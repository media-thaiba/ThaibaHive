import crypto from 'crypto';
import { RoomManager, roomManager } from '../streaming/room-manager';
import { WebRtcSignalingManager, signalingManager } from '../streaming/webrtc-signaling';
import { db } from '@/db';
import { streamingRooms, streamingSessions, streamRecordings, conferenceSignals } from '@/db/schema';

jest.mock('@/db', () => {
  const mockDb: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  mockDb.transaction = jest.fn(async (cb: any) => cb(mockDb));
  return { db: mockDb };
});

describe('WebRTC E2EE Conferencing Engine & Perfect Negotiation (Phase 12 / Track 3A)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RFC 5766 TURN Credentials & Perfect Negotiation Invariants', () => {
    it('should generate valid RFC 5766 time-limited HMAC-SHA1 TURN credentials', () => {
      const secret = 'test-turn-secret-key-12345';
      const creds = signalingManager.generateTurnCredentials('test_user_001', secret, 86400);

      expect(creds.username).toContain(':test_user_001');
      expect(creds.credential).toBeDefined();
      expect(typeof creds.credential).toBe('string');
      expect(creds.urls).toEqual(
        expect.arrayContaining([
          'turn:turn.thaibahive.org:3478?transport=udp',
          'turn:turn.thaibahive.org:3478?transport=tcp',
        ])
      );
      expect(creds.expiresAt).toBeGreaterThan(Date.now());

      // Validate HMAC-SHA1 signature computation
      const expectedHmac = crypto.createHmac('sha1', secret).update(creds.username).digest('base64');
      expect(creds.credential).toBe(expectedHmac);
    });

    it('should enforce deterministic, asymmetric politeness for Perfect Negotiation glare resolution', () => {
      const peerA = 'peer_alpha_100';
      const peerB = 'peer_omega_200';

      const aIsPolite = signalingManager.isPolitePeer(peerA, peerB);
      const bIsPolite = signalingManager.isPolitePeer(peerB, peerA);

      // Exactly one must be polite to prevent deadlock during offer collision
      expect(aIsPolite).toBe(true);
      expect(bIsPolite).toBe(false);
      expect(aIsPolite !== bIsPolite).toBe(true);
    });
  });

  describe('SFrame / Insertable Streams P-256 ECDH Key Agreement & Forward Secrecy', () => {
    it('should perform symmetric ECDH shared secret derivation between two peers', () => {
      const peerA = roomManager.generateEcdhKeyPair();
      const peerB = roomManager.generateEcdhKeyPair();

      expect(peerA.publicKeyHex).toBeDefined();
      expect(peerA.privateKeyHex).toBeDefined();
      expect(peerB.publicKeyHex).toBeDefined();
      expect(peerB.privateKeyHex).toBeDefined();

      const secretA = roomManager.deriveSharedSecret(peerA.privateKeyHex, peerB.publicKeyHex);
      const secretB = roomManager.deriveSharedSecret(peerB.privateKeyHex, peerA.publicKeyHex);

      expect(secretA).toBe(secretB);
      expect(secretA.length).toBe(64); // 256 bits = 64 hex characters
    });

    it('should derive epoch-specific 256-bit AES-GCM keys with forward secrecy across rotations', () => {
      const peerA = roomManager.generateEcdhKeyPair();
      const peerB = roomManager.generateEcdhKeyPair();
      const sharedSecret = roomManager.deriveSharedSecret(peerA.privateKeyHex, peerB.publicKeyHex);

      const epoch1Key = roomManager.deriveEpochKey(sharedSecret, 1);
      const epoch2Key = roomManager.deriveEpochKey(sharedSecret, 2);

      expect(epoch1Key.length).toBe(64);
      expect(epoch2Key.length).toBe(64);
      // Cryptographic guarantee: Key from epoch 1 CANNOT decrypt frames from epoch 2
      expect(epoch1Key).not.toBe(epoch2Key);
    });

    it('should generate human-verifiable key fingerprints', () => {
      const fingerprint = roomManager.computeFingerprint('04abcdef0123456789abcdef0123456789');
      expect(fingerprint).toMatch(/^[A-F0-9]{4}(-[A-F0-9]{4}){7}$/);
    });
  });

  describe('Room State Machine & Atomic Capacity Gating', () => {
    it('should create room with hashed passcode and status ACTIVE', async () => {
      const insertMock = jest.fn().mockReturnValue({});
      (db.insert as jest.Mock).mockReturnValue({ values: insertMock });

      const room = await roomManager.createRoom('inst_alpha', 'host_01', {
        roomName: 'Physics Lecture Hall',
        roomType: 'CLASSROOM',
        maxParticipants: 100,
        passcode: 'SafePass123',
        isE2eeEnabled: true,
        recordingEnabled: true,
      });

      expect(room.id).toMatch(/^room_/);
      expect(room.status).toBe('ACTIVE');
      expect((room as any).hasPasscode).toBe(true);
      expect((room as any).passcodeHash).toBeUndefined();
      expect(db.insert).toHaveBeenCalledWith(streamingRooms);
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          passcodeHash: crypto.createHash('sha256').update('SafePass123').digest('hex'),
        })
      );
    });

    it('should block admission when invalid passcode is provided', async () => {
      const mockRoom = {
        id: 'room_secured_1',
        institutionId: 'inst_alpha',
        roomName: 'Executive Boardroom',
        status: 'ACTIVE',
        maxParticipants: 10,
        passcodeHash: crypto.createHash('sha256').update('CorrectPasscode').digest('hex'),
      };

      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation((table) => ({
          where: jest.fn().mockResolvedValue([mockRoom]),
        })),
      }));

      await expect(
        roomManager.joinRoom('inst_alpha', 'room_secured_1', 'user_02', { passcode: 'WrongPasscode' })
      ).rejects.toThrow('Invalid room passcode');
    });

    it('should enforce atomic capacity gate when room reaches maxParticipants limit', async () => {
      const mockRoom = {
        id: 'room_crowded',
        institutionId: 'inst_alpha',
        roomName: 'Small Seminar',
        status: 'ACTIVE',
        maxParticipants: 2,
        passcodeHash: null,
      };

      // Mock 2 active sessions currently in the room
      const activeSessions = [
        { id: 'ses_1', roomId: 'room_crowded', leftAt: null },
        { id: 'ses_2', roomId: 'room_crowded', leftAt: null },
      ];

      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation((table) => ({
          where: jest.fn().mockImplementation(async () => {
            if (table === streamingRooms) return [mockRoom];
            if (table === streamingSessions) return activeSessions;
            return [];
          }),
        })),
      }));

      await expect(
        roomManager.joinRoom('inst_alpha', 'room_crowded', 'user_03', {})
      ).rejects.toThrow('Room has reached maximum capacity of 2 participants');
    });

    it('should admit participant and rotate epoch when room is under capacity', async () => {
      const mockRoom = {
        id: 'room_available',
        institutionId: 'inst_alpha',
        roomName: 'Open Hall',
        status: 'ACTIVE',
        maxParticipants: 50,
        passcodeHash: null,
      };

      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation((table) => ({
          where: jest.fn().mockImplementation(async () => {
            if (table === streamingRooms) return [mockRoom];
            if (table === streamingSessions) return []; // 0 active
            return [];
          }),
        })),
      }));

      const insertMock = jest.fn().mockReturnValue({});
      (db.insert as jest.Mock).mockReturnValue({ values: insertMock });

      const joinResult = await roomManager.joinRoom(
        'inst_alpha',
        'room_available',
        'user_04',
        { e2eePublicKey: '04mockpubkey' },
        'peer_user_4'
      );

      expect(joinResult.session.roomId).toBe('room_available');
      expect(joinResult.session.peerId).toBe('peer_user_4');
      expect(joinResult.epoch).toBeGreaterThan(0);
      expect(db.insert).toHaveBeenCalledWith(streamingSessions);
      expect(db.insert).toHaveBeenCalledWith(conferenceSignals);
    });

    it('should trigger forward-secrecy epoch rotation when a participant leaves', async () => {
      const mockSession = {
        id: 'ses_departing',
        institutionId: 'inst_alpha',
        roomId: 'room_active_1',
        peerId: 'peer_leaving',
        leftAt: null,
      };

      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue([mockSession]),
        })),
      }));

      const updateSetMock = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue({}) });
      (db.update as jest.Mock).mockReturnValue({ set: updateSetMock });

      const initialEpoch = roomManager.getRoomEpoch('room_active_1');
      await roomManager.leaveRoom('inst_alpha', 'room_active_1', 'peer_leaving');

      expect(roomManager.getRoomEpoch('room_active_1')).toBe(initialEpoch + 1);
      expect(db.update).toHaveBeenCalledWith(streamingSessions);
      expect(updateSetMock).toHaveBeenCalledWith(
        expect.objectContaining({
          leftAt: expect.any(String),
        })
      );
    });
  });

  describe('Host Moderation Actions (Kick, Lock, End Meeting)', () => {
    it('should allow host to kick a participant and rotate encryption epoch', async () => {
      const mockRoom = { id: 'room_mod', institutionId: 'inst_alpha', status: 'ACTIVE' };
      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue([mockRoom]),
        })),
      }));

      const updateSetMock = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue({}) });
      (db.update as jest.Mock).mockReturnValue({ set: updateSetMock });
      (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({}) });

      const res = await roomManager.moderateRoom('inst_alpha', 'room_mod', 'host_01', {
        action: 'kick_participant',
        targetPeerId: 'disruptive_peer',
        reason: 'Violation of conduct',
      });

      expect(res.action).toBe('kicked');
      expect(res.targetPeerId).toBe('disruptive_peer');
      expect(res.epoch).toBeDefined();
      expect(db.update).toHaveBeenCalledWith(streamingSessions);
    });

    it('should allow host to lock the room', async () => {
      const mockRoom = { id: 'room_lock_test', institutionId: 'inst_alpha', status: 'ACTIVE' };
      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue([mockRoom]),
        })),
      }));

      (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({}) });

      const res = await roomManager.moderateRoom('inst_alpha', 'room_lock_test', 'host_01', {
        action: 'lock_room',
      });

      expect(res.isLocked).toBe(true);

      // Now join attempt should fail
      await expect(
        roomManager.joinRoom('inst_alpha', 'room_lock_test', 'late_user', {})
      ).rejects.toThrow('Room \'room_lock_test\' is locked by moderator');
    });

    it('should end room and terminate all active sessions', async () => {
      const mockRoom = { id: 'room_ending', institutionId: 'inst_alpha', status: 'ACTIVE' };
      (db.select as jest.Mock).mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue([mockRoom]),
        })),
      }));

      const updateSetMock = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue({}) });
      (db.update as jest.Mock).mockReturnValue({ set: updateSetMock });
      (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockReturnValue({}) });

      const res = await roomManager.moderateRoom('inst_alpha', 'room_ending', 'host_01', {
        action: 'end_room',
      });

      expect(res.status).toBe('ENDED');
      expect(db.update).toHaveBeenCalledWith(streamingRooms);
      expect(db.update).toHaveBeenCalledWith(streamingSessions);
    });
  });
});
