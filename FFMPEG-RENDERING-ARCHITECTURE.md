# FFMPEG RENDERING ARCHITECTURE
## CINEMATIC STUDIO — PHASE 4 ARCHITECTURE BLUEPRINT

**Status:** APPROVED & IMPLEMENTED  
**Scope:** Dual-Pipeline Concatenation, Filtergraphs, Conforming Standards & Process Resource Bounds

---

## 1. DUAL-PIPELINE CONCATENATION STRATEGY

To balance performance against visual fidelity when assembling heterogeneous AI provider outputs, the engine implements a deterministic dual-pipeline branching strategy:

```
                             [ Timeline Clip Set ]
                                      │
                                      ▼
                        [ Concat Compatibility Audit ]
                      (Resolution, FPS, Codec, Pixel Format,
                       Audio Streams, Sample Rate, Transitions)
                                      │
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
             All Criteria Match?                 Any Mismatch?
             (100% Identical)                  (Mixed AI Outputs)
                     │                                 │
                     ▼                                 ▼
         [ PIPELINE A: STREAM COPY ]       [ PIPELINE B: NORMALIZING TRANSCODE ]
         - Zero quality degradation        - Letterbox / Pillarbox auto-pad
         - Muxing throughput: > 500 MB/s   - Conforms to Constant 24.000 FPS
         - CPU utilization: < 5%           - Generates synthetic audio (anullsrc)
         - Minimal RAM consumption         - Conforms to yuv420p color matrix
```

---

## 2. PIPELINE SPECIFICATIONS

### Pipeline A — Stream-Copy Demuxer Concat
- **Preconditions**:
  - Exact matching width & height across all source video streams.
  - Matching constant frame rate (CFR) with delta $< 0.001$ fps.
  - Identical video codec (e.g., all `h264`).
  - Identical pixel format (`yuv420p`).
  - Matching audio presence (all clips have stereo AAC at 48,000 Hz, or all clips have no audio).
  - No transition effects applied.
- **FFmpeg Invocation**:
  ```bash
  ffmpeg -f concat -safe 0 -i concat_manifest.txt -c copy -movflags +faststart output.mp4
  ```

### Pipeline B — Normalizing Transcode Filtergraph
- **Trigger**: Any deviation in resolution, VFR vs CFR, missing audio streams, or crossfades.
- **Video Conformance Chain**:
  ```
  [i:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24,format=yuv420p[vi]
  ```
- **Audio Conformance Chain & Silent Clip Fallback**:
  If a clip lacks an audio track (typical of raw Veo/Luma outputs), a synthetic silence stream matching the exact clip duration is generated:
  ```
  anullsrc=channel_layout=stereo:sample_rate=48000:d=<duration>[ai]
  ```
- **Final Concat Node**:
  ```
  [v0][a0][v1][a1]...concat=n=N:v=1:a=1[outv][outa]
  ```

---

## 3. HARDWARE RESOURCE CONTROL & RAM BOUNDS

To preserve host system stability on a 20 GB Windows 11 workstation:

1. **Subprocess Pipe Streaming**:
   Frames stream directly between demuxer, filtergraph, and encoder inside the FFmpeg process. Neither the Tauri Rust backend nor the React frontend loads raw media frames into application memory.
2. **Buffer Configuration Parameters**:
   - `-max_muxing_queue_size 1024`: Bounds the packet multiplexing queue memory buffer to prevent unbounded growth when multiplexing complex audio/video streams.
   - `-bufsize 20M`: Sets the video buffer verifier (VBV) decoder buffer size for rate control. (Note: this controls bitstream smoothing, while physical process RAM is isolated by OS process boundaries).
   - `-threads 4`: Caps CPU worker threads to leave headroom for OS scheduling and UI rendering.
3. **Machine-Readable Progress Pipe**:
   - Invocation includes `-progress pipe:1 -nostats`.
   - Output parsed via key-value line parser (`out_time_ms`, `fps`, `frame`, `progress`).
   - Dispatched to desktop frontend via Tauri events or polled through SQLite job status.

