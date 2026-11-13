/**
 * CINEMATIC STUDIO — Extension Popup UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('statusBadge');
  const pairedView = document.getElementById('pairedView');
  const unpairedView = document.getElementById('unpairedView');
  const profileIdVal = document.getElementById('profileIdVal');
  const nativeStatusVal = document.getElementById('nativeStatusVal');
  const handshakeVal = document.getElementById('handshakeVal');
  const pairingInput = document.getElementById('pairingInput');
  const btnPair = document.getElementById('btnPair');
  const btnTestConn = document.getElementById('btnTestConn');
  const btnUnpair = document.getElementById('btnUnpair');

  function refresh() {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (res) => {
      if (!res) return;

      const { profileId, connectionState, isNativeConnected, isHandshakeComplete } = res;

      if (profileId) {
        pairedView.style.display = 'block';
        unpairedView.style.display = 'none';

        profileIdVal.textContent = profileId.substring(0, 8) + '...';
        nativeStatusVal.textContent = isNativeConnected ? 'CONNECTED' : 'DISCONNECTED';
        handshakeVal.textContent = isHandshakeComplete ? 'VERIFIED' : 'PENDING';

        if (isHandshakeComplete) {
          statusBadge.textContent = 'CONNECTED';
          statusBadge.className = 'badge badge-connected';
        } else if (isNativeConnected) {
          statusBadge.textContent = 'AUTHENTICATING';
          statusBadge.className = 'badge badge-pending';
        } else {
          statusBadge.textContent = connectionState || 'DISCONNECTED';
          statusBadge.className = 'badge badge-disconnected';
        }
      } else {
        pairedView.style.display = 'none';
        unpairedView.style.display = 'block';
        statusBadge.textContent = 'UNPAIRED';
        statusBadge.className = 'badge badge-disconnected';
      }
    });
  }

  btnPair.addEventListener('click', () => {
    const raw = pairingInput.value.trim();
    if (!raw) return;

    let profileId = null;
    let pairingSecret = null;

    if (raw.startsWith('cinematic://pair')) {
      const url = new URL(raw.replace('cinematic://', 'http://localhost/'));
      profileId = url.searchParams.get('profile');
      pairingSecret = url.searchParams.get('secret');
    } else if (raw.includes(':')) {
      const parts = raw.split(':');
      profileId = parts[0];
      pairingSecret = parts[1];
    }

    if (!profileId || !pairingSecret) {
      alert('Invalid pairing format. Use cinematic://pair?profile=...&secret=... or profile:secret');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'SET_PAIRING_MATERIAL',
      profileId,
      pairingSecret
    }, (res) => {
      if (res && res.success) {
        pairingInput.value = '';
        setTimeout(refresh, 500);
      } else {
        alert(res?.error || 'Failed to save pairing material');
      }
    });
  });

  btnTestConn.addEventListener('click', () => {
    btnTestConn.textContent = 'Testing...';
    chrome.runtime.sendMessage({ action: 'TEST_CONNECTION' }, (res) => {
      btnTestConn.textContent = 'Test Connection';
      refresh();
    });
  });

  btnUnpair.addEventListener('click', () => {
    if (confirm('Are you sure you want to unpair this Chrome profile from Cinematic Studio?')) {
      chrome.runtime.sendMessage({ action: 'UNPAIR' }, () => {
        refresh();
      });
    }
  });

  refresh();
});
