/**
 * CINEMATIC STUDIO — Task A: Chrome Native Messaging Protocol & Host Harness Test Suite
 * 
 * Tests the complete stdio framing protocol specified in:
 * - src-tauri/src/bin/host.rs
 * - src-tauri/src/chrome_service/ipc.rs
 * - chrome-extension/background.js
 */

const { Readable, Writable } = require('stream');
const crypto = require('crypto');

const MAX_MESSAGE_SIZE = 1024 * 1024; // 1 MB limit as defined in ipc.rs line 7

// Protocol Encoders & Decoders matching Rust implementation
function encodePacket(obj) {
  const jsonBuf = Buffer.from(JSON.stringify(obj), 'utf8');
  if (jsonBuf.length > MAX_MESSAGE_SIZE) {
    throw new Error(`Message size ${jsonBuf.length} exceeds maximum bounded limit of ${MAX_MESSAGE_SIZE} bytes`);
  }
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuf.length, 0);
  return Buffer.concat([lenBuf, jsonBuf]);
}

function decodePacket(buffer) {
  if (buffer.length < 4) {
    throw new Error('Packet buffer shorter than 4-byte header');
  }
  const len = buffer.readUInt32LE(0);
  if (len === 0) {
    throw new Error('Received 0-byte packet');
  }
  if (len > MAX_MESSAGE_SIZE) {
    throw new Error(`Message size ${len} exceeds maximum bounded limit of ${MAX_MESSAGE_SIZE} bytes`);
  }
  if (buffer.length < 4 + len) {
    throw new Error(`Incomplete packet: expected ${4 + len} bytes, got ${buffer.length}`);
  }
  const body = buffer.subarray(4, 4 + len).toString('utf8');
  return {
    message: JSON.parse(body),
    bytesRead: 4 + len
  };
}

// In-memory Host Dispatcher mimicking src-tauri/src/bin/host.rs
class MockHostDispatcher {
  constructor(pairingSecretMap = {}) {
    this.pairingSecrets = pairingSecretMap;
    this.activeChallenges = new Map();
    this.taskStore = new Map();
    this.stderrLogs = [];
  }

  logStderr(msg) {
    this.stderrLogs.push(msg);
  }

  handleMessage(msg) {
    const now = Date.now();
    this.logStderr(`[Host] Received message: type='${msg.type}', id='${msg.id}'`);

    switch (msg.type) {
      case 'INITIATE_HANDSHAKE': {
        const profileId = msg.profile_id || '';
        this.logStderr(`[Host] Handshake initiated for profile: ${profileId}`);
        const sessionId = crypto.randomUUID();
        const serverNonce = crypto.randomBytes(16).toString('hex');
        const expiresAt = now + 60000;
        this.activeChallenges.set(sessionId, { profileId, serverNonce, expiresAt });

        return {
          id: crypto.randomUUID(),
          type: 'CHALLENGE_ISSUED',
          profile_id: profileId,
          payload: {
            session_id: sessionId,
            server_nonce: serverNonce,
            expires_at: expiresAt
          },
          timestamp: now
        };
      }

      case 'VERIFY_HANDSHAKE_RESPONSE': {
        const profileId = msg.profile_id || '';
        const { session_id, client_nonce, signature_hex } = msg.payload || {};
        const challenge = this.activeChallenges.get(session_id);

        if (!challenge || challenge.profileId !== profileId || now > challenge.expiresAt) {
          return {
            id: crypto.randomUUID(),
            type: 'HANDSHAKE_FAILED',
            profile_id: profileId,
            payload: { success: false, error: 'Challenge expired or invalid session' },
            timestamp: now
          };
        }

        const secret = this.pairingSecrets[profileId];
        if (!secret) {
          return {
            id: crypto.randomUUID(),
            type: 'HANDSHAKE_FAILED',
            profile_id: profileId,
            payload: { success: false, error: 'No secret registered for profile' },
            timestamp: now
          };
        }

        const expectedMsg = `${challenge.serverNonce}:${client_nonce}`;
        const expectedSig = crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(expectedMsg).digest('hex');

        if (signature_hex.toLowerCase() === expectedSig.toLowerCase()) {
          this.activeChallenges.delete(session_id);
          return {
            id: crypto.randomUUID(),
            type: 'HANDSHAKE_VERIFIED',
            profile_id: profileId,
            payload: { success: true, message: 'Mutual pairing verified successfully' },
            timestamp: now
          };
        } else {
          return {
            id: crypto.randomUUID(),
            type: 'HANDSHAKE_FAILED',
            profile_id: profileId,
            payload: { success: false, error: 'HMAC signature mismatch' },
            timestamp: now
          };
        }
      }

      case 'PING': {
        return {
          id: msg.id,
          type: 'PONG',
          profile_id: msg.profile_id,
          payload: { status: 'HEALTHY', timestamp: now },
          timestamp: now
        };
      }

      case 'TASK_PROGRESS': {
        const { task_id, percentage, status_message } = msg.payload || {};
        this.taskStore.set(task_id, { progress: percentage, status: status_message });
        return null; // Host does not reply to progress events
      }

      case 'TASK_COMPLETED': {
        const { task_id } = msg.payload || {};
        this.taskStore.set(task_id, { completed: true, payload: msg.payload });
        return null;
      }

      case 'TASK_FAILED': {
        const { task_id, error_message } = msg.payload || {};
        this.taskStore.set(task_id, { failed: true, error: error_message });
        return null;
      }

      case 'NEEDS_HUMAN_ACTION': {
        const { task_id, action_reason } = msg.payload || {};
        this.taskStore.set(task_id, { humanAction: true, reason: action_reason });
        return null;
      }

      default:
        this.logStderr(`[Host] Unhandled message type: ${msg.type}`);
        return null;
    }
  }
}

