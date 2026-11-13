# BUNDLED FFMPEG DISTRIBUTION SPECIFICATION
## CINEMATIC STUDIO — ACQUISITION, PROVENANCE & LICENSING

**Release Version:** 9.0.2 Essentials Build (Windows x64)  
**Distribution Source:** Gyan.dev (official Windows release linked by https://ffmpeg.org/download.html)  
**License:** GNU General Public License version 3 (GPL v3)  

---

## 1. PROVENANCE & VERIFICATION METADATA

| Property | Value |
| :--- | :--- |
| **Upstream URL** | `https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip` |
| **Manifest Checksum URL** | `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip.sha256` |
| **Archive SHA-256 Checksum** | `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba` |
| **ffmpeg.exe Binary Size** | 105,423,872 bytes (~100.5 MB) |
| **ffprobe.exe Binary Size** | 105,221,120 bytes (~100.3 MB) |
| **Compiler Toolchain** | gcc 16.2.0 (Rev3, Built by MSYS2 project) |
| **Build Configuration** | `--enable-gpl --enable-version3 --enable-static --disable-w32threads --enable-libx264 --enable-libx265 --enable-libvpx --enable-libopus --enable-libvorbis --enable-libmp3lame --enable-nvenc --enable-amf` |

---

## 2. INCLUDED CODECS, FILTERS & CAPABILITIES

### Supported Video Encoders:
- **`libx264`**: H.264 / AVC software encoder (default for 1080p landscape & 9:16 social deliverables).
- **`libx265`**: H.265 / HEVC software encoder (4K UHD archive mastering).
- **`h264_nvenc`**: NVIDIA hardware-accelerated H.264 encoder (automatically leveraged when GPU present).
- **`hevc_nvenc`**: NVIDIA hardware-accelerated HEVC encoder.
- **`prores`**: Apple ProRes standard intermediate encoder.

### Supported Audio Encoders:
- **`aac`**: Native AAC encoder (128k to 256k stereo mastering).
- **`libmp3lame`**: MP3 audio encoder.
- **`pcm_s16le`**: Uncompressed 16-bit PCM audio.

### Essential Conforming Filters:
- **`scale`**: Multi-resolution downscaling & upscaling.
- **`pad`**: Centered aspect ratio padding for letterboxing and pillarboxing without image distortion.
- **`fps`**: Conforming Variable Frame Rate (VFR) timestamps to fixed Constant Frame Rate (24.000 CFR).
- **`anullsrc`**: Synthetic audio generator preventing A/V drift on silent AI video clips.
- **`amix`**: Multi-channel audio mixer for voiceover dialogue + background music ducking.
- **`xfade` & `acrossfade`**: Video and audio crossfade transitions.

---

## 3. LEGAL & REDISTRIBUTION OBLIGATIONS (GPL v3)

FFmpeg is free software distributed under the GNU General Public License (GPL) version 3. As an application bundling this distribution, CINEMATIC STUDIO complies with all redistribution obligations:

1. **License Notices Preserved**:
   The full text of the GNU GPL v3 license is shipped in the installation directory at `resources/media-engine/windows-x64/LICENSES/FFMPEG-LICENSE.txt` and accessible through the desktop application's Settings UI.
2. **Source Code Availability**:
   Source code for the exact FFmpeg release version (`9.0.2`) is hosted publicly by the upstream project at:
   `https://github.com/FFmpeg/FFmpeg/releases/tag/n9.0.2`
3. **Subprocess Separation**:
   CINEMATIC STUDIO executes `ffmpeg.exe` as an independent external operating system subprocess via command-line arguments and standard input/output pipes. The Tauri Rust binary is not statically or dynamically linked against libavcodec/libavformat, maintaining clear boundary separation.

