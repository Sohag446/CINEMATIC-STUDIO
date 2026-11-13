# Contributing to CINEMATIC STUDIO

Thank you for your interest in contributing to **CINEMATIC STUDIO**! This document provides guidelines for collaborators and developers working on this project.

---

## 1. Core Architectural Invariants

When contributing code, you must respect the following non-negotiable architectural tenets:

1. **Zero Credential Scraping**:
   - Never write code that accesses, reads, decrypts, or exfiltrates user cookies, passwords, or session tokens.
   - The Chrome extension must never request `cookies`, `webRequest`, or `<all_urls>` permissions.
2. **Zero Bot Bypassing**:
   - Never implement automated CAPTCHA solvers, Cloudflare Turnstile bypasses, or proof-of-work crackers.
   - When a bot verification gate or login wall is encountered, the code must halt automation immediately and emit `NEEDS_HUMAN_ACTION`.
3. **RAM & Performance Limits**:
   - The platform is designed to operate within a 20 GB host RAM ceiling alongside multiple open Chrome browser profiles.
   - Heavy media operations must stream through FFmpeg subprocesses rather than buffering raw frames in memory.
   - Concurrency must remain bounded to a single active browser task at a time.
4. **Relational SQLite Schema Migrations**:
   - Database schema changes must be added as forward-only SQL migration scripts in `src-tauri/migrations/`.
   - Never drop or truncate existing user tables without migration protection.

---

## 2. Development Setup

### System Requirements:
- Windows 10/11 x64
- Node.js 20.x or higher
- Rust 1.75+ with `x86_64-pc-windows-msvc` target
- Visual Studio 2022 C++ Build Tools (`link.exe` and Windows SDK)

### Getting Started:
```bash
# 1. Install frontend dependencies
npm ci

# 2. Run frontend dev server
npm run dev

# 3. Compile frontend bundle
npm run build

# 4. Run test suites
npm test # or node tests/<test_suite>.cjs
```

---

## 3. Pull Request Guidelines

1. **Feature Branches**: Create a descriptive branch (e.g., `feat/timeline-scrubbing` or `fix/claude-adapter-selector`).
2. **Testing**: Ensure all automated regression test suites pass before opening a PR:
   - `node tests/combined_phase1_2_validation.cjs`
   - `node tests/phase3_provider_matrix_test.cjs`
   - `node tests/phase4_media_assembly_test.cjs`
   - `node tests/media_engine_resolver_test.cjs`
   - `node tests/final_rendering_regression_suite.cjs`
3. **Commit Messages**: Use standard conventional commit formats (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
4. **No Secrets or Large Binaries**: Never commit API keys, `.env` files, or binaries larger than 50 MB to Git.

