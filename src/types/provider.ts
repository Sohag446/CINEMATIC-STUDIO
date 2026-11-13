/**
 * CINEMATIC STUDIO — Phase 3 AI Provider Adapter Contracts & Capability Types
 * 
 * Formal polymorphic interface contracts for browser-automated AI providers:
 * 1. Google Flow / Veo (Video Generation)
 * 2. ChatGPT (Scripting, Reasoning, Prompts)
 * 3. Google Gemini (Scripting, Multimodal Analysis)
 * 4. Claude (Narrative Architecture, Continuity Rules)
 */

export type ProviderId = 
  | 'google_flow_veo'
  | 'chatgpt'
  | 'gemini'
  | 'claude'
  | 'runway'
  | 'luma'
  | 'kling';

export type ProviderReadinessStatus = 
  | 'READY'
  | 'NOT_AUTHENTICATED'
  | 'BOT_CHALLENGE'
  | 'RATE_LIMITED'
  | 'UI_UNRECOGNIZED'
  | 'BUSY';

export type HumanActionReason = 
  | 'CAPTCHA'
  | 'AUTH_EXPIRED'
  | 'CONFIRMATION_REQUIRED'
  | 'UPLOAD_FAILED'
  | 'UI_CHANGED'
  | 'GENERATION_AMBIGUOUS'
  | 'DOWNLOAD_MANUAL_REQUIRED';

export interface ProviderCapabilities {
  supportsTextReasoning: boolean;
  supportsVideoGeneration: boolean;
  supportsImageToVideo: boolean;
  supportsStartEndFrames: boolean;
  supportsNegativePrompts: boolean;
  supportsAspectRatios: ('16:9' | '9:16' | '1:1' | '2.39:1')[];
  maxClipDurationSeconds: number;
  requiresManualUploadAssist: boolean;
  supportedMimeTypes: string[];
  supportedUrls: string[];
}

export type ProviderTaskType = 
  | 'TEXT_PROMPT'
  | 'TEXT_TO_VIDEO'
  | 'IMAGE_TO_VIDEO'
  | 'STORY_GENERATION';

export interface ReferenceAsset {
  id: string;
  assetType: 'CHARACTER' | 'ENVIRONMENT' | 'PREVIOUS_FRAME' | 'STORYBOARD';
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  dataBase64?: string;
}

export interface ProviderExecutionRequest {
  taskId: string;
  profileId: string;
  providerId: ProviderId;
  taskType: ProviderTaskType;
  prompt: string;
  negativePrompt?: string;
  targetDurationSeconds?: number;
  targetAspectRatio?: '16:9' | '9:16' | '1:1' | '2.39:1';
  referenceAssets?: ReferenceAsset[];
  timeoutMs?: number;
}

export interface ProviderReadinessResult {
  status: ProviderReadinessStatus;
  authenticated: boolean;
  userIdentifier?: string;
  statusMessage?: string;
  requiresHumanAction?: boolean;
  actionReason?: HumanActionReason;
}

export interface ProviderExecutionProgress {
  taskId: string;
  percentage: number;
  statusMessage: string;
  currentPhase: 'PREPARING' | 'NAVIGATING' | 'UPLOADING' | 'SUBMITTING' | 'GENERATING' | 'COLLECTING';
}

export interface ProviderExecutionResult {
  taskId: string;
  success: boolean;
  textOutput?: string;
  outputVideoUrl?: string;
  downloadedFilePath?: string;
  errorMessage?: string;
  requiresHumanAction?: boolean;
  humanActionReason?: HumanActionReason;
  executionDurationMs: number;
}

export interface ExecutionContext {
  tabId?: number;
  targetUrl: string;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface IProviderAdapter {
  readonly providerId: ProviderId;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  checkReadiness(context: ExecutionContext): Promise<ProviderReadinessResult>;
  injectPrompt(prompt: string, context: ExecutionContext): Promise<boolean>;
  injectReferenceAsset?(asset: ReferenceAsset, context: ExecutionContext): Promise<boolean>;
  triggerSubmission(context: ExecutionContext): Promise<boolean>;
  monitorProgress(
    onProgress: (progress: ProviderExecutionProgress) => void,
    context: ExecutionContext
  ): Promise<ProviderExecutionResult>;
  abort(context: ExecutionContext): Promise<void>;
}

