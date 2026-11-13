/**
 * CINEMATIC STUDIO — Extension Background Execution Engine
 * Manages tab selection, navigation, timeouts, and task lifecycle coordination
 */

export class ExecutionEngine {
  constructor(postDesktopMessageFn) {
    this.postDesktopMessage = postDesktopMessageFn;
    this.activeTasks = new Map();

    this.providerTargetUrls = {
      'chatgpt': 'https://chatgpt.com/',
      'claude': 'https://claude.ai/',
      'gemini': 'https://gemini.google.com/app',
      'google_flow_veo': 'https://flow.google.com/'
    };
  }

  /**
   * Dispatches a validated task to the appropriate browser tab
   */
  async executeTask(task, profileId) {
    const { taskId, providerId } = task;
    console.log(`[ExecutionEngine] Beginning task ${taskId} on provider '${providerId}' for profile ${profileId}`);

    const targetUrl = this.providerTargetUrls[providerId];
    if (!targetUrl) {
      this.postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'TASK_FAILED',
        profile_id: profileId,
        payload: {
          task_id: taskId,
          success: false,
          error_message: `Unknown or disallowed provider: ${providerId}`,
          execution_duration_ms: 0
        },
        timestamp: Date.now()
      });
      return;
    }

    try {
      // 1. Find or create matching tab
      const tab = await this.ensureProviderTab(providerId, targetUrl);
      this.activeTasks.set(taskId, { tabId: tab.id, profileId, startTime: Date.now() });

      // 2. Notify desktop: navigating / readying tab
      this.postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'TASK_PROGRESS',
        profile_id: profileId,
        payload: {
          task_id: taskId,
          percentage: 5,
          status_message: `Connecting to ${providerId} tab #${tab.id}...`,
          current_phase: 'NAVIGATING'
        },
        timestamp: Date.now()
      });

      // 3. Dispatch to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'EXECUTE_PROVIDER_TASK',
        task
      });

      this.activeTasks.delete(taskId);

      if (!response) {
        throw new Error('Content script closed unexpectedly without returning an execution payload');
      }

      if (response.requiresHumanAction) {
        console.warn(`[ExecutionEngine] Task ${taskId} requires operator action: ${response.humanActionReason}`);
        this.postDesktopMessage({
          id: crypto.randomUUID(),
          type: 'NEEDS_HUMAN_ACTION',
          profile_id: profileId,
          payload: {
            task_id: taskId,
            action_reason: response.humanActionReason,
            status_message: response.errorMessage || 'Human intervention required on provider webpage'
          },
          timestamp: Date.now()
        });
      } else if (response.success) {
        console.log(`[ExecutionEngine] Task ${taskId} completed successfully`);
        this.postDesktopMessage({
          id: crypto.randomUUID(),
          type: 'TASK_COMPLETED',
          profile_id: profileId,
          payload: {
            task_id: taskId,
            success: true,
            text_output: response.textOutput,
            output_video_url: response.outputVideoUrl,
            downloaded_file_path: response.downloadedFilePath,
            execution_duration_ms: response.executionDurationMs
          },
          timestamp: Date.now()
        });
      } else {
        console.error(`[ExecutionEngine] Task ${taskId} failed:`, response.errorMessage);
        this.postDesktopMessage({
          id: crypto.randomUUID(),
          type: 'TASK_FAILED',
          profile_id: profileId,
          payload: {
            task_id: taskId,
            success: false,
            error_message: response.errorMessage,
            execution_duration_ms: response.executionDurationMs
          },
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error(`[ExecutionEngine] Exception while executing task ${taskId}:`, err);
      this.activeTasks.delete(taskId);
      this.postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'TASK_FAILED',
        profile_id: profileId,
        payload: {
          task_id: taskId,
          success: false,
          error_message: err.message || 'Fatal execution error',
          execution_duration_ms: 0
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Reuses an existing open tab matching the target provider, or opens a new background tab
   */
  async ensureProviderTab(providerId, targetUrl) {
    let domainPattern = '*://chatgpt.com/*';
    if (providerId === 'claude') domainPattern = '*://claude.ai/*';
    if (providerId === 'gemini') domainPattern = '*://gemini.google.com/*';
    if (providerId === 'google_flow_veo') domainPattern = '*://*.google.com/*';

    const existingTabs = await chrome.tabs.query({ url: domainPattern });
    if (existingTabs && existingTabs.length > 0) {
      console.log(`[ExecutionEngine] Reusing existing open tab #${existingTabs[0].id} for ${providerId}`);
      return existingTabs[0];
    }

    // Open dedicated tab
    console.log(`[ExecutionEngine] No existing tab found for ${providerId}. Creating new tab...`);
    const newTab = await chrome.tabs.create({ url: targetUrl, active: false });

    // Wait until tab completes loading
    await new Promise((resolve) => {
      const listener = (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      // Fallback timeout after 15s
      setTimeout(resolve, 15000);
    });

    // Short buffer for content script injection
    await new Promise(r => setTimeout(r, 1000));
    return newTab;
  }

  /**
   * Relays intermediate progress updates back to the desktop
   */
  relayProgress(progress, profileId) {
    this.postDesktopMessage({
      id: crypto.randomUUID(),
      type: 'TASK_PROGRESS',
      profile_id: profileId,
      payload: {
        task_id: progress.taskId,
        percentage: progress.percentage,
        status_message: progress.statusMessage,
        current_phase: progress.currentPhase
      },
      timestamp: Date.now()
    });
  }

  /**
   * Cancels an active task
   */
  cancelTask(taskId, profileId) {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      console.log(`[ExecutionEngine] Cancelled task ${taskId}`);
      this.postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'TASK_FAILED',
        profile_id: profileId,
        payload: {
          task_id: taskId,
          success: false,
          error_message: 'Task cancelled by operator',
          execution_duration_ms: 0
        },
        timestamp: Date.now()
      });
    }
  }
}

