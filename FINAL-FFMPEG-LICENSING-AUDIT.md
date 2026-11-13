# CINEMATIC STUDIO — FINAL FFMPEG GPL V3 LICENSING & DISTRIBUTION AUDIT

**Audit Date:** November 13, 2026  
**Auditor:** Principal Software Architect & Licensing Compliance Auditor  
**Scope:** FFmpeg 9.0.2 Essentials Build, GPL v3 Requirements, Process Isolation, and Redistribution Obligations  
**Target Architecture:** Self-Contained Windows x64 Desktop Application Bundle  

---

## 1. BUILD CONFIGURATION & COPYLEFT ANALYSIS

The bundled FFmpeg binary (`ffmpeg.exe` v9.0.2-essentials_build-www.gyan.dev) was built with MSYS2 GCC 16.2.0 using the following explicit configuration flags:

```
configuration: --enable-gpl --enable-version3 --enable-static --disable-w32threads --disable-autodetect
--enable-cairo --enable-fontconfig --enable-iconv --enable-gnutls --enable-libxml2 --enable-gmp
--enable-bzlib --enable-lzma --enable-zlib --enable-libsrt --enable-libssh --enable-libzmq
--enable-avisynth --enable-sdl2 --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxvid
--enable-libaom --enable-libopenjpeg --enable-libvpx --enable-mediafoundation --enable-libass
--enable-libfreetype --enable-libfribidi --enable-libharfbuzz --enable-libvidstab --enable-libvmaf
--enable-libzimg --enable-amf --enable-cuda-llvm --enable-cuvid --enable-dxva2 --enable-d3d11va
--enable-d3d12va --enable-ffnvcodec --enable-libvpl --enable-nvdec --enable-nvenc --enable-vaapi
--enable-openal --enable-libgme --enable-libopenmpt --enable-libopencore-amrwb --enable-libmp3lame
--enable-libtheora --enable-libvo-amrwbenc --enable-libgsm --enable-libopencore-amrnb --enable-libopus
--enable-libspeex --enable-libvorbis --enable-librubberband
```

### 1.1 Triggering Copyleft Components
The flags `--enable-gpl` and `--enable-version3` are required because the binary statically embeds several GPL-licensed third-party libraries:
- **`libx264`:** H.264 video encoder (GPL v2 or later)
- **`libx265`:** HEVC/H.265 video encoder (GPL v2 or later)
- **`libxvid`:** MPEG-4 Part 2 video codec (GPL v2 or later)
- **`librubberband`:** Audio pitch-shifting and time-stretching library (GPL v2 or later)
- **`libvidstab`:** Video stabilization library (GPL v2 or later)

**Conclusion:** The compiled `ffmpeg.exe` and `ffprobe.exe` binaries are governed as a whole under the **GNU General Public License version 3 (GPL v3)**.

---

## 2. APPLICATION ISOLATION & PROPRIETARY SEPARATION

### 2.1 The Free Software Foundation (FSF) Standard on Subprocesses
The Free Software Foundation GPL FAQ specifically addresses applications that communicate with GPL software via standard operating system process execution:

> *"If the main program and the plug-ins are a single combined program, which means they are linked together, then the GPL applies to the plug-ins... By contrast, pipes, sockets and command-line arguments are communication mechanisms normally used between two separate programs... So if they communicate that way, they are normally separate programs."*

### 2.2 Technical Separation in CINEMATIC STUDIO
1. **No In-Process C/Rust FFI Linkage:** CINEMATIC STUDIO does not link dynamically (`.dll`) or statically (`.lib`) against `libavcodec`, `libavformat`, or any FFmpeg internal C libraries.
2. **Standard OS Subprocess Boundary:** CINEMATIC STUDIO executes FFmpeg strictly as a standalone child process using the standard Windows Win32 `CreateProcessW` API (invoked via Rust `std::process::Command` or Node `child_process.spawn`).
3. **Piped Communication Streams:** Communication is restricted to:
   - CLI command line argument vectors (`argv`).
   - Machine-readable text streams on `stdout` (`-progress pipe:1`).
   - Diagnostic logging streams on `stderr`.
   - File system I/O (reading and writing MP4/WAV media container files).
