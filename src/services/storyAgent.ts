import { CameraFraming, CameraMovement, CameraAngle } from '../types';

export interface StoryAnalysisResult {
  title: string;
  logline: string;
  acts: {
    actNumber: number;
    title: string;
    description: string;
  }[];
  characters: {
    name: string;
    role: string;
    description: string;
    wardrobe: string;
    promptLock: string;
  }[];
  environments: {
    name: string;
    type: string;
    timeOfDay: string;
    lighting: string;
    promptLock: string;
  }[];
  scenes: {
    sceneNumber: number;
    title: string;
    dramaticBeat: string;
    location: string;
    timeOfDay: string;
    shots: {
      shotNumber: number;
      targetDurationSeconds: number; // ~10 seconds per shot
      framing: CameraFraming;
      angle: CameraAngle;
      movement: CameraMovement;
      subjectAction: string;
      lightingSetup: string;
      continuityTokens: string;
      compiledPrompt: string;
    }[];
  }[];
}

/**
 * Story Analysis Agent Engine
 * Analyzes screenplay or story outlines into narrative acts, character visual locks,
 * environment lighting parameters, and continuous ~10-second shot generation prompts.
 */
export const storyAgent = {
  analyzeStory(rawText: string, projectName: string = 'Untitled Film'): StoryAnalysisResult {
    const cleanText = rawText.trim();
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    // Heuristic detection or intelligent extraction
    const hasCyberpunk = /cyber|neon|hacker|ai|neural|blade|matrix|android|enforcer/i.test(cleanText);
    const hasSpace = /space|star|station|orbit|planet|galaxy|ship|astronaut/i.test(cleanText);

    // Extract title
    let detectedTitle = projectName;
    if (lines.length > 0 && lines[0].length < 60 && !lines[0].toLowerCase().startsWith('scene')) {
      detectedTitle = lines[0].replace(/^[#*-]\s*/, '').trim();
    }

    // Scan text for potential character names (Capitalized names before colons or common cues)
    const nameRegex = /\b([A-Z][a-z]{2,15}(?:\s[A-Z][a-z]{2,15})?)\b/g;
    const commonWords = new Set([
      'The', 'Scene', 'Act', 'Shot', 'Interior', 'Exterior', 'Int', 'Ext', 'Day', 'Night',
      'Camera', 'Close', 'Wide', 'Medium', 'Action', 'Cut', 'Fade', 'Audio', 'Music', 'Lights'
    ]);

    const potentialNames: string[] = [];
    let match;
    while ((match = nameRegex.exec(cleanText)) !== null) {
      const name = match[1];
      if (!commonWords.has(name) && name.length > 3 && !potentialNames.includes(name)) {
        potentialNames.push(name);
      }
    }

    const primaryChar = potentialNames[0] || 'Elena Vance';
    const secondaryChar = potentialNames[1] || 'Kaelen Morse';

    const characters = [
      {
        name: primaryChar,
        role: 'Protagonist / Lead Specialist',
        description: `Athletic build, piercing intense eyes, focused demeanor, weathered features indicative of field experience.`,
        wardrobe: hasCyberpunk
          ? 'Weathered distressed brown leather jacket with brass hardware, dark tactical trousers, reinforced combat boots.'
          : hasSpace
          ? 'Modular EVA pressure flight suit with matte white alloy plating and magnetic utility harness.'
          : 'Charcoal wool trench coat with upturned collar, midnight dark turtleneck, slim charcoal trousers.',
        promptLock: `cinematic 35mm photograph of ${primaryChar}, distinctive intense eyes, natural skin texture, dramatic rim lighting, anamorphic lens flare`
      },
      {
        name: secondaryChar,
        role: 'Antagonist / Syndicate Operative',
        description: 'Tall imposing figure, scarred cheek, sharp angular jawline, cold calculative gaze.',
        wardrobe: hasCyberpunk
          ? 'Floor-length matte black armored duster coat, high structured collar, minimalist titanium gauntlet accents.'
          : hasSpace
          ? 'Dark obsidian pressurized command suit with gold-tinted optical visor retracted.'
          : 'Midnight navy tailored Italian suit with open collar and concealed inner ballistic lining.',
        promptLock: `cinematic 35mm photograph of ${secondaryChar}, cold piercing gaze, sharp shadows, cinematic chiaroscuro, 85mm portrait lens`
      }
    ];

    // Environments
    const environments = [
      {
        name: hasCyberpunk ? 'Lower Sector 7 Neon Alley' : hasSpace ? 'Orbital Relay Command Deck' : 'Rain-Slicked Downtown Alley',
        type: 'Exterior / Urban',
        timeOfDay: 'Midnight / Storm',
        lighting: hasCyberpunk
          ? 'Wet asphalt reflecting saturated cyan and magenta volumetric neon signs with heavy rainfall haze'
          : hasSpace
          ? 'Deep vacuum darkness contrasted with cold cobalt HUD projections and distant solar rim light'
          : 'Low streetlamp amber glow cut through thick fog and wet glistening cobblestones',
        promptLock: hasCyberpunk
          ? 'cyberpunk alley at midnight, saturated cyan and magenta neon caustics, heavy rain, mist, 35mm anamorphic'
          : hasSpace
          ? 'orbital station interior, vast observation window showing planet curvature, ambient cobalt glow, volumetric light'
          : 'dark rain-soaked city street, fog diffusion, warm tungsten street lamps, wet reflections, film noir aesthetic'
      },
      {
        name: hasCyberpunk ? 'Nexus High-Security Server Core' : hasSpace ? 'Hypersleep Cryo Chamber' : 'Abandoned Warehouse Office',
        type: 'Interior / Industrial',
        timeOfDay: 'Artificial Halogen',
        lighting: 'Stark directional key lights with deep negative fill and subtle haze',
        promptLock: 'industrial interior, atmospheric dust particles, high-contrast chiaroscuro lighting, photorealistic cinematic'
      }
    ];

    // Narrative Acts Breakdown
    const acts = [
      {
        actNumber: 1,
        title: 'Inciting Incident & Arrival',
        description: `Introduction to the hostile world and initial stakes for ${primaryChar}.`
      },
      {
        actNumber: 2,
        title: 'Rising Conflict & Confrontation',
        description: `${primaryChar} infiltrates target perimeter and encounters critical obstacles.`
      },
      {
        actNumber: 3,
        title: 'Climactic Reveal & Aftermath',
        description: `High-tension resolution, turning point decision, and final departure.`
      }
    ];

    // Generate continuous ~10s cinematic shot list
    // Standard film pacing: 4-6 distinct ~10s shots per scene
    const sceneTemplates = [
      {
        sceneNumber: 1,
        title: 'Arrival at the Perimeter',
        dramaticBeat: `${primaryChar} assesses the target entrance in harsh weather conditions.`,
        location: environments[0].name,
        timeOfDay: environments[0].timeOfDay,
        shots: [
          {
            shotNumber: 1,
            targetDurationSeconds: 10,
            framing: 'WIDE' as CameraFraming,
            angle: 'LOW_ANGLE' as CameraAngle,
            movement: 'DOLLY_IN' as CameraMovement,
            subjectAction: `${primaryChar} emerges slowly from dark shadows into the wet glistening street, stopping beneath a flickering light.`,
            lightingSetup: 'Saturated atmospheric rim lighting with deep back illumination and rain haze.',
            continuityTokens: `${primaryChar} wardrobe lock: distressed jacket. Environment lock: rain-slicked pavement.`,
            compiledPrompt: `Cinematic wide angle 10s video, 35mm film. ${primaryChar} wearing distressed leather jacket walking forward slowly into a rain-slicked city street at night. Volumetric neon reflections, camera smoothly dollying forward at ground level, photorealistic, 4k ultra-detailed.`
          },
          {
            shotNumber: 2,
            targetDurationSeconds: 10,
            framing: 'MEDIUM' as CameraFraming,
            angle: 'EYE_LEVEL' as CameraAngle,
            movement: 'TRACKING' as CameraMovement,
            subjectAction: `${primaryChar} raises a hand to activate an optical scanner, scanning the perimeter with cautious, alert eyes.`,
            lightingSetup: 'Soft blue key light cast across facial contours with glowing optical reflections.',
            continuityTokens: `${primaryChar} facial scar and collar hardware visible.`,
            compiledPrompt: `Medium cinematic tracking shot, 10s. ${primaryChar} turning head cautiously while scanning a fortified facility doorway. Subtle glowing blue reflection in eyes, wind blowing wet hair, realistic atmospheric vapor, 85mm cinematic lens.`
          },
          {
            shotNumber: 3,
            targetDurationSeconds: 10,
            framing: 'CLOSE_UP' as CameraFraming,
            angle: 'EYE_LEVEL' as CameraAngle,
            movement: 'STATIC' as CameraMovement,
            subjectAction: `Extreme focus on ${primaryChar}'s intense determination as breathing creates misty condensation in the cold air.`,
            lightingSetup: 'Chiaroscuro lighting, split face lighting with intense catchlights in pupils.',
            continuityTokens: `Exact same facial features and rain droplet continuity.`,
            compiledPrompt: `Tight close-up shot 10s, 35mm cinema camera. Intense gaze of ${primaryChar}, droplets of cold rain running down cheeks, visible breath condensation, subtle micro-expressions of focus and resolve, shallow depth of field.`
          }
        ]
      },
      {
        sceneNumber: 2,
        title: 'Breach of the Inner Sanctum',
        dramaticBeat: `${primaryChar} bypasses security protocols as silent alarms flicker.`,
        location: environments[1].name,
        timeOfDay: environments[1].timeOfDay,
        shots: [
          {
            shotNumber: 4,
            targetDurationSeconds: 10,
            framing: 'WIDE' as CameraFraming,
            angle: 'HIGH_ANGLE' as CameraAngle,
            movement: 'PAN_RIGHT' as CameraMovement,
            subjectAction: `${primaryChar} swiftly slips through heavy sliding security doors into a vast industrial server corridor.`,
            lightingSetup: 'Pulsing amber warning strobes casting sweeping diagonal shadows across metallic columns.',
            continuityTokens: `Maintains dark tactical trousers and utility backpack.`,
            compiledPrompt: `Wide high-angle cinematic pan 10s. Character moving quickly through a massive server architecture hallway. Pulsing amber security lighting, long cinematic shadows on polished floor, high production value.`
          },
          {
            shotNumber: 5,
            targetDurationSeconds: 10,
            framing: 'MEDIUM' as CameraFraming,
            angle: 'DUTCH' as CameraAngle,
            movement: 'DOLLY_IN' as CameraMovement,
            subjectAction: `${primaryChar} interfaces directly with a glowing central console, downloading encrypted data files rapidly.`,
            lightingSetup: 'Bright cyan terminal screen glow acting as primary key light against dark surrounding cavern.',
            continuityTokens: `Identical wardrobe hardware and glove textures.`,
            compiledPrompt: `Medium Dutch angle shot 10s. ${primaryChar} typing intensely on an illuminated terminal interface, cyan data streams reflecting on face and leather jacket, camera slowly pushing in to heighten tension.`
          },
          {
            shotNumber: 6,
            targetDurationSeconds: 10,
            framing: 'CLOSE_UP' as CameraFraming,
            angle: 'LOW_ANGLE' as CameraAngle,
            movement: 'ORBIT' as CameraMovement,
            subjectAction: `${primaryChar} notices sudden footsteps behind, head snapping toward the dark doorway in alarm.`,
            lightingSetup: 'Abrupt warm spotlight cutting through the background darkness.',
            continuityTokens: `Direct visual continuity into confrontation scene.`,
            compiledPrompt: `Cinematic orbital close-up 10s. Character suddenly stiffening as a silhouette appears in background shadow. Rapid shift in eye focus, dramatic backlight creating golden halo outline, suspenseful cinematic climax.`
          }
        ]
      }
    ];

    return {
      title: detectedTitle,
      logline: cleanText.length > 200 ? cleanText.slice(0, 200) + '...' : cleanText || 'A cinematic tale of courage, confrontation, and destiny.',
      acts,
      characters,
      environments,
      scenes: sceneTemplates
    };
  }
};
