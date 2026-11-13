/**
 * CINEMATIC STUDIO — Isolated Content Script
 * Provider State Detection & DOM Bridge Foundation
 */

(function() {
  console.log('[Cinematic Studio Agent] Content script injected on:', window.location.hostname);

  // Detect basic authenticated state on known providers
  function detectAuthState() {
    const host = window.location.hostname;
    let isAuthenticated = false;
    let userIndicator = null;

    if (host.includes('chatgpt.com')) {
      // ChatGPT authenticated user menu indicator
      const avatar = document.querySelector('button[data-testid="profile-button"], img[alt*="User"]');
      if (avatar) {
        isAuthenticated = true;
        userIndicator = 'ChatGPT User';
      }
    } else if (host.includes('claude.ai')) {
      // Claude user menu
      const userBtn = document.querySelector('[data-testid="user-menu-button"]');
      if (userBtn) {
        isAuthenticated = true;
        userIndicator = 'Claude User';
      }
    } else if (host.includes('google.com')) {
      // Google Veo / Gemini Google Account indicator
      const gAccount = document.querySelector('a[aria-label*="Google Account"], img[alt*="Google Account"]');
      if (gAccount) {
        isAuthenticated = true;
        userIndicator = gAccount.getAttribute('aria-label') || 'Google Account Active';
      }
    }

    return { isAuthenticated, userIndicator, hostname: host, title: document.title };
  }

  // Listen for queries from background service worker
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'CHECK_PROVIDER_STATUS') {
      const auth = detectAuthState();
      sendResponse(auth);
    }
  });
})();
