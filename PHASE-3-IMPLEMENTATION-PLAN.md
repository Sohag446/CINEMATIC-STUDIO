# CINEMATIC STUDIO — PHASE 3 IMPLEMENTATION PLAN
## AI Provider Integration & Browser Execution Engine

**Document Version:** 1.0.0  
**Phase:** 3 of 5  
**Execution Target:** Local Workspace (`c:\Users\Sohag Hossen\Documents\video agent`)  
**Prerequisites:** Phase 1 & 2 frozen and verified.  

---

## 1. Phase 3 Objectives & Boundaries

Phase 3 establishes the operational intelligence and automated browser coordination of CINEMATIC STUDIO:
1. **Desktop as Central Controller:** Owns the task queue, SQLite persistence, clip metadata, prompt formulation, reference asset storage, and profile assignments.
2. **Chrome Extension as Execution Agent:** Lightweight Manifest V3 extension operating within existing logged-in user profiles. Connects to desktop via Native Messaging.
3. **Polymorphic Provider Adapters:** Independent adapters for Google Flow/Veo, ChatGPT, Gemini, and Claude that encapsulate provider-specific DOM selectors, readiness checks, prompt injection, progress monitoring, and output harvesting.
4. **Human-in-the-Loop Protocol:** Immediate, safe pausing when human action is required (CAPTCHA, login expiry, safety filter). Zero circumvention of platform security gates.
5. **Memory and RAM Bounds:** Enforces strict sequential profile execution to stay within workstation limits (peak ~850MB–1.4GB per profile on 20GB system).

---

## 2. Milestone Breakdown & Delivery Sequence

### Milestone 1: Provider Adapter Contracts and Capability Matrix
- **Status:** COMPLETED.
- **Deliverables:**
  - `src/types/provider.ts`: Formal TypeScript contracts (`IProviderAdapter`, `ProviderCapabilities`, `ProviderExecutionRequest`, `ProviderExecutionResult`).
  - `PROVIDER-CAPABILITY-MATRIX.md`: Exhaustive capability matrix auditing all 4 primary providers + 3 supplemental providers.
  - Integration with `src/types/index.ts`.

### Milestone 2: Secure Desktop-Extension Task Message Protocol
- **Objective:** Establish the typed bidirectional messaging protocol between Desktop (Tauri/Host) and Extension (Service Worker).
- **Deliverables:**
  - `src-tauri/src/chrome_service/ipc.rs`: Expand `IpcMessage` payloads for task dispatch (`EXECUTE_TASK`, `CANCEL_TASK`, `TASK_PROGRESS`, `TASK_COMPLETED`, `TASK_FAILED`, `NEEDS_HUMAN_ACTION`).
  - Strict message schema validation, profile authorization check, and timestamp freshness verification.
  - Host-to-extension routing and response handling.

### Milestone 3: Browser Execution Engine (Extension Core)
- **Objective:** Build the core execution engine inside the Chrome extension.
- **Deliverables:**
  - `chrome-extension/engine/executionEngine.js`: Coordinates incoming tasks from Native Messaging.
  - Tab discovery, selection, reuse, and lifecycle management (finding matching provider tabs or opening dedicated pinned tabs).
  - Domain allowlisting and origin validation (rejecting any arbitrary URL or command).
  - Timeout management and task cancellation.

### Milestone 4: ChatGPT, Gemini, and Claude Adapters
- **Objective:** Implement modular browser adapters for text reasoning, scriptwriting, and continuity generation.
- **Deliverables:**
  - `chrome-extension/adapters/chatgpt.js`: ProseMirror text injection, streaming stop-button observer, markdown response extraction.
  - `chrome-extension/adapters/gemini.js`: Rich-textarea WebComponent injection, completion chip observer, output extraction.
  - `chrome-extension/adapters/claude.js`: ContentEditable injection, streaming token observer, structured JSON beat extraction.
  - Resilient versioned DOM selectors with fallback trees.

### Milestone 5: Google Flow / Veo Adapter
- **Objective:** Implement the video production adapter for Google Flow & Veo.
- **Deliverables:**
  - `chrome-extension/adapters/googleFlowVeo.js`: Workspace detection, aspect ratio configuration, prompt submission, reference keyframe assignment.
  - Video generation progress tracking (spinner, progress bar, percentage).
  - Output video discovery, native download trigger, and local save path coordination.

### Milestone 6: Reference Asset Transfer System
- **Objective:** Transfer reference assets (character sheets, storyboard sketches, previous clip end-frames) safely.
- **Deliverables:**
  - Bounded asset transfer protocol: Desktop transfers only the required asset for the active clip.
  - Chunked/bounded encoding (< 5 MB images, base64 or file blob) to prevent memory ballooning.
  - Provider-specific file input handling (`DataTransfer`, synthetic file drop).

### Milestone 7: Task Queue Integration & Recovery
- **Objective:** Connect the Browser Execution Engine with the Desktop Task Queue.
- **Deliverables:**
  - Forward-only database migration `004_task_queue_and_execution.sql`:
    - Full 12-state task lifecycle (`QUEUED`, `ASSIGNED`, `WAITING_FOR_PROFILE`, `WAITING_FOR_PROVIDER`, `UPLOADING`, `SUBMITTING`, `GENERATING`, `COMPLETED`, `FAILED`, `PAUSED`, `CANCELLED`, `NEEDS_HUMAN_ACTION`).
    - Persistent execution logs (`task_execution_logs`).
  - Desktop task queue runner: Sequential profile concurrency enforcement, retry with exponential backoff, crash recovery upon app restart.
  - Tauri commands & frontend UI integration for task status monitoring and Human-in-the-Loop resume modals.

### Milestone 8: Automated Verification & Documentation
- **Objective:** Validate all Phase 3 components through automated test matrices.
- **Deliverables:**
  - `tests/phase3_provider_matrix_test.cjs`: Comprehensive test suite verifying all provider contracts, selectors, message schemas, and state machine transitions.
  - `BROWSER-EXECUTION-ENGINE.md`: Technical architectural guide.
  - `PHASE-3-TEST-REPORT.md`: Truthful report detailing verified tests, blocked items, and phase exit status.

---

## 3. Strict Compliance Guidelines
1. Do not modify, refactor, or delete the 20 original architecture blueprints.
2. Do not bypass or weaken any Windows security control or Smart App Control policy.
3. Clearly distinguish simulated tests from actual physical browser runtime tests.
4. Keep the target 20 GB RAM ceiling respected at all times via sequential execution.

