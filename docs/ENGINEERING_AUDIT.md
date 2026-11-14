# CINEMATIC STUDIO — LOCAL ARCHIVE & SOURCE CODE AUDIT
**Date:** 2026-11-14  
**Auditor:** Principal Software Architect & Senior Windows Systems Engineer  
**Target Environment:** Windows 11 x64, Tauri 2, Rust, React, TypeScript, SQLite, Bundled FFmpeg  
**Developer:** Md. Sohag Hossen  

---

## 1. Local ZIP Archive Audit (`C:\Users\Sohag Hossen\Downloads\github video soft`)

A total of 18 archives (16 unique projects) in `C:\Users\Sohag Hossen\Downloads\github video soft` were inspected for source code, architecture, license compliance, dependencies, and integration feasibility.

| Archive Name | Size (Bytes) | Identified Repository / Vendor | License | Tech Stack | Evaluation & Integration Feasibility | Practical Rank |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`free-short-video-studio-main.zip`** | 378,186 | `lcy362/free-short-video-studio` | **MIT** | Next.js, React, TypeScript, Tailwind | **High Feasibility.** Contains modular AI scene breakdown orchestrator (`orchestrator.ts`), prompt templates (`prompt-templates.ts`), scene list UI (`SceneList.tsx`), and in-browser FFmpeg media preview. Direct React/TypeScript synergy with CINEMATIC STUDIO. | **#1** |
| **`MeerCut-main.zip`** *(also copies 1 & 2)* | 41,704,916 | `CodeWithAmeer/MeerCut` | **GPL-3.0** | C++17, CMake, Native Windows NLE | **High Architecture Reference.** Excellent multi-track timeline, color grading, audio mixing, titles, transitions, and local AI architecture. Cannot be directly copy-pasted due to C++ vs TypeScript/Rust boundary and GPL-3.0 license copyleft, but provides the exact standard for timeline data models and transform mathematics. | **#2** |
| **`agnes-video-generator-master.zip`** | 45,416,455 | `lcy362/agnes-video-generator` | **Apache-2.0** | Python 3.10+, FastAPI, Vue 3, Vite | **Medium Feasibility.** AI video generation pipeline with script analysis, audio synthesis, and scene stitching. Vue 3 frontend requires rewriting into React, but workflow orchestration patterns are valuable. | **#3** |
| **`shorts-studio-main.zip`** | 19,134,449 | `AtlasTech/shorts-studio` | **GPL-3.0** | Python 3.9+, Lua, DaVinci Resolve API | **Specialized Tool.** Focuses on vertical short conversion, facial tracking, and auto-subtitles for DaVinci Resolve. Useful for caption and reframing algorithms; not a standalone timeline NLE. | **#4** |
| **`openshot-qt-develop.zip`** | 151,437,204 | `OpenShot/openshot-qt` | **GPL-3.0** | Python 3, PyQt5, C++ (libopenshot) | **Heavyweight NLE Reference.** Mature multi-track timeline, keyframing, and video decoding architecture. Too large and tightly bound to Python/Qt/C++ to embed directly into Tauri/Web without shipping a secondary Python runtime. | **#5** |
| **`Video-Editor-SDK-React-main.zip`** | 56,055,641 | Beijing Meishe Technology Co., Ltd. | **Commercial / Proprietary** | Android JNI, C++, Java JARs, Doxygen | **Unusable.** Misleadingly named repo; contains Android mobile SDK `.so` and `.jar` libraries with Doxygen docs. Proprietary license requiring commercial authorization keys. | Disqualified |
| **`Video-Editor-SDK-main.zip`** | 55,977,988 | Beijing Meishe Technology Co., Ltd. | **Commercial / Proprietary** | Android JNI, C++, Java | **Unusable.** Identical to above (Android mobile SDK). | Disqualified |
| **`Video-Editor-SDK-Flutter-main.zip`**| 56,081,538 | Beijing Meishe Technology Co., Ltd. | **Commercial / Proprietary** | Flutter / Android wrapper | **Unusable.** Mobile-only wrapper. | Disqualified |
| **`Video-Editor-SDK-IOS-main.zip`** | 437,104,979 | Beijing Meishe Technology Co., Ltd. | **Commercial / Proprietary** | iOS Objective-C / Swift CocoaPods | **Unusable.** iOS mobile platform only. | Disqualified |
| **`Video-Maker-SDK-main.zip`** | 61,226,032 | Beijing Meishe Technology Co., Ltd. | **Commercial / Proprietary** | Android JNI, C++ | **Unusable.** Android mobile platform only. | Disqualified |
| **`Video-Crop-SDK-main.zip`** | 55,952,051 | Beijing Meishe Technology Co., Ltd. | **Commercial / Proprietary** | Android JNI, C++ | **Unusable.** Android mobile platform only. | Disqualified |
| **`CupCat-Video-Editor-2026-main.zip`** | 1,040 | Malware / Phishing lure | None | Fake README with password link | **Dangerous.** 1 KB archive with malicious phishing links targeting "CapCut Pro 2026" via password-protected executable. | **Malware Threat** |
| **`cupcat-video-editor-main.zip`** | 1,017 | Malware / Phishing lure | None | Fake README | **Dangerous.** Identical phishing campaign. | **Malware Threat** |
| **`CupCat-VideoEditor-Ai-main.zip`** | 1,024 | Malware / Phishing lure | None | Fake README | **Dangerous.** Identical phishing campaign. | **Malware Threat** |
| **`Sony-Vegas-Pro-Ultimate-Toolkit-main.zip`** | 1,054 | Malware / Phishing lure | None | Fake README | **Dangerous.** Phishing lure targeting Sony Vegas users. | **Malware Threat** |
| **`SonyVegas-Pro-2026-main.zip`** | 1,054 | Malware / Phishing lure | None | Fake README | **Dangerous.** Phishing lure targeting Sony Vegas users. | **Malware Threat** |

