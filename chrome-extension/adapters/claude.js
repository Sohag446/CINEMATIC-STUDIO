/**
 * CINEMATIC STUDIO — Claude (Anthropic) Provider Adapter
 * Handles narrative reasoning, continuity rule checks, and beat breakdown generation
 */

(function() {
  window.CinematicAdapters = window.CinematicAdapters || {};
  const Common = window.CinematicAdapters.Common;

  const SELECTORS = {
    promptInput: [
      'div[contenteditable="true"][data-placeholder]',
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      'textarea[placeholder*="Reply to Claude"]'
    ],
    sendButton: [
      'button[aria-label="Send Message"]',
      'button[data-testid="send-button"]',
      'button.bg-accent-main',
      'fieldset button:not([disabled])'
    ],
    streamingIndicator: [
      '[data-is-streaming="true"]',
      '.animate-pulse',
      'button[aria-label="Stop response"]'
    ],
    responseContainers: [
      'div.font-claude-message',
      '[data-is-streaming="false"]',
      'div.prose'
    ],
    authCheck: [
      '[data-testid="user-menu-button"]',
      'button[aria-label*="User Menu"]',
      'button[aria-label*="Account"]'
    ],
    rateLimitModal: [
      'div:has-text("You\'ve reached your message limit")',
      'div[role="dialog"]:has-text("limit")'
    ]
  };

  const ClaudeAdapter = {
    providerId: 'claude',
    displayName: 'Claude (Anthropic)',
    capabilities: {
      supportsTextReasoning: true,
      supportsVideoGeneration: false,
      supportsImageToVideo: false,
      supportsStartEndFrames: false,
      supportsNegativePrompts: false,
      supportsAspectRatios: [],
      maxClipDurationSeconds: 0,
      requiresManualUploadAssist: false,
      supportedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
      supportedUrls: ['https://claude.ai/']
    },

    async checkReadiness() {
      const challenge = Common.checkChallenges();
      if (challenge.isChallenged) {
        return {
          status: 'BOT_CHALLENGE',
          authenticated: false,
          requiresHumanAction: true,
          actionReason: challenge.reason,
          statusMessage: challenge.message
        };
      }

      const userEl = Common.queryWithFallbacks(SELECTORS.authCheck);
      const inputEl = Common.queryWithFallbacks(SELECTORS.promptInput);

      if (!userEl && !inputEl) {
        return {
          status: 'NOT_AUTHENTICATED',
          authenticated: false,
          requiresHumanAction: true,
          actionReason: 'AUTH_EXPIRED',
          statusMessage: 'Please log in to your Claude account'
        };
      }

      return {
        status: 'READY',
        authenticated: true,
        userIdentifier: 'Claude Active Session'
      };
    },

    async executeTask(task, onProgress) {
      onProgress({ taskId: task.taskId, percentage: 10, statusMessage: 'Locating Claude ProseMirror editor...', currentPhase: 'PREPARING' });

      const inputEl = await Common.waitForElement(SELECTORS.promptInput, 10000);
      if (!inputEl) {
        return {
          taskId: task.taskId,
          success: false,
          requiresHumanAction: true,
          humanActionReason: 'UI_CHANGED',
          errorMessage: 'Could not locate Claude prompt input field',
          executionDurationMs: 0
        };
      }

      onProgress({ taskId: task.taskId, percentage: 25, statusMessage: 'Injecting dramatic beat prompt...', currentPhase: 'SUBMITTING' });
      Common.dispatchInput(inputEl, task.prompt);
      await Common.sleep(500);

      const sendBtn = await Common.waitForElement(SELECTORS.sendButton, 5000);
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }

      onProgress({ taskId: task.taskId, percentage: 40, statusMessage: 'Submitted prompt. Awaiting Claude synthesis...', currentPhase: 'GENERATING' });
      await Common.sleep(2000);

      const startTime = Date.now();
      const timeoutMs = task.timeoutMs || 120000;
      let lastLength = 0;
      let stableCount = 0;

      while (Date.now() - startTime < timeoutMs) {
        const streaming = Common.queryWithFallbacks(SELECTORS.streamingIndicator);
        const responses = document.querySelectorAll(SELECTORS.responseContainers.join(','));
        const latestResponse = responses[responses.length - 1];
        const currentLength = latestResponse ? (latestResponse.textContent || '').length : 0;

        if (streaming) {
          onProgress({ taskId: task.taskId, percentage: 65, statusMessage: 'Claude formulating narrative output...', currentPhase: 'GENERATING' });
          stableCount = 0;
        } else if (currentLength > 0 && currentLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            onProgress({ taskId: task.taskId, percentage: 100, statusMessage: 'Claude beat generation completed.', currentPhase: 'COLLECTING' });
            return {
              taskId: task.taskId,
              success: true,
              textOutput: latestResponse ? latestResponse.innerText.trim() : '',
              executionDurationMs: Date.now() - startTime
            };
          }
        }

        lastLength = currentLength;
        await Common.sleep(1000);
      }

      return {
        taskId: task.taskId,
        success: false,
        errorMessage: 'Claude generation timed out after ' + (timeoutMs / 1000) + 's',
        executionDurationMs: Date.now() - startTime
      };
    }
  };

  window.CinematicAdapters.Claude = ClaudeAdapter;
})();

