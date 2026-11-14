/**
 * Generate real test media fixtures for V4.1.0 Windows Acceptance Testing
 * - two MP4 videos
 * - one MOV video
 * - one PNG image
 * - one WAV/MP3 audio file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'tests', 'acceptance_media');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Find bundled FFmpeg
const ffmpegCandidates = [
  path.join(rootDir, 'src-tauri', 'resources', 'media-engine', 'windows-x64', 'ffmpeg.exe'),
  'C:\\Users\\Sohag Hossen\\AppData\\Local\\Cinematic Studio\\resources\\media-engine\\windows-x64\\ffmpeg.exe',
  'ffmpeg'
];

let ffmpeg = null;
for (const c of ffmpegCandidates) {
  if (fs.existsSync(c)) {
    ffmpeg = c;
    break;
  }
}

if (!ffmpeg) {
  console.error('FFmpeg binary not found!');
  process.exit(1);
}

console.log('Using FFmpeg:', ffmpeg);

const video1Mp4 = path.join(outDir, 'clip_a_landscape_1080p.mp4');
const video2Mp4 = path.join(outDir, 'clip_b_landscape_1080p.mp4');
const video3Mov = path.join(outDir, 'clip_c_portrait_1080p.mov');
const imagePng = path.join(outDir, 'overlay_badge.png');
const audioWav = path.join(outDir, 'soundtrack_music.wav');

// 1. Video 1: 1920x1080 24fps 3.0s red/orange gradient with counter
console.log('Generating Video 1 (MP4 1080p)...');
execSync(`"${ffmpeg}" -y -f lavfi -i testsrc=duration=3:size=1920x1080:rate=24 -f lavfi -i sine=frequency=440:duration=3:sample_rate=48000 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k "${video1Mp4}"`, { stdio: 'inherit' });

// 2. Video 2: 1920x1080 24fps 2.5s smptebars
console.log('Generating Video 2 (MP4 1080p)...');
execSync(`"${ffmpeg}" -y -f lavfi -i smptebars=duration=2.5:size=1920x1080:rate=24 -f lavfi -i sine=frequency=880:duration=2.5:sample_rate=48000 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k "${video2Mp4}"`, { stdio: 'inherit' });

// 3. Video 3: 1080x1920 24fps 2.0s portrait MOV
console.log('Generating Video 3 (MOV Portrait)...');
execSync(`"${ffmpeg}" -y -f lavfi -i testsrc=duration=2:size=1080x1920:rate=24 -f lavfi -i sine=frequency=220:duration=2:sample_rate=48000 -c:v qtrle -c:a pcm_s16le "${video3Mov}"`, { stdio: 'inherit' });

// 4. Image: 500x500 PNG with text
console.log('Generating Image (PNG Overlay)...');
execSync(`"${ffmpeg}" -y -f lavfi -i color=c=yellow@0.8:s=500x500:d=1 -frames:v 1 "${imagePng}"`, { stdio: 'inherit' });

// 5. Audio: 5.0s stereo 48kHz WAV
console.log('Generating Audio (WAV 48kHz)...');
execSync(`"${ffmpeg}" -y -f lavfi -i sine=frequency=523.25:duration=5.0:sample_rate=48000 -c:a pcm_s16le "${audioWav}"`, { stdio: 'inherit' });

console.log('\nAll 5 Acceptance Media files generated:');
[video1Mp4, video2Mp4, video3Mov, imagePng, audioWav].forEach(f => {
  const s = fs.statSync(f);
  console.log(`- ${path.basename(f)}: ${(s.size / 1024).toFixed(1)} KB`);
});
