/**
 * CINEMATIC STUDIO — Google Flow / Veo Video Provider Adapter
 * Handles text-to-video, image-to-video, progress tracking, and video download coordination
 */

(function() {
  window.CinematicAdapters = window.CinematicAdapters || {};
  const Common = window.CinematicAdapters.Common;

  const SELECTORS = {
    promptInput: [
      'textarea[placeholder*="Describe"]',
      'div[data-test-id="prompt-input"] textarea',
      'textarea[aria-label*="prompt"]',
      'div.prompt-box textarea',
      'div[contenteditable="true"][aria-label*="prompt"]'
    ],
    generateButton: [
      'button[data-test-id="generate-button"]',
      'button[aria-label*="Generate"]',
      'button.generate-btn',
      'button:not([disabled])'
    ],
    aspectRatio169: [
      'button[aria-label*="16:9"]',
      'button[data-aspect="16:9"]',
      'div[role="radio"][aria-label*="16:9"]'
    ],
    aspectRatio916: [
      'button[aria-label*="9:16"]',
      'button[data-aspect="9:16"]',
      'div[role="radio"][aria-label*="9:16"]'
    ],
    imageSlot: [
      'input[type="file"][accept*="image"]',
      'div[data-test-id="start-frame-slot"] input[type="file"]',
      'div.keyframe-slot input[type="file"]'
    ],
    progressIndicators: [
      'div[role="progressbar"]',
      '.progress-bar',
      '.generation-spinner',
      'div[data-test-id="generation-progress"]',
      'span.percentage'
    ],
    renderedVideo: [
      'video',
      'div.video-player video',
      'video[src^="blob:"]',
      'video[src^="http"]'
    ],
    downloadButton: [
      'button[aria-label*="Download"]',
      'button[data-test-id="download-button"]',
      'a[download]',
      'button:has-text("Download")'
    ],
    authCheck: [
      'a[aria-label*="Google Account"]',
      'img[alt*="Google Account"]',
      'div[data-test-id="user-avatar"]'
    ],
    safetyWarning: [
      'div[data-test-id="safety-violation"]',
      'div[role="alert"]:has-text("policy")',
      'div:has-text("content flagged")'
    ]
  };

  const GoogleFlowVeoAdapter = {
    providerId: 'google_flow_veo',
    displayName: 'Google Flow / Veo',
    capabilities: {
      supportsTextReasoning: false,
      supportsVideoGeneration: true,
      supportsImageToVideo: true,
      supportsStartEndFrames: true,
      supportsNegativePrompts: true,
      supportsAspectRatios: ['16:9', '9:16'],
      maxClipDurationSeconds: 10,
      requiresManualUploadAssist: false,
      supportedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      supportedUrls: ['https://flow.google.com/', 'https://labs.google.com/veo/']
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

      const inputEl = Common.queryWithFallbacks(SELECTORS.promptInput);
      const userEl = Common.queryWithFallbacks(SELECTORS.authCheck);

      if (!inputEl && !userEl) {
        return {
          status: 'NOT_AUTHENTICATED',
          authenticated: false,
          requiresHumanAction: true,
          actionReason: 'AUTH_EXPIRED',
          statusMessage: 'Please log in to your Google Account on Flow/Veo'
        };
      }

      return {
        status: 'READY',
        authenticated: true,
        userIdentifier: 'Google Flow/Veo Active Session'
      };
    },

    async executeTask(task, onProgress) {
      onProgress({ taskId: task.taskId, percentage: 5, statusMessage: 'Locating Veo video prompt workspace...', currentPhase: 'PREPARING' });

      // 1. Locate prompt editor
      const inputEl = await Common.waitForElement(SELECTORS.promptInput, 15000);
      if (!inputEl) {
        return {
          taskId: task.taskId,
          success: false,
          requiresHumanAction: true,
          humanActionReason: 'UI_CHANGED',
          errorMessage: 'Could not locate Veo video prompt input field',
          executionDurationMs: 0
        };
      }

      // 2. Select Aspect Ratio if specified
      if (task.targetAspectRatio === '9:16') {
        const aspectBtn = Common.queryWithFallbacks(SELECTORS.aspectRatio916);
        if (aspectBtn) aspectBtn.click();
      } else {
        const aspectBtn = Common.queryWithFallbacks(SELECTORS.aspectRatio169);
        if (aspectBtn) aspectBtn.click();
      }

      // 3. Inject Reference Asset (Image-to-Video) if provided
      if (task.referenceAssets && task.referenceAssets.length > 0) {
        onProgress({ taskId: task.taskId, percentage: 15, statusMessage: 'Assigning reference keyframe...', currentPhase: 'UPLOADING' });
        const primaryAsset = task.referenceAssets[0];
        if (primaryAsset.dataBase64) {
          const fileInput = Common.queryWithFallbacks(SELECTORS.imageSlot);
          if (fileInput) {
            try {
              // Synthetic DataTransfer File attachment
              const byteCharacters = atob(primaryAsset.dataBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: primaryAsset.mimeType });
              const file = new File([blob], primaryAsset.fileName, { type: primaryAsset.mimeType });

              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              fileInput.files = dataTransfer.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              await Common.sleep(1000);
            } catch (err) {
              console.warn('[Veo Adapter] Automatic file drop failed:', err);
            }
          }
        }
      }

      // 4. Inject prompt
      onProgress({ taskId: task.taskId, percentage: 25, statusMessage: 'Injecting cinematic video prompt...', currentPhase: 'SUBMITTING' });
      Common.dispatchInput(inputEl, task.prompt);
      await Common.sleep(800);

      // 5. Click Generate
      const genBtn = await Common.waitForElement(SELECTORS.generateButton, 5000);
      if (genBtn && !genBtn.disabled) {
        genBtn.click();
      } else {
        inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }

      onProgress({ taskId: task.taskId, percentage: 35, statusMessage: 'Submitted generation task. Awaiting Veo rendering queue...', currentPhase: 'GENERATING' });
      await Common.sleep(3000);

      // 6. Monitor Video Generation (Veo rendering takes 45s - 240s)
      const startTime = Date.now();
      const timeoutMs = task.timeoutMs || 300000; // 5 min timeout
      let progressPct = 35;

      while (Date.now() - startTime < timeoutMs) {
        // Check for safety violation modal
        const safetyEl = Common.queryWithFallbacks(SELECTORS.safetyWarning);
        if (safetyEl) {
          return {
            taskId: task.taskId,
            success: false,
            requiresHumanAction: true,
            humanActionReason: 'CONFIRMATION_REQUIRED',
            errorMessage: 'Safety violation triggered by provider: ' + safetyEl.textContent,
            executionDurationMs: Date.now() - startTime
          };
        }

        // Check for completed video element or download button
        const videoEl = Common.queryWithFallbacks(SELECTORS.renderedVideo);
        const downloadBtn = Common.queryWithFallbacks(SELECTORS.downloadButton);

        if (videoEl && videoEl.src) {
          onProgress({ taskId: task.taskId, percentage: 95, statusMessage: 'Video rendering finished. Initiating output collection...', currentPhase: 'COLLECTING' });

          let videoUrl = videoEl.src;
          // Trigger download if native download button is present
          if (downloadBtn) {
            downloadBtn.click();
          }

          onProgress({ taskId: task.taskId, percentage: 100, statusMessage: 'Veo video clip generation complete.', currentPhase: 'COLLECTING' });
          return {
            taskId: task.taskId,
            success: true,
            outputVideoUrl: videoUrl,
            executionDurationMs: Date.now() - startTime
          };
        }

        // Increment visual progress while waiting
        if (progressPct < 90) {
          progressPct += 2;
          onProgress({ taskId: task.taskId, percentage: progressPct, statusMessage: 'Veo neural rendering in progress...', currentPhase: 'GENERATING' });
        }

        await Common.sleep(2500);
      }

      return {
        taskId: task.taskId,
        success: false,
        errorMessage: 'Veo video generation timed out after ' + (timeoutMs / 1000) + 's',
        executionDurationMs: Date.now() - startTime
      };
    }
  };

  window.CinematicAdapters.GoogleFlowVeo = GoogleFlowVeoAdapter;
})();

