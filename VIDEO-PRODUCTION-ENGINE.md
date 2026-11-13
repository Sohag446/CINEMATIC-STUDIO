# VIDEO PRODUCTION ENGINE & PIPELINE SPECIFICATION
## CINEMATIC STUDIO: Long-Form Narrative Orchestration

---

## 1. End-to-End Production Pipeline Lifecycle

```
[ Raw Narrative Story / Screenplay / Concept ]
                     |
                     v
+---------------------------------------------------------------+
| STAGE 1: NARRATIVE DECOMPOSITION (Story Engine)               |
| - Three-Act / Five-Act Structural Breakdown                   |
| - Character Roster Extraction & Archetype Analysis            |
| - Environmental Set & Location Cataloging                     |
+-------------------------------+-------------------------------+
                                | (Operator Approves Plan)
                                v
+---------------------------------------------------------------+
| STAGE 2: SCENE & SHOT BREAKDOWN (Clip Planning Engine)        |
| - Scenes 01 to N with dramatic beats & emotional pacing       |
| - Shots 001 to 360+ with camera angles, lenses, & actions     |
| - Sequential vs Parallel generation dependency graph          |
+-------------------------------+-------------------------------+
                                | (Pre-Flight Asset Audit)
                                v
+---------------------------------------------------------------+
| STAGE 3: ASSET & VAULT PRE-FLIGHT                             |
| - Character Seed Locking (Front, Profile, Wardrobe)           |
| - Location Master Reference Locking                           |
| - Audio / Scratch Dialogue Mapping                            |
+-------------------------------+-------------------------------+
                                | (Task Queue Dispatch)
                                v
+---------------------------------------------------------------+
| STAGE 4: PRODUCTION EXECUTION & MONITORING                    |
| - Multi-Profile Task Queue Dispatching                        |
| - Continuity Start-Frame Handover (Clip N -> Clip N+1)        |
| - Automated Clip Ingestion & Checksum Verification            |
+-------------------------------+-------------------------------+
                                | (Human Review Gate)
                                v
+---------------------------------------------------------------+
| STAGE 5: OPERATOR VERIFICATION & TIMELINE LOCK                |
| - Visual Continuity Review & Defect Flagging                  |
| - Accept Take / Reroll Alternative Take                       |
| - Multi-Track Assembly via FFmpeg Engine                      |
+---------------------------------------------------------------+
```

---

## 2. Granular Clip Decomposition & Pacing Architecture

Long-form cinematic storytelling cannot be generated in monolithic prompts. The engine breaks down stories into granular, bite-sized production units matched to consumer AI video model limits (typically **5 to 10 seconds**).

### 2.1 Production Scale Mathematics

| Target Film Runtime | Average Clip Duration | Required Master Clips | Pacing Strategy |
| :--- | :--- | :--- | :--- |
| **5 Minutes** | 8.0 Seconds | **~ 38 Clips** | High-tempo action or dynamic music video |
| **10 Minutes** | 10.0 Seconds | **~ 60 Clips** | Standard narrative short |
| **20 Minutes** | 9.0 Seconds | **~ 133 Clips** | Complex multi-scene festival short |
| **60 Minutes** | 10.0 Seconds | **~ 360 Clips** | Feature-length episodic or narrative film |

---

## 3. Clip Dependency Graph & Execution Scheduling

Not all clips must be generated sequentially. CINEMATIC STUDIO builds a **Directed Acyclic Graph (DAG)** of clip dependencies:

```
Scene 01 (Alleyway)                      Scene 02 (Diner Interior)
[Clip 01: Hero walks into rain]          [Clip 04: Waitress pours coffee]
       |                                                |
       v (Requires End Frame of Clip 01)                v (Requires End Frame of Clip 04)
[Clip 02: Close-up hero looking up]      [Clip 05: Detective enters door]
       |
       v (Requires End Frame of Clip 02)
[Clip 03: Reveal villain in shadows]
```

### Scheduling Rules:
1. **Intra-Scene Continuity Dependencies**: If Clip $N+1$ depends on the physical exit vector or end-frame of Clip $N$, it is locked in `WAITING_FOR_DEPENDENCY` until Clip $N$ is generated, downloaded, and approved by the operator.
2. **Inter-Scene Parallelism**: Independent scenes (e.g., Scene 01 in the Alleyway and Scene 02 in the Diner) have zero mutual visual dependencies. They can be scheduled concurrently across different Chrome profiles (e.g. Profile 1 working on Scene 01 while Profile 2 works on Scene 02).

---

## 4. Human Review & Quality Assurance Gates

Automation must never silently overwrite or advance past flawed generative output. Every generated clip passes through a mandatory QA gate:

```
[ New Clip Downloaded ] -> [ Automatic FFmpeg Verification ]
                                     |
           +-------------------------+-------------------------+
           | (Corrupted / 0-byte)                              | (Valid MP4)
           v                                                   v
   [ Mark FAILED ]                                    [ Transition to REVIEW ]
   [ Notify Operator ]                                [ Display in Inspector ]
                                                               |
                                     +-------------------------+-------------------------+
                                     |                                                   |
                                     v                                                   v
                            [ Operator REJECTS ]                                [ Operator ACCEPTS ]
                            - Flag reason: Visual Artifact,                     - Mark Status: APPROVED
                              Character Distortion,                             - Extract Final End Frame
                              Camera Drift                                      - Unlock Next Dependent Clip
                            - Retain Take in History                            - Generate 360p Timeline Proxy
                            - Re-queue with revised seed                        - Append to Master Timeline
```

### Defect Tagging Mechanism:
When an operator rejects a take, they can select standard defect tags:
- `DEFECT_CHARACTER_MORPH`: Character face or body structure changed mid-clip.
- `DEFECT_CONTINUITY_BREAK`: Wardrobe color or lighting does not match previous clip.
- `DEFECT_MOTION_GLITCH`: Hallucinatory physics, extra limbs, or unnatural speed.
- `DEFECT_PROMPT_DRIFT`: Model ignored key instructions (e.g. omitted the umbrella).

These tags are stored in SQLite and automatically fed into the Prompt Engine's negative prompt compiler for the subsequent take.

