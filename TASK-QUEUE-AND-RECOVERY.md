# TASK QUEUE, STATE MACHINE & CRASH RECOVERY
## CINEMATIC STUDIO: Deterministic Task Orchestration & Fault Recovery

---

## 1. Finite State Machine (FSM) State Diagram

The task queue governs every generative operation, API query, file download, and FFmpeg transcode. It operates as a mathematically deterministic Finite State Machine (FSM) with strict state transition validation.

```
                  +-----------+
                  |  CREATED  |
                  +-----+-----+
                        |
                        v
                  +-----------+
                  |  QUEUED   +<-----------------------------------+
                  +-----+-----+                                    |
                        |                                          |
                        v                                          |
                  +-----------+                                    |
                  | PREPARING |                                    |
                  +-----+-----+                                    |
                        |                                          |
          +-------------+-------------+                            |
          |                           |                            |
          v                           v                            |
+--------------------+      +--------------------+                 |
|WAITING_FOR_PROFILE |      |  WAITING_FOR_USER  |                 |
+---------+----------+      +---------+----------+                 |
          |                           |                            |
          +-------------+-------------+                            |
                        |                                          |
                        v                                          |
                  +-----------+                                    |
                  |  RUNNING  |                                    |
                  +-----+-----+                                    |
                        |                                          |
                        v                                          |
                  +------------+                                   |
                  | GENERATING |                                   |
                  +-----+------+                                   |
                        |                                          |
                        v                                          |
                  +------------+                                   |
                  | COLLECTING |                                   |
                  +-----+------+                                   |
                        |                                          |
          +-------------+-------------+                            |
          |                           |                            |
          v                           v                            |
    +-----------+               +-----------+                      |
    | COMPLETED |               |  FAILED   +---(Auto-Retry?)------+
    +-----------+               +-----+-----+
                                      |
                                      v
                               +---------------+
                               |NEEDS_ATTENTION|
                               +---------------+
```

---

## 2. Formal FSM State Definitions & Allowed Transitions

| State Name | Operational Meaning | Allowed Next States | Trigger / Condition |
| :--- | :--- | :--- | :--- |
| `CREATED` | Task initialized in SQLite with payload. | `QUEUED`, `CANCELLED` | Operator queues task or clears shot. |
| `QUEUED` | Awaiting execution slot and resource lock. | `PREPARING`, `PAUSED`, `CANCELLED` | Queue scheduler picks next eligible task. |
| `PREPARING` | Packaging assets (start frame, prompt dialect). | `WAITING_FOR_PROFILE`, `WAITING_FOR_USER`, `RUNNING`, `FAILED` | Asset pre-flight check. |
| `WAITING_FOR_PROFILE`| Assigned Chrome Profile is offline. | `RUNNING`, `PAUSED`, `CANCELLED` | Browser extension reconnects. |
| `WAITING_FOR_USER` | Human action required (CAPTCHA, Login, 2FA). | `RUNNING`, `PAUSED`, `CANCELLED` | User solves challenge and clicks "Resume". |
| `RUNNING` | Browser extension actively injecting DOM inputs. | `GENERATING`, `FAILED`, `CANCELLED` | Prompt submitted successfully. |
| `GENERATING` | Remote AI website is rendering the media. | `COLLECTING`, `FAILED`, `NEEDS_ATTENTION`| Progress observer detects rendering finish. |
| `COLLECTING` | Streaming raw video file from browser to disk. | `COMPLETED`, `FAILED` | Checksum matches; asset registered. |
| `COMPLETED` | Asset saved to project vault, thumbnails ready. | *Terminal State* | Workflow advances to next shot. |
| `FAILED` | Unrecoverable error, crash, or tab killed. | `QUEUED`, `NEEDS_ATTENTION` | Retry attempt or manual failure escalation. |
| `PAUSED` | Suspended by user or memory throttling. | `QUEUED`, `CANCELLED` | User clicks "Resume Queue". |
| `CANCELLED` | Terminated by operator. | *Terminal State* | Clean up intermediate files. |
| `NEEDS_ATTENTION` | Ambiguous state requiring operator decision. | `QUEUED`, `COMPLETED`, `FAILED` | Operator resolves discrepancy in UI. |

---

## 3. Crash & Unexpected Power-Off Recovery Engine

If the desktop application is terminated mid-task (due to operating system crash, sudden power outage, or user killing the process), CINEMATIC STUDIO executes an automatic **Reconciliation Walk** on startup:

```
[ Desktop App Starts Up ]
           |
           v
  (Rust QueueActor reads SQLite with WAL replay)
  Query: SELECT * FROM tasks WHERE state IN ('RUNNING', 'GENERATING', 'COLLECTING')
           |
           v
  [ Are there orphaned in-flight tasks? ]
           |
           +---> NO: Resume normal idle state.
           |
           +---> YES: For each orphaned task:
                   |
                   v
  [ Step 1: Query Local Communication Bridge ]
  Does the assigned Chrome Profile extension report an active tab for this task?
                   |
     +-------------+-------------+
     |                           |
     v (YES: Generation in prog.) v (NO / Ambiguous)
  [ Re-attach Monitor ]         [ Transition to NEEDS_ATTENTION ]
  - Resume polling progress     - Display in UI Recovery Drawer:
  - Do NOT trigger new render     "Task #42 was generating when app closed.
                                  Check provider website before re-running."
```

### Critical Safeguard: Zero Duplicate Generations
The recovery engine **never blindly re-dispatches a generation task**. Doing so could waste precious user subscription credits, generate duplicate takes, or desynchronize continuity frame bindings. If any ambiguity exists, the system flags the task as `NEEDS_ATTENTION` and waits for operator verification.

---

## 4. Priority Scheduling & Concurrency Semaphores

The Queue Scheduler enforces strict resource boundaries:

```rust
// Rust Queue Scheduler Core Logic (tokio-based)
pub struct QueueScheduler {
    global_concurrency: Arc<tokio::sync::Semaphore>, // e.g., max 2 tasks total
    profile_locks: Arc<DashMap<String, Arc<tokio::sync::Mutex<()>>>>, // 1 task per profile
    db_pool: r2d2::Pool<SqliteConnectionManager>,
}

impl QueueScheduler {
    pub async fn process_next(&self) {
        // 1. Acquire global concurrency permit (protects host RAM)
        let _permit = self.global_concurrency.acquire().await.unwrap();

        // 2. Fetch highest-priority pending task from SQLite
        let task = self.fetch_highest_priority_task().await;
        
        // 3. Lock profile to ensure single-task-per-profile execution
        let profile_lock = self.profile_locks.entry(task.profile_id.clone())
            .or_insert_with(|| Arc::new(tokio::sync::Mutex::new(())))
            .clone();
            
        let _profile_guard = profile_lock.lock().await;

        // 4. Dispatch task to BridgeActor
        self.dispatch_task(task).await;
    }
}
```

This dual-lock mechanism guarantees:
- **Zero Profile Collisions**: Profile 1 never receives a second generation command while still processing the first.
- **Global Host RAM Protection**: Total active generative processes across all profiles never exceed the configured system concurrency threshold.

