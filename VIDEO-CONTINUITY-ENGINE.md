# VIDEO CONTINUITY ENGINE ARCHITECTURE
## CINEMATIC STUDIO: Visual, Spatial & Temporal Consistency System

---

## 1. The Core Challenge of AI Video Continuity

Consumer AI video models (Google Veo, Runway, Luma, Kling) operate as probabilistic diffusion systems. Even when supplied with identical prompts, consecutive generations drift significantly in:
- Facial geometry and facial micro-features.
- Wardrobe fabric patterns, accessories, and colors.
- Spatial orientation (180-degree rule violations, inverted screen direction).
- Prop permanence (objects disappearing or mutating between cuts).
- Lighting temperature and shadow angles.

CINEMATIC STUDIO treats continuity as a **multi-layered constraint satisfaction problem**, combining automated frame extraction with rule-based prompt anchoring and classic cinematic editing conventions.

---

## 2. Multi-Tier Continuity Tracking Matrix

```
+-------------------------------------------------------------------------------------------------+
| CONTINUITY ATTRIBUTE   | TRACKED PARAMETERS                    | ENFORCEMENT MECHANISM          |
+------------------------+---------------------------------------+--------------------------------+
| **Character Identity** | Facial structure, hair style/color,   | Master Character Reference Vault|
|                        | skin tone, unique marks (scars, eyes) | Seed Image Injection + Prompts |
+------------------------+---------------------------------------+--------------------------------+
| **Wardrobe & Props**   | Garment color, layers, held items     | Strict Wardrobe Tokens         |
|                        | (e.g., leather briefcase in right hand)| Negative prompt against vanish |
+------------------------+---------------------------------------+--------------------------------+
| **Spatial / Screen Dir**| Motion vector (Left-to-Right, Pan,   | Camera & Subject Vector Tags   |
|                        | Eyeline match, 180-degree line)       | (e.g., [ScreenDir: L->R])      |
+------------------------+---------------------------------------+--------------------------------+
| **Environmental Key**  | Sun position, rain density, neon key, | Shared Environment Lighting    |
|                        | ground wetness, background landmarks  | Master Template Injection      |
+------------------------+---------------------------------------+--------------------------------+
| **Temporal Edge Handover**| Final frame ($T_{end}$) of Clip $N$ | Automated FFmpeg PNG extract   |
|                        | becomes Start frame of Clip $N+1$     | Injected into Video Provider   |
+------------------------+---------------------------------------+--------------------------------+
```

---

## 3. High-Precision Edge-Frame Extraction Pipeline

When Clip $N$ is completed and approved, the Media Engine immediately extracts the exact final frame of the video file to serve as the start anchor for Clip $N+1$:

```
[ Clip N Approved: "sc001_cl001.mp4" ]
                   |
                   v
  (Rust MediaActor spawns FFmpeg Subprocess)
  Command: ffmpeg -sseof -0.04 -i sc001_cl001.mp4 -update 1 -q:v 1 sc001_cl001_end.png
                   |
                   v
  (Verifies PNG integrity & dimensions: 1920x1080)
                   |
                   v
  (Saved to: projects/<id>/continuity_frames/sc001_cl001_end.png)
                   |
                   v
  (Automatically linked in SQLite to Clip N+1: continuity_start_frame_path)
```

### Frame Accuracy Guard:
Using `-sseof -0.04` extracts the frame within 40 milliseconds of the file's end boundary, preventing black-frame artifacts or partial container padding frames from contaminating the next generation.

---

## 4. Vector Handover & Momentum Matching

Human perception tolerates cuts between shots if momentum and gaze direction are preserved. The Continuity Engine tracks five kinematic parameters:

```typescript
export interface KinematicContinuityContext {
  characterId: string;
  exitScreenDirection: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT' | 'TOWARDS_CAMERA' | 'AWAY_FROM_CAMERA' | 'STATIC';
  exitVelocity: 'STATIONARY' | 'WALKING' | 'RUNNING' | 'SPRINTING';
  exitEyelineGaze: 'LOOKING_LEFT' | 'LOOKING_RIGHT' | 'LOOKING_UP' | 'LOOKING_DOWN' | 'DIRECT_EYELINE';
  exitLightingAngle: 'KEY_LIGHT_LEFT' | 'KEY_LIGHT_RIGHT' | 'BACKLIT' | 'DIFFUSE';
  heldProps: string[]; // e.g. ["silver revolver in right hand", "red duffel bag on left shoulder"]
}
```

When compiling the prompt for Clip $N+1$, the Prompt Engine automatically enforces kinematic continuity:
- If Clip $N$ had the character running **Left-to-Right**, Clip $N+1$ prompt is automatically prefixed:
  *"Continuing momentum from previous shot, character enters from left frame moving right at a steady run..."*
- If the operator attempts to set a contradictory camera angle that violates the 180-degree rule, the UI displays a soft advisory: *"Warning: Shot violates line of action from Shot 11. Flip camera axis or insert a cutaway."*

---

## 5. Continuity Validation Checklist & Filmmaking Fallbacks

Because AI video models cannot guarantee 100% visual perfection, CINEMATIC STUDIO incorporates professional cinematic mitigation workflows:

```
[ Clip N+1 Generated ]
          |
          v
+---------------------------------------------------------------+
| AUTOMATED CONTINUITY AUDIT                                    |
| 1. Does aspect ratio match master timeline? [PASS]            |
| 2. Does duration match target within 0.5s? [PASS]             |
| 3. Color histogram correlation > 0.70? [PASS/WARN]            |
+-------------------------------+-------------------------------+
                                |
                                v
+---------------------------------------------------------------+
| OPERATOR CONTINUITY REVIEW MODAL                              |
| Side-by-Side Split View:                                      |
| [ Clip N End Frame ]   vs   [ Clip N+1 Start Frame ]          |
|                                                               |
| Operator Options:                                             |
| [A] Accept Direct Cut (Visuals match seamlessly)              |
| [B] Minor Drift: Apply Cross-Dissolve / Match Blur in Render  |
| [C] Severe Break: Insert B-Roll / Reaction Cutaway Beat       |
| [D] Reject Take: Re-generate with higher seed weight          |
+---------------------------------------------------------------+
```

### The "B-Roll Cutaway" Heuristic:
When an AI video model fails to maintain perfect facial consistency across a cut, professional editors cut to a reaction shot of another character, a prop insert, or an atmospheric environment shot for 1.5 to 2.5 seconds. CINEMATIC STUDIO includes a one-click button: **"Insert 2-Second Atmospheric Cutaway"**, generating an intermediate transition shot that resets the audience's visual memory and preserves the illusion of continuity.

