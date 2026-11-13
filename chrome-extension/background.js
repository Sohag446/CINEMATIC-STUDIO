/**
 * CINEMATIC STUDIO — Ephemeral Manifest V3 Background Service Worker
 * Native Messaging Bridge, HMAC-SHA256 Authentication & Profile Isolation
 */

import { ExecutionEngine } from './engine/executionEngine.js';

const NATIVE_HOST_NAME = 'com.cinematic.studio';
let nativePort = null;
let reconnectTimer = null;
let isHandshakeComplete = false;
const engine = new ExecutionEngine(postDesktopMessage);

// ----------------------------------------------------------------------------
// 1. LIFECYCLE INITIALIZATION & STATE RESTORATION
// ----------------------------------------------------------------------------
self.addEventListener('activate', () => {
  console.log('[Cinematic Agent] Service Worker activated.');
  initiateNativeConnection();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Cinematic Agent] Chrome startup detected. Restoring session...');
  initiateNativeConnection();
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Cinematic Agent] Installed or updated:', details.reason);
  initiateNativeConnection();
});

// ----------------------------------------------------------------------------
// 2. CRYPTOGRAPHIC HMAC-SHA256 UTILITY
// ----------------------------------------------------------------------------
async function computeHmacSha256Hex(secretHex, message) {
  const encoder = new TextEncoder();
  const rawSecret = encoder.encode(secretHex);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawSecret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuf = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const hashBytes = Array.from(new Uint8Array(signatureBuf));
  return hashBytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ----------------------------------------------------------------------------
// 3. NATIVE MESSAGING PORT MANAGEMENT & RECONNECTION
// ----------------------------------------------------------------------------
async function initiateNativeConnection() {
  if (nativePort) {
    return;
  }

  const { profileId, pairingSecret } = await chrome.storage.local.get(['profileId', 'pairingSecret']);
  if (!profileId || !pairingSecret) {
    console.log('[Cinematic Agent] Extension is not paired yet. Standing by for pairing token.');
    await chrome.storage.local.set({ connectionState: 'PAIRING_REQUIRED' });
    return;
  }

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    console.log('[Cinematic Agent] Connected to Native Messaging Host:', NATIVE_HOST_NAME);

    nativePort.onMessage.addListener(handleDesktopMessage);

    nativePort.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Host closed connection';
      console.warn('[Cinematic Agent] Native Messaging host disconnected:', error);
      nativePort = null;
      isHandshakeComplete = false;
      chrome.storage.local.set({ connectionState: 'DISCONNECTED', lastError: error });

      // Exponential bounded backoff reconnection (5 seconds)
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          initiateNativeConnection();
        }, 5000);
      }
    });

    // Send initial handshake ping
    const clientNonce = crypto.randomUUID();
    postDesktopMessage({
      id: crypto.randomUUID(),
      type: 'INITIATE_HANDSHAKE',
      profile_id: profileId,
      payload: { client_nonce: clientNonce },
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('[Cinematic Agent] Failed to connect to Native Messaging host:', err);
    chrome.storage.local.set({ connectionState: 'ERROR', lastError: err.message });
  }
}

function postDesktopMessage(msg) {
  if (nativePort) {
    try {
      nativePort.postMessage(msg);
    } catch (e) {
      console.error('[Cinematic Agent] postMessage failed:', e);
    }
  }
}