---

## 2. Technical Recommendation from Local Archive Audit

1. **Adopt AI Scene Orchestration Patterns from `free-short-video-studio` (MIT):**
   - Clean TypeScript interfaces for scene list management, prompt templating, and task progress tracking.
   - Clean, permissive MIT license allowing seamless integration into CINEMATIC STUDIO without copyleft contagion.
2. **Adopt Multi-Track NLE Data Models from `MeerCut` (GPL-3.0 Reference):**
   - Track separation: V1 (Primary video), V2 (Overlays/B-roll), V3 (VFX/Titles), A1 (Voice/Dialogue), A2 (Music score), A3 (Sound effects).
   - Normalized time representation: float seconds for timeline position and duration, integer microsecond precision for rendering.
   - Separate audio and video track handling with clip detachment (`detachAudioFromClip`).
3. **Blacklist Phishing Archives:**
   - The five ~1 KB archives (`CupCat-Video-Editor-2026-main.zip`, etc.) contain malicious download URLs and must never be referenced or executed.

---

## 3. Existing Architecture Audit of CINEMATIC STUDIO v4.0.0

- **Frontend:** React 18, TypeScript, Tailwind CSS, Zustand, Lucide icons, Vite.
- **Desktop Shell:** Tauri 2 (`tauri` 2.12), Rust (`src-tauri`).
- **Media Engine:** Bundled Gyan FFmpeg 9.0.2 (`ffmpeg.exe`, `ffprobe.exe`) staged into `src-tauri/resources/media-engine/windows-x64/`.
- **Database:** SQLite via `sql.js` in browser mode and SQLite via native host in desktop mode.
- **Chrome Integration:** Chrome Extension (Manifest V3, ID: `olfkacbfbgihonffpmnmnhmfmonfhmpf`) + Native Messaging Host (`com.cinematic.studio`, `cinematic-studio-host.exe`).

### Key Deficiencies to Solve in Current Architecture:
1. **Chrome Opens in Floating Window:** Currently, `launch_profile` launches Google Chrome with `--app` or standalone process flags, which Windows displays as an independent desktop window. To embed Chrome *inside* CINEMATIC STUDIO, a native Win32 window-parenting container or Tauri child window mechanism must be implemented.
2. **Video Editor Functionality:** The editor UI looks like an NLE, but real HTML5 playback, video decoding, scrubbing, multi-track trimming, and FFmpeg composition rendering must be hardened end-to-end so that users can actually edit and export finished films reliably.
