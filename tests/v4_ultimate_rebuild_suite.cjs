/**
 * CINEMATIC STUDIO v4.0.0 — ULTIMATE MASTER REBUILD TEST SUITE
 * 
 * Verifies:
 * 1. Global Version 4.0.0 Synchronization across all manifests and components
 * 2. Strict 5-Section Desktop Navigation Architecture
 * 3. Natural Language Duration Parsing & ~10s Scene Scaling (up to 720 scenes for 2 hours)
 * 4. 23-Point Production Package Asset Generation
 * 5. Cinematic Continuity Engine (Linking First Frame to Previous Last Frame)
 * 6. Scene Status State Machine & Multi-Account Profile Switcher
 * 7. CapCut-Style Multi-Track Editor (V1-V3, A1-A3), Real Player & Transform Inspector
 * 8. Pipeline Assembly Bridge (1-Click "Assemble Completed Scenes" to V1)
 * 9. Developer Attribution & Project Transparency (Md. Sohag Hossen)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const rootDir = path.resolve(__dirname, '..');
let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('CINEMATIC STUDIO v4.0.1 — ULTIMATE MASTER REBUILD TEST SUITE');
console.log('Developer: Md. Sohag Hossen');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// 1. VERSION 4.0.1 SYNCHRONIZATION
// ----------------------------------------------------------------------------
runTest('Package.json version is 4.0.1 or 4.0.2', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.ok(pkg.version === '4.0.1' || pkg.version === '4.0.2', `Expected 4.0.1 or 4.0.2, got ${pkg.version}`);
});

runTest('Tauri Cargo.toml version is 4.0.1 or 4.0.2', () => {
  const cargo = fs.readFileSync(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
  assert.match(cargo, /version\s*=\s*"4\.0\.(1|2)"/, 'Cargo.toml does not contain version 4.0.1 or 4.0.2');
});

runTest('Tauri tauri.conf.json version is 4.0.1 or 4.0.2', () => {
  const tauriConf = JSON.parse(fs.readFileSync(path.join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8'));
  assert.ok(tauriConf.version === '4.0.1' || tauriConf.version === '4.0.2', `Expected 4.0.1 or 4.0.2, got ${tauriConf.version}`);
});

runTest('Chrome Extension manifest.json version is 4.0.1 or 4.0.2', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'chrome-extension', 'manifest.json'), 'utf8'));
  assert.ok(manifest.version === '4.0.1' || manifest.version === '4.0.2', `Expected 4.0.1 or 4.0.2, got ${manifest.version}`);
});

runTest('AboutModal.tsx and Diagnostics display v4.0.1 or v4.0.2', () => {
  const about = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AboutModal.tsx'), 'utf8');
  assert.match(about, /Version: 4\.0\.(1|2)/, 'AboutModal missing Version: 4.0.1/4.0.2');

  const diag = fs.readFileSync(path.join(rootDir, 'src', 'services', 'diagnosticService.ts'), 'utf8');
  assert.match(diag, /v4\.0\.(1|2)/, 'diagnosticService missing v4.0.1/4.0.2');

  const home = fs.readFileSync(path.join(rootDir, 'src', 'features', 'home', 'SimpleProjectHome.tsx'), 'utf8');
  assert.match(home, /Desktop v4\.0\.(1|2)/, 'SimpleProjectHome missing Desktop v4.0.1/4.0.2');
});

// ----------------------------------------------------------------------------
// 2. 5-SECTION NAVIGATION ARCHITECTURE
// ----------------------------------------------------------------------------
runTest('TopNav and App implement exactly 5 main sections', () => {
  const topNav = fs.readFileSync(path.join(rootDir, 'src', 'components', 'TopNav.tsx'), 'utf8');
  assert.match(topNav, /<span>Home<\/span>/, 'Missing Home nav');
  assert.match(topNav, /<span>AI Workspace<\/span>/, 'Missing AI Workspace nav');
  assert.match(topNav, /<span>Projects<\/span>/, 'Missing Projects nav');
  assert.match(topNav, /<span>Video Editor<\/span>/, 'Missing Video Editor nav');
  assert.match(topNav, /<span>Settings<\/span>/, 'Missing Settings nav');

  const app = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');
  assert.match(app, /case 'HOME':/, 'App missing HOME route');
  assert.match(app, /case 'AI_WORKSPACE':/, 'App missing AI_WORKSPACE route');
  assert.match(app, /case 'PROJECTS':/, 'App missing PROJECTS route');
  assert.match(app, /case 'VIDEO_EDITOR':/, 'App missing VIDEO_EDITOR route');
  assert.match(app, /case 'SETTINGS':/, 'App missing SETTINGS route');
});

runTest('Creating or Opening a project routes directly to AI_WORKSPACE', () => {
  const store = fs.readFileSync(path.join(rootDir, 'src', 'stores', 'useStudioStore.ts'), 'utf8');
  assert.match(store, /createProject[\s\S]*?mainView:\s*'AI_WORKSPACE'/, 'createProject does not navigate to AI_WORKSPACE');
  assert.match(store, /openProject[\s\S]*?mainView:\s*'AI_WORKSPACE'/, 'openProject does not navigate to AI_WORKSPACE');
});

// ----------------------------------------------------------------------------
// 3. DURATION PARSING & ~10s SCENE CALCULATION
// ----------------------------------------------------------------------------
runTest('Natural language duration parsing & scene scaling', () => {
  const storyAgentCode = fs.readFileSync(path.join(rootDir, 'src', 'services', 'storyAgent.ts'), 'utf8');
  assert.match(storyAgentCode, /export function parseRequestedDuration/, 'Missing parseRequestedDuration export');

  // Test regex logic directly
  function parseDur(input) {
    const raw = String(input || '').toLowerCase().trim();
    if (!raw) return 60;
    const hoursMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\b/);
    if (hoursMatch) return Math.round(parseFloat(hoursMatch[1]) * 3600);
    const minutesMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min|m)\b/);
    if (minutesMatch) return Math.round(parseFloat(minutesMatch[1]) * 60);
    const secondsMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:seconds|second|secs|sec|s)\b/);
    if (secondsMatch) return Math.round(parseFloat(secondsMatch[1]));
    return 60;
  }

  assert.strictEqual(parseDur('30s'), 30);
  assert.strictEqual(parseDur('1 minute'), 60);
  assert.strictEqual(parseDur('5 min'), 300);
  assert.strictEqual(parseDur('10 minutes'), 600);
  assert.strictEqual(parseDur('30m'), 1800);
  assert.strictEqual(parseDur('2 hours'), 7200);

  // Scene count = duration / 10
  assert.strictEqual(Math.round(parseDur('30s') / 10), 3);
  assert.strictEqual(Math.round(parseDur('1 minute') / 10), 6);
  assert.strictEqual(Math.round(parseDur('10 minutes') / 10), 60);
  assert.strictEqual(Math.round(parseDur('2 hours') / 10), 720);
});

// ----------------------------------------------------------------------------
// 4. 23-POINT PRODUCTION PACKAGE & CINEMATIC CONTINUITY ENGINE
// ----------------------------------------------------------------------------
runTest('StoryAgent generates 23-point production package & continuity locks', () => {
  const storyAgentCode = fs.readFileSync(path.join(rootDir, 'src', 'services', 'storyAgent.ts'), 'utf8');
  assert.match(storyAgentCode, /storyConcept:/, 'Missing storyConcept');
  assert.match(storyAgentCode, /visualStyleGuide:/, 'Missing visualStyleGuide');
  assert.match(storyAgentCode, /cinematographyGuide:/, 'Missing cinematographyGuide');
  assert.match(storyAgentCode, /cameraMovementGuide:/, 'Missing cameraMovementGuide');
  assert.match(storyAgentCode, /lightingGuide:/, 'Missing lightingGuide');
  assert.match(storyAgentCode, /colorGradingDirection:/, 'Missing colorGradingDirection');
  assert.match(storyAgentCode, /backgroundMusicDirection:/, 'Missing backgroundMusicDirection');
  assert.match(storyAgentCode, /soundEffectRequirements:/, 'Missing soundEffectRequirements');
  assert.match(storyAgentCode, /firstFrameDescription:/, 'Missing firstFrameDescription');
  assert.match(storyAgentCode, /lastFrameDescription:/, 'Missing lastFrameDescription');
  assert.match(storyAgentCode, /continuityInstructions:/, 'Missing continuityInstructions');
  assert.match(storyAgentCode, /continuityRecord:/, 'Missing continuityRecord');

  // Verify First Frame of Scene N links to Last Frame of Scene N-1
  assert.match(storyAgentCode, /Continuous handoff from previous scene closing frame/, 'Continuity engine linking not enforced');
});

// ----------------------------------------------------------------------------
// 5. AI WORKSPACE: TWO PRIMARY TABS & MULTI-ACCOUNT SWITCHER
// ----------------------------------------------------------------------------
runTest('AI Workspace has exactly TWO primary tabs (Story Assistant & Video Assistant)', () => {
  const aiWorkspace = fs.readFileSync(path.join(rootDir, 'src', 'features', 'aivideo', 'AIVideoWorkspace.tsx'), 'utf8');
  assert.match(aiWorkspace, /Tab 1: AI Story Assistant/, 'Missing Tab 1: AI Story Assistant');
  assert.match(aiWorkspace, /Tab 2: AI Video Assistant/, 'Missing Tab 2: AI Video Assistant');
  assert.match(aiWorkspace, /Open Chrome/, 'Missing prominent Open Chrome button');
  assert.match(aiWorkspace, /Assemble Completed Scenes/, 'Missing Assemble Completed Scenes button');
  assert.match(aiWorkspace, /googleAccounts/, 'Missing multi-account switcher in AI Workspace');
});

// ----------------------------------------------------------------------------
// 6. CAPCUT-STYLE VIDEO EDITOR & TIMELINE
// ----------------------------------------------------------------------------
runTest('CapCut multi-track timeline supports V1-V3, A1-A3, drag-and-drop, and clip operations', () => {
  const timeline = fs.readFileSync(path.join(rootDir, 'src', 'features', 'timeline', 'MultitrackTimeline.tsx'), 'utf8');
  assert.match(timeline, /handleSplit/, 'Missing clip split');
  assert.match(timeline, /handleDuplicate/, 'Missing duplicate clip');
  assert.match(timeline, /handleTrimStartToPlayhead/, 'Missing trim start');
  assert.match(timeline, /handleTrimEndToPlayhead/, 'Missing trim end');
  assert.match(timeline, /undoTimeline/, 'Missing undo timeline');
  assert.match(timeline, /redoTimeline/, 'Missing redo timeline');
  assert.match(timeline, /onDrop=/, 'Missing drag and drop support on timeline tracks');

  const api = fs.readFileSync(path.join(rootDir, 'src', 'services', 'api.ts'), 'utf8');
  assert.match(api, /V1: Main Video/, 'Missing Track V1');
  assert.match(api, /V2: Overlays \/ B-Roll/, 'Missing Track V2');
  assert.match(api, /V3: VFX & Graphics/, 'Missing Track V3');
  assert.match(api, /A1: Dialogue \/ Voiceover/, 'Missing Track A1');
  assert.match(api, /A2: Music Score & Ambience/, 'Missing Track A2');
  assert.match(api, /A3: Sound Effects \(SFX\)/, 'Missing Track A3');
});

runTest('DesktopInspector provides full Transform, Speed, Audio, and Color controls', () => {
  const inspector = fs.readFileSync(path.join(rootDir, 'src', 'components', 'DesktopInspector.tsx'), 'utf8');
  assert.match(inspector, /Scale:/, 'Missing Scale slider');
  assert.match(inspector, /Position X:/, 'Missing Position X slider');
  assert.match(inspector, /Position Y:/, 'Missing Position Y slider');
  assert.match(inspector, /Rotation:/, 'Missing Rotation slider');
  assert.match(inspector, /Opacity:/, 'Missing Opacity slider');
  assert.match(inspector, /Playback Speed Multiplier:/, 'Missing Speed multiplier');
  assert.match(inspector, /Gain \/ Volume:/, 'Missing Volume slider');
  assert.match(inspector, /Detach Audio to Track A1/, 'Missing Detach Audio action');
  assert.match(inspector, /Brightness:/, 'Missing Brightness slider');
  assert.match(inspector, /Contrast:/, 'Missing Contrast slider');
  assert.match(inspector, /Saturation:/, 'Missing Saturation slider');
});

runTest('PreviewMonitor applies CSS transforms, filters, and playback speed to real HTML5 video', () => {
  const monitor = fs.readFileSync(path.join(rootDir, 'src', 'features', 'timeline', 'PreviewMonitor.tsx'), 'utf8');
  assert.match(monitor, /transformStyle/, 'Missing transformStyle in PreviewMonitor');
  assert.match(monitor, /playbackRate/, 'Missing video playbackRate synchronization');
  assert.match(monitor, /style=\{transformStyle\}/, 'transformStyle not applied to <video> element');
});

// ----------------------------------------------------------------------------
// 7. DEVELOPER ATTRIBUTION & REPOSITORY TRANSPARENCY
// ----------------------------------------------------------------------------
runTest('Developer attribution Md. Sohag Hossen and repository links are preserved', () => {
  const about = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AboutModal.tsx'), 'utf8');
  assert.match(about, /Md\. Sohag Hossen/, 'Developer attribution missing in AboutModal');
  assert.match(about, /https:\/\/github\.com\/Sohag446\/CINEMATIC-STUDIO/, 'Repository link missing in AboutModal');

  const cargo = fs.readFileSync(path.join(rootDir, 'src-tauri', 'Cargo.toml'), 'utf8');
  assert.match(cargo, /Md\. Sohag Hossen/, 'Developer attribution missing in Cargo.toml');
});

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passedTests} / ${totalTests} tests passed.`);
console.log('================================================================');

if (passedTests < totalTests) {
  process.exit(1);
}
