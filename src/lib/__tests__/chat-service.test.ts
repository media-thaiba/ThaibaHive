import { ChatServiceError } from "@/services/chat";

const mockGet = jest.fn();
const mockAll = jest.fn();
const mockRun = jest.fn();
const mockReturning = jest.fn();

const mockChain: Record<string, any> = {
  where: jest.fn(() => mockChain),
  from: jest.fn(() => mockChain),
  select: jest.fn(() => mockChain),
  innerJoin: jest.fn(() => mockChain),
  leftJoin: jest.fn(() => mockChain),
  groupBy: jest.fn(() => mockChain),
  having: jest.fn(() => mockChain),
  orderBy: jest.fn(() => mockChain),
  limit: jest.fn(() => mockChain),
  set: jest.fn(() => ({ where: jest.fn(() => ({ run: mockRun, get: mockGet, returning: mockReturning })) })),
  values: jest.fn(() => ({ returning: mockReturning })),
  get: mockGet,
  all: mockAll,
  run: mockRun,
  returning: mockReturning,
};

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => mockChain),
    insert: jest.fn(() => ({ values: mockChain.values })),
    update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => ({ run: mockRun, get: mockGet, returning: mockReturning })) })) })),
    delete: jest.fn(() => ({ where: jest.fn(() => ({ run: mockRun })) })),
    transaction: jest.fn(async (fn: any) => {
      const tx = {
        select: jest.fn(() => mockChain),
        insert: jest.fn(() => ({ values: mockChain.values })),
        update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => ({ run: mockRun, get: mockGet, returning: mockReturning })) })) })),
        delete: jest.fn(() => ({ where: jest.fn(() => ({ run: mockRun })) })),
      };
      return fn(tx);
    }),
  },
  chatRooms: { id: "id", name: "name", createdById: "createdById" },
  chatParticipants: { roomId: "roomId", staffId: "staffId", role: "role", lastReadAt: "lastReadAt" },
  chatMessages: { roomId: "roomId", senderId: "senderId", createdAt: "createdAt" },
  staff: { id: "id", role: "role", firstName: "firstName", lastName: "lastName" },
}));

describe("ChatServiceError", () => {
  it("should set correct status for each code", () => {
    expect(new ChatServiceError("msg", "NOT_FOUND").status).toBe(404);
    expect(new ChatServiceError("msg", "FORBIDDEN").status).toBe(403);
    expect(new ChatServiceError("msg", "CONFLICT").status).toBe(409);
    expect(new ChatServiceError("msg", "BAD_REQUEST").status).toBe(400);
    expect(new ChatServiceError("msg", "INTERNAL").status).toBe(500);
  });

  it("should default to BAD_REQUEST", () => {
    const err = new ChatServiceError("msg");
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.status).toBe(400);
    expect(err.name).toBe("ChatServiceError");
  });
});

