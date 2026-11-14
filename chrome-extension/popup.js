/**
 * CINEMATIC STUDIO — Extension Popup UI Logic
 * Truthful State Verification, One-Click Native Bridge & Workspace Focus
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('statusBadge');
  const btnConnect = document.getElementById('btnConnect');
  const appStatusVal = document.getElementById('appStatusVal');
  const hostStatusVal = document.getElementById('hostStatusVal');
  const profileVal = document.getElementById('profileVal');
  const handshakeVal = document.getElementById('handshakeVal');
  const tabDomainVal = document.getElementById('tabDomainVal');
  const tabTitleVal = document.getElementById('tabTitleVal');
  const actionControls = document.getElementById('actionControls');
  const btnReconnect = document.getElementById('btnReconnect');
  const btnOpenStudio = document.getElementById('btnOpenStudio');
  const btnDisconnect = document.getElementById('btnDisconnect');
  const statusNotice = document.getElementById('statusNotice');

  // 1. Inspect Active Tab Safely
  function inspectCurrentTab() {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          tabDomainVal.textContent = 'Chrome Tab';
          tabTitleVal.textContent = 'No active tab selected';
          return;
        }

        const activeTab = tabs[0];
        if (activeTab.url) {
          try {
            const urlObj = new URL(activeTab.url);
            tabDomainVal.textContent = urlObj.hostname || 'Local Page';
            tabTitleVal.textContent = activeTab.title || urlObj.pathname;
          } catch {
            tabDomainVal.textContent = 'Special Page';
            tabTitleVal.textContent = activeTab.title || activeTab.url;
          }
        } else {
          tabDomainVal.textContent = 'Protected Browser Surface';
          tabTitleVal.textContent = activeTab.title || 'System Tab';
        }
      });
    } catch (e) {
      console.warn('Tab inspection error:', e);
    }
  }

  // 2. Refresh Connection State
  function refreshState() {
    chrome.runtime.sendMessage({ action: 'GET_CONNECTION_STATE' }, (res) => {
      if (!res) {
        setUiState('DISCONNECTED', false, 'Unable to communicate with extension background worker.');
        return;
      }

      const {
        isNativeConnected,
        isHandshakeComplete,
        desktopAppRunning,
        profileId,
        displayName,
        lastError
      } = res;

      // Profile details
      if (profileId) {
        profileVal.textContent = displayName || (profileId.substring(0, 10) + '...');
      } else {
        profileVal.textContent = 'Default Studio Profile';
      }

      // App status
      if (desktopAppRunning) {
        appStatusVal.textContent = 'Active (Cinematic Studio v2.0.2)';
        appStatusVal.style.color = '#34d399';
      } else if (isNativeConnected) {
        appStatusVal.textContent = 'Native Host Active';
        appStatusVal.style.color = '#38bdf8';
      } else {
        appStatusVal.textContent = 'Not Running / Unreachable';
        appStatusVal.style.color = '#94a3b8';
      }

      // Truthful Badge and Handshake State
      if (isHandshakeComplete && isNativeConnected) {
        setUiState('CONNECTED', true, 'Secure connection verified. AI Video production bridge is active.');
        handshakeVal.textContent = 'VERIFIED ✓ (HMAC-SHA256)';
        handshakeVal.style.color = '#34d399';
      } else if (isNativeConnected) {
        setUiState('AUTHENTICATING', false, 'Host connected. Completing mutual challenge-response handshake...');
        handshakeVal.textContent = 'AUTHENTICATING...';
        handshakeVal.style.color = '#fcd34d';
      } else if (lastError) {
        setUiState('DISCONNECTED', false, lastError);
        handshakeVal.textContent = 'DISCONNECTED';
        handshakeVal.style.color = '#94a3b8';
      } else {
        setUiState('DISCONNECTED', false, 'Ready to connect. Click above to establish bridge.');
        handshakeVal.textContent = 'STANDBY';
        handshakeVal.style.color = '#94a3b8';
      }
    });

    inspectCurrentTab();
  }

  function setUiState(status, isConnected, noticeText) {
    statusBadge.textContent = status;
    statusNotice.textContent = noticeText;

    if (status === 'CONNECTED') {
      statusBadge.className = 'badge badge-connected';
      statusNotice.className = 'notice success';
      btnConnect.style.display = 'none';
      actionControls.style.display = 'flex';
    } else if (status === 'AUTHENTICATING' || status === 'CONNECTING') {
      statusBadge.className = 'badge badge-connecting';
      statusNotice.className = 'notice';
      btnConnect.style.display = 'flex';
      btnConnect.disabled = true;
      btnConnect.innerHTML = `<span>CONNECTING...</span>`;
      actionControls.style.display = 'none';
    } else {
      statusBadge.className = 'badge badge-disconnected';
      statusNotice.className = 'notice';
      btnConnect.style.display = 'flex';
      btnConnect.disabled = false;
      btnConnect.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        <span>CONNECT TO CINEMATIC STUDIO</span>
      `;
      actionControls.style.display = 'none';
    }
  }

  // 3. One-Click Primary Action: CONNECT TO CINEMATIC STUDIO
  btnConnect.addEventListener('click', () => {
    setUiState('CONNECTING', false, 'Verifying desktop installation and initiating secure handshake...');

    chrome.runtime.sendMessage({ action: 'CONNECT_TO_STUDIO' }, (res) => {
      if (res && res.success) {
        setTimeout(refreshState, 600);
      } else {
        const err = res?.error || 'Could not reach Cinematic Studio. Ensure the desktop application is installed.';
        setUiState('DISCONNECTED', false, err);
      }
    });
  });

  // Reconnect
  btnReconnect.addEventListener('click', () => {
    setUiState('CONNECTING', false, 'Reconnecting to Cinematic Studio host...');
    chrome.runtime.sendMessage({ action: 'RECONNECT_STUDIO' }, () => {
      setTimeout(refreshState, 600);
    });
  });

  // Focus Desktop App & AI Video Workspace
  btnOpenStudio.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'FOCUS_AND_NAVIGATE_WORKSPACE', workspace: 'aivideo' }, (res) => {
      if (res && res.success) {
        statusNotice.textContent = 'Command sent to focus Cinematic Studio AI Video workspace.';
      }
    });
  });

  // Disconnect
  btnDisconnect.addEventListener('click', () => {
    if (confirm('Disconnect this Chrome session from Cinematic Studio?')) {
      chrome.runtime.sendMessage({ action: 'DISCONNECT_STUDIO' }, () => {
        refreshState();
      });
    }
  });

  // Initial load
  refreshState();
  setInterval(refreshState, 3000);
});
