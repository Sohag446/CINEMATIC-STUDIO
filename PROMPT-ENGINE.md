# INTELLIGENT PROMPT ENGINE ARCHITECTURE
## CINEMATIC STUDIO: Multi-Tier Prompt Compilation & Templating

---

## 1. Multi-Tier Prompt Compilation Pipeline

The user should never have to manually re-type character descriptions, lighting directives, and camera technical parameters for hundreds of shots. The Prompt Engine acts as an automated compiler that synthesizes high-level cinematic intent into model-optimized prompt strings.

```
+---------------------------------------------------------------------------------------+
| PROMPT COMPILER INPUT SOURCES                                                         |
|                                                                                       |
|  [ Character Vault ]       [ Environment Vault ]       [ Shot Cinematography ]        |
|  - Physical features       - Location architecture     - Lens (35mm Anamorphic)       |
|  - Locked wardrobe         - Weather & atmosphere      - Camera movement (Dolly-in)   |
|  - Emotional expression    - Time of day & lighting    - Subject action vector        |
|            |                         |                          |                     |
+------------+-------------------------+--------------------------+---------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------------+
| CONTINUITY & MOMENTUM INJECTOR                                                        |
| - Preceding shot end-frame visual context                                             |
| - Kinematic momentum handover ("Continuing left-to-right motion...")                  |
+--------------------------------------+------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------------+
| PROVIDER-SPECIFIC DIALECT TRANSLATOR                                                  |
|                                                                                       |
|  +--------------------+  +--------------------+  +--------------------------------+   |
|  | Google Veo Dialect |  | Runway Gen-3 Dial. |  | Luma / Kling Dialect           |   |
|  | Natural cinematic  |  | Dynamic camera tag |  | Keyframe & motion intensity    |   |
|  | narrative prose    |  | formatting         |  | parameters                     |   |
|  +---------+----------+  +---------+----------+  +----------------+---------------+   |
+------------|-----------------------|------------------------------|-------------------+
             |                       |                              |
             v                       v                              v
[ Final Compiled Prompt ] [ Final Compiled Prompt ] [ Final Compiled Prompt ]
```

---

## 2. Token Resolution & Vault Binding

Prompts support declarative variable tokens that resolve deterministically against the project's SQLite vaults:

### 2.1 Supported Semantic Tokens
- `{{char:ID:wardrobe}}`: Injects the canonical appearance and current wardrobe of the designated character.
- `{{char:ID:emotion}}`: Injects the character's facial expression matching the scene's emotional beat.
- `{{env:ID:lighting}}`: Injects the location's lighting key and atmospheric weather conditions.
- `{{cam:framing}}` / `{{cam:movement}}`: Injects standardized cinematic camera terminology.
- `{{continuity:prev_vector}}`: Injects directional kinematic momentum from the preceding shot.

### 2.2 Compilation Example

#### Raw Shot Metadata in Database:
- **Scene**: Rooftop Rain (Night)
- **Character**: Marcus Cole (Wearing damaged cyberpunk duster coat)
- **Action**: Sprinting toward edge of roof and vaulting over ledge
- **Camera**: 35mm anamorphic lens, Low-angle tracking shot, fast dolly forward
- **Previous Shot Context**: Running left-to-right at top speed

#### Output Compiled for Google Veo:
```
A cinematic 35mm anamorphic film shot at 24fps. Low-angle tracking camera rapidly dollies forward, following Marcus Cole, a rugged late-30s man with sharp stubble, soaked hair, and an open charcoal duster coat. Continuing his full-sprint momentum from left to right across a rain-slicked industrial rooftop, he leaps dynamically across a ten-foot alleyway gap between buildings. Background features towering neon corporate monoliths obscured by dense volumetric rain and atmospheric fog. Dramatic cold cyan edge-lighting with warm tungsten rim highlights. Photorealistic film grain, high dynamic range, cinematic motion blur.
```

---

## 3. Provider-Specific Dialect Adapters

Different AI models respond to fundamentally different syntax structures:

### 3.1 Google Veo / Flow Engine
- **Dialect Profile**: Highly responsive to natural narrative prose, photorealistic film stock references (e.g. *Kodak Vision3 500T, 35mm anamorphic*), lighting cues, and subtle emotional nuance. Avoids chaotic comma-separated keyword spam.

### 3.2 Runway Gen-3 Alpha Engine
- **Dialect Profile**: Excels with structured camera movement prefixes (e.g. `[Camera: Low angle fast tracking dolly in]`), subject action descriptions, and clean separation of lighting parameters.

### 3.3 Midjourney v6 / Flux (Reference Image Synthesis)
- **Dialect Profile**: Employs parametric flags (`--ar 16:9`, `--stylize 250`, `--v 6.1`), aesthetic style tags, and concise weighted keywords.

---

## 4. Negative Prompt Compilation

To suppress generative defects and model drift, the engine compiles a tailored negative prompt:

```sql
-- Standard Cinematic Studio Negative Filter
compiled_negative_prompt = 
  "CGI, 3D render, cartoon, anime, illustration, oversaturated, plastic skin, "
  "deformed limbs, extra fingers, mutated hands, camera jitter, warped face, "
  "text, watermark, subtitles, low resolution, blurry, flickering lighting"
```

If specific defects were flagged on previous takes (e.g., `DEFECT_CHARACTER_MORPH`), the negative compiler dynamically injects targeted counter-terms (e.g., *"changing facial hair, altering coat color, disappearing glasses"*).

---

## 5. Prompt Revision History & Visual Diff Engine

Every prompt iteration is immutably versioned in the SQLite `prompts` table:

```
[ Clip 14: Prompt Versions ]
- Version 1 (Auto-Compiled) -------------------- [View]
- Version 2 (Operator added: "rain splashes") -- [View]
- Version 3 (Approved for Generation) ---------- [ACTIVE]
```

### Prompt Diff Viewer:
The desktop UI provides a side-by-side textual diff highlighting additions in green and removals in red, ensuring that operator refinements are never lost or silently overwritten.

