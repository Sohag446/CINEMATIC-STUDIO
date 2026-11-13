/**
 * CINEMATIC STUDIO — Google Gemini Provider Adapter
 * Handles rich-textarea input injection and multimodal analysis response scraping
 */

(function() {
  window.CinematicAdapters = window.CinematicAdapters || {};
  const Common = window.CinematicAdapters.Common;

  const SELECTORS = {
    promptInput: [
      'rich-textarea div[role="textbox"]',
      'div[role="textbox"][contenteditable="true"]',
      'div.ql-editor',
      'textarea[aria-label*="prompt"]'
    ],
    sendButton: [
      'button[aria-label*="Send message"]',
      'button[aria-label*="Send prompt"]',
      'button.send-button',
      'button[data-test-id="send-button"]'
    ],
    streamingIndicator: [
      '.response-streaming',
      'mat-progress-bar',
      '.sparkle-animating',
      'tts-control[data-state="disabled"]'
    ],
    responseContainers: [
      'message-content',
      '.response-content',
      '.model-response-text',
      'div[data-test-id="model-turn"]'
    ],
    authCheck: [
      'a[aria-label*="Google Account"]',
      'img[alt*="Google Account"]',
      'button[aria-label*="Google Account"]'
    ]
  };

  const GeminiAdapter = {
    providerId: 'gemini',
    displayName: 'Google Gemini',
    capabilities: {
      supportsTextReasoning: true,
      supportsVideoGeneration: false,
      supportsImageToVideo: false,
      supportsStartEndFrames: false,
      supportsNegativePrompts: false,
      supportsAspectRatios: [],
      maxClipDurationSeconds: 0,
      requiresManualUploadAssist: false,
      supportedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      supportedUrls: ['https://gemini.google.com/']
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
          statusMessage: 'Please log in to your Google Account on Gemini'
        };
      }

      return {
        status: 'READY',
        authenticated: true,
        userIdentifier: userEl ? userEl.getAttribute('aria-label') : 'Gemini Active Session'
      };
    },

    async executeTask(task, onProgress) {
      onProgress({ taskId: task.taskId, percentage: 10, statusMessage: 'Locating Gemini rich editor...', currentPhase: 'PREPARING' });

      const inputEl = await Common.waitForElement(SELECTORS.promptInput, 10000);
      if (!inputEl) {
        return {
          taskId: task.taskId,
          success: false,
          requiresHumanAction: true,
          humanActionReason: 'UI_CHANGED',
          errorMessage: 'Could not locate Gemini rich-textarea prompt input',
          executionDurationMs: 0
        };
      }

      onProgress({ taskId: task.taskId, percentage: 25, statusMessage: 'Injecting prompt into rich editor...', currentPhase: 'SUBMITTING' });
      Common.dispatchInput(inputEl, task.prompt);
      await Common.sleep(500);

      const sendBtn = await Common.waitForElement(SELECTORS.sendButton, 5000);
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }

      onProgress({ taskId: task.taskId, percentage: 40, statusMessage: 'Submitted prompt. Awaiting Gemini synthesis...', currentPhase: 'GENERATING' });
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
          onProgress({ taskId: task.taskId, percentage: 65, statusMessage: 'Gemini reasoning and generating...', currentPhase: 'GENERATING' });
          stableCount = 0;
        } else if (currentLength > 0 && currentLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            onProgress({ taskId: task.taskId, percentage: 100, statusMessage: 'Gemini generation completed.', currentPhase: 'COLLECTING' });
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
        errorMessage: 'Gemini generation timed out after ' + (timeoutMs / 1000) + 's',
        executionDurationMs: Date.now() - startTime
      };
    }
  };

  window.CinematicAdapters.Gemini = GeminiAdapter;
})();

