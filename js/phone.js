/**
 * phone.js — Core phone logic
 * Handles: power, volume, flashlight, brightness, notification panel, time.
 */

const Phone = (() => {
  let isOn = true;
  let flashlight = false;
  let volume = 50;
  let notifY = -100; // notification panel translateY %
  let draggingPanel = false;
  let panelStartY = 0;

  // --- Time ---
  function updateTime() {
    const el = document.getElementById('time');
    if (el) {
      const now = new Date();
      el.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  // --- Power ---
  function togglePower() {
    isOn = !isOn;
    const screen = document.getElementById('screen');
    if (!isOn) {
      screen.classList.add('off');
      screen.setAttribute('data-off', '1');
    } else {
      screen.classList.remove('off');
      screen.removeAttribute('data-off');
      AppManager.goHome();
    }
  }

  function isPoweredOn() { return isOn; }

  // --- Flashlight ---
  function toggleFlashlight() {
    flashlight = !flashlight;
    document.body.style.background = flashlight ? '#fff' : '#0a0a0a';
  }

  // --- Volume ---
  function volumeUp() {
    volume = Math.min(100, volume + 10);
    showToast('🔊 Volume ' + volume);
  }
  function volumeDown() {
    volume = Math.max(0, volume - 10);
    showToast('🔉 Volume ' + volume);
  }
  function getVolume() { return volume; }

  // --- Toast notification (replaces alert) ---
  function showToast(msg) {
    let toast = document.getElementById('phone-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'phone-toast';
      toast.style.cssText = `
        position:absolute;bottom:60px;left:50%;transform:translateX(-50%);
        background:rgba(255,255,255,0.12);backdrop-filter:blur(10px);
        color:white;padding:6px 16px;border-radius:20px;font-size:11px;
        font-family:'Inter',Arial,sans-serif;pointer-events:none;
        opacity:0;transition:opacity 0.3s;z-index:50;white-space:nowrap;
      `;
      document.querySelector('.phone').appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 1500);
  }

  // --- Brightness (sun/moon toggle) ---
  function toggleBrightnessControl() {
    document.getElementById('moon').classList.toggle('active');
    document.getElementById('sun').classList.toggle('active');
  }

  // --- Notification panel drag ---
  function initNotificationDrag() {
    const panel = document.getElementById('notificationPanel');

    document.addEventListener('mousedown', (e) => {
      const phoneRect = document.querySelector('.phone').getBoundingClientRect();
      const relY = e.clientY - phoneRect.top;
      if (relY < 40 || notifY === 0) {
        draggingPanel = true;
        panelStartY = e.clientY;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!draggingPanel) return;
      const delta = e.clientY - panelStartY;
      const movePercent = (delta / window.innerHeight) * 150;
      const translateY = Math.min(0, Math.max(-100, -100 + movePercent));
      panel.style.transform = `translateY(${translateY}%)`;
      notifY = translateY;
    });

    document.addEventListener('mouseup', () => {
      if (!draggingPanel) return;
      draggingPanel = false;
      if (notifY > -60) {
        panel.style.transform = 'translateY(0%)';
        notifY = 0;
      } else {
        panel.style.transform = 'translateY(-100%)';
        notifY = -100;
      }
    });
  }

  // --- Moon drag (brightness) ---
  function initMoonDrag() {
    const moon = document.getElementById('moon');
    const sun = document.getElementById('sun');
    const overlay = document.getElementById('brightnessOverlay');
    let dragging = false, offsetX = 0, offsetY = 0;

    moon.addEventListener('mousedown', (e) => {
      dragging = true;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
      e.stopPropagation();
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = document.getElementById('screen').getBoundingClientRect();
      let x = e.clientX - rect.left - offsetX;
      let y = e.clientY - rect.top - offsetY;
      x = Math.max(0, Math.min(rect.width - 100, x));
      y = Math.max(0, Math.min(rect.height - 100, y));
      moon.style.left = x + 'px';
      moon.style.top = y + 'px';

      const sunRect = sun.getBoundingClientRect();
      const moonRect = moon.getBoundingClientRect();
      const dx = (sunRect.left + 50) - (moonRect.left + 50);
      const dy = (sunRect.top + 50) - (moonRect.top + 50);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const coverage = Math.max(0, 1 - dist / 100);
      overlay.style.opacity = coverage * 0.9;
    });
  }

  // --- Init ---
  function init() {
    updateTime();
    setInterval(updateTime, 1000);
    initNotificationDrag();
    initMoonDrag();
  }

  return {
    init,
    togglePower,
    toggleFlashlight,
    volumeUp,
    volumeDown,
    toggleBrightnessControl,
    isPoweredOn,
    getVolume,
    showToast,
  };
})();
