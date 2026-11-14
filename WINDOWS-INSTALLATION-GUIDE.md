# CINEMATIC STUDIO — WINDOWS INSTALLATION GUIDE

**Application:** CINEMATIC STUDIO
**Version:** 2.0.1
**Architecture:** Windows 11 / Windows 10 (64-bit x64)
**Developer:** Md. Sohag Hossen ([GitHub Profile](https://github.com/Sohag446))
**Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO

---

## 1. Overview & System Requirements

CINEMATIC STUDIO is a professional desktop application for AI cinematic video production. It runs locally on your Windows computer, coordinates with your Google Chrome browser to interact with AI video generators (such as Google Veo / Flow), and provides an integrated non-linear multitrack video editor (NLE).

### Minimum Hardware & Software Requirements
| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit, Build 19041+) | Windows 11 (64-bit, Build 22000+) |
| **Architecture** | x86_64 (Intel / AMD 64-bit) | x86_64 (Intel / AMD 64-bit) |
| **Processor** | Intel Core i5 (8th Gen) or AMD Ryzen 5 | Intel Core i7 / i9 (10th Gen+) or AMD Ryzen 7 / 9 |
| **Memory (RAM)** | 8 GB RAM | 16 GB – 32 GB RAM |
| **Free Disk Space** | 2.5 GB available storage | 10 GB+ SSD storage (for 1080p video takes) |
| **Browser** | Google Chrome 116+ (Standard 64-bit) | Latest Google Chrome Release |

---

## 2. Choosing Your Installer

CINEMATIC STUDIO provides two official Windows installers:

| Installer Package | Filename | Recommended Audience |
| :--- | :--- | :--- |
| **NSIS Setup (.exe)** *(Recommended)* | `Cinematic Studio_2.0.1_x64-setup.exe` | **Individual Users & Directors.** Installs into your user profile (`%LOCALAPPDATA%\Programs\Cinematic Studio`). Does **not** require Windows Administrator elevation or UAC prompts. |
| **Windows Installer (.msi)** | `Cinematic Studio_2.0.1_x64_en-US.msi` | **System Administrators & Enterprise Deployments.** Standard Windows Installer package with stable WiX UpgradeCode for silent network deployment (`msiexec /i`). |

---

## 3. Step-by-Step Installation (NSIS Setup)

1. **Download the Installer:**
   - Download `Cinematic Studio_2.0.1_x64-setup.exe` from the official [GitHub Releases page](https://github.com/Sohag446/CINEMATIC-STUDIO/releases).
2. **Run the Installer:**
   - Double-click `Cinematic Studio_2.0.1_x64-setup.exe`.
3. **Smart App Control / SmartScreen Notice:**
   - If Windows SmartScreen displays *"Windows protected your PC"* (common for newly released open-source software):
     1. Click **More info**.
     2. Verify the publisher is **Md. Sohag Hossen** and application is **Cinematic Studio**.
     3. Click **Run anyway**.
4. **Installation Progress:**
   - The setup program automatically:
     - Copies application binaries to `%LOCALAPPDATA%\Programs\Cinematic Studio`.
     - Deploys the bundled FFmpeg 9.0.2 media engine and Chrome Native Messaging Host.
     - Automatically registers the Chrome Native Messaging key in Windows Registry (`HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`).
     - Creates **Desktop** and **Start Menu** shortcuts.
5. **Launch the Application:**
   - Click **Finish** to immediately open CINEMATIC STUDIO.

---

## 4. First-Launch Setup Wizard

When launching CINEMATIC STUDIO for the first time, a beginner-friendly 4-step wizard will welcome you:

1. **Welcome Screen:** Overview of the 3-step workflow (Story $\rightarrow$ Chrome Video Generation $\rightarrow$ Studio Assembly).
2. **Chrome Extension Setup:**
   - Click **Copy Path** to copy the extension directory (`chrome-extension`).
   - Open Google Chrome $\rightarrow$ `chrome://extensions` $\rightarrow$ enable **Developer mode**.
   - Click **Load unpacked** and select the extension folder.
   - Click **1-Click Register** to verify the Windows Registry host.
3. **Chrome Profile Selection:**
   - Select your daily Chrome profile containing your active ChatGPT, Gemini, Claude, or Google Veo / Flow sessions.
4. **Verification Complete:**
   - The wizard verifies database, media engine, and native messaging communication, and launches your Project Home.

---

## 5. Verifying Your Installation

To confirm that all components are operational:
1. Open CINEMATIC STUDIO.
2. In the top title bar menu, click **Help** $\rightarrow$ **Installation & Chrome Diagnostics...**.
3. All items should report `PASS`:
   - Application Version: `v2.0.1 (Production)`
   - Storage Vault: `%LOCALAPPDATA%\CinematicStudio`
   - Relational Database: SQLite WAL mode active
   - Media Engine: Bundled FFmpeg 9.0.2 validated
   - Native Messaging Host: HKCU key verified
4. If any item displays `WARNING`, click **1-Click Auto-Repair**.
