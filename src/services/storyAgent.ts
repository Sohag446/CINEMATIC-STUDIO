import { CameraFraming, CameraMovement, CameraAngle, SceneContinuityRecord } from '../types';

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
   * Analyzes screenplay narrative and duration into complete 23-point production package
   * Generates up to 720 structured ~10-second scenes with Cinematic Continuity Engine
   */
  analyzeStory(rawText: string, projectName: string = 'Untitled Film', durationInput?: string): StoryAnalysisResult {
    const cleanText = rawText.trim();
    const durationSeconds = this.parseRequestedDuration(durationInput);
    const targetClipsCount = Math.max(1, Math.min(720, Math.round(durationSeconds / 10)));

    // Theme & Genre heuristics
    const isCyberpunk = /cyber|neon|hacker|ai|neural|blade|matrix|android|enforcer|dystopian/i.test(cleanText);
    const isRomantic = /love|romance|emotional|heart|couple|relationship|tear|teenage|bangladesh/i.test(cleanText);

    // Extract title
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    let detectedTitle = projectName;
    if (lines.length > 0 && lines[0].length < 60 && !lines[0].toLowerCase().startsWith('scene')) {
      detectedTitle = lines[0].replace(/^[#*-]\s*/, '').trim();
    }

    // Detect character names
    const nameRegex = /\b([A-Z][a-z]{2,15}(?:\s[A-Z][a-z]{2,15})?)\b/g;
    const stopWords = new Set([
      'The', 'Scene', 'Act', 'Shot', 'Interior', 'Exterior', 'Int', 'Ext', 'Day', 'Night',
      'Camera', 'Close', 'Wide', 'Medium', 'Action', 'Cut', 'Fade', 'Audio', 'Music', 'Lights',
      'Title', 'Logline', 'Bangladesh', 'Dhaka'
    ]);

    const detectedNames: string[] = [];
    let match;
    while ((match = nameRegex.exec(cleanText)) !== null) {
      const name = match[1];
      if (!stopWords.has(name) && name.length > 3 && !detectedNames.includes(name)) {
        detectedNames.push(name);
      }
    }

    const leadCharName = detectedNames[0] || (isRomantic ? 'Aayan Rahman' : isCyberpunk ? 'Elena Vance' : 'Commander Aris');
    const partnerCharName = detectedNames[1] || (isRomantic ? 'Zara Ahmed' : isCyberpunk ? 'Kaelen Morse' : 'Dr. Lyra Cross');

    // 5. Character Bible
    const characters = [
      {
        name: leadCharName,
        role: isRomantic ? 'Protagonist / Emotional Lead' : isCyberpunk ? 'Neural Archivist Infiltrator' : 'Expedition Commander',
        appearance: isRomantic
          ? 'Slender 18-year-old student, expressive sorrowful dark brown eyes, soft unstyled black hair falling over brow, quiet introverted posture.'
          : isCyberpunk
          ? 'Athletic build, sharp focused gaze, slight facial scar along right jawline, dark cropped hair, weathered combat demeanor.'
          : 'Tall commanding posture, steady piercing gray eyes, short trimmed dark hair, calm focused expression.',
        wardrobe: isRomantic
          ? 'Slightly faded navy blue cotton school uniform shirt with open collar, dark trousers, and worn canvas messenger bag.'
          : isCyberpunk
          ? 'Distressed brown leather tactical jacket with brass buckles, dark reinforced trousers, combat boots.'
          : 'Matte white pressurized EVA flight suit with titanium alloy magnetic harness.',
        referenceImagePrompt: `Cinematic portrait of ${leadCharName}, authentic natural facial features, 35mm film photography, 85mm f/1.4 lens, realistic skin pores, emotional rim lighting, 8k ultra-detailed photorealistic.`,
        promptLock: `cinematic 35mm photograph of ${leadCharName}, distinctive expressive eyes, natural skin texture, anamorphic lens flare`
      },
      {
        name: partnerCharName,
        role: isRomantic ? 'Co-Lead / Unrequited Love' : isCyberpunk ? 'Syndicate Enforcer' : 'Chief Science Officer',
        appearance: isRomantic
          ? 'Graceful 18-year-old student, deep expressive almond eyes, long flowing dark wavy hair, gentle bittersweet smile with hints of melancholy.'
          : isCyberpunk
          ? 'Imposing silhouette, angular jawline, cold calculating gaze, cybernetic optic scanner.'
          : 'Sharp observant eyes, tied-back auburn hair, thoughtful posture.',
        wardrobe: isRomantic
          ? 'Traditional light pastel embroidered cotton salwar kameez with delicate chiffon dupatta draped over shoulder.'
          : isCyberpunk
          ? 'Floor-length matte black armored duster coat with high structured collar.'
          : 'Deep cobalt blue technical flight jumpsuit with bio-monitor wrist terminal.',
        referenceImagePrompt: `Cinematic portrait of ${partnerCharName}, soft natural daylight, shallow depth of field, 35mm kodachrome tone, photorealistic 8k.`,
        promptLock: `cinematic photograph of ${partnerCharName}, natural beauty, gentle melancholy eyes, soft diffuse lighting, 35mm film grain`
      }
    ];

    // 8. Environment & Location Descriptions
    const environments = [
      {
        name: isRomantic ? 'Old Dhaka Rain-Washed Rooftop' : isCyberpunk ? 'Lower Sector 7 Neon Alley' : 'Lunar Outpost Observation Deck',
        type: 'Exterior',
        timeOfDay: isRomantic ? 'Late Monsoon Afternoon / Overcast' : 'Midnight / Rainstorm',
        lightingRules: isRomantic
          ? 'Soft diffuse gray monsoon daylight with gentle golden backlight breaking through storm clouds, glistening wet red-clay bricks.'
          : 'High contrast wet asphalt reflecting cyan and magenta volumetric neon signs.',
        promptLock: isRomantic
          ? 'vintage rooftop in Old Dhaka, monsoon rain droplets on wet terracotta pots, overcast misty sky, nostalgic emotional atmosphere'
          : 'cyberpunk alley at midnight, saturated cyan and magenta neon, heavy rainfall, 35mm anamorphic'
      },
      {
        name: isRomantic ? 'Bustling Historic Riverfront Terminal' : isCyberpunk ? 'Sub-Level Server Cavern' : 'Colony Ship Airload Vault',
        type: 'Exterior / Transit',
        timeOfDay: isRomantic ? 'Golden Hour Sunset' : 'Halogen Tungsten',
        lightingRules: isRomantic
          ? 'Warm low-angle amber sunlight casting long stretching silhouettes across rippling muddy river waters.'
          : 'Stark directional key light with deep negative fill.',
        promptLock: isRomantic
          ? 'busy river terminal at golden hour, amber warm haze, wooden boats on river, long shadows, emotional cinematic aesthetic'
          : 'industrial server room, high contrast chiaroscuro, amber strobe lighting'
      }
    ];

    // 3. Beginning, Middle, Ending Narrative Acts
    const acts = [
      {
        actNumber: 1,
        title: isRomantic ? 'Act I: The Silent Connection' : 'Act I: Infiltration & The Approach',
        description: isRomantic
          ? `${leadCharName} and ${partnerCharName} share quiet stolen glances during monsoon rain, a connection formed entirely without spoken words.`
          : `${leadCharName} breaches the perimeter under cover of harsh atmospheric conditions.`,
        dramaticBeat: 'Establishing yearning and emotional innocence against impending separation.'
      },
      {
        actNumber: 2,
        title: isRomantic ? 'Act II: The Unspoken Distance' : 'Act II: Rising Conflict & Confrontation',
        description: isRomantic
          ? `Social divides, family expectations, and imminent departure create an invisible chasm between the two teenagers.`
          : `${leadCharName} reaches the core objective as pursuit forces converge.`,
        dramaticBeat: 'Escalating emotional tension as time runs out.'
      },
      {
        actNumber: 3,
        title: isRomantic ? 'Act III: The Bittersweet Departure' : 'Act III: Climactic Escape & Aftermath',
        description: isRomantic
          ? `At the river terminal, one final lingering glance through closing transit gates seals their eternal unspoken love.`
          : `High-stakes escape and reflective resolution as the sun breaks over the horizon.`,
        dramaticBeat: 'Cathartic emotional resolution with lingering bittersweet resonance.'
      }
    ];

    // Camera Framing & Movements Palette
    const framings: CameraFraming[] = ['WIDE', 'MEDIUM', 'CLOSE_UP', 'MEDIUM', 'WIDE', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'OVER_THE_SHOULDER'];
    const angles: CameraAngle[] = ['EYE_LEVEL', 'LOW_ANGLE', 'EYE_LEVEL', 'HIGH_ANGLE', 'DUTCH', 'BIRDS_EYE'];
    const movements: CameraMovement[] = ['DOLLY_IN', 'TRACKING', 'STATIC', 'PAN_LEFT', 'PAN_RIGHT', 'DOLLY_OUT', 'ORBIT'];

    // 4. Progressive Scene-by-Scene Generation (Up to 720 scenes with Continuity Engine)
    const scenes: ProductionScene[] = [];

    const beatTemplatesRomantic = [
      { beat: 'Standing on the rain-swept terrace, watching water cascade from rusted tin awnings.', act: `${leadCharName} leans against the parapet, gazing quietly toward the distant horizon as raindrops catch the light.` },
      { beat: 'First visual encounter: eyes meet across the narrow balcony alleyway.', act: `${partnerCharName} steps out onto the opposite balcony, tucking damp hair behind ear, noticing ${leadCharName}.` },
      { beat: 'A fleeting, hesitant smile shared between the falling rain drops.', act: `Both smile faintly, an unspoken shared sorrow and innocent joy passing between them without words.` },
      { beat: 'Walking along the flooded narrow brick street as rickshaw bells echo.', act: `${leadCharName} walks slowly along the cobblestones, occasionally glancing back to see ${partnerCharName}'s silhouette.` },
      { beat: 'Sheltering beneath a tea stall canvas during an intense thunderstorm.', act: `They stand inches apart under dripping tarp, hands almost touching, breathing the earthy monsoon air.` },
      { beat: 'A folded paper note exchanged with trembling fingers.', act: `${leadCharName} extends a small folded dry note; ${partnerCharName} receives it gently, clutching it to chest.` },
      { beat: 'Evening golden light washing across the river ferry ghat.', act: `Wooden boats bob gently in amber ripples as crowds move past; the two remain still amidst the chaos.` },
      { beat: 'Family elders beckon from the departure terminal gates.', act: `${partnerCharName} turns backward reluctantly toward the embarking ferry, tears welling in quiet eyes.` },
      { beat: 'The distance expands as the ferry engine churns muddy water.', act: `${leadCharName} runs to the end of the wooden pier, standing motionless against the setting sun.` },
      { beat: 'Final lingering eye contact across thirty meters of expanding water.', act: `${partnerCharName} holds the paper note against the ferry railing, gazing back until silhouette fades into gold.` }
    ];

    const beatTemplatesAction = [
      { beat: 'Approaching the rain-slicked perimeter under scanning searchlights.', act: `${leadCharName} moves silently along the exterior wall, checking digital chronometer.` },
      { beat: 'Bypassing laser optical sensors with electromagnetic pulses.', act: `Sparks shower gently in the mist as heavy steel barrier doors slide open.` },
      { beat: 'Infiltrating the central server cavern beneath pulsing warning strobes.', act: `${leadCharName} sprints across the catwalk, amber security lights casting long sweeping shadows.` },
      { beat: 'Connecting data probe to the encrypted memory core.', act: `Terminal screens illuminate face in neon cyan as progress bar counts down.` },
      { beat: 'Detection: footfalls resonate across the metal grating.', act: `${partnerCharName} steps out from the darkness with drawn weapon, eyes locked on the console.` },
      { beat: 'Tense stand-off: calculating the exit angle.', act: `${leadCharName} unhooks a flash canister, locking eyes with ${partnerCharName} in deliberate focus.` },
      { beat: 'Detonation and blinding smoke deployment.', act: `White volumetric phosphor illuminates the chamber as silhouettes clash in fluid combat.` },
      { beat: 'Ascending emergency ventilation shaft to the rain-soaked roof.', act: `${leadCharName} bursts through roof hatch into the torrential downpour.` },
      { beat: 'Extraction transport vehicle descending through low storm clouds.', act: `VTOL thrusters wash water across the helipad as ${leadCharName} leaps aboard.` },
      { beat: 'Looking out over the sprawling illuminated metropolis below.', act: `${leadCharName} clutches the retrieved memory drive as dawn breaks across wet glass.` }
    ];

    const selectedBeatTemplates = isRomantic ? beatTemplatesRomantic : beatTemplatesAction;

    for (let i = 1; i <= targetClipsCount; i++) {
      const beatIdx = (i - 1) % selectedBeatTemplates.length;
      const beatInfo = selectedBeatTemplates[beatIdx];
      const cycleNumber = Math.floor((i - 1) / selectedBeatTemplates.length) + 1;

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

      const promptAction = cycleNumber > 1 ? `${beatInfo.act} (Sequence iteration ${cycleNumber})` : beatInfo.act;

      const videoPrompt = `Cinematic ${framing.toLowerCase().replace('_', ' ')} ${angle.toLowerCase().replace('_', ' ')} shot, 10s video. ${promptAction} Atmospheric ${env.lightingRules}. Camera ${movement.toLowerCase().replace('_', ' ')}. 35mm anamorphic cinema lens, natural film grain, shallow depth of field, photorealistic 8k production quality.`;

      const negativePrompt = `low quality, amateur, blurry, cartoon, 3d render, distorted faces, unrealistic movement, morphing limbs, oversaturated, watermark, subtitles`;

      const imagePrompt = `Cinematic keyframe 35mm photograph: ${promptAction} Photorealistic, 85mm portrait, Kodak Vision3 500T color science.`;

      const soundEffects = isRomantic
        ? 'Gentle monsoon rain on tin roof, distant rickshaw horn, soft rustling fabric, ambient wind chimes.'
        : 'Volumetric rain patter on pavement, hydraulic door hiss, low industrial sub-bass drone, distant thunder.';

      const musicCue = isRomantic
        ? 'Melancholic acoustic guitar melody accompanied by mournful sarod and soft ambient cello swells.'
        : 'Tense atmospheric synth pulse, driving rhythmic bassline with evolving brass swells.';

      const continuityRecord: SceneContinuityRecord = {
        scene_number: i,
        scene_purpose: `Story beat ${i}/${targetClipsCount}: ${beatInfo.beat}`,
        previous_scene_connection: i > 1 ? `Connects seamlessly from Scene #${(i - 1).toString().padStart(3, '0')}` : 'Opening establishing scene',
        opening_frame_description: firstFrame,
        closing_frame_description: lastFrame,
        character_states: [
          {
            character_name: leadCharName,
            wardrobe: characters[0].wardrobe,
            hair_accessories: 'Damp hair, realistic strand physics',
            props: isRomantic ? 'Folded paper note, canvas bag' : 'Data drive, tactical gloves',
            emotional_state: isRomantic ? 'Restrained longing, sorrow, vulnerability' : 'Alert, determined, adrenaline-focused'
          }
        ],
        location_state: {
          environment_name: env.name,
          weather: isRomantic ? 'Monsoon Rain / Overcast' : 'Rainstorm / Mist',
          time_of_day: env.timeOfDay,
          lighting: env.lightingRules,
          color_palette: isRomantic ? 'Teal, terracotta, amber, muted navy' : 'Cyan, magenta, obsidian, warm halogen'
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
        color_grading_direction: isRomantic ? 'Warm nostalgic filmic bleach bypass with soft highlights' : 'Cool cyan shadows, high contrast highlights',
        transition_instruction: i % 4 === 0 ? 'Crossfade (1.0s)' : 'Direct Match Cut (0s)',
        expected_duration_seconds: 10
      };

      scenes.push({
        sceneNumber: i,
        title: `Scene ${i.toString().padStart(3, '0')}: ${beatInfo.beat.slice(0, 40)}`,
        dramaticBeat: beatInfo.beat,
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
      lightingGuide: isRomantic
        ? 'Naturalistic soft monsoon lighting with gentle window diffusion and warm amber golden hour rim light.'
        : 'Chiaroscuro directional lighting with neon volumetric reflections and deep negative fill.',
      colorGradingDirection: isRomantic
        ? 'Kodak Vision3 250D emulation: rich warm skin tones, deep forest greens, soft monsoon cyans, gentle highlight rolloff.'
        : 'Kodak 5219 low-key film stock with teal shadows and amber halogen punch.',
      backgroundMusicDirection: isRomantic
        ? 'Emotional acoustic string instrumentation, solitary piano melodies, gentle sarod and cello swells.'
        : 'Sub-bass atmospheric drone, driving rhythmic cinematic percussion, emotive brass textures.',
      soundEffectRequirements: [
        'High-fidelity ambient rain and water droplets',
        'Foley: footsteps on wet pavement and floorboards',
        'Fabric rustling and intimate breath sounds',
        'Environmental urban reverb'
      ],
      totalDurationSeconds: durationSeconds,
      totalClipsCount: targetClipsCount
    };
  }
};
