/**
 * CINEMATIC STUDIO — ChatGPT Provider Adapter
 * Handles ProseMirror prompt injection, streaming progress, and markdown scraping
 */

(function() {
  window.CinematicAdapters = window.CinematicAdapters || {};
  const Common = window.CinematicAdapters.Common;

  const SELECTORS = {
    promptInput: [
      '#prompt-textarea',
      'div[id="prompt-textarea"]',
      'textarea[data-id="root"]',
      'div[contenteditable="true"][data-placeholder]'
    ],
    sendButton: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[data-testid="composer-speech-button"] + button',
      'button.mb-1.mr-1'
    ],
    stopButton: [
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label="Stop streaming"]'
    ],
    assistantTurns: [
      'div[data-message-author-role="assistant"]',
      '.agent-turn .markdown',
      'div.markdown.prose'
    ],
    authCheck: [
      'button[data-testid="profile-button"]',
      'img[alt*="User"]',
      'nav button',
      'div[data-testid="user-menu"]'
    ],
    rateLimitWarning: [
      'div[data-testid="error-message"]',
      '.text-token-text-error'
    ]
  };

  const ChatGPTAdapter = {
    providerId: 'chatgpt',
    displayName: 'ChatGPT (OpenAI)',
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
      supportedUrls: ['https://chatgpt.com/']
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

      if (!inputEl && !userEl) {
        return {
          status: 'NOT_AUTHENTICATED',
          authenticated: false,
          requiresHumanAction: true,
          actionReason: 'AUTH_EXPIRED',
          statusMessage: 'Please log in to your ChatGPT account'
        };
      }

      return {
        status: 'READY',
        authenticated: true,
        userIdentifier: 'ChatGPT Active Session'
      };
    },

    async executeTask(task, onProgress) {
      onProgress({ taskId: task.taskId, percentage: 10, statusMessage: 'Locating prompt editor...', currentPhase: 'PREPARING' });

      // 1. Locate prompt editor
      const inputEl = await Common.waitForElement(SELECTORS.promptInput, 10000);
      if (!inputEl) {
        const challenge = Common.checkChallenges();
        if (challenge.isChallenged) {
          return { taskId: task.taskId, success: false, requiresHumanAction: true, humanActionReason: challenge.reason, errorMessage: challenge.message, executionDurationMs: 0 };
        }
        return { taskId: task.taskId, success: false, requiresHumanAction: true, humanActionReason: 'UI_CHANGED', errorMessage: 'Could not locate ChatGPT prompt input field', executionDurationMs: 0 };
      }

      // 2. Inject prompt text
      onProgress({ taskId: task.taskId, percentage: 25, statusMessage: 'Injecting narrative prompt...', currentPhase: 'SUBMITTING' });
      Common.dispatchInput(inputEl, task.prompt);
      await Common.sleep(500);

      // 3. Click send button
      const sendBtn = await Common.waitForElement(SELECTORS.sendButton, 5000);
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        // Fallback: press Enter key
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }

      onProgress({ taskId: task.taskId, percentage: 40, statusMessage: 'Prompt submitted. Awaiting generation...', currentPhase: 'GENERATING' });
      await Common.sleep(1500);

      // 4. Monitor streaming response
      const startTime = Date.now();
      const timeoutMs = task.timeoutMs || 120000;
      let lastTextLength = 0;
      let stableCount = 0;

      while (Date.now() - startTime < timeoutMs) {
        // Check for rate limit error
        const errEl = Common.queryWithFallbacks(SELECTORS.rateLimitWarning);
        if (errEl && errEl.textContent.toLowerCase().includes('cap')) {
          return {
            taskId: task.taskId,
            success: false,
            requiresHumanAction: true,
            humanActionReason: 'CONFIRMATION_REQUIRED',
            errorMessage: errEl.textContent,
            executionDurationMs: Date.now() - startTime
          };
        }

        const stopBtn = Common.queryWithFallbacks(SELECTORS.stopButton);
        const turns = document.querySelectorAll(SELECTORS.assistantTurns.join(','));
        const latestTurn = turns[turns.length - 1];
        const currentLength = latestTurn ? (latestTurn.textContent || '').length : 0;

        if (stopBtn) {
          // Still streaming
          onProgress({ taskId: task.taskId, percentage: 70, statusMessage: 'Generating response tokens...', currentPhase: 'GENERATING' });
          stableCount = 0;
        } else if (currentLength > 0 && currentLength === lastTextLength) {
          stableCount++;
          if (stableCount >= 3) {
            // Finished streaming and stabilized
            onProgress({ taskId: task.taskId, percentage: 100, statusMessage: 'Response generation completed.', currentPhase: 'COLLECTING' });
            return {
              taskId: task.taskId,
              success: true,
              textOutput: latestTurn ? latestTurn.innerText.trim() : '',
              executionDurationMs: Date.now() - startTime
            };
          }
        }

        lastTextLength = currentLength;
        await Common.sleep(1000);
      }

      return {
        taskId: task.taskId,
        success: false,
        errorMessage: 'ChatGPT generation timed out after ' + (timeoutMs / 1000) + 's',
        executionDurationMs: Date.now() - startTime
      };
    }
  };

  window.CinematicAdapters.ChatGPT = ChatGPTAdapter;
})();

