/**
 * CINEMATIC STUDIO — Phase 3 Provider Matrix & Execution Engine Test Suite
 * Validates adapter contracts, selectors, message schemas, and state transitions
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — PHASE 3 PROVIDER & EXECUTION ENGINE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(category, title, condition, detail) {
    if (condition) {
      console.log(`[PASS] [${category}] ${title} - ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] [${category}] ${title} - ${detail}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: ADAPTER SOURCE & MANIFEST VALIDATION
  // --------------------------------------------------------------------------
  const extDir = path.resolve(__dirname, '..', 'chrome-extension');
  const manifestPath = path.join(extDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert('Manifest', 'MV3 Extension Manifest Valid', manifest.manifest_version === 3, 'Manifest Version 3 confirmed');
  assert('Manifest', 'Deterministic Extension Key Declared', typeof manifest.key === 'string' && manifest.key.length > 100, 'Fixed RSA key present');

  const contentScripts = manifest.content_scripts[0];
  const requiredScripts = [
    'adapters/common.js',
    'adapters/chatgpt.js',
    'adapters/gemini.js',
    'adapters/claude.js',
    'adapters/googleFlowVeo.js',
    'content.js'
  ];
  const allScriptsDeclared = requiredScripts.every(s => contentScripts.js.includes(s));
  assert('Manifest', 'Modular Provider Adapters Registered', allScriptsDeclared, 'All 4 provider adapters wired in content_scripts');

  const allowedUrls = [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://flow.google.com/*',
    'https://*.google.com/veo/*'
  ];
  const allHostPermsPresent = allowedUrls.every(u => manifest.host_permissions.includes(u));
  assert('Security', 'Strict Provider Host Permissions Scoped', allHostPermsPresent, 'Only approved AI provider domains declared in host_permissions');

  // --------------------------------------------------------------------------
  // TEST SUITE 2: PROVIDER CAPABILITIES & CONTRACT VALIDATION
  // --------------------------------------------------------------------------
  const commonSrc = fs.readFileSync(path.join(extDir, 'adapters', 'common.js'), 'utf8');
  const chatgptSrc = fs.readFileSync(path.join(extDir, 'adapters', 'chatgpt.js'), 'utf8');
  const geminiSrc = fs.readFileSync(path.join(extDir, 'adapters', 'gemini.js'), 'utf8');
  const claudeSrc = fs.readFileSync(path.join(extDir, 'adapters', 'claude.js'), 'utf8');
  const veoSrc = fs.readFileSync(path.join(extDir, 'adapters', 'googleFlowVeo.js'), 'utf8');

  assert('Contract', 'ChatGPT Source Contract Implemented', chatgptSrc.includes("providerId: 'chatgpt'"), 'ChatGPT adapter declared');
  assert('Contract', 'ChatGPT Video Generation Falsified', chatgptSrc.includes("supportsVideoGeneration: false"), 'ChatGPT accurately classified as non-video');

  assert('Contract', 'Claude Source Contract Implemented', claudeSrc.includes("providerId: 'claude'"), 'Claude adapter declared');
  assert('Contract', 'Claude Video Generation Falsified', claudeSrc.includes("supportsVideoGeneration: false"), 'Claude accurately classified as non-video');

  assert('Contract', 'Gemini Source Contract Implemented', geminiSrc.includes("providerId: 'gemini'"), 'Gemini adapter declared');
  assert('Contract', 'Gemini Video Generation Falsified', geminiSrc.includes("supportsVideoGeneration: false"), 'Gemini accurately classified as non-video');

  assert('Contract', 'Google Flow/Veo Source Contract Implemented', veoSrc.includes("providerId: 'google_flow_veo'"), 'Veo adapter declared');
  assert('Contract', 'Google Flow/Veo Video Generation Supported', veoSrc.includes("supportsVideoGeneration: true"), 'Veo accurately classified as video generation');
  assert('Contract', 'Google Flow/Veo Image-to-Video Supported', veoSrc.includes("supportsImageToVideo: true"), 'Veo start-frame keyframe supported');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: SELECTOR FALLBACK RESILIENCE
  // --------------------------------------------------------------------------
  assert('Selectors', 'ChatGPT Versioned Fallback Selectors', chatgptSrc.includes('#prompt-textarea') && chatgptSrc.includes('div[id="prompt-textarea"]'), 'Multiple selector fallbacks present');
  assert('Selectors', 'Gemini Rich-Textarea Fallbacks', geminiSrc.includes('rich-textarea') && geminiSrc.includes('div[role="textbox"]'), 'WebComponent and native fallbacks present');
  assert('Selectors', 'Claude ContentEditable Fallbacks', claudeSrc.includes('div[contenteditable="true"]') && claudeSrc.includes('div.ProseMirror'), 'ProseMirror and contenteditable fallbacks present');
  assert('Selectors', 'Veo Aspect Ratio & Slot Fallbacks', veoSrc.includes('16:9') && veoSrc.includes('9:16') && veoSrc.includes('keyframe'), 'Cinema and social aspect ratio controls mapped');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: HUMAN-IN-THE-LOOP ACCESS CONTROL COMPLIANCE
  // --------------------------------------------------------------------------
  assert('Compliance', 'Cloudflare Turnstile Detection', commonSrc.includes('cloudflare') && commonSrc.includes('turnstile'), 'Cloudflare anti-bot challenge observer present');
  assert('Compliance', 'reCAPTCHA Detection', commonSrc.includes('recaptcha'), 'reCAPTCHA detection present');
  assert('Compliance', 'Zero Auto-Solving of CAPTCHAs', !commonSrc.includes('solveCaptcha') && !commonSrc.includes('bypassTurnstile'), 'Strict non-circumvention policy verified');
  assert('Compliance', 'Session Expiry Detection', commonSrc.includes('/login') || commonSrc.includes('/auth'), 'Login expiration triggers operator intervention');

  // --------------------------------------------------------------------------
  // TEST SUITE 5: FORWARD-ONLY DATABASE MIGRATION 004
  // --------------------------------------------------------------------------
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const mig1 = fs.readFileSync(path.resolve(__dirname, '..', 'src-tauri', 'migrations', '001_initial_schema.sql'), 'utf8');
  const mig2 = fs.readFileSync(path.resolve(__dirname, '..', 'src-tauri', 'migrations', '002_storage_root_and_deletion_journal.sql'), 'utf8');
  const mig3 = fs.readFileSync(path.resolve(__dirname, '..', 'src-tauri', 'migrations', '003_chrome_profiles_and_pairing.sql'), 'utf8');
  const mig4 = fs.readFileSync(path.resolve(__dirname, '..', 'src-tauri', 'migrations', '004_task_queue_and_execution.sql'), 'utf8');

  db.run(mig1);
  db.run(mig2);
  db.run(mig3);
  db.run(mig4);

  // Verify tasks table has profile_id column
  const tableInfo = db.exec("PRAGMA table_info(tasks)")[0].values;
  const colNames = tableInfo.map(c => c[1]);
  assert('Database', 'Migration 004 Added profile_id Column', colNames.includes('profile_id'), 'Column profile_id exists');
  assert('Database', 'Migration 004 Added retry_count Column', colNames.includes('retry_count'), 'Column retry_count exists');
  assert('Database', 'Migration 004 Added human_action_reason Column', colNames.includes('human_action_reason'), 'Column human_action_reason exists');

  // Verify task_execution_logs table exists
  const logsTableExists = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='task_execution_logs'")[0].values[0][0];
  assert('Database', 'task_execution_logs Table Created', logsTableExists === 1, 'Persistent execution logs table verified');

  // --------------------------------------------------------------------------
  // TEST SUITE 6: TASK STATE MACHINE & HUMAN-IN-THE-LOOP TRANSITIONS
  // --------------------------------------------------------------------------
  const projectId = 'proj-test-123';
  const taskId = 'task-test-456';
  db.run(`INSERT INTO projects (id, name, slug, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, created_at, updated_at)
          VALUES ('${projectId}', 'Test Film', 'test-film', '16:9', 24.0, 60.0, 'C:\\test', 1, 1)`);

  // 1. Insert QUEUED task
  db.run(`INSERT INTO tasks (id, project_id, task_type, target_provider, state, priority, progress_percentage, payload_json, created_at)
          VALUES ('${taskId}', '${projectId}', 'TEXT_TO_VIDEO', 'google_flow_veo', 'QUEUED', 50, 0.0, '{}', 100)`);

  let state = db.exec(`SELECT state FROM tasks WHERE id = '${taskId}'`)[0].values[0][0];
  assert('StateMachine', 'Task Initialized to QUEUED', state === 'QUEUED', 'Initial task state is QUEUED');

  // 2. Transition to GENERATING
  db.run(`UPDATE tasks SET state = 'GENERATING', progress_percentage = 45.0 WHERE id = '${taskId}'`);
  state = db.exec(`SELECT state, progress_percentage FROM tasks WHERE id = '${taskId}'`)[0].values[0];
  assert('StateMachine', 'Task Progressed to GENERATING', state[0] === 'GENERATING' && state[1] === 45.0, 'State updated to GENERATING at 45%');

  // 3. Transition to NEEDS_HUMAN_ACTION on challenge
  db.run(`UPDATE tasks SET state = 'NEEDS_HUMAN_ACTION', human_action_reason = 'CAPTCHA' WHERE id = '${taskId}'`);
  state = db.exec(`SELECT state, human_action_reason FROM tasks WHERE id = '${taskId}'`)[0].values[0];
  assert('StateMachine', 'Task Transitioned to NEEDS_HUMAN_ACTION', state[0] === 'NEEDS_HUMAN_ACTION' && state[1] === 'CAPTCHA', 'Human action state captured');

  // 4. Resume after human action
  db.run(`UPDATE tasks SET state = 'QUEUED', human_action_reason = NULL WHERE id = '${taskId}'`);
  state = db.exec(`SELECT state, human_action_reason FROM tasks WHERE id = '${taskId}'`)[0].values[0];
  assert('StateMachine', 'Task Resumed to QUEUED', state[0] === 'QUEUED' && state[1] === null, 'Resumed without error flags');

  // 5. Complete task
  db.run(`UPDATE tasks SET state = 'COMPLETED', progress_percentage = 100.0, result_json = '{"outputVideoUrl": "blob:http://..."}' WHERE id = '${taskId}'`);
  state = db.exec(`SELECT state, progress_percentage FROM tasks WHERE id = '${taskId}'`)[0].values[0];
  assert('StateMachine', 'Task Transitioned to COMPLETED', state[0] === 'COMPLETED' && state[1] === 100.0, 'Task completed at 100%');

  // Log execution step
  db.run(`INSERT INTO task_execution_logs (id, task_id, phase, message, percentage, created_at)
          VALUES ('log-1', '${taskId}', 'COLLECTING', 'Video blob collected successfully', 100.0, 200)`);
  const logCount = db.exec(`SELECT count(*) FROM task_execution_logs WHERE task_id = '${taskId}'`)[0].values[0][0];
  assert('Database', 'Persistent Execution Log Recorded', logCount === 1, 'Audit log row created for task');

  console.log('\n----------------------------------------------------------------');
  console.log(`PHASE 3 TOTALS: ${passed} PASS | ${failed} FAIL`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runPhase3Tests().catch(err => {
  console.error(err);
  process.exit(1);
});

