/**
 * CINEMATIC STUDIO — Content Script & Adapter Dispatcher
 * Coordinates page-level task execution with specialized provider adapters
 */

(function() {
  console.log('[Cinematic Agent] Content script active on:', window.location.hostname);

  function resolveAdapter() {
    const host = window.location.hostname.toLowerCase();
    const adapters = window.CinematicAdapters || {};

    if (host.includes('chatgpt.com')) {
      return adapters.ChatGPT;
    } else if (host.includes('claude.ai')) {
      return adapters.Claude;
    } else if (host.includes('gemini.google.com')) {
      return adapters.Gemini;
    } else if (host.includes('flow.google.com') || host.includes('veo')) {
      return adapters.GoogleFlowVeo;
    }
    return null;
  }

  // Handle messages dispatched from background service worker
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    const adapter = resolveAdapter();

    if (req.action === 'CHECK_PROVIDER_STATUS') {
      if (!adapter) {
        sendResponse({
          status: 'UI_UNRECOGNIZED',
          authenticated: false,
          statusMessage: 'No adapter available for domain: ' + window.location.hostname
        });
        return true;
      }

      adapter.checkReadiness().then(res => sendResponse(res));
      return true; // async sendResponse
    }

    if (req.action === 'EXECUTE_PROVIDER_TASK') {
      if (!adapter) {
        sendResponse({
          taskId: req.task.taskId,
          success: false,
          errorMessage: 'Unsupported provider domain: ' + window.location.hostname,
          executionDurationMs: 0
        });
        return true;
      }

      const onProgress = (progress) => {
        // Send intermediate progress back to background service worker
        chrome.runtime.sendMessage({
          action: 'RELAY_TASK_PROGRESS',
          progress
        });
      };

      adapter.executeTask(req.task, onProgress).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({
          taskId: req.task.taskId,
          success: false,
          errorMessage: err.message || 'Execution exception occurred in content script',
          executionDurationMs: 0
        });
      });

      return true; // async sendResponse
    }
  });
})();
