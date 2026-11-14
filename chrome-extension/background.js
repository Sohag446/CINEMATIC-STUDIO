/**
 * CINEMATIC STUDIO — Ephemeral Manifest V3 Background Service Worker
 * Native Messaging Bridge, HMAC-SHA256 Authentication & One-Click Bridge
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
  initiateNativeConnection(false);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Cinematic Agent] Chrome startup detected. Restoring session...');
  initiateNativeConnection(false);
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Cinematic Agent] Installed or updated:', details.reason);
  initiateNativeConnection(false);
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
async function initiateNativeConnection(autoRegisterIfUnpaired = true) {
  if (nativePort) {
    return nativePort;
  }

  const { profileId, pairingSecret } = await chrome.storage.local.get(['profileId', 'pairingSecret']);

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
    });

    if (profileId && pairingSecret) {
      // Send handshake challenge request
      const clientNonce = crypto.randomUUID();
      postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'INITIATE_HANDSHAKE',
        profile_id: profileId,
        payload: { client_nonce: clientNonce },
        timestamp: Date.now()
      });
    } else if (autoRegisterIfUnpaired) {
      console.log('[Cinematic Agent] Unpaired profile. Requesting auto-registration from Cinematic Studio...');
      postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'AUTO_DISCOVER_OR_REGISTER_PROFILE',
        payload: {
          client_version: '2.0.2',
          requested_workspace: 'aivideo'
        },
        timestamp: Date.now()
      });
    } else {
      await chrome.storage.local.set({ connectionState: 'PAIRING_REQUIRED' });
    }

    return nativePort;
  } catch (err) {
    console.error('[Cinematic Agent] Failed to connect to Native Messaging host:', err);
    chrome.storage.local.set({ connectionState: 'ERROR', lastError: err.message });
    return null;
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

  // Handle auto-registration response before profileId check
  if (packet.type === 'PROFILE_REGISTRATION_SUCCESS') {
    const { profile_id, display_name, session_id, server_nonce, pairing_secret } = packet.payload || {};
    if (profile_id && pairing_secret && server_nonce) {
      console.log(`[Cinematic Agent] Auto-registered with profile ${display_name} (${profile_id})`);
      await chrome.storage.local.set({
        profileId: profile_id,
        displayName: display_name,
        pairingSecret: pairing_secret,
        connectionState: 'PAIRING_PENDING',
        lastError: null
      });

      // Complete handshake immediately
      const clientNonce = crypto.randomUUID();
      const messageToSign = `${server_nonce}:${clientNonce}`;
      const signatureHex = await computeHmacSha256Hex(pairing_secret, messageToSign);

      postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'VERIFY_HANDSHAKE_RESPONSE',
        profile_id,
        payload: {
          session_id,
          client_nonce: clientNonce,
          signature_hex: signatureHex
        },
        timestamp: Date.now()
      });
    }
    return;
  }

  // Strict Profile Isolation for subsequent messages
  if (packet.profile_id && profileId && packet.profile_id !== profileId) {
    console.warn(`[Cinematic Agent] Security violation: received message for profile ${packet.profile_id}, but this profile is ${profileId}. Dropping.`);
    return;
  }

  switch (packet.type) {
    case 'CHALLENGE_ISSUED': {
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

      // Notify host to focus AI Video workspace
      postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'FOCUS_AND_NAVIGATE_WORKSPACE',
        profile_id: profileId,
        payload: { workspace: 'aivideo' },
        timestamp: Date.now()
      });
      break;
    }

    case 'APP_STATUS_RESPONSE': {
      await chrome.storage.local.set({
        desktopAppRunning: true,
        desktopVersion: packet.payload?.version || '2.0.2',
        lastSeenAt: Date.now()
      });
      break;
    }

    case 'STUDIO_FOCUS_ACK': {
      console.log('[Cinematic Agent] Desktop confirmed studio focus ack.');
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
      console.log('[Cinematic Agent] Desktop packet received:', packet.type);
  }
}

// ----------------------------------------------------------------------------
// 5. TAB DISCOVERY & DEDUPLICATION
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
  if (req.action === 'GET_CONNECTION_STATE' || req.action === 'GET_STATUS') {
    chrome.storage.local.get(['profileId', 'displayName', 'pairingSecret', 'connectionState', 'lastSeenAt', 'lastError'])
      .then(data => {
        sendResponse({
          ...data,
          isNativeConnected: !!nativePort,
          isHandshakeComplete,
          desktopAppRunning: !!nativePort
        });
      });
    return true;
  }

  if (req.action === 'CONNECT_TO_STUDIO') {
    initiateNativeConnection(true).then((port) => {
      if (port) {
        sendResponse({ success: true, connected: true });
      } else {
        sendResponse({ success: false, error: 'Could not connect to Native Messaging Host' });
      }
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (req.action === 'RECONNECT_STUDIO') {
    if (nativePort) {
      nativePort.disconnect();
      nativePort = null;
    }
    isHandshakeComplete = false;
    setTimeout(() => {
      initiateNativeConnection(true).then(() => {
        sendResponse({ success: true });
      });
    }, 200);
    return true;
  }

  if (req.action === 'DISCONNECT_STUDIO' || req.action === 'UNPAIR') {
    if (nativePort) {
      nativePort.disconnect();
      nativePort = null;
    }
    isHandshakeComplete = false;
    chrome.storage.local.set({ connectionState: 'DISCONNECTED', lastError: null }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (req.action === 'FOCUS_AND_NAVIGATE_WORKSPACE') {
    if (nativePort) {
      postDesktopMessage({
        id: crypto.randomUUID(),
        type: 'FOCUS_AND_NAVIGATE_WORKSPACE',
        payload: { workspace: req.workspace || 'aivideo' },
        timestamp: Date.now()
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Not connected to desktop application' });
    }
    return true;
  }

  if (req.action === 'RELAY_TASK_PROGRESS') {
    chrome.storage.local.get(['profileId']).then(({ profileId }) => {
      if (profileId && req.progress) {
        engine.relayProgress(req.progress, profileId);
      }
    });
    return;
  }
});
