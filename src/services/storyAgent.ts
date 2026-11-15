import { CameraFraming, CameraMovement, CameraAngle, SceneContinuityRecord } from '../types';

export type SupportedAIWebsite = 'chatgpt' | 'gemini' | 'claude' | 'google_flow';

/**
 * ARCHITECTURAL MANDATE (Milestone A / ADR-002):
 * CINEMATIC STUDIO uses NO direct AI APIs, NO API keys, and NO external inference endpoints.
 * All AI capabilities are orchestrated through genuine Google Chrome interacting with
 * supported AI website interfaces via the Native Messaging Host and Chrome Extension.
 */
export interface BrowserAgentDispatchTask {
  projectId: string;
  targetWebsite: SupportedAIWebsite;
  prompt: string;
  contextBrief?: string;
}

export interface BrowserAgentDispatchResult {
  success: boolean;
  taskId?: string;
  status: 'WAITING_FOR_BROWSER' | 'HUMAN_ACTION_REQUIRED' | 'SUBMITTED' | 'COMPLETED' | 'FAILED';
  message?: string;
  extractedResponse?: string;
  error?: string;
}

export interface IBrowserAgentDispatcher {
  isBrowserAvailable(): boolean;
  dispatchToBrowser(task: BrowserAgentDispatchTask): Promise<BrowserAgentDispatchResult>;
}

export interface StoryChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationalStorySession {
  id: string;
  projectId: string;
  targetWebsite: SupportedAIWebsite;
  messages: StoryChatMessage[];
  productionBible?: ProductionPackage;
  isLocked: boolean;
  created_at: number;
  updated_at: number;
}

export interface StoryDialogueResponse {
  reply: string;
  clarificationNeeded: boolean;
  clarificationQuestions?: string[];
  productionBible?: ProductionPackage;
  requiresBrowser?: boolean;
  status?: string;
}

export interface ProductionPackage {
  // 1. Story concept
  storyConcept: string;
  // 2. Full narrative
  fullNarrative: string;
  // 3. Beginning, middle, and ending
  acts: {
    actNumber: number;
    title: string;
    description: string;
    dramaticBeat: string;
  }[];
  // 4. Scene-by-scene breakdown
  scenes: ProductionScene[];
  // 5. Character Bible
  characters: {
    name: string;
    role: string;
    // 6. Character appearance descriptions
    appearance: string;
    wardrobe: string;
    // 7. Character reference image requirements
    referenceImagePrompt: string;
    promptLock: string;
  }[];
  // 8. Environment and location descriptions
  environments: {
    name: string;
    type: string;
    timeOfDay: string;
    lightingRules: string;
    promptLock: string;
  }[];
  // 9. Visual style guide
  visualStyleGuide: string;
  // 10. Cinematography guide
  cinematographyGuide: string;
  // 11. Camera movement instructions
  cameraMovementGuide: string;
  // 12. Lighting instructions
  lightingGuide: string;
  // 13. Color grading direction
  colorGradingDirection: string;
  // 14. Background music direction
  backgroundMusicDirection: string;
  // 15. Sound effect requirements
  soundEffectRequirements: string[];
  // Calculated stats
  totalDurationSeconds: number;
  totalClipsCount: number;
}

export interface ProductionScene {
  sceneNumber: number;
  title: string;
  dramaticBeat: string;
  location: string;
  timeOfDay: string;
  // 16. Scene continuity instructions
  continuityInstructions: string;
  // 17. First-frame descriptions
  firstFrameDescription: string;
  // 18. Last-frame descriptions
  lastFrameDescription: string;
  // 19. Image-generation prompts where required
  imagePrompt: string;
  // 20. Video-generation prompts
  videoPrompt: string;
  // 21. Negative prompts where supported
  negativePrompt: string;
  // 22. Scene duration (~10s)
  targetDurationSeconds: number;
  // 23. Scene transition instructions
  transitionInstruction: string;
  // Technical camera setup
  framing: CameraFraming;
  angle: CameraAngle;
  movement: CameraMovement;
  subjectAction: string;
  lightingSetup: string;
  soundEffects: string;
  musicCue: string;
  continuityRecord: SceneContinuityRecord;
}

