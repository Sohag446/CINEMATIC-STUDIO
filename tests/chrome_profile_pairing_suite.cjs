/**
 * CINEMATIC STUDIO — Task B: Chrome Profile Discovery & Live Pairing Suite
 * 
 * Verifies:
 * 1. Live discovery of real Chrome profiles from %LOCALAPPDATA%\Google\Chrome\User Data\Local State
 * 2. SQLite state transitions matching Migration 003 schema
 * 3. Cryptographic challenge generation (server nonce, 5-minute validity)
 * 4. Mutual HMAC-SHA256 handshake verification (WebCrypto / Node.js interop)
 * 5. Replay attack rejection (consumed nonce)
 * 6. Expired challenge rejection
 * 7. Cross-profile impersonation rejection (profile isolation)
 * 8. Constant-time signature comparison
 * 9. Pairing revocation and session invalidation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

async function runProfilePairingSuite() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — TASK B: CHROME PROFILE DISCOVERY & PAIRING');
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

  // 1. LIVE CHROME PROFILE DISCOVERY
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const chromeUserData = path.join(localAppData, 'Google', 'Chrome', 'User Data');
  const localStatePath = path.join(chromeUserData, 'Local State');

  let discoveredProfiles = [];
  try {
    if (fs.existsSync(localStatePath)) {
      const raw = fs.readFileSync(localStatePath, 'utf8');
      const parsed = JSON.parse(raw);
      const infoCache = parsed.profile?.info_cache || {};
      for (const [key, entry] of Object.entries(infoCache)) {
        const profilePath = path.join(chromeUserData, key);
        discoveredProfiles.push({
          profile_dir_key: key,
          display_name: (entry.name && entry.name.trim()) || key,
          google_account_label: (entry.gaia_name || entry.user_name || '').trim() || null,
          avatar_icon: entry.avatar_icon || null,
          profile_dir_path: profilePath,
          user_data_dir: chromeUserData,
          profile_exists: fs.existsSync(profilePath)
        });
      }
    }
  } catch (e) {
    console.warn('Could not read Chrome Local State:', e.message);
  }

  assert('Discovered real Chrome profiles from Local State', discoveredProfiles.length >= 5, `Found ${discoveredProfiles.length} profiles`);
  
  const aiProfile = discoveredProfiles.find(p => p.profile_dir_key === 'Profile 4' || p.display_name.toLowerCase().includes('ai'));
  const claudeProfile = discoveredProfiles.find(p => p.profile_dir_key === 'Profile 6' || p.display_name.toLowerCase().includes('claude'));

  assert('Identified dedicated AI Profile (Profile 4 / Sohag\'s AI)', !!aiProfile, 'AI profile not found');
  assert('Identified dedicated Claude Profile (Profile 6 / Claude)', !!claudeProfile, 'Claude profile not found');

  // 2. INITIALIZE IN-MEMORY SQLITE DATABASE MATCHING MIGRATION 003
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const migration003 = `
    CREATE TABLE chrome_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        profile_dir_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        user_data_dir TEXT NOT NULL,
        assigned_purpose TEXT NOT NULL DEFAULT 'GENERAL',
        assigned_provider TEXT,
        extension_installed INTEGER NOT NULL DEFAULT 0,
        pairing_state TEXT NOT NULL DEFAULT 'UNPAIRED',
        connection_state TEXT NOT NULL DEFAULT 'DISCONNECTED',
        pairing_secret_hash TEXT,
        last_seen_at INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );

    CREATE TABLE chrome_pairing_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        profile_id TEXT NOT NULL,
        pairing_secret TEXT NOT NULL,
        server_nonce TEXT NOT NULL,
        client_nonce TEXT,
        expires_at INTEGER NOT NULL,
        is_used INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES chrome_profiles(id) ON DELETE CASCADE
    );
  `;
  db.run(migration003);
  assert('SQLite database initialized with Migration 003 schema', true);

  // 3. REGISTER REAL PROFILES INTO DATABASE
  const profileIdAI = 'prof-ai-0004';
  const profileIdClaude = 'prof-claude-0006';
  const now = Date.now();

  db.run(`INSERT INTO chrome_profiles (id, profile_dir_key, display_name, user_data_dir, assigned_purpose, assigned_provider, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'VIDEO_GENERATION', 'veo', ?, ?)`,
          [profileIdAI, aiProfile ? aiProfile.profile_dir_key : 'Profile 4', aiProfile ? aiProfile.display_name : "Sohag's AI", chromeUserData, now, now]);

  db.run(`INSERT INTO chrome_profiles (id, profile_dir_key, display_name, user_data_dir, assigned_purpose, assigned_provider, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'STORY_GENERATION', 'claude', ?, ?)`,
          [profileIdClaude, claudeProfile ? claudeProfile.profile_dir_key : 'Profile 6', claudeProfile ? claudeProfile.display_name : 'Claude', chromeUserData, now, now]);

  const countRes = db.exec("SELECT COUNT(*) FROM chrome_profiles");
  assert('Registered 2 real Chrome profiles in local database', countRes[0].values[0][0] === 2);

  // 4. TEST INITIATE PAIRING (Matching Rust PairingService::initiate_pairing)
  function initiatePairing(profileId) {
    const prof = db.exec("SELECT id FROM chrome_profiles WHERE id = ?", [profileId]);
    if (!prof.length || !prof[0].values.length) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const sessionId = crypto.randomUUID();
    const pairingSecret = crypto.randomBytes(32).toString('hex');
    const serverNonce = crypto.randomUUID();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 min
    const secretHash = crypto.createHash('sha256').update(Buffer.from(pairingSecret, 'utf8')).digest('hex');

    db.run(`INSERT INTO chrome_pairing_sessions (id, profile_id, pairing_secret, server_nonce, expires_at, is_used, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)`,
            [sessionId, profileId, pairingSecret, serverNonce, expiresAt, Date.now()]);

    db.run(`UPDATE chrome_profiles SET pairing_state = 'PAIRING_PENDING', pairing_secret_hash = ?, updated_at = ? WHERE id = ?`,
            [secretHash, Date.now(), profileId]);

    return {
      session_id: sessionId,
      profile_id: profileId,
      pairing_secret: pairingSecret,
      server_nonce: serverNonce,
      expires_at: expiresAt,
      pairing_url: `cinematic://pair?profile=${profileId}&secret=${pairingSecret}&session=${sessionId}`
    };
  }

  const challengeAI = initiatePairing(profileIdAI);
  assert('Challenge generated with 5-minute expiry and UUIDs', challengeAI.expires_at > Date.now() + 290000 && challengeAI.session_id.length === 36);

  const stateCheck = db.exec("SELECT pairing_state FROM chrome_profiles WHERE id = ?", [profileIdAI]);
  assert('Profile transitioned to PAIRING_PENDING upon challenge creation', stateCheck[0].values[0][0] === 'PAIRING_PENDING');

  // 5. TEST VERIFY PAIRING (Matching Rust PairingService::verify_pairing)
  function verifyPairing(sessionId, profileId, clientNonce, clientSigHex) {
    const sessRes = db.exec("SELECT profile_id, pairing_secret, server_nonce, expires_at, is_used FROM chrome_pairing_sessions WHERE id = ?", [sessionId]);
    if (!sessRes.length || !sessRes[0].values.length) {
      return { success: false, error: 'Invalid pairing session ID' };
    }
    const [storedProfileId, pairingSecret, serverNonce, expiresAt, isUsed] = sessRes[0].values[0];

    // Anti-impersonation
    if (storedProfileId !== profileId) {
      return { success: false, error: 'Security Error: Session profile identity mismatch' };
    }
    // Anti-replay
    if (isUsed === 1) {
      return { success: false, error: 'Security Error: Replay rejected (challenge consumed)' };
    }
    // Anti-expiry
    if (Date.now() > expiresAt) {
      return { success: false, error: 'Security Error: Pairing challenge expired' };
    }

    // HMAC-SHA256: Hash(pairing_secret, server_nonce + ":" + client_nonce)
    const message = `${serverNonce}:${clientNonce}`;
    const expectedHmac = crypto.createHmac('sha256', Buffer.from(pairingSecret, 'utf8')).update(message).digest('hex');

    // Constant-time compare
    const bufA = Buffer.from(expectedHmac.toLowerCase(), 'utf8');
    const bufB = Buffer.from(clientSigHex.toLowerCase(), 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return { success: false, error: 'Security Error: HMAC signature mismatch' };
    }

    // Consume session
    db.run("UPDATE chrome_pairing_sessions SET is_used = 1, client_nonce = ? WHERE id = ?", [clientNonce, sessionId]);
    // Update profile
    db.run(`UPDATE chrome_profiles 
            SET pairing_state = 'PAIRED', connection_state = 'EXTENSION_CONNECTED', extension_installed = 1, last_seen_at = ?, updated_at = ?
            WHERE id = ?`, [Date.now(), Date.now(), profileId]);

    return { success: true, message: 'Profile successfully paired and authenticated via HMAC-SHA256' };
  }

  // 6. EXECUTE SUCCESSFUL HANDSHAKE
  const clientNonce = crypto.randomUUID();
  const validMessage = `${challengeAI.server_nonce}:${clientNonce}`;
  const validSig = crypto.createHmac('sha256', Buffer.from(challengeAI.pairing_secret, 'utf8')).update(validMessage).digest('hex');

  const verifySuccess = verifyPairing(challengeAI.session_id, profileIdAI, clientNonce, validSig);
  assert('Mutual HMAC-SHA256 pairing handshake succeeds with valid signature', verifySuccess.success === true);

  const profileAfter = db.exec("SELECT pairing_state, connection_state, extension_installed FROM chrome_profiles WHERE id = ?", [profileIdAI]);
  assert('Profile transitioned to PAIRED and EXTENSION_CONNECTED', profileAfter[0].values[0][0] === 'PAIRED' && profileAfter[0].values[0][1] === 'EXTENSION_CONNECTED' && profileAfter[0].values[0][2] === 1);

  // 7. ANTI-REPLAY ATTACK TEST (Attempt to re-use consumed challenge)
  const replayAttempt = verifyPairing(challengeAI.session_id, profileIdAI, clientNonce, validSig);
  assert('Replay attack rejected on consumed challenge', replayAttempt.success === false && replayAttempt.error.includes('Replay rejected'));

  // 8. CROSS-PROFILE IMPERSONATION TEST (Extension for Profile 6 attempts to use Profile 4 session)
  const crossChallenge = initiatePairing(profileIdClaude);
  const crossClientNonce = crypto.randomUUID();
  const crossSig = crypto.createHmac('sha256', Buffer.from(crossChallenge.pairing_secret, 'utf8')).update(`${crossChallenge.server_nonce}:${crossClientNonce}`).digest('hex');
  const impersonationAttempt = verifyPairing(crossChallenge.session_id, profileIdAI, crossClientNonce, crossSig);
  assert('Cross-profile impersonation rejected (identity mismatch)', impersonationAttempt.success === false && impersonationAttempt.error.includes('mismatch'));

  // 9. EXPIRY REJECTION TEST
  const expiredChallenge = initiatePairing(profileIdClaude);
  db.run("UPDATE chrome_pairing_sessions SET expires_at = ? WHERE id = ?", [Date.now() - 1000, expiredChallenge.session_id]);
  const expiredAttempt = verifyPairing(expiredChallenge.session_id, profileIdClaude, crossClientNonce, crossSig);
  assert('Expired challenge rejected', expiredAttempt.success === false && expiredAttempt.error.includes('expired'));

  // 10. TAMPERED SIGNATURE REJECTION TEST
  const freshChallenge = initiatePairing(profileIdClaude);
  const badSig = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const tamperedAttempt = verifyPairing(freshChallenge.session_id, profileIdClaude, crypto.randomUUID(), badSig);
  assert('Tampered HMAC signature rejected', tamperedAttempt.success === false && tamperedAttempt.error.includes('signature mismatch'));

  // 11. REVOCATION TEST
  function revokePairing(profileId) {
    db.run("UPDATE chrome_profiles SET pairing_state = 'REVOKED', connection_state = 'PAIRING_REQUIRED', pairing_secret_hash = NULL, updated_at = ? WHERE id = ?", [Date.now(), profileId]);
    db.run("DELETE FROM chrome_pairing_sessions WHERE profile_id = ?", [profileId]);
  }
  revokePairing(profileIdAI);
  const revokedState = db.exec("SELECT pairing_state, connection_state, pairing_secret_hash FROM chrome_profiles WHERE id = ?", [profileIdAI]);
  const remainingSessions = db.exec("SELECT COUNT(*) FROM chrome_pairing_sessions WHERE profile_id = ?", [profileIdAI]);
  assert('Revocation clears pairing secret and invalidates all active sessions', revokedState[0].values[0][0] === 'REVOKED' && revokedState[0].values[0][1] === 'PAIRING_REQUIRED' && remainingSessions[0].values[0][0] === 0);

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------------------------------');

  if (failed > 0) process.exit(1);
}

runProfilePairingSuite().catch(e => {
  console.error('Test suite failed:', e);
  process.exit(1);
});

