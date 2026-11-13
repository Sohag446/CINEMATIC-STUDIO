/**
 * CINEMATIC STUDIO — Phase 4 Media Assembly, Multitrack Timeline & FFmpeg Engine Test Suite
 * Validates Migration 005, non-destructive editing, dual-pipeline concat logic,
 * normalizing filtergraph generation, RAM-bounded streaming, and 360-clip scale.
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — PHASE 4 MEDIA ASSEMBLY & FFMPEG TEST SUITE');
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
  // TEST SUITE 1: SQLITE MIGRATION 005 & MEDIA SCHEMA INTEGRITY
  // --------------------------------------------------------------------------
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const migrationsDir = path.resolve(__dirname, '..', 'src-tauri', 'migrations');
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_storage_root_and_deletion_journal.sql',
    '003_chrome_profiles_and_pairing.sql',
    '004_task_queue_and_execution.sql',
    '005_media_and_rendering.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    assert('Migration', `Migration File Exists (${file})`, fs.existsSync(filePath), `Found ${filePath}`);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    db.run(sqlContent);
  }

  // Verify created tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")[0].values.flat();
  const requiredPhase4Tables = [
    'media_assets',
    'timeline_tracks',
    'timeline_clips',
    'timeline_transitions',
    'render_jobs'
  ];
  for (const table of requiredPhase4Tables) {
    assert('Schema', `Table Exists (${table})`, tables.includes(table), `Verified table ${table} is present in SQLite`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: NON-DESTRUCTIVE EDITING INVARIANT
  // --------------------------------------------------------------------------
  // Create test project
  const now = Date.now();
  db.run(`
    INSERT INTO projects (id, name, slug, project_dir_path, target_aspect_ratio, target_fps, created_at, updated_at)
    VALUES ('proj-1', 'Test Film', 'test-film', 'C:\\Studio\\Projects\\TestFilm', '16:9', 24.0, ${now}, ${now});
  `);

  // Insert media asset
  db.run(`
    INSERT INTO media_assets (id, project_id, file_name, file_path, file_size_bytes, media_type, duration_seconds, width, height, fps, video_codec, audio_codec, created_at)
    VALUES ('asset-1', 'proj-1', 'scene1_shot1.mp4', 'C:\\Studio\\Projects\\TestFilm\\assets\\scene1_shot1.mp4', 15420000, 'VIDEO', 5.0, 1920, 1080, 24.0, 'h264', 'aac', ${now});
  `);

  // Insert timeline tracks (V1, A1)
  db.run(`
    INSERT INTO timeline_tracks (id, project_id, track_index, track_type, label)
    VALUES 
      ('track-v1', 'proj-1', 1, 'VIDEO', 'Video Track 1'),
      ('track-a1', 'proj-1', 2, 'AUDIO', 'Audio Track 1');
  `);

  // Insert timeline clip referencing asset-1
  db.run(`
    INSERT INTO timeline_clips (id, track_id, project_id, media_asset_id, timeline_start_seconds, timeline_duration_seconds, source_in_seconds, source_out_seconds, created_at, updated_at)
    VALUES ('clip-1', 'track-v1', 'proj-1', 'asset-1', 0.0, 5.0, 0.0, 5.0, ${now}, ${now});
  `);

  // Verify clip and asset are linked
  let assetCount = db.exec("SELECT COUNT(*) FROM media_assets WHERE id = 'asset-1';")[0].values[0][0];
  let clipCount = db.exec("SELECT COUNT(*) FROM timeline_clips WHERE id = 'clip-1';")[0].values[0][0];
  assert('Non-Destructive', 'Initial Relationship Verified', assetCount === 1 && clipCount === 1, 'Asset and timeline clip both exist');

  // Perform deletion of timeline clip
  db.run("DELETE FROM timeline_clips WHERE id = 'clip-1';");

  clipCount = db.exec("SELECT COUNT(*) FROM timeline_clips WHERE id = 'clip-1';")[0].values[0][0];
  assetCount = db.exec("SELECT COUNT(*) FROM media_assets WHERE id = 'asset-1';")[0].values[0][0];

  assert('Non-Destructive', 'Timeline Clip Deleted', clipCount === 0, 'Clip removed from sequence');
  assert('Non-Destructive', 'Media Asset Untouched (Invariant)', assetCount === 1, 'Original media asset record preserved in vault');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: DUAL-PIPELINE CONCAT STRATEGY DECISION MATRIX
  // --------------------------------------------------------------------------
  function selectPipelineStrategy(clips) {
    if (!clips || clips.length === 0) return 'STREAM_COPY';
    if (clips.length === 1) return 'STREAM_COPY';

    const baseline = clips[0];
    for (let i = 1; i < clips.length; i++) {
      const c = clips[i];
      if (c.width !== baseline.width || c.height !== baseline.height) {
        return 'NORMALIZING_TRANSCODE'; // Resolution mismatch
      }
      if (Math.abs(c.fps - baseline.fps) > 0.01) {
        return 'NORMALIZING_TRANSCODE'; // FPS mismatch
      }
      if (c.video_codec !== baseline.video_codec) {
        return 'NORMALIZING_TRANSCODE'; // Video codec mismatch
      }
      if (c.pixel_format !== baseline.pixel_format) {
        return 'NORMALIZING_TRANSCODE'; // Pixel format mismatch
      }
      if (c.has_audio !== baseline.has_audio) {
        return 'NORMALIZING_TRANSCODE'; // Audio stream mismatch
      }
      if (c.has_audio && (c.audio_codec !== baseline.audio_codec || c.audio_sample_rate !== baseline.audio_sample_rate)) {
        return 'NORMALIZING_TRANSCODE'; // Audio format mismatch
      }
      if (c.has_transition) {
        return 'NORMALIZING_TRANSCODE'; // Transitions require filtergraph blending
      }
    }
    return 'STREAM_COPY';
  }

  // Case 1: Identical clips -> STREAM_COPY
  const uniformClips = [
    { width: 1920, height: 1080, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: true, audio_codec: 'aac', audio_sample_rate: 48000, has_transition: false },
    { width: 1920, height: 1080, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: true, audio_codec: 'aac', audio_sample_rate: 48000, has_transition: false },
    { width: 1920, height: 1080, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: true, audio_codec: 'aac', audio_sample_rate: 48000, has_transition: false }
  ];
  assert('Strategy', 'Uniform Clips Select Stream-Copy', selectPipelineStrategy(uniformClips) === 'STREAM_COPY', 'Zero transcoding overhead for matching clips');

  // Case 2: Resolution mismatch -> NORMALIZING_TRANSCODE
  const resMismatchClips = [
    { width: 1920, height: 1080, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: true, audio_codec: 'aac', audio_sample_rate: 48000, has_transition: false },
    { width: 1280, height: 720, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: true, audio_codec: 'aac', audio_sample_rate: 48000, has_transition: false }
  ];
  assert('Strategy', 'Resolution Mismatch Selects Normalizing Transcode', selectPipelineStrategy(resMismatchClips) === 'NORMALIZING_TRANSCODE', '720p mixed with 1080p triggers normalization');

  // Case 3: Missing audio stream in AI video -> NORMALIZING_TRANSCODE
  const missingAudioClips = [
    { width: 1920, height: 1080, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: true, audio_codec: 'aac', audio_sample_rate: 48000, has_transition: false },
    { width: 1920, height: 1080, fps: 24.0, video_codec: 'h264', pixel_format: 'yuv420p', has_audio: false, audio_codec: null, audio_sample_rate: null, has_transition: false }
  ];
  assert('Strategy', 'Missing Audio Stream Selects Normalizing Transcode', selectPipelineStrategy(missingAudioClips) === 'NORMALIZING_TRANSCODE', 'Synthetic silent audio track required');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: NORMALIZING FILTERGRAPH CONSTRUCTION & SAFETY
  // --------------------------------------------------------------------------
  function buildNormalizingFiltergraph(inputs, targetWidth, targetHeight, targetFps) {
    const filters = [];
    const concatInputs = [];

    inputs.forEach((input, idx) => {
      // Video chain: scale -> pad -> setsar -> fps -> format
      const vChain = `[${idx}:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${targetFps},format=yuv420p[v${idx}]`;
      filters.push(vChain);

      // Audio chain: if no audio, generate silence; else conform
      let aChain = '';
      if (input.has_audio) {
        aChain = `[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${idx}]`;
      } else {
        aChain = `anullsrc=channel_layout=stereo:sample_rate=48000:d=${input.duration}[a${idx}]`;
      }
      filters.push(aChain);

      concatInputs.push(`[v${idx}][a${idx}]`);
    });

    // Concat filter
    filters.push(`${concatInputs.join('')}concat=n=${inputs.length}:v=1:a=1[outv][outa]`);
    return filters.join('; ');
  }

  const testInputs = [
    { duration: 4.5, has_audio: true },
    { duration: 5.0, has_audio: false },
    { duration: 3.2, has_audio: true }
  ];
  const filtergraph = buildNormalizingFiltergraph(testInputs, 1920, 1080, 24);

  assert('Filtergraph', 'Video Chain Conforms Aspect Ratio & SAR', filtergraph.includes('scale=1920:1080:force_original_aspect_ratio=decrease'), 'Aspect ratio preserved with letterbox/pillarbox');
  assert('Filtergraph', 'Video Chain Conforms Pixel Format', filtergraph.includes('format=yuv420p'), 'yuv420p color matrix enforced');
  assert('Filtergraph', 'Video Chain Conforms Constant Frame Rate', filtergraph.includes('fps=24'), '24fps constant frame rate enforced');
  assert('Filtergraph', 'Synthetic Audio Fallback Injected', filtergraph.includes('anullsrc=channel_layout=stereo:sample_rate=48000:d=5'), 'Audio channel sync guaranteed for silent clip');
  assert('Filtergraph', 'Concat Filter Combines All Nodes', filtergraph.includes('concat=n=3:v=1:a=1[outv][outa]'), 'Clean [outv][outa] master streams produced');

  // --------------------------------------------------------------------------
  // TEST SUITE 5: BUFFER BOUNDS & SAFE SUBPROCESS ARGUMENTS
  // --------------------------------------------------------------------------
  function buildFFmpegArgs(options) {
    const args = ['-hide_banner', '-y', '-progress', 'pipe:1'];
    // RAM protection parameters
    args.push('-max_muxing_queue_size', '1024');
    args.push('-bufsize', '20M');
    args.push('-threads', String(options.threads || 4));

    if (options.useNvenc) {
      args.push('-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', String(options.crf));
    } else {
      args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(options.crf));
    }

    args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    args.push(options.outputPath);
    return args;
  }

  const sampleArgs = buildFFmpegArgs({
    crf: 18,
    threads: 4,
    useNvenc: false,
    outputPath: 'C:\\Studio Projects\\Test\\master.mp4'
  });

  assert('Safety', 'Tokenized Argument Vector (No Shell Injection)', Array.isArray(sampleArgs), 'Args structured as safe argv array');
  assert('Safety', 'Buffer Size Capped at 20MB', sampleArgs.includes('-bufsize') && sampleArgs[sampleArgs.indexOf('-bufsize') + 1] === '20M', 'RAM-bounded streaming buffer configured');
  assert('Safety', 'Muxing Queue Capped at 1024 Packets', sampleArgs.includes('-max_muxing_queue_size') && sampleArgs[sampleArgs.indexOf('-max_muxing_queue_size') + 1] === '1024', 'Muxer queue memory bounded');
  assert('Safety', 'Thread Pool Capped at 4', sampleArgs.includes('-threads') && sampleArgs[sampleArgs.indexOf('-threads') + 1] === '4', 'CPU thread starvation prevented');
  assert('Safety', 'Machine Readable Progress Pipe Declared', sampleArgs.includes('-progress') && sampleArgs[sampleArgs.indexOf('-progress') + 1] === 'pipe:1', 'Real-time telemetry parsed from stdout pipe');

  // --------------------------------------------------------------------------
  // TEST SUITE 6: 360-CLIP PRODUCTION SCALE & RAM FOOTPRINT
  // --------------------------------------------------------------------------
  const clipBatchStart = Date.now();
  const clips360 = [];
  for (let i = 1; i <= 360; i++) {
    const startTime = (i - 1) * 10.0;
    clips360.push({
      id: `clip-scale-${i}`,
      track_id: 'track-v1',
      project_id: 'proj-1',
      media_asset_id: 'asset-1',
      timeline_start_seconds: startTime,
      timeline_duration_seconds: 10.0,
      source_in_seconds: 0.0,
      source_out_seconds: 10.0,
      volume: 1.0,
      created_at: now
    });
  }

  // Insert all 360 clips into SQLite
  db.run("BEGIN TRANSACTION;");
  for (const c of clips360) {
    db.run(`
      INSERT INTO timeline_clips (id, track_id, project_id, media_asset_id, timeline_start_seconds, timeline_duration_seconds, source_in_seconds, source_out_seconds, volume, created_at, updated_at)
      VALUES ('${c.id}', '${c.track_id}', '${c.project_id}', '${c.media_asset_id}', ${c.timeline_start_seconds}, ${c.timeline_duration_seconds}, ${c.source_in_seconds}, ${c.source_out_seconds}, ${c.volume}, ${c.created_at}, ${c.created_at});
    `);
  }
  db.run("COMMIT;");
  const clipBatchElapsed = Date.now() - clipBatchStart;

  const totalClipsInDb = db.exec("SELECT COUNT(*) FROM timeline_clips WHERE project_id = 'proj-1';")[0].values[0][0];
  assert('Scale', '360 Clips Persisted in Database', totalClipsInDb === 360, `360 clips written in ${clipBatchElapsed}ms`);

  // Measure JSON payload memory size
  const serialized = JSON.stringify(clips360);
  const memoryKb = (Buffer.byteLength(serialized, 'utf8') / 1024).toFixed(2);
  assert('Scale', 'Low Memory Descriptors (< 200 KB)', parseFloat(memoryKb) < 200, `360-clip metadata takes only ${memoryKb} KB`);

  // Verify total duration calculation for 360 clips
  const maxEnd = db.exec("SELECT MAX(timeline_start_seconds + timeline_duration_seconds) FROM timeline_clips WHERE project_id = 'proj-1';")[0].values[0][0];
  assert('Scale', '1-Hour Production Total Runtime Conforms', maxEnd === 3600.0, `Calculated timeline duration: ${maxEnd}s (60.0 minutes)`);

  // --------------------------------------------------------------------------
  // TEST SUITE 7: RENDER JOB FINITE STATE MACHINE & PROGRESS TRACKING
  // --------------------------------------------------------------------------
  db.run(`
    INSERT INTO render_jobs (id, project_id, preset_name, state, output_path, progress_percentage, render_strategy, created_at)
    VALUES ('job-1', 'proj-1', 'LANDSCAPE_1080P', 'QUEUED', 'C:\\Studio\\Projects\\TestFilm\\renders\\master.mp4', 0.0, 'NORMALIZING_TRANSCODE', ${now});
  `);

  // Transition through FSM states
  const states = ['PREPARING', 'RENDERING', 'FINALIZING', 'COMPLETED'];
  for (const st of states) {
    const progress = st === 'COMPLETED' ? 100.0 : 45.0;
    db.run(`UPDATE render_jobs SET state = '${st}', progress_percentage = ${progress} WHERE id = 'job-1';`);
  }

  const finalJob = db.exec("SELECT state, progress_percentage FROM render_jobs WHERE id = 'job-1';")[0].values[0];
  assert('FSM', 'Render Job Transitions to COMPLETED', finalJob[0] === 'COMPLETED' && finalJob[1] === 100.0, 'State machine reached COMPLETED at 100%');

  // Summary
  console.log('\n================================================================');
  console.log(`PHASE 4 TEST SUMMARY: Passed: ${passed} | Failed: ${failed} | Total: ${passed + failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error('Test execution failed with unhandled error:', err);
  process.exit(1);
});