export interface StoryAnalysisResult extends ProductionPackage {
  title: string;
  logline: string;
}

export function parseRequestedDuration(input?: string): number {
  if (!input || !input.trim()) return 60; // Default 1 minute
  const text = input.toLowerCase().trim();

  // Check hours
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b/);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    return Math.round(hours * 3600);
  }

  // Check minutes
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minute|minutes|min|mins|m)\b/);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]);
    return Math.round(mins * 60);
  }

  // Check seconds
  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:second|seconds|sec|secs|s)\b/);
  if (secMatch) {
    return Math.round(parseFloat(secMatch[1]));
  }

  // Raw number fallback (assume seconds if <= 300, minutes if < 10)
  const num = parseFloat(text);
  if (!isNaN(num)) {
    if (num <= 10) return Math.round(num * 60);
    return Math.round(num);
  }

  return 60;
}

export const storyAgent = {
  parseRequestedDuration,

  /**
   * Creates a new conversational narrative session for multi-turn story development
   * using the in-workspace browser automation bridge.
   */
  createSession(projectId: string, targetWebsite: SupportedAIWebsite = 'chatgpt'): ConversationalStorySession {
    const now = Date.now();
    return {
      id: `session_${now}_${Math.random().toString(36).substring(2, 9)}`,
      projectId,
      targetWebsite,
      messages: [],
      isLocked: false,
      created_at: now,
      updated_at: now
    };
  },

  /**
   * Multi-turn narrative dialogue interface.
   * STRICT NO-AI-API ARCHITECTURE: Dispatches prompts strictly through the embedded
   * Chrome browser automation bridge. Does not make direct HTTP requests to LLM inference endpoints.
   */
  async sendStoryMessage(
    session: ConversationalStorySession,
    userPrompt: string,
    dispatcher?: IBrowserAgentDispatcher
  ): Promise<StoryDialogueResponse> {
    const now = Date.now();
    session.messages.push({
      id: `msg_u_${now}`,
      role: 'user',
      content: userPrompt,
      timestamp: now
    });
    session.updated_at = now;

    // Truthful architectural gate: If embedded browser is not active, report browser requirement
    if (!dispatcher || !dispatcher.isBrowserAvailable()) {
      const responseText = 'Embedded Chrome is not currently connected. CINEMATIC STUDIO uses in-workspace browser automation with ChatGPT, Gemini, or Claude rather than direct AI APIs. Please launch the in-workspace Chrome browser in the AI Workspace.';
      session.messages.push({
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      });
      return {
        reply: responseText,
        clarificationNeeded: false,
        requiresBrowser: true,
        status: 'WAITING_FOR_BROWSER'
      };
    }

    try {
      // Dispatch task through Native Messaging / Extension bridge
      const dispatchResult = await dispatcher.dispatchToBrowser({
        projectId: session.projectId,
        targetWebsite: session.targetWebsite,
        prompt: userPrompt
      });

      if (!dispatchResult.success) {
        const errorText = dispatchResult.error || 'Failed to dispatch prompt to embedded browser.';
        session.messages.push({
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: Date.now()
        });
        return { reply: errorText, clarificationNeeded: false, status: dispatchResult.status };
      }

      const reply = dispatchResult.extractedResponse || 'Task dispatched to browser. Awaiting response extraction from website.';
      session.messages.push({
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now()
      });

      return {
        reply,
        clarificationNeeded: false,
        status: dispatchResult.status
      };
    } catch (err: any) {
      const errorMsg = `Browser Agent Error: ${err?.message || String(err)}`;
      session.messages.push({
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now()
      });
      return { reply: errorMsg, clarificationNeeded: false, status: 'FAILED' };
    }
  },

  /**
   * Analyzes screenplay narrative and duration into complete 23-point production package.
   * Generates structured ~10-second scenes with Cinematic Continuity Engine.
   */
  analyzeStory(rawText: string, projectName: string = 'Untitled Film', durationInput?: string): StoryAnalysisResult {
    const cleanText = rawText.trim();
    const durationSeconds = this.parseRequestedDuration(durationInput);
    const targetClipsCount = Math.max(1, Math.min(720, Math.round(durationSeconds / 10)));

    // Extract title from first line if formatted as title
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    let detectedTitle = projectName;
    if (lines.length > 0 && lines[0].length < 60 && !lines[0].toLowerCase().startsWith('scene')) {
      detectedTitle = lines[0].replace(/^[#*-]\s*/, '').replace(/^title:\s*/i, '').trim();
    }

    // Extract character names from screenplay dialogue / action syntax
    const nameRegex = /\b([A-Z][a-z]{2,15}(?:\s[A-Z][a-z]{2,15})?)\b/g;
    const stopWords = new Set([
      'The', 'Scene', 'Act', 'Shot', 'Interior', 'Exterior', 'Int', 'Ext', 'Day', 'Night',
      'Camera', 'Close', 'Wide', 'Medium', 'Action', 'Cut', 'Fade', 'Audio', 'Music', 'Lights',
      'Title', 'Logline'
    ]);

    const detectedNames: string[] = [];
    let match;
    while ((match = nameRegex.exec(cleanText)) !== null) {
      const name = match[1];
      if (!stopWords.has(name) && name.length > 3 && !detectedNames.includes(name)) {
        detectedNames.push(name);
      }
    }

    const leadCharName = detectedNames[0] || 'Protagonist';
    const partnerCharName = detectedNames[1] || 'Supporting Character';

    // 5. Character Bible
    const characters = [
      {
        name: leadCharName,
        role: 'Protagonist / Lead',
        appearance: `Lead protagonist featuring grounded natural facial structure, expressive eyes, authentic posture suited to: ${cleanText.slice(0, 100)}`,
        wardrobe: 'Grounded contextual attire suited to narrative tone and environment.',
        referenceImagePrompt: `Cinematic portrait of ${leadCharName}, authentic natural facial features, 35mm film photography, 85mm f/1.4 lens, realistic skin pores, emotional rim lighting, 8k ultra-detailed photorealistic.`,
        promptLock: `cinematic 35mm photograph of ${leadCharName}, distinctive expressive eyes, natural skin texture, anamorphic lens flare`
      },
      {
        name: partnerCharName,
        role: 'Supporting Role',
        appearance: `Supporting character complementing ${leadCharName}, distinct silhouette and facial features.`,
        wardrobe: 'Contextually consistent wardrobe matching narrative world aesthetics.',
        referenceImagePrompt: `Cinematic portrait of ${partnerCharName}, soft natural lighting, shallow depth of field, 35mm film tone, photorealistic 8k.`,
        promptLock: `cinematic photograph of ${partnerCharName}, natural aesthetic, distinct profile, soft diffuse lighting, 35mm film grain`
      }
    ];

    // 8. Environment & Location Descriptions
    const environments = [
      {
        name: 'Primary Dramatic Environment',
        type: 'Interior / Exterior',
        timeOfDay: 'Cinematic Lighting Window',
        lightingRules: 'Soft directional key light with motivated backlight and natural practicals.',
        promptLock: 'cinematic setting, rich atmospheric depth, 35mm anamorphic'
      },
      {
        name: 'Secondary Transit / Contrast Location',
        type: 'Transition Location',
        timeOfDay: 'Golden Hour / Low Light',
        lightingRules: 'High contrast practicals with volumetric depth.',
        promptLock: 'atmospheric cinematic scene, high dynamic range, amber tones'
      }
    ];

    // 3. Beginning, Middle, Ending Narrative Acts
    const acts = [
      {
        actNumber: 1,
        title: 'Act I: Inciting Incident & Objective',
        description: `${leadCharName} establishes core intent within narrative context: ${cleanText.slice(0, 150)}`,
        dramaticBeat: 'Establishing stakes, spatial presence, and character objective.'
      },
      {
        actNumber: 2,
        title: 'Act II: Escalation & Rising Stakes',
        description: `Tension intensifies as ${leadCharName} and ${partnerCharName} navigate obstacles.`,
        dramaticBeat: 'Confrontation of opposing forces and narrative crux.'
      },
      {
        actNumber: 3,
        title: 'Act III: Climax & Resolution',
        description: `The sequence culminates in dramatic impact and emotional clarity.`,
        dramaticBeat: 'Resolution of primary tension with lasting cinematic resonance.'
      }
    ];

    // Camera Framing & Movements Palette
    const framings: CameraFraming[] = ['WIDE', 'MEDIUM', 'CLOSE_UP', 'MEDIUM', 'WIDE', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'OVER_THE_SHOULDER'];
    const angles: CameraAngle[] = ['EYE_LEVEL', 'LOW_ANGLE', 'EYE_LEVEL', 'HIGH_ANGLE', 'DUTCH', 'BIRDS_EYE'];
    const movements: CameraMovement[] = ['DOLLY_IN', 'TRACKING', 'STATIC', 'PAN_LEFT', 'PAN_RIGHT', 'DOLLY_OUT', 'ORBIT'];

    // 4. Progressive Scene-by-Scene Generation (Up to 720 scenes with Continuity Engine)
    const scenes: ProductionScene[] = [];

    for (let i = 1; i <= targetClipsCount; i++) {
      const framing = framings[(i - 1) % framings.length];
      const angle = angles[(i - 1) % angles.length];
      const movement = movements[(i - 1) % movements.length];
      const env = environments[(i - 1) % environments.length];

      // Continuity Engine: Link First Frame of Scene N to Last Frame of Scene N-1
      const prevSceneLastFrame = i > 1
        ? scenes[i - 2].lastFrameDescription
        : `Establishing camera perspective on ${env.name}, atmospheric light setting the emotional tone.`;

      const firstFrame = i === 1
        ? `Wide establishing frame: ${env.name} bathed in ${env.timeOfDay} lighting. Atmosphere is thick with emotional resonance.`
        : `Continuous handoff from previous scene closing frame: Directly matching ${prevSceneLastFrame}, camera resumes tracking ${leadCharName}.`;

      const lastFrame = `Final frame of Shot #${i.toString().padStart(3, '0')}: ${leadCharName} completes motion, eye line fixed toward target, holding for seamless cut to next angle.`;

      const promptAction = `${leadCharName} executes motivated dramatic movement in ${env.name}.`;

      const videoPrompt = `Cinematic ${framing.toLowerCase().replace('_', ' ')} ${angle.toLowerCase().replace('_', ' ')} shot, 10s video. ${promptAction} Atmospheric ${env.lightingRules}. Camera ${movement.toLowerCase().replace('_', ' ')}. 35mm anamorphic cinema lens, natural film grain, shallow depth of field, photorealistic 8k production quality.`;

      const negativePrompt = `low quality, amateur, blurry, cartoon, 3d render, distorted faces, unrealistic movement, morphing limbs, oversaturated, watermark, subtitles`;

      const imagePrompt = `Cinematic keyframe 35mm photograph: ${promptAction} Photorealistic, 85mm portrait, Kodak Vision3 500T color science.`;

      const soundEffects = 'Atmospheric environmental tone, motivated foley, natural reverb.';
      const musicCue = 'Cinematic score underscoring dramatic beat and emotional rhythm.';

      const continuityRecord: SceneContinuityRecord = {
        scene_number: i,
        scene_purpose: `Story beat ${i}/${targetClipsCount}`,
        previous_scene_connection: i > 1 ? `Connects seamlessly from Scene #${(i - 1).toString().padStart(3, '0')}` : 'Opening establishing scene',
        opening_frame_description: firstFrame,
        closing_frame_description: lastFrame,
        character_states: [
          {
            character_name: leadCharName,
            wardrobe: characters[0].wardrobe,
            hair_accessories: 'Natural realistic styling',
            props: 'Narrative props',
            emotional_state: 'Focused, dramatic intent'
          }
        ],
        location_state: {
          environment_name: env.name,
          weather: 'Atmospheric',
          time_of_day: env.timeOfDay,
          lighting: env.lightingRules,
          color_palette: 'Cinematic filmic grading palette'
        },
        camera_setup: {
          framing,
          angle,
          movement,
          style: '35mm anamorphic prime lens, T1.5 shallow depth'
        },
        action_description: promptAction,
        video_prompt: videoPrompt,
        negative_prompt: negativePrompt,
        image_prompt: imagePrompt,
        sound_effects: soundEffects,
        background_music_cue: musicCue,
        color_grading_direction: 'Kodak Vision3 emulation: natural skin tones, soft highlight rolloff',
        transition_instruction: i % 4 === 0 ? 'Crossfade (1.0s)' : 'Direct Match Cut (0s)',
        expected_duration_seconds: 10
      };

      scenes.push({
        sceneNumber: i,
        title: `Scene ${i.toString().padStart(3, '0')}`,
        dramaticBeat: `Beat ${i} progression`,
        location: env.name,
        timeOfDay: env.timeOfDay,
        continuityInstructions: `Maintain character visual locks for ${leadCharName}. Opening matches closing frame of previous shot.`,
        firstFrameDescription: firstFrame,
        lastFrameDescription: lastFrame,
        imagePrompt,
        videoPrompt,
        negativePrompt,
        targetDurationSeconds: 10,
        transitionInstruction: i % 4 === 0 ? 'Crossfade (1.0s)' : 'Match Cut',
        framing,
        angle,
        movement,
        subjectAction: promptAction,
        lightingSetup: env.lightingRules,
        soundEffects,
        musicCue,
        continuityRecord
      });
    }

    return {
      title: detectedTitle,
      logline: cleanText.length > 200 ? cleanText.slice(0, 200) + '...' : cleanText || 'A cinematic masterpiece crafted with emotional continuity and visual precision.',
      storyConcept: cleanText || 'A cinematic narrative told through purposeful cinematography and continuous emotional beats.',
      fullNarrative: `Title: ${detectedTitle}\n\nAct I:\n${acts[0].description}\n\nAct II:\n${acts[1].description}\n\nAct III:\n${acts[2].description}`,
      acts,
      scenes,
      characters,
      environments,
      visualStyleGuide: 'Shot on 35mm anamorphic camera with shallow depth of field, authentic film grain, soft halation around practical lights, and natural cinematic color science.',
      cinematographyGuide: 'Dynamic combination of steady dolly movements, intimate close-ups capturing nuanced micro-expressions, and atmospheric wide establishing angles.',
      cameraMovementGuide: 'Smooth motivated camera moves: dolly-in on key emotional discoveries, slow tracking during transit, and static locks on moments of intense contemplation.',
      lightingGuide: 'Naturalistic soft lighting with gentle diffusion and warm motivated rim light.',
      colorGradingDirection: 'Kodak Vision3 250D emulation: rich warm skin tones, soft highlights, natural shadow rolloff.',
      backgroundMusicDirection: 'Emotional acoustic string instrumentation, subtle ambient pads, and evolving melodic cues.',
      soundEffectRequirements: [
        'High-fidelity ambient room and environmental tone',
        'Foley: footsteps and surface interactions',
        'Fabric rustling and intimate movement sounds',
        'Environmental natural acoustic reverb'
      ],
      totalDurationSeconds: durationSeconds,
      totalClipsCount: targetClipsCount
    };
  }
};
