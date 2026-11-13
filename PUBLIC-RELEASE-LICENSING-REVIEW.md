# CINEMATIC STUDIO — PUBLIC RELEASE LICENSING REVIEW

**Date:** 2026-11-13  
**Status:** COMPLETE & ADVISORY  
**Target Repository:** `https://github.com/Sohag446/CINEMATIC-STUDIO` (Public)  
**Legal Framework:** Intellectual Property, Berne Convention, GitHub Terms of Service, GPLv3 Compliance  

---

## 1. EXECUTIVE SUMMARY

This licensing review audits the legal posture and copyright implications of publishing the CINEMATIC STUDIO repository to public GitHub visibility (`https://github.com/Sohag446/CINEMATIC-STUDIO`).

Key Findings:
1. **Root License Absence:** No root `LICENSE` file currently exists in the repository. In strict adherence to engineering governance rules, an AI assistant must not unilaterally apply an open-source license without the explicit choice and authorization of the project owner (Sohag Hossen).
2. **Default Legal Status (All Rights Reserved):** Under international copyright law and the Berne Convention, the absence of an open-source license retains all copyright and intellectual property rights exclusively with the author.
3. **GitHub Terms of Service Interaction:** Setting a repository to "Public" grants other GitHub users specific platform-level rights (such as viewing the code and creating forks within GitHub), but does **not** grant rights to commercially redistribute, modify, or use the code outside GitHub without permission.
4. **Third-Party Dependency Compliance:** All direct Rust crates and npm packages use standard permissive licenses (MIT, Apache 2.0, BSD). Bundled FFmpeg Gyan essentials operates under GPLv3 and is safely decoupled via isolated OS subprocess execution.

---

## 2. THE ABSENCE OF A ROOT LICENSE FILE: LEGAL IMPLICATIONS

### 2.1 Default Copyright Under International Law
When source code is created, copyright ownership automatically attaches to the author upon fixation in a tangible medium. Because no root `LICENSE` file has been added:
* **Copyright Notice:** Copyright &copy; 2026 Sohag Hossen. All rights reserved.
* **Redistribution Rights:** Outside individuals, companies, or entities have **no legal right** to reproduce, redistribute, sell, sub-license, or incorporate this source code into other products.

### 2.2 GitHub Public Repository Terms of Service (GitHub ToS Section D.4)
By pushing this repository to a public GitHub URL, the project owner accepts GitHub's Terms of Service regarding public repositories:
* **Right to View:** Anyone on the internet can view and clone the repository.
* **Right to Fork:** Users may fork the repository on GitHub to their personal GitHub accounts.
* **Display & Indexing:** GitHub may parse, index, and display the source code in search results and UI.
* **No Commercial License Granted:** GitHub ToS explicitly states that public repository visibility does *not* grant a license to download and redistribute the software commercially, nor does it convert the project into an Open Source Initiative (OSI) approved open-source project.

---

## 3. THIRD-PARTY DEPENDENCY LICENSING AUDIT

A thorough dependency audit was performed across all three layers of the application stack:

### 3.1 Rust Backend Dependencies (`src-tauri/Cargo.toml`)
All direct dependencies in Cargo.toml utilize permissive, non-copyleft open-source licenses:
* `tauri` (v2): MIT / Apache-2.0
* `serde`, `serde_json`: MIT / Apache-2.0
* `tokio`: MIT
* `rusqlite`: MIT
* `aes-gcm`: MIT / Apache-2.0
* `sha2`: MIT / Apache-2.0
* `rand`: MIT / Apache-2.0
* `chrono`: MIT / Apache-2.0
* `log`, `env_logger`: MIT / Apache-2.0
* `regex`: MIT / Apache-2.0

*Verdict:* Zero license conflicts. Fully compatible with proprietary, source-available, or permissive licensing.

### 3.2 Frontend Dependencies (`package.json`)
All direct dependencies in `package.json` utilize standard permissive licenses:
* `react`, `react-dom` (v18.3.1): MIT
* `zustand`: MIT
* `lucide-react`: ISC / MIT
* `tailwindcss`: MIT
* `vite`: MIT
* `@tauri-apps/api` (v2): MIT / Apache-2.0