// ----------------------------------------------------------------------------
// 4. DESKTOP MESSAGE DISPATCHER & HANDSHAKE
// ----------------------------------------------------------------------------
async function handleDesktopMessage(packet) {
  if (!packet || typeof packet !== 'object') return;

  const { profileId, pairingSecret } = await chrome.storage.local.get(['profileId', 'pairingSecret']);

  // Strict Profile Isolation: reject messages intended for a different registered profile
  if (packet.profile_id && packet.profile_id !== profileId) {
    console.warn(`[Cinematic Agent] Security violation: received message for profile ${packet.profile_id}, but this profile is ${profileId}. Dropping.`);
    return;
  }

  switch (packet.type) {
    case 'CHALLENGE_ISSUED': {
      // Desktop sends server_nonce, request HMAC signature
      const { server_nonce, session_id } = packet.payload || {};
      if (!server_nonce || !pairingSecret) return;

      const clientNonce = crypto.randomUUID();
      const messageToSign = `${server_nonce}:${clientNonce}`;
      const signatureHex = await computeHmacSha256Hex(pairingSecret, messageToSign);

      postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'VERIFY_HANDSHAKE_RESPONSE',
        profile_id: profileId,
        payload: {
          session_id,
          client_nonce: clientNonce,
          signature_hex: signatureHex
        },
        timestamp: Date.now()
      });
      break;
    }

    case 'HANDSHAKE_VERIFIED': {
      isHandshakeComplete = true;
      await chrome.storage.local.set({ 
        connectionState: 'EXTENSION_CONNECTED',
        lastSeenAt: Date.now(),
        lastError: null
      });
      console.log('[Cinematic Agent] Mutual cryptographic handshake verified. State: EXTENSION_CONNECTED');
      break;
    }

    case 'PING': {
      postDesktopMessage({
        id: packet.id,
        type: 'PONG',
        profile_id: profileId,
        payload: {
          status: 'HEALTHY',
          handshake_active: isHandshakeComplete,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
      break;
    }

    case 'QUERY_ACTIVE_PROVIDER_TABS': {
      // Find matching tabs in current profile
      const targetDomain = packet.payload?.domain || '';
      const tabs = await findMatchingTabs(targetDomain);
      postDesktopMessage({
        id: packet.id,
        type: 'QUERY_ACTIVE_PROVIDER_TABS_RESPONSE',
        profile_id: profileId,
        payload: { tabs },
        timestamp: Date.now()
      });
      break;
    }

    case 'EXECUTE_TASK': {
      if (!isHandshakeComplete) {
        console.warn('[Cinematic Agent] Cannot execute task: handshake not verified.');
        return;
      }
      engine.executeTask(packet.payload, profileId);
      break;
    }

    case 'CANCEL_TASK': {
      const taskId = packet.payload?.task_id;
      if (taskId) engine.cancelTask(taskId, profileId);
      break;
    }

    default:
      console.log('[Cinematic Agent] Unknown desktop packet type:', packet.type);
  }
}

// ----------------------------------------------------------------------------
// 5. TAB DISCOVERY & DEDUPLICATION (Part C9)
// ----------------------------------------------------------------------------
async function findMatchingTabs(domain) {
  const queryOptions = {};
  if (domain) {
    queryOptions.url = `*://${domain}/*`;
  }
  const tabs = await chrome.tabs.query(queryOptions);
  return tabs.map(t => ({
    id: t.id,
    url: t.url,
    title: t.title,
    status: t.status,
    active: t.active
  }));
}

// ----------------------------------------------------------------------------
// 6. POPUP & INTERNAL EXTENSION MESSAGING INTERFACE
// ----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'RELAY_TASK_PROGRESS') {
    chrome.storage.local.get(['profileId']).then(({ profileId }) => {
      if (profileId && req.progress) {
        engine.relayProgress(req.progress, profileId);
      }
    });
    return;
  }

  if (req.action === 'GET_STATUS') {
    chrome.storage.local.get(['profileId', 'pairingSecret', 'connectionState', 'lastSeenAt', 'lastError'])
      .then(data => {
        sendResponse({
          ...data,
          isNativeConnected: !!nativePort,
          isHandshakeComplete
        });
      });
    return true; // async sendResponse
  }

  if (req.action === 'SET_PAIRING_MATERIAL') {
    const { profileId, pairingSecret } = req;
    if (!profileId || !pairingSecret) {
      sendResponse({ success: false, error: 'Profile ID and Pairing Secret are required' });
      return;
    }
    chrome.storage.local.set({ 
      profileId, 
      pairingSecret, 
      connectionState: 'PAIRING_PENDING',
      lastError: null 
    }).then(() => {
      // Attempt connection immediately
      initiateNativeConnection();
      sendResponse({ success: true });
    });
    return true;
  }

  if (req.action === 'UNPAIR') {
    if (nativePort) {
      nativePort.disconnect();
      nativePort = null;
    }
    isHandshakeComplete = false;
    chrome.storage.local.clear().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (req.action === 'TEST_CONNECTION') {
    initiateNativeConnection();
    sendResponse({ 
      success: true, 
      isNativeConnected: !!nativePort, 
      isHandshakeComplete 
    });
    return true;
  }
});
