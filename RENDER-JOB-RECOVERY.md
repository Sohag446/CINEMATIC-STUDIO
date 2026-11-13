# RENDER JOB RECOVERY & OUTPUT SAFETY ARCHITECTURE
## CINEMATIC STUDIO — PHASE 4 ARCHITECTURE BLUEPRINT

**Status:** APPROVED & IMPLEMENTED  
**Scope:** Two-Stage Staging, Collision Avoidance, Crash Recovery & Process Restart Idempotency

---

## 1. OUTPUT SAFETY & OVERWRITE DEFENSE

Indiscriminate use of `-y` in media rendering creates high data-loss risk, as an in-progress crash or bad command line can destroy or truncate a previously completed valid master output file.

### Two-Stage Staged Rendering Architecture:
```
[ User Initiates Render ]
          │
          ▼
[ Pre-Flight Output Collision Check ] ──(Exists & No Overwrite Permitted)──▶ [ Raise COLLISION_DETECTED ]
          │                                                                              │
   (Approved / New)                                                                      ▼
          │                                                                  [ UI Prompt: Overwrite /
          ▼                                                                    Version Up / Cancel ]
[ Write to Staging Path ]
Target: <output_path>.tmp.<job_id>.mp4
          │
     (Rendering...)
          │
   ┌──────┴──────────────────────────┐
   │                                 │
(Success: Exit Code 0)        (Failure / Crash / Cancel)
   │                                 │
   ▼                                 ▼
[ Verify Non-Zero Bytes ]      [ Clean Staging Path ]
   │                           - File <output_path>.tmp.<job_id>.mp4 deleted
   ▼                           - Existing valid file at <output_path> UNTOUCHED
[ Atomic Rename / Move ]
<staging_path> ──▶ <output_path>
```

### Safety Guarantees:
1. **Zero Silent Overwrites**: When target file already exists on disk, `create_render_job` rejects execution unless `allow_overwrite: true` is explicitly provided.
2. **Prior Master Protection**: A failed or interrupted render never damages, corrupts, or truncates an existing output file because execution writes strictly to the isolated temporary staging file.
3. **No Dangling Artifacts**: On error, cancel, or forced shutdown, temporary `.tmp.<job_id>.mp4` staging files are deleted.

---

## 2. FINITE STATE MACHINE (FSM)

```
        ┌────────────────────────────────────────────────────────┐
        │                                                        │
        ▼                                                        │
    [ QUEUED ] ──▶ [ PREPARING ] ──▶ [ VALIDATING ] ──▶ [ RENDERING ]
        │                                                    │
        │                                          ┌─────────┴─────────┐
        │                                          ▼                   ▼
        │                                     (Failure)            (Success)
        │                                          │                   │
        │                                          ▼                   ▼
    (Cancelled)                              [ FAILED ]         [ FINALIZING ]
        │                                                              │
        ▼                                                              ▼
  [ CANCELLED ]                                                  [ VERIFYING ]
                                                                       │
                                                                       ▼
                                                                 [ COMPLETED ]
```

---

## 3. APPLICATION RESTART & CRASH RECOVERY PROTOCOL

When the desktop application starts:
1. **Orphaned Job Detection**:
   The engine queries SQLite for any render jobs remaining in active transient states:
   ```sql
   SELECT id, output_path FROM render_jobs 
   WHERE state IN ('RENDERING', 'PREPARING', 'VALIDATING');
   ```
2. **State Transition**:
   Because the backing FFmpeg subprocess terminated when the application crashed or closed, these orphaned jobs are updated to `FAILED`:
   ```sql
   UPDATE render_jobs 
   SET state = 'FAILED', 
       error_message = 'Interrupted by application shutdown or unexpected restart. Temporary staging files cleaned.'
   WHERE state IN ('RENDERING', 'PREPARING', 'VALIDATING');
   ```
3. **Staging Cleanup**:
   The recovery runner derives `<output_path>.tmp.<job_id>.mp4` for each orphaned job and unlinks it from disk. Existing completed outputs remain untouched.
4. **Idempotency**:
   Running recovery repeatedly produces identical clean state without side effects.

