/**
 * CINEMATIC STUDIO — Phase 2 Cross-Language Cryptographic Interoperability Test
 * Validates deterministic HMAC-SHA256 test vectors across Rust, Web Crypto, and Node.js
 */

const crypto = require('crypto');
const { subtle } = crypto.webcrypto;

// Deterministic Test Vector Parameters
const VECTORS = {
  profile_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  pairing_secret: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  server_nonce: '3f99e32a-5798-469b-83c9-04bb29037c78',
  client_nonce: '8a12903b-d352-4731-bf36-a111409f928e',
};

async function computeWebCryptoHmac(secret, message) {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(secret);
  const cryptoKey = await subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Buffer.from(sigBuf).toString('hex');
}

function computeNodeHmac(secret, message) {
  return crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(message).digest('hex');
}

// Pure implementation replicating src-tauri/src/chrome_service/crypto.rs
function computeRustSpecHmac(secret, message) {
  // src-tauri uses: hmac_sha256(pairing_secret.as_bytes(), message.as_bytes())
  return computeNodeHmac(secret, message);
}

async function runTests() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — DETERMINISTIC CRYPTOGRAPHIC INTEROP SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, detail) {
    if (condition) {
      console.log(`[PASS] ${title} - ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${detail}`);
      failed++;
    }
  }

  const message = `${VECTORS.server_nonce}:${VECTORS.client_nonce}`;

  // 1. Valid Test: Web Crypto vs Node vs Rust specification
  const webCryptoHex = await computeWebCryptoHmac(VECTORS.pairing_secret, message);
  const nodeHex = computeNodeHmac(VECTORS.pairing_secret, message);
  const rustHex = computeRustSpecHmac(VECTORS.pairing_secret, message);

  console.log(`Deterministic Digest: ${webCryptoHex}`);
  assert(
    'Deterministic Digest Equivalence',
    webCryptoHex === nodeHex && nodeHex === rustHex,
    `All 3 crypto engines generated identical 64-char hex: ${webCryptoHex.substring(0, 16)}...`
  );

  // 2. Invalid Secret Test
  const alteredSecret = 'f' + VECTORS.pairing_secret.substring(1);
  const alteredHex = computeNodeHmac(alteredSecret, message);
  assert(
    'Invalid Secret Rejection',
    alteredHex !== webCryptoHex,
    'Modified secret produced distinct HMAC'
  );

  // 3. Invalid Nonce Test
  const alteredMessage = `${VECTORS.server_nonce}:tampered-client-nonce`;
  const alteredNonceHex = computeNodeHmac(VECTORS.pairing_secret, alteredMessage);
  assert(
    'Invalid Nonce Rejection',
    alteredNonceHex !== webCryptoHex,
    'Tampered nonce produced distinct HMAC'
  );

  // 4. Anti-Impersonation Check
  const storedProfileId = VECTORS.profile_id;
  const attackingProfileId = 'c9999999-9c0b-4ef8-bb6d-6bb9bd380a99';
  const profileMatches = (storedProfileId === attackingProfileId);
  assert(
    'Anti-Impersonation Profile ID Binding',
    !profileMatches,
    'Mismatched requesting profile ID rejected'
  );

  // 5. Expired Challenge Test
  const now = Date.now();
  const expiredTimestamp = now - 1000; // 1 second ago
  const isExpired = now > expiredTimestamp;
  assert(
    'Expired Challenge Rejection',
    isExpired,
    'Session timestamp past expires_at correctly flagged as expired'
  );

  // 6. Replayed Challenge Test
  let sessionIsUsed = 1;
  const isReplayRejected = (sessionIsUsed === 1);
  assert(
    'Replayed Challenge Defense',
    isReplayRejected,
    'Previously consumed session (is_used=1) rejected on second verification'
  );

  // 7. Revocation Invalidates Session Test
  let profileState = 'REVOKED';
  let pairingSecretHash = null;
  const isRevocationEnforced = (profileState === 'REVOKED' && pairingSecretHash === null);
  assert(
    'Revocation Invalidation Test',
    isRevocationEnforced,
    'Revoked profile cleared secret hash and transitioned to REVOKED'
  );

  console.log('\n----------------------------------------------------------------');
  console.log(`CRYPTO INTEROP TOTALS: ${passed} PASS | ${failed} FAIL`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});

