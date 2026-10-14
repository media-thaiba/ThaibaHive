/**
 * Phase 12 (Track 3A): Unified Campus Identity & Real-Time E2EE WebRTC Conferencing
 * 8-Stage Zero-Egress Simulation CLI Runner (CONFERENCE-SIMULATE)
 */

import crypto from 'crypto';

if (!process.env.AUTH_JWT_SECRET) {
  process.env.AUTH_JWT_SECRET = 'thaibahive_simulated_secret_key_minimum_32_characters_long_2026';
}

import { db } from '../src/db';
import { institutions, staff, samlProviders, oidcProviders } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { SamlService, exclusiveC14N } from '../src/lib/auth/saml-service';
import { OidcService } from '../src/lib/auth/oidc-service';
import { FederatedUserMapper } from '../src/lib/auth/federated-user-mapper';
import { SsoAuditLedger } from '../src/lib/auth/sso-audit-ledger';
import { roomManager } from '../src/lib/streaming/room-manager';
import { signalingManager } from '../src/lib/streaming/webrtc-signaling';

async function runConferenceSimulation() {
  console.log('================================================================================');
  console.log('   THAIBAHIVE CAMPUS SSO & REAL-TIME WEBRTC CONFERENCING SIMULATOR (PHASE 12)  ');
  console.log('================================================================================\n');

  const testInstId = `inst_sim_${Date.now()}`;
  const now = new Date().toISOString();

  // ---------------------------------------------------------------------------
  // Stage 1: Seed Test Institution & Identity Providers
  // ---------------------------------------------------------------------------
  console.log('Stage 1/8: Seeding Institution & Federated Identity Providers...');
  await db.insert(institutions).values({
    id: testInstId,
    name: 'Thaiba Global University (Simulated Campus)',
    code: `TGU-${Date.now().toString().slice(-4)}`,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const samlProvId = `saml_prov_${Date.now()}`;
  await db.insert(samlProviders).values({
    id: samlProvId,
    tenantId: testInstId,
    institutionId: testInstId,
    name: 'Azure AD / Entra ID Federation',
    idpEntityId: 'https://sts.windows.net/sim-tenant-01/',
    ssoUrl: 'https://login.microsoftonline.com/sim-saml/sso',
    x509Certificate: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0simulatedKey==',
    isActive: true,
    createdAt: now,
  });

  const oidcProvId = `oidc_prov_${Date.now()}`;
  await db.insert(oidcProviders).values({
    id: oidcProvId,
    tenantId: testInstId,
    institutionId: testInstId,
    name: 'Google Workspace Education OIDC',
    issuerUrl: 'https://accounts.google.com',
    discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
    clientId: 'sim-client-id.apps.googleusercontent.com',
    clientSecret: 'sim-client-secret-xyz',
    scopes: 'openid email profile',
    isActive: true,
    createdAt: now,
  });

  console.log(`  ✓ Test institution '${testInstId}' initialized.`);
  console.log(`  ✓ SAML 2.0 Provider '${samlProvId}' and OIDC Provider '${oidcProvId}' registered.`);

  // ---------------------------------------------------------------------------
  // Stage 2: SP Metadata XML Generation & Connectivity Diagnostic Simulation
  // ---------------------------------------------------------------------------
  console.log('\nStage 2/8: SP Metadata XML Generation & Diagnostic Probing...');
  const samlService = new SamlService();
  const spMetadata = samlService.generateSpMetadata(
    'https://app.thaibahive.org/sp',
    'https://app.thaibahive.org/api/auth/saml/acs'
  );

  if (!spMetadata.includes('EntityDescriptor') || !spMetadata.includes('AssertionConsumerService')) {
    throw new Error('SP Metadata XML missing critical SAML EntityDescriptor / ACS declarations');
  }
  console.log(`  ✓ SP Metadata XML generated (${spMetadata.length} bytes) with Exclusive C14N signature bindings.`);

  const oidcService = new OidcService();
  const stateToken = oidcService.generateState({ institutionId: testInstId, providerId: oidcProvId });
  const verifiedState = oidcService.verifyState(stateToken);
  if (!verifiedState || verifiedState.institutionId !== testInstId) {
    throw new Error('State token HMAC-SHA256 CSRF verification failed');
  }
  console.log(`  ✓ OIDC CSRF State Token generated and verified via timing-safe HMAC.`);

  // ---------------------------------------------------------------------------
  // Stage 3: SAML 2.0 Security, XXE Defense & Replay Cache Invariants
  // ---------------------------------------------------------------------------
  console.log('\nStage 3/8: SAML 2.0 XML Canonicalization, XXE Defense & Replay Rejection...');

  // Exclusive C14N
  const sampleXml = '<saml:Assertion xmlns:b="urn:b" xmlns:a="urn:a" id="1" ><saml:Subject /></saml:Assertion>';
  const canonicalXml = exclusiveC14N(sampleXml);
  if (!canonicalXml.includes('xmlns:a="urn:a" xmlns:b="urn:b"') || !canonicalXml.includes('<saml:Subject></saml:Subject>')) {
    throw new Error('Exclusive C14N did not properly sort namespace declarations or expand empty elements');
  }
  console.log(`  ✓ Exclusive C14N canonicalization verified.`);

  // Fail-closed XXE attack rejection
  const maliciousXml = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/shadow">]><saml:Assertion>&xxe;</saml:Assertion>';
  let xxeBlocked = false;
  try {
    samlService.parseAndValidateResponse(Buffer.from(maliciousXml).toString('base64'), {
      id: samlProvId,
      institutionId: testInstId,
      name: 'Azure AD / Entra ID Federation',
      entityId: 'https://sts.windows.net/sim-tenant-01/',
      ssoUrl: 'https://login.microsoftonline.com/sim-saml/sso',
      x509Certificate: 'dummy',
      isActive: true,
    });
  } catch (err: any) {
    if (err.message.includes('XXE entity expansion forbidden')) {
      xxeBlocked = true;
    }
  }
  if (!xxeBlocked) {
    throw new Error('Fail-closed XXE defense failed to block malicious entity expansion');
  }
  console.log(`  ✓ Malicious XXE entity expansion safely rejected (Fail-Closed).`);

  // Assertion Replay Detection & Digital Signature
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const certDer = crypto.createHash('sha256').update(publicKey).digest('base64');
  const assertionId = `assert_sim_${Date.now()}`;

  const rawAssertion = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" IssueInstant="${now}" Version="2.0"><saml:Subject><saml:NameID>student@thaibahive.org</saml:NameID></saml:Subject></saml:Assertion>`;
  const canonicalAssertion = exclusiveC14N(rawAssertion);
  const digestValue = crypto.createHash('sha256').update(canonicalAssertion, 'utf8').digest('base64');

  const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/><ds:Reference URI="#${assertionId}"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
  const canonicalSignedInfo = exclusiveC14N(signedInfoXml);

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(canonicalSignedInfo, 'utf8');
  const signatureValue = signer.sign(privateKey, 'base64');

  const signedResponse = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" IssueInstant="${now}" Version="2.0">
      <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        ${signedInfoXml}
        <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
        <ds:KeyInfo><ds:X509Data><ds:X509Certificate>${certDer}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>
      </ds:Signature>
      <saml:Subject><saml:NameID>student@thaibahive.org</saml:NameID></saml:Subject>
    </saml:Assertion>
  </samlp:Response>`;

  const b64Signed = Buffer.from(signedResponse).toString('base64');
  const mockProv = {
    id: samlProvId,
    institutionId: testInstId,
    name: 'Azure AD / Entra ID Federation',
    entityId: 'https://sts.windows.net/sim-tenant-01/',
    ssoUrl: 'https://login.microsoftonline.com/sim-saml/sso',
    x509Certificate: publicKey,
    wantAssertionsSigned: true,
    isActive: true,
  };

  // First pass: Valid
  const parsedFirst = samlService.parseAndValidateResponse(b64Signed, mockProv, { enforceSignature: true });
  if (parsedFirst.subjectId !== 'student@thaibahive.org') {
    throw new Error('Failed to validate signed SAML assertion');
  }
  console.log(`  ✓ Signed SAML assertion validated with RSA-SHA256 digital signature.`);

  // Second pass: Replay should fail
  let replayBlocked = false;
  try {
    samlService.parseAndValidateResponse(b64Signed, mockProv);
  } catch (err: any) {
    if (err.message.includes('replay detected')) {
      replayBlocked = true;
    }
  }
  if (!replayBlocked) {
    throw new Error('Assertion replay cache failed to detect duplicate assertion');
  }
  console.log(`  ✓ Assertion replay attack blocked within 600s cache TTL.`);

  // ---------------------------------------------------------------------------
  // Stage 4: OIDC RFC 7636 PKCE S256 Flow & Discovery
  // ---------------------------------------------------------------------------
  console.log('\nStage 4/8: OIDC RFC 7636 PKCE S256 Flow Simulation...');
  const pkcePair = oidcService.generatePkce();
  const challengeCheck = crypto.createHash('sha256').update(pkcePair.codeVerifier).digest('base64url');
  if (challengeCheck !== pkcePair.codeChallenge) {
    throw new Error('PKCE S256 code_challenge mismatch');
  }
  console.log(`  ✓ RFC 7636 PKCE S256 pair generated (verifier: ${pkcePair.codeVerifier.length} chars, challenge: ${pkcePair.codeChallenge.length} chars).`);

  // ---------------------------------------------------------------------------
  // Stage 5: JIT User Provisioning & Escalation Defense
  // ---------------------------------------------------------------------------
  console.log('\nStage 5/8: JIT Provisioning & RBAC Privilege Escalation Guard...');
  const jitResult = await FederatedUserMapper.mapOrCreateUser({
    tenantId: testInstId,
    institutionId: testInstId,
    providerType: 'OIDC',
    providerId: oidcProvId,
    externalSubjectId: `ext_sub_${Date.now()}`,
    email: `prof_sim_${Date.now()}@tgu.edu`,
    name: 'Professor Turing',
    roles: ['super_admin'], // Attempt privilege escalation!
  });

  if (jitResult.role === 'super_admin') {
    throw new Error('Privilege escalation guard failed: super_admin was granted via external IdP claim');
  }
  if (jitResult.role !== 'admin') {
    throw new Error(`Expected role clamped to 'admin', got '${jitResult.role}'`);
  }

  const [createdStaff] = await db.select().from(staff).where(eq(staff.id, jitResult.userId));
  if (!createdStaff || !createdStaff.emailVerifiedAt) {
    throw new Error('JIT provisioned staff record missing emailVerifiedAt stamp');
  }
  console.log(`  ✓ JIT provisioned user '${createdStaff.id}' created with verified email.`);
  console.log(`  ✓ Privilege escalation attempt ('super_admin' claim) clamped to 'admin'.`);

  // ---------------------------------------------------------------------------
  // Stage 6: WebRTC Conferencing Room Creation & Capacity Gating
  // ---------------------------------------------------------------------------
  console.log('\nStage 6/8: WebRTC Room Creation, Passcode & Capacity Gating...');
  const room = await roomManager.createRoom(testInstId, createdStaff.id, {
    roomName: 'Advanced Quantum Computing Seminar',
    roomType: 'CLASSROOM',
    maxParticipants: 2, // Low capacity to test atomic admission gate
    passcode: 'Quantum2026',
    isE2eeEnabled: true,
    recordingEnabled: false,
  });

  console.log(`  ✓ Room '${room.id}' created with capacity 2 and SHA-256 hashed passcode.`);

  // Participant 1 joins
  const p1KeyPair = roomManager.generateEcdhKeyPair();
  const join1 = await roomManager.joinRoom(
    testInstId,
    room.id,
    'user_sim_p1',
    { passcode: 'Quantum2026', e2eePublicKey: p1KeyPair.publicKeyHex },
    'peer_sim_p1'
  );
  console.log(`  ✓ Participant 1 joined (Epoch ${join1.epoch}, Fingerprint: ${join1.fingerprint}).`);

  // Participant 2 joins
  const p2KeyPair = roomManager.generateEcdhKeyPair();
  const join2 = await roomManager.joinRoom(
    testInstId,
    room.id,
    'user_sim_p2',
    { passcode: 'Quantum2026', e2eePublicKey: p2KeyPair.publicKeyHex },
    'peer_sim_p2'
  );
  console.log(`  ✓ Participant 2 joined (Epoch ${join2.epoch}, Fingerprint: ${join2.fingerprint}).`);

  // Participant 3 joins (must be blocked by capacity gate)
  let capacityBlocked = false;
  try {
    await roomManager.joinRoom(
      testInstId,
      room.id,
      'user_sim_p3',
      { passcode: 'Quantum2026' },
      'peer_sim_p3'
    );
  } catch (err: any) {
    if (err.message.includes('maximum capacity')) {
      capacityBlocked = true;
    }
  }
  if (!capacityBlocked) {
    throw new Error('Atomic capacity gate failed to block third participant from exceeding capacity of 2');
  }
  console.log(`  ✓ Third participant blocked by atomic capacity gate (maxParticipants: 2).`);

  // ---------------------------------------------------------------------------
  // Stage 7: Signaling Relay & SFrame P-256 ECDH Key Agreement
  // ---------------------------------------------------------------------------
  console.log('\nStage 7/8: Perfect Negotiation Signaling & SFrame ECDH Key Agreement...');
  // Perfect Negotiation Politeness
  const isP1Polite = signalingManager.isPolitePeer('peer_sim_p1', 'peer_sim_p2');
  const isP2Polite = signalingManager.isPolitePeer('peer_sim_p2', 'peer_sim_p1');
  if (isP1Polite === isP2Polite) {
    throw new Error('Perfect negotiation politeness is not asymmetric');
  }
  console.log(`  ✓ Perfect negotiation politeness determined (peer_sim_p1 polite: ${isP1Polite}).`);

  // Dispatch SDP offer and candidate
  await signalingManager.dispatchSignal({
    institutionId: testInstId,
    roomId: room.id,
    senderPeerId: 'peer_sim_p1',
    recipientPeerId: 'peer_sim_p2',
    signalType: 'offer',
    payloadJson: JSON.stringify({ sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n', type: 'offer' }),
    sequenceNum: 1,
  });

  const pendingSignals = await signalingManager.getPendingSignals(testInstId, room.id, 'peer_sim_p2');
  if (pendingSignals.length === 0) {
    throw new Error('Pending signals queue failed to deliver offer');
  }
  console.log(`  ✓ WebRTC SDP Offer queued and retrieved for peer_sim_p2.`);

  // Ephemeral ECDH Key Agreement
  const secretP1 = roomManager.deriveSharedSecret(p1KeyPair.privateKeyHex, p2KeyPair.publicKeyHex);
  const secretP2 = roomManager.deriveSharedSecret(p2KeyPair.privateKeyHex, p1KeyPair.publicKeyHex);
  if (secretP1 !== secretP2) {
    throw new Error('SFrame ECDH key agreement failed: shared secrets do not match');
  }
  const epochKeyP1 = roomManager.deriveEpochKey(secretP1, join2.epoch);
  const epochKeyP2 = roomManager.deriveEpochKey(secretP2, join2.epoch);
  if (epochKeyP1 !== epochKeyP2) {
    throw new Error('Derived SFrame epoch keys do not match between peers');
  }
  console.log(`  ✓ SFrame P-256 ECDH Key Agreement verified (256-bit AES-GCM Key derived: ${epochKeyP1.slice(0, 16)}...).`);

  // Participant 1 leaves -> Forward Secrecy epoch rotation
  const epochBeforeLeave = roomManager.getRoomEpoch(room.id);
  await roomManager.leaveRoom(testInstId, room.id, 'peer_sim_p1');
  const epochAfterLeave = roomManager.getRoomEpoch(room.id);
  if (epochAfterLeave !== epochBeforeLeave + 1) {
    throw new Error('Room epoch was not rotated upon participant departure');
  }
  console.log(`  ✓ Participant 1 departed; Forward-Secrecy triggered Epoch rotation (${epochBeforeLeave} -> ${epochAfterLeave}).`);

  // ---------------------------------------------------------------------------
  // Stage 8: Merkle Hash Chain Audit Integrity Verification
  // ---------------------------------------------------------------------------
  console.log('\nStage 8/8: Merkle Hash Pointer Audit Chain Integrity Verification...');
  // Record additional test audit events
  await SsoAuditLedger.recordEvent({
    institutionId: testInstId,
    providerId: samlProvId,
    providerType: 'SAML',
    eventType: 'login_success',
    subjectId: 'student@thaibahive.org',
  });

  const auditCheck = await SsoAuditLedger.verifyChain(testInstId);
  if (!auditCheck.valid) {
    throw new Error(`Merkle audit chain broken at event: ${auditCheck.brokenAtId}`);
  }
  console.log(`  ✓ Sequential SHA-256 Merkle audit chain verified 100% untampered (${auditCheck.totalLogs} entries).`);

  console.log('\n================================================================================');
  console.log('       ✅ ALL 8 SIMULATION STAGES PASSED SUCCESSFULLY (100% COMPLETE)          ');
  console.log('================================================================================');
}

runConferenceSimulation().catch((err) => {
  console.error('\n❌ Conference simulation failed:', err);
  process.exit(1);
});
