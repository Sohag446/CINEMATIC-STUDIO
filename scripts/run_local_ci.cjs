/**
 * Phase 1 Local CI Runner
 * Mirrors the exact execution sequence defined in .github/workflows/phase1-native-verification.yml
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'tests', 'test_output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const logFile = path.join(outputDir, 'ci_workflow_run.log');

let logContent = '';
function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
}

const steps = [
  {
    name: 'Verify Application Icons Exist',
    cmd: 'node',
    args: ['scripts/generate_icons.cjs'],
    cwd: rootDir,
    shell: false,
  },
  {
    name: 'Frontend TypeScript & Production Build (npm run build)',
    cmd: 'npm.cmd',
    args: ['run', 'build'],
    cwd: rootDir,
    shell: true,
  },
  {
    name: 'Run Master Verification Simulation Suite',
    cmd: 'node',
    args: ['tests/phase1_validation.cjs'],
    cwd: rootDir,
    shell: false,
  },
  {
    name: 'Rust Formatting Check (cargo fmt --check)',
    cmd: path.join(process.env.USERPROFILE, '.cargo', 'bin', 'cargo.exe'),
    args: ['fmt', '--check'],
    cwd: path.join(rootDir, 'src-tauri'),
    shell: false,
  },
  {
    name: 'Rust Backend Cargo Check (cargo check --verbose)',
    cmd: path.join(process.env.USERPROFILE, '.cargo', 'bin', 'cargo.exe'),
    args: ['check', '--verbose'],
    cwd: path.join(rootDir, 'src-tauri'),
    shell: false,
  },
  {
    name: 'Execute Native Rust Unit & Integration Test Suite (cargo test)',
    cmd: path.join(process.env.USERPROFILE, '.cargo', 'bin', 'cargo.exe'),
    args: ['test', '--verbose', '--', '--nocapture'],
    cwd: path.join(rootDir, 'src-tauri'),
    shell: false,
  },
];

log('================================================================');
log('PHASE 1 CI WORKFLOW EXECUTION: .github/workflows/phase1-native-verification.yml');
log(`Timestamp: ${new Date().toISOString()}`);
log(`Workspace: ${rootDir}`);
log('================================================================\n');

const results = [];

for (const step of steps) {
  log(`>>> STEP: ${step.name}`);
  log(`Command: ${step.cmd} ${step.args.join(' ')}`);
  log(`Working Directory: ${step.cwd}`);
  const startTime = Date.now();

  const proc = spawnSync(step.cmd, step.args, {
    cwd: step.cwd,
    encoding: 'utf8',
    shell: step.shell,
    env: {
      ...process.env,
      PATH: `${path.join(process.env.LOCALAPPDATA, 'Programs', 'nodejs')};${path.join(process.env.USERPROFILE, '.cargo', 'bin')};${process.env.PATH}`,
    },
  });

  const durationMs = Date.now() - startTime;
  const stdout = proc.stdout || '';
  const stderr = proc.stderr || '';
  const exitCode = proc.status;
  const error = proc.error ? proc.error.message : null;

  if (stdout.trim()) {
    log('--- STDOUT ---');
    log(stdout.trim());
  }
  if (stderr.trim()) {
    log('--- STDERR ---');
    log(stderr.trim());
  }
  if (error) {
    log('--- PROCESS ERROR ---');
    log(error);
  }

  let status = 'PASS';
  if (exitCode !== 0) {
    if (stderr.includes('os error 4551') || stderr.includes('Application Control') || (error && error.includes('4551'))) {
      status = 'BLOCKED (Windows SAC os error 4551)';
    } else {
      status = `FAIL (exit code ${exitCode})`;
    }
  }

  log(`Status: ${status} (Duration: ${durationMs}ms)\n`);
  results.push({ name: step.name, status, exitCode, durationMs });
}

log('================================================================');
log('WORKFLOW EXECUTION SUMMARY');
log('================================================================');
for (const r of results) {
  log(`- ${r.name}: ${r.status}`);
}
log('================================================================\n');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
fs.writeFileSync(logFile, logContent, 'utf8');
log(`Log saved to: ${logFile}`);