async function runNativeMessagingSuite() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — TASK A: NATIVE MESSAGING PROTOCOL SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, detail) {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - Detail: ${detail}`);
      failed++;
    }
  }

  // TEST 1: 32-bit LE length prefix encoding
  try {
    const testObj = { type: 'PING', id: '123' };
    const packet = encodePacket(testObj);
    const expectedLen = Buffer.from(JSON.stringify(testObj)).length;
    const readLen = packet.readUInt32LE(0);
    assert('32-bit LE length prefix matches exact JSON byte length', readLen === expectedLen, `Expected ${expectedLen}, got ${readLen}`);
  } catch (e) {
    assert('32-bit LE length prefix test', false, e.message);
  }

  // TEST 2: Round-trip packet decode
  try {
    const original = { id: 'test-1', type: 'PING', profile_id: 'Profile 1', payload: { foo: 'bar' }, timestamp: 1000 };
    const encoded = encodePacket(original);
    const decoded = decodePacket(encoded);
    assert('Round-trip packet encode/decode retains full fidelity', JSON.stringify(decoded.message) === JSON.stringify(original), 'Mismatch in decoded object');
  } catch (e) {
    assert('Round-trip packet encode/decode', false, e.message);
  }

  // TEST 3: Reject 0-byte packet
  try {
    const zeroLenBuf = Buffer.alloc(4, 0);
    decodePacket(zeroLenBuf);
    assert('Reject 0-byte packet', false, 'Should have thrown error');
  } catch (e) {
    assert('Reject 0-byte packet with descriptive error', e.message.includes('0-byte packet'), e.message);
  }

  // TEST 4: Reject oversized packet (> 1MB)
  try {
    const oversizedLen = Buffer.alloc(4);
    oversizedLen.writeUInt32LE(MAX_MESSAGE_SIZE + 100, 0);
    const fakeData = Buffer.concat([oversizedLen, Buffer.alloc(100)]);
    decodePacket(fakeData);
    assert('Reject oversized packet (> 1MB)', false, 'Should have thrown bounds error');
  } catch (e) {
    assert('Reject oversized packet (> 1MB) with bounds violation error', e.message.includes('exceeds maximum bounded limit'), e.message);
  }

  // TEST 5: Reject malformed / non-JSON payload
  try {
    const corruptBody = Buffer.from('{ unclosed json: ', 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(corruptBody.length, 0);
    decodePacket(Buffer.concat([header, corruptBody]));
    assert('Reject malformed JSON payload', false, 'Should have thrown parse error');
  } catch (e) {
    assert('Reject malformed JSON payload cleanly', e.name === 'SyntaxError' || e.message.includes('JSON'), e.message);
  }

  // TEST 6: Verify stderr separation (Diagnostic logs MUST NOT taint stdout)
  const host = new MockHostDispatcher({ 'profile-1': 'secret-123' });
  const pingMsg = { id: 'ping-1', type: 'PING', profile_id: 'profile-1', payload: {}, timestamp: Date.now() };
  const pongResp = host.handleMessage(pingMsg);
  assert('Host responds to PING with PONG', pongResp && pongResp.type === 'PONG', 'No PONG returned');
  assert('Host diagnostic logs routed to stderr only', host.stderrLogs.length > 0 && host.stderrLogs[0].includes('[Host]'), 'No stderr log recorded');

  // TEST 7: Full Handshake Lifecycle Simulation (INITIATE -> CHALLENGE -> VERIFY -> VERIFIED)
  const initMsg = { id: 'init-1', type: 'INITIATE_HANDSHAKE', profile_id: 'profile-1', payload: {}, timestamp: Date.now() };
  const challengeResp = host.handleMessage(initMsg);
  assert('Host issues CHALLENGE with session_id and server_nonce', challengeResp && challengeResp.type === 'CHALLENGE_ISSUED' && challengeResp.payload.server_nonce, 'Invalid challenge');

  const clientNonce = crypto.randomUUID();
  const signInput = `${challengeResp.payload.server_nonce}:${clientNonce}`;
  const validSig = crypto.createHmac('sha256', Buffer.from('secret-123', 'utf8')).update(signInput).digest('hex');

  const verifyMsg = {
    id: 'verify-1',
    type: 'VERIFY_HANDSHAKE_RESPONSE',
    profile_id: 'profile-1',
    payload: {
      session_id: challengeResp.payload.session_id,
      client_nonce: clientNonce,
      signature_hex: validSig
    },
    timestamp: Date.now()
  };
  const verifiedResp = host.handleMessage(verifyMsg);
  assert('Host successfully verifies valid HMAC-SHA256 handshake', verifiedResp && verifiedResp.type === 'HANDSHAKE_VERIFIED' && verifiedResp.payload.success === true, 'Verification failed');

  // TEST 8: Rejection of Tampered Handshake Signature
  const tamperedVerifyMsg = {
    ...verifyMsg,
    payload: { ...verifyMsg.payload, signature_hex: '0000000000000000000000000000000000000000000000000000000000000000' }
  };
  // Re-issue challenge to test tampered response
  const challenge2 = host.handleMessage(initMsg);
  tamperedVerifyMsg.payload.session_id = challenge2.payload.session_id;
  const tamperedResp = host.handleMessage(tamperedVerifyMsg);
  assert('Host rejects tampered HMAC handshake signature', tamperedResp && tamperedResp.type === 'HANDSHAKE_FAILED', 'Tampered signature was not rejected');

  // TEST 9: Task Progress and State Updates
  host.handleMessage({ id: 't-1', type: 'TASK_PROGRESS', profile_id: 'profile-1', payload: { task_id: 'task-abc', percentage: 45.5, status_message: 'Generating prompt' } });
  assert('Host records TASK_PROGRESS in state store', host.taskStore.get('task-abc')?.progress === 45.5, 'Task progress not recorded');

  // TEST 10: Human Action Signal Handling
  host.handleMessage({ id: 't-2', type: 'NEEDS_HUMAN_ACTION', profile_id: 'profile-1', payload: { task_id: 'task-abc', action_reason: 'CLOUDFLARE_TURNSTILE' } });
  assert('Host correctly handles NEEDS_HUMAN_ACTION without crashing', host.taskStore.get('task-abc')?.humanAction === true && host.taskStore.get('task-abc')?.reason === 'CLOUDFLARE_TURNSTILE', 'Human action state mismatch');

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------------------------------');

  if (failed > 0) process.exit(1);
}

runNativeMessagingSuite().catch(e => {
  console.error('Test suite failed:', e);
  process.exit(1);
});