describe("Chat Service Methods", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockAll.mockReset();
    mockRun.mockReset();
    mockReturning.mockReset();
    jest.clearAllMocks();
  });

  describe("getUserRooms", () => {
    it("should return empty rooms when user has no participations", async () => {
      mockAll.mockResolvedValueOnce([]);

      const { getUserRooms } = require("@/services/chat");
      const result = await getUserRooms("user-1");

      expect(result.rooms).toEqual([]);
    });
  });

  describe("getRoomDetails", () => {
    it("should throw NOT_FOUND when room does not exist", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { getRoomDetails } = require("@/services/chat");
      await expect(getRoomDetails("room-1", "user-1")).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when user is not a participant", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1" })  // room found
        .mockResolvedValueOnce(undefined);          // not a participant

      const { getRoomDetails } = require("@/services/chat");
      await expect(getRoomDetails("room-1", "user-1")).rejects.toThrow(ChatServiceError);
    });
  });

  describe("createRoom", () => {
    it("should throw BAD_REQUEST for group room with empty name", async () => {
      const { createRoom } = require("@/services/chat");
      await expect(
        createRoom({ name: "  ", participantIds: ["user-2"], isDirectMessage: false, creatorStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw BAD_REQUEST for DM with non-null name", async () => {
      const { createRoom } = require("@/services/chat");
      await expect(
        createRoom({ name: "Hello", participantIds: ["user-2"], isDirectMessage: true, creatorStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw BAD_REQUEST for DM with more than 1 participant", async () => {
      const { createRoom } = require("@/services/chat");
      await expect(
        createRoom({ participantIds: ["user-2", "user-3"], isDirectMessage: true, creatorStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw CONFLICT for duplicate DM", async () => {
      mockGet.mockResolvedValueOnce({ roomId: "existing-dm" });

      const { createRoom } = require("@/services/chat");
      await expect(
        createRoom({ participantIds: ["user-2"], isDirectMessage: true, creatorStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe("getRoomMessages", () => {
    it("should throw FORBIDDEN for non-participant", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { getRoomMessages } = require("@/services/chat");
      await expect(
        getRoomMessages({ roomId: "room-1", staffId: "user-1", limit: 50 })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw BAD_REQUEST for invalid beforeCursor", async () => {
      mockGet.mockResolvedValueOnce({});

      const { getRoomMessages } = require("@/services/chat");
      await expect(
        getRoomMessages({ roomId: "room-1", staffId: "user-1", limit: 50, beforeCursor: "not-a-date" })
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe("sendMessage", () => {
    it("should throw FORBIDDEN for non-participant", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { sendMessage } = require("@/services/chat");
      await expect(
        sendMessage({ roomId: "room-1", senderId: "user-1", text: "hello" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw BAD_REQUEST when no text or media", async () => {
      mockGet.mockResolvedValueOnce({});

      const { sendMessage } = require("@/services/chat");
      await expect(
        sendMessage({ roomId: "room-1", senderId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe("addParticipant", () => {
    it("should throw NOT_FOUND when room does not exist", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { addParticipant } = require("@/services/chat");
      await expect(
        addParticipant({ roomId: "room-1", staffId: "user-2", role: "Member", addedById: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw BAD_REQUEST when adding to DM room", async () => {
      mockGet.mockResolvedValueOnce({ id: "room-1", name: null });

      const { addParticipant } = require("@/services/chat");
      await expect(
        addParticipant({ roomId: "room-1", staffId: "user-2", role: "Member", addedById: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw CONFLICT when user is already a participant", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })  // room
        .mockResolvedValueOnce({ role: "Manager" })               // addedBy participant
        .mockResolvedValueOnce({ role: "admin" })                 // addedBy global role
        .mockResolvedValueOnce({ id: "existing" });               // target already exists

      const { addParticipant } = require("@/services/chat");
      await expect(
        addParticipant({ roomId: "room-1", staffId: "user-2", role: "Member", addedById: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when caller is not Manager or admin", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })  // room
        .mockResolvedValueOnce({ role: "Member" })                // addedBy participant
        .mockResolvedValueOnce({ role: "staff" });                // addedBy global role

      const { addParticipant } = require("@/services/chat");
      await expect(
        addParticipant({ roomId: "room-1", staffId: "user-2", role: "Member", addedById: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe("updateParticipant", () => {
    it("should throw FORBIDDEN when caller is not Manager or admin", async () => {
      mockGet
        .mockResolvedValueOnce({})            // caller participant (any role works for assertParticipant)
        .mockResolvedValueOnce({ role: "staff" });  // caller global role

      const { updateParticipant } = require("@/services/chat");
      await expect(
        updateParticipant({ roomId: "room-1", participantId: "user-2", role: "Member", callerStaffId: "user-1", callerRole: "staff" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw NOT_FOUND when target participant not found", async () => {
      mockGet
        .mockResolvedValueOnce({ role: "Manager" })  // caller is manager
        .mockResolvedValueOnce(undefined);             // target not found

      const { updateParticipant } = require("@/services/chat");
      await expect(
        updateParticipant({ roomId: "room-1", participantId: "user-2", role: "Member", callerStaffId: "user-1", callerRole: "staff" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw CONFLICT when demoting last manager of room with 2+ participants", async () => {
      mockGet
        .mockResolvedValueOnce({ role: "Manager" })  // caller is manager
        .mockResolvedValueOnce({ role: "Manager" })  // target is manager
        .mockResolvedValueOnce({ count: 1 })          // only 1 manager
        .mockResolvedValueOnce({ count: 3 });         // 3 participants

      const { updateParticipant } = require("@/services/chat");
      await expect(
        updateParticipant({ roomId: "room-1", participantId: "user-2", role: "Member", callerStaffId: "user-1", callerRole: "staff" })
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe("removeParticipant", () => {
    it("should throw NOT_FOUND when room does not exist", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { removeParticipant } = require("@/services/chat");
      await expect(
        removeParticipant({ roomId: "room-1", participantId: "user-2", callerStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when non-participant tries to remove others", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })  // room
        .mockResolvedValueOnce(undefined);                         // caller participant not found

      const { removeParticipant } = require("@/services/chat");
      await expect(
        removeParticipant({ roomId: "room-1", participantId: "user-2", callerStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when member tries to remove another member", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })  // room
        .mockResolvedValueOnce({ role: "Member" })                // caller is Member
        .mockResolvedValueOnce({ role: "staff" })                 // caller global role
        .mockResolvedValueOnce({ id: "target" });                 // target exists

      const { removeParticipant } = require("@/services/chat");
      await expect(
        removeParticipant({ roomId: "room-1", participantId: "user-2", callerStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw NOT_FOUND when target participant does not exist", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })  // room
        .mockResolvedValueOnce({ role: "Manager" })                // caller is Manager
        .mockResolvedValueOnce({ role: "admin" })                  // caller global role
        .mockResolvedValueOnce(undefined);                          // target not found

      const { removeParticipant } = require("@/services/chat");
      await expect(
        removeParticipant({ roomId: "room-1", participantId: "user-2", callerStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });

    it("should throw CONFLICT when removing last manager of room with 2+ participants", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })  // room
        .mockResolvedValueOnce({ role: "admin" })                 // caller global role (skips participant check)
        .mockResolvedValueOnce({ role: "Manager" })               // target is Manager
        .mockResolvedValueOnce({ count: 1 })                       // only 1 manager
        .mockResolvedValueOnce({ count: 3 });                      // 3 participants

      const { removeParticipant } = require("@/services/chat");
      await expect(
        removeParticipant({ roomId: "room-1", participantId: "user-2", callerStaffId: "user-1" })
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe("deleteRoom", () => {
    it("should throw NOT_FOUND when room does not exist", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { deleteRoom } = require("@/services/chat");
      await expect(deleteRoom("room-1", "user-1", "staff")).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when caller is not creator or admin", async () => {
      mockGet.mockResolvedValueOnce({ id: "room-1", createdById: "other-user" });

      const { deleteRoom } = require("@/services/chat");
      await expect(deleteRoom("room-1", "user-1", "staff")).rejects.toThrow(ChatServiceError);
    });

    it("should succeed when caller is the creator", async () => {
      mockGet.mockResolvedValueOnce({ id: "room-1", createdById: "user-1" });
      mockRun.mockResolvedValueOnce(undefined);

      const { deleteRoom } = require("@/services/chat");
      await expect(deleteRoom("room-1", "user-1", "staff")).resolves.toBeUndefined();
    });

    it("should succeed when caller is admin", async () => {
      mockGet.mockResolvedValueOnce({ id: "room-1", createdById: "other-user" });
      mockRun.mockResolvedValueOnce(undefined);

      const { deleteRoom } = require("@/services/chat");
      await expect(deleteRoom("room-1", "user-1", "admin")).resolves.toBeUndefined();
    });
  });

  describe("clearMessages", () => {
    it("should throw NOT_FOUND when room does not exist", async () => {
      mockGet.mockResolvedValueOnce(undefined);

      const { clearMessages } = require("@/services/chat");
      await expect(clearMessages("room-1", "user-1", "staff")).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when caller is not a participant", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })
        .mockResolvedValueOnce(undefined);

      const { clearMessages } = require("@/services/chat");
      await expect(clearMessages("room-1", "user-1", "staff")).rejects.toThrow(ChatServiceError);
    });

    it("should throw FORBIDDEN when non-manager tries to clear group chat", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })
        .mockResolvedValueOnce({ role: "Member" });

      const { clearMessages } = require("@/services/chat");
      await expect(clearMessages("room-1", "user-1", "staff")).rejects.toThrow(ChatServiceError);
    });

    it("should succeed when participant clears DM", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: null })  // DM room
        .mockResolvedValueOnce({ role: "Member" });            // participant
      mockAll.mockResolvedValueOnce([]);                       // remaining participants
      mockRun.mockResolvedValue(undefined);

      const { clearMessages } = require("@/services/chat");
      const result = await clearMessages("room-1", "user-1", "staff");
      expect(result.cleared).toBe(true);
    });

    it("should succeed when manager clears group chat", async () => {
      mockGet
        .mockResolvedValueOnce({ id: "room-1", name: "Group" })
        .mockResolvedValueOnce({ role: "Manager" });
      mockAll.mockResolvedValueOnce([]);
      mockRun.mockResolvedValue(undefined);

      const { clearMessages } = require("@/services/chat");
      const result = await clearMessages("room-1", "user-1", "staff");
      expect(result.cleared).toBe(true);
    });
  });
});