4. **Independent Replacement:** An end-user can delete `ffmpeg.exe` in the application resources and replace it with an alternative FFmpeg binary without modifying or recompiling the CINEMATIC STUDIO binary.

**Finding:** The proprietary desktop application and the bundled FFmpeg binary are legally distinct programs under standard FSF copyright principles.

---

## 3. CORRESPONDING SOURCE & REDISTRIBUTION OBLIGATIONS

Distributing GPL v3 binaries imposes specific legal obligations on the distributor:

### 3.1 License Text Inclusion: `PASS`
- The full text of the GNU General Public License v3 is packaged inside `src-tauri/resources/media-engine/windows-x64/LICENSES/FFMPEG-LICENSE.txt`.
- The third-party attribution and build readme is packaged inside `src-tauri/resources/media-engine/windows-x64/LICENSES/BUILD-README.txt`.

### 3.2 Build Metadata & Attribution: `PASS`
- Exact upstream archive, compiler version (GCC 16.2.0 MSYS2), configuration flags, and SHA-256 checksums are documented in `BUILD-INFO.txt` and `CHECKSUMS.txt`.

### 3.3 Corresponding Source Code Requirement: `REVIEW REQUIRED`
Under GPL v3 Section 6 (Conveying Non-Source Forms), the distributor of a GPL binary must satisfy one of the sanctioned distribution methods:
- **Option 6(a):** Accompany the binary with the complete corresponding source code on a durable physical medium.
- **Option 6(b):** Accompany the binary with a written offer (valid for at least three years) to give anyone the corresponding source code.
- **Option 6(d):** If the binary is made available over a network server, offer equivalent access to the corresponding source code from the same place or another publicly accessible network server.

**Audit Disclosure:**
- The upstream source commit is: `https://github.com/FFmpeg/FFmpeg/commit/946fcce07b` (release tag `n9.0.2`).
- Build scripts and patch files used by Gyan.dev are hosted at `https://github.com/GyanD/codexffmpeg`.
- **Legal Review Recommendation:** Merely linking to upstream `ffmpeg.org` or GitHub may not satisfy Option 6(b) or 6(d) if the upstream repository ever moves or deletes the tag. When CINEMATIC STUDIO is distributed publicly or commercially, the project should host an immutable source archive mirror of FFmpeg 9.0.2 and the Gyan.dev build scripts on its own public download infrastructure.

---

## 4. PATENT LICENSING DISCLOSURE (H.264 & HEVC/H.265)

- FFmpeg includes encoders for patented video standards (`x264` for AVC/H.264 and `x265` for HEVC/H.265).
- Copyright licenses (GPL v3) convey software copyright rights, but do not convey patent licenses from patent pool administrators (such as MPEG LA / Via Licensing Alliance).
- In many jurisdictions, distributing commercial video editing software that encodes H.264/HEVC may require patent licensing agreements if commercial distribution exceeds royalty-free annual thresholds.
- **Auditor Note:** Commercial legal counsel should review MPEG LA / Via LA patent pool royalty thresholds prior to commercial distribution.

---

## 5. LICENSING AUDIT SUMMARY

| Component | License | Bundled Status | Compliance Status |
| :--- | :--- | :--- | :---: |
| `ffmpeg.exe` & `ffprobe.exe` | GPL v3 | Bundled in `resources/` | **PASS** |
| License Text Included | GPL v3 | `LICENSES/FFMPEG-LICENSE.txt` | **PASS** |
| Compiler Flags & Attribution | Notices | `LICENSES/BUILD-README.txt` | **PASS** |
| Process Isolation | CLI Boundary | Child process via `Command::new` | **PASS** |
| Corresponding Source Mirror | GPL v3 Sec 6 | Upstream reference documented | **LEGAL REVIEW RECOMMENDED** |
| Patent Royalties (MPEG LA) | Commercial | Codecs: x264, x265 | **LEGAL REVIEW RECOMMENDED** |

*Certified by Antigravity Technical Verification Agent.*

