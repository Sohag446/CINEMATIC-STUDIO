/**
 * CINEMATIC STUDIO — Browser Adapter Common DOM Utilities
 */

(function() {
  window.CinematicAdapters = window.CinematicAdapters || {};

  const CommonUtils = {
    /**
     * Attempts to find an element using an ordered list of fallback selectors
     */
    queryWithFallbacks(selectors, root = document) {
      for (const sel of selectors) {
        try {
          const el = root.querySelector(sel);
          if (el) return el;
        } catch (e) {
          // ignore invalid selector syntax in fallbacks
        }
      }
      return null;
    },

    /**
     * Polls the DOM until at least one selector in the fallback list resolves
     */
    async waitForElement(selectors, timeoutMs = 15000, root = document) {
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const el = this.queryWithFallbacks(selectors, root);
        if (el && el.offsetParent !== null) { // visible
          return el;
        }
        await this.sleep(250);
      }
      return null;
    },

    /**
     * Dispatches realistic synthetic input events for React, Vue, and ProseMirror rich inputs
     */
    dispatchInput(element, text) {
      element.focus();

      if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
        // ProseMirror / Rich-Textarea contenteditable handling
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, text);
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      } else {
        // Native textarea or input
        const proto = Object.getPrototypeOf(element);
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(element, text);
        } else {
          element.value = text;
        }
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    },

    /**
     * Checks for anti-bot, login expiry, or rate-limit gates
     */
    checkChallenges() {
      // 1. Cloudflare Turnstile / Challenge
      const cfFrame = document.querySelector('iframe[src*="cloudflare"], #turnstile-wrapper, .cf-turnstile');
      if (cfFrame) {
        return { isChallenged: true, reason: 'CAPTCHA', message: 'Cloudflare Turnstile challenge detected' };
      }

      // 2. Google / Universal CAPTCHA
      const recaptcha = document.querySelector('iframe[src*="recaptcha"], .g-recaptcha');
      if (recaptcha) {
        return { isChallenged: true, reason: 'CAPTCHA', message: 'reCAPTCHA challenge detected' };
      }

      // 3. Login redirect / expiry
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('/login') || pathname.includes('/auth') || pathname.includes('/signin')) {
        return { isChallenged: true, reason: 'AUTH_EXPIRED', message: 'Authentication session expired (redirected to login)' };
      }

      return { isChallenged: false };
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };

  window.CinematicAdapters.Common = CommonUtils;
})();

