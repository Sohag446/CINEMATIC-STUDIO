# TIMELINE ENGINE ARCHITECTURE
## CINEMATIC STUDIO — PHASE 4 ARCHITECTURE BLUEPRINT

**Status:** APPROVED & IMPLEMENTED  
**Scope:** Multitrack Data Model, Timeline Coordinates, Non-Destructive Editing & 360-Clip Virtualization

---

## 1. MULTITRACK DATA MODEL

The Timeline Subsystem supports a non-linear, multi-layered editing paradigm structured across ordered audio and video tracks.

```
┌────────────────────────────────────────────────────────────────────────┐
│ TRACK V2 (OVERLAY):   [ Lower Third Title ]      [ B-Roll Cutaway ]    │
├────────────────────────────────────────────────────────────────────────┤
│ TRACK V1 (VIDEO):     [ Scene 1 Shot 1 ] ───▶ [ Scene 1 Shot 2 ]       │
├────────────────────────────────────────────────────────────────────────┤
│ TRACK A1 (DIALOGUE):  [ Voiceover Narration 1 ] [ Voiceover 2 ]        │
├────────────────────────────────────────────────────────────────────────┤
│ TRACK A2 (MUSIC/SFX): [ ──────── Background Cinematic Music ──────── ] │
└────────────────────────────────────────────────────────────────────────┘
▲                       ▲                                                ▲
00:00:00                Playhead (Current Timecode)                      01:00:00
```

### Relational Hierarchy:
- **`projects`**: Root entity containing global settings (`target_aspect_ratio`, `target_fps`).
- **`timeline_tracks`**: Ordered vertical layers (`VIDEO`, `AUDIO`, `OVERLAY`) maintaining mute, lock, and volume controls.
- **`timeline_clips`**: Horizontal clip instances placed along the timeline coordinate space.
- **`timeline_transitions`**: Dynamic transitions between adjacent clips (Crossfade, Dissolve, Wipe).

---

## 2. TIMELINE COORDINATE SYSTEM & EDITING MATH

Each `timeline_clip` operates in two distinct coordinate frames:

1. **Timeline Coordinates** (Where and when the clip plays in the master composition):
   - `timeline_start_seconds`: Global offset in seconds from composition start (0.000s).
   - `timeline_duration_seconds`: Active visible duration on the timeline.
2. **Source Coordinates** (What portion of the source media asset is played):
   - `source_in_seconds`: Offset into source file where playback begins (In-Point).
   - `source_out_seconds`: Offset into source file where playback terminates (Out-Point).

$$\text{Effective Speed Factor} = \frac{\text{source\_out\_seconds} - \text{source\_in\_seconds}}{\text{timeline\_duration\_seconds}} = 1.0 \quad (\text{Standard Playback})$$

### Razor Split Operation (Non-Destructive)
When splitting a clip of duration $D$ at playhead offset $T_{\text{split}}$ where $\text{start} < T_{\text{split}} < \text{start} + D$:
- **Instance A (Left Half)**:
  - $\text{timeline\_start} = \text{start}$
  - $\text{timeline\_duration} = T_{\text{split}} - \text{start}$
  - $\text{source\_in} = \text{source\_in}$
  - $\text{source\_out} = \text{source\_in} + (T_{\text{split}} - \text{start})$
- **Instance B (Right Half)**:
  - $\text{timeline\_start} = T_{\text{split}}$
  - $\text{timeline\_duration} = \text{start} + D - T_{\text{split}}$
  - $\text{source\_in} = \text{source\_in} + (T_{\text{split}} - \text{start})$
  - $\text{source\_out} = \text{source\_out}$

Both instances link to the **identical** `media_asset_id`. No media is duplicated on disk.

---

## 3. 360-CLIP SCALE & VIRTUALIZATION STRATEGY

For a 60-minute feature or episodic production (360+ individual shots):
1. **Lightweight Metadata Footprint**:
   - Each clip descriptor serialized in memory consumes ~240 bytes.
   - 360 clips consume ~84 KB JSON payload.
   - 1,000 clips consume ~272 KB JSON payload (strictly under the 500 KB RAM limit).
2. **TanStack Virtualizer Windowing**:
   - Only clips visible in the viewport ($+ \text{overscan}=5$) have active DOM nodes rendered.
   - Prevents DOM node bloat and maintains a continuous 60 FPS scrubbing experience regardless of project length.
3. **Low-Frequency Sync**:
   - Playhead updates store state locally in React/Zustand; database synchronization is debounced to avoid SQLite disk writes during real-time scrubbing.