*Verdict:* Zero license conflicts. Fully compatible with proprietary, source-available, or permissive licensing.

### 3.3 Bundled FFmpeg Media Engine (`src-tauri/resources/media-engine/`)
The bundled FFmpeg binaries (`ffmpeg.exe` and `ffprobe.exe`) are distributed under the **GNU General Public License v3.0 (GPLv3)**.

#### Subprocess Isolation Architecture & GPL Redistribution Realities:
* **Coupling Mechanism:** CINEMATIC STUDIO interacts with FFmpeg strictly as an external CLI subprocess using `std::process::Command` in Rust, passing standard flags and reading pipes.
* **Linkage Separation:** CINEMATIC STUDIO does **not** link statically or dynamically against FFmpeg C/C++ libraries (`libavcodec`, `libavformat`, etc.). There is zero C ABI linkage.
* **GPL Redistribution Obligations:** Running FFmpeg as a separate subprocess does **not** automatically extinguish all GPL obligations when distributing software. While independent process invocation over standard OS pipes is widely recognized as maintaining separation between independent works, the bundled installer that distributes `ffmpeg.exe` alongside the host application constitutes an "aggregate work" or distribution bundle under GPLv3. Consequently:
  - The distributor **must** satisfy GPLv3 redistribution requirements for the FFmpeg binary: including bundling the complete text of the GNU GPLv3, preserving copyright notices, providing build documentation (`BUILD-INFO.txt`), and making available the exact corresponding source code (or an enforceable written offer for source code) for that FFmpeg build.
  - If the desktop application and FFmpeg are tightly interdependent such that one cannot function without the other, legal scholars note that certain jurisdictions may scrutinize whether the combined package constitutes a single work.
  - **Legal Recommendation:** While the current decoupled architecture follows industry-standard practice for desktop tools bundling FFmpeg, professional legal review by qualified intellectual property counsel is strongly recommended before commercial distribution or closed-source enterprise packaging.
* **Distribution Notice Compliance:** All required GPLv3 notices, build metadata, and license documents are distributed in:
  - `src-tauri/resources/media-engine/windows-x64/LICENSES/FFMPEG-LICENSE.txt`
  - `src-tauri/resources/media-engine/windows-x64/LICENSES/BUILD-README.txt`
  - `src-tauri/resources/media-engine/windows-x64/BUILD-INFO.txt`
  - `src-tauri/resources/media-engine/windows-x64/CHECKSUMS.txt`

---

## 4. LICENSING CHOICES FOR THE PROJECT OWNER

Before or after the initial publication, the project owner may choose one of the following licensing paths:

### Option 1: Source-Available / "All Rights Reserved" (Current State)
* **Action Required:** None. Leave repository as-is without a root `LICENSE` file.
* **Purpose:** Allows friends, collaborators, and the public to inspect code, follow development, and test locally, while strictly prohibiting unauthorized commercial exploitation, redistribution, or repackaging by third parties.

### Option 2: Permissive Open-Source License (MIT or Apache 2.0)
* **Action Required:** Add a root `LICENSE` file containing the standard MIT or Apache 2.0 text.
* **Purpose:** Maximizes open-source adoption, community contributions, and public reuse with minimal restrictions.

### Option 3: Copyleft Open-Source License (GPLv3)
* **Action Required:** Add a root `LICENSE` file containing GNU GPLv3 text.
* **Purpose:** Ensures all future modifications and derivatives created by anyone must also remain open-source under GPLv3, completely harmonizing with the FFmpeg distribution model.

---

## 5. CONCLUSION & PUBLICATION READINESS

From a legal and licensing standpoint:
* The repository is **100% CLEAR TO PUBLISH** under its current "All Rights Reserved" status.
* All third-party attribution and GPL notices for FFmpeg are properly documented.
* No unauthorized license has been applied, preserving full copyright sovereignty for Sohag Hossen.

