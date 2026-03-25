/**
 * camera.js — Roast Camera
 * Overrides openApp('Camera') in the phone interface.
 * "Takes a photo" then delivers a sarcastic roast with dramatic flair.
 */

const RoastCameraApp = (() => {
  let container = null;
  let shotCount = 0;
  let videoStream = null;
  let videoElement = null;
  let currentCamera = 'user'; // 'user' = front camera, 'environment' = back camera

  const ROASTS = [
    "That face could make an onion cry… from laughter. 😂",
    "You look like you were drawn from memory by someone who's never met you. 🎨",
    'If charisma was Wi-Fi, you\'d be "No Signal." 📵',
    "You're proof that even God has off days. 🙏",
    "Your face just crashed my beauty algorithm. Fatal error. 💀",
    "I've seen better looking avatars on a default profile pic. 👤",
    "You look like you argue with mirrors… and lose. 🪞",
    "Even my flash couldn't make this photo brighter. ⚡",
    "404: Attractiveness Not Found. 🔍",
    "I'd roast you harder, but I don't want to start a grease fire. 🔥",
    "You look like a 'before' picture in every ad ever made. 📸",
    "My lens just filed a complaint. HR is involved now. 📋",
    "You're not ugly, you're just… aggressively average. 😐",
    "That's not a face, that's a modern art exhibit nobody asked for. 🖼️",
    "Even filters are like: 'Nah, I can't fix this.' 🚫",
    "Your face made autocorrect give up. ⌨️",
    "I tried to enhance this photo. My GPU caught fire. 🖥️🔥",
    "You look like you got dressed in the dark… during an earthquake. 🌋",
    "Somewhere out there, a village is missing its… you know what, nevermind. 🏘️",
    "If boredom had a face, well... say no more. 😴"
  ];

  const EMOJIS = ['🤡', '💀', '😭', '🫠', '🤮', '😬', '🥴', '🤣', '👽', '🫣', '💅', '🪦'];

  const ANALYZING_MSGS = [
    'Analyzing face…',
    'Scanning for beauty…',
    'Loading roast engine…',
    'Consulting the burn unit…',
    'Calculating savagery…',
    'Warming up insults…'
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  async function startCamera() {
    if (!container) return;
    
    const videoContainer = container.querySelector('.camera-video-container');
    const errorEl = container.querySelector('.camera-error');
    const hintEl = container.querySelector('.camera-hint');
    
    try {
      // Request camera access
      const constraints = {
        video: {
          facingMode: currentCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      videoStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create video element if not exists
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('autoplay', '');
        videoElement.muted = true;
      }
      
      videoElement.srcObject = videoStream;
      videoContainer.appendChild(videoElement);
      
      // Hide error, show hint
      if (errorEl) errorEl.style.display = 'none';
      if (hintEl) hintEl.textContent = ' ';
      
    } catch (err) {
      console.error('Camera error:', err);
      if (errorEl) {
        errorEl.style.display = 'block';
        if (err.name === 'NotAllowedError') {
          errorEl.textContent = '📷 Camera access denied\nClick to try again';
        } else if (err.name === 'NotFoundError') {
          errorEl.textContent = '📷 No camera found\nClick to try again';
        } else {
          errorEl.textContent = '📷 Camera error: ' + err.message + '\nClick to try again';
        }
      }
      if (hintEl) hintEl.textContent = '';
    }
  }

  function stopCamera() {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  function typeText(el, text, speed, cb) {
    el.textContent = '';
    let i = 0;
    function step() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(step, speed);
      } else if (cb) {
        setTimeout(cb, 200);
      }
    }
    step();
  }

  function captureImage() {
    if (!videoElement) return null;
    
    // Create a canvas to capture the current frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    
    // Apply the same hue-rotate filter if it's active
    const vf = container.querySelector('.camera-viewfinder');
    if (vf && vf.style.filter) {
      ctx.filter = vf.style.filter;
    }
    
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  function saveToGallery(imageData) {
    // Get existing captured images from localStorage
    let capturedImages = [];
    try {
      const stored = localStorage.getItem('capturedPhotos');
      capturedImages = stored ? JSON.parse(stored) : [];
    } catch (e) {
      capturedImages = [];
    }
    
    // Add new image
    capturedImages.unshift({
      data: imageData,
      timestamp: Date.now()
    });
    
    // Keep only last 20 images
    if (capturedImages.length > 20) {
      capturedImages = capturedImages.slice(0, 20);
    }
    
    // Save back to localStorage
    try {
      localStorage.setItem('capturedPhotos', JSON.stringify(capturedImages));
    } catch (e) {
      console.error('Failed to save photo:', e);
    }
    
    // Notify gallery if it's open
    if (window.galleryRefreshCallback) {
      window.galleryRefreshCallback();
    }
  }

  function onShutter() {
    if (!container) return;
    
    // Capture the image first
    const capturedImage = captureImage();
    
    // Save to gallery if we have a valid capture
    if (capturedImage) {
      saveToGallery(capturedImage);
    }
    
    shotCount++;

    // Update counter
    const counter = container.querySelector('.camera-counter');
    if (counter) counter.textContent = `#${shotCount}`;

    // Flash effect
    const flash = container.querySelector('.camera-flash');
    if (flash) {
      flash.classList.remove('active');
      void flash.offsetWidth; // reflow
      flash.classList.add('active');
    }

    // Scanning state
    const face = container.querySelector('.camera-face-outline');
    if (face) face.classList.add('scanning');

    // Show analyzing text after flash
    setTimeout(() => {
      const analyzing = container.querySelector('.camera-analyzing');
      const analyzingText = container.querySelector('.camera-analyzing-text');
      if (analyzing) analyzing.classList.add('active');

      // Cycle through analyzing messages
      let msgIndex = 0;
      const msgs = [pick(ANALYZING_MSGS), pick(ANALYZING_MSGS)];
      if (analyzingText) analyzingText.textContent = msgs[0];

      const msgInterval = setInterval(() => {
        msgIndex++;
        if (msgIndex < msgs.length && analyzingText) {
          analyzingText.textContent = msgs[msgIndex];
        }
      }, 700);

      // Show roast after delay
      setTimeout(() => {
        clearInterval(msgInterval);
        if (analyzing) analyzing.classList.remove('active');
        if (face) face.classList.remove('scanning');
        showRoast();
      }, 1800);
    }, 400);
  }

  function showRoast() {
    if (!container) return;
    const overlay = container.querySelector('.camera-roast-overlay');
    const emojiEl = container.querySelector('.camera-roast-emoji');
    const textEl = container.querySelector('.camera-roast-text');

    if (!overlay || !textEl) return;

    const roast = pick(ROASTS);
    const emoji = pick(EMOJIS);

    if (emojiEl) emojiEl.textContent = emoji;
    overlay.classList.add('active');

    // Typing effect for the roast
    typeText(textEl, roast, 30, () => {
      textEl.classList.add('shake');
      setTimeout(() => textEl.classList.remove('shake'), 500);
    });
  }

  function closeRoast() {
    if (!container) return;
    const overlay = container.querySelector('.camera-roast-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function render(parentEl) {
    container = document.createElement('div');
    container.className = 'camera-app';

    container.innerHTML = `
      <div class="camera-viewfinder">
        <div class="camera-video-container"></div>

        <div class="camera-counter">#0</div>

        <div class="camera-hint">Loading camera...</div>
        
        <div class="camera-error"></div>

        <div class="camera-analyzing">
          <div class="camera-analyzing-text">Analyzing face…</div>
          <div class="camera-analyzing-dots">● ● ●</div>
        </div>

        <div class="camera-flash"></div>
      </div>

      <div class="camera-controls">
        <button class="camera-side-btn camera-flip-btn">🔄</button>
        <button class="camera-shutter"></button>
        <button class="camera-side-btn camera-filter-btn">✨</button>
      </div>

      <div class="camera-roast-overlay">
        <div class="camera-roast-card">
          <div class="camera-roast-emoji">🤡</div>
          <div class="camera-roast-label">✦ BRUTAL ANALYSIS ✦</div>
          <div class="camera-roast-text"></div>
          <button class="camera-close-btn">I can't handle this 😭</button>
        </div>
      </div>
    `;

    parentEl.appendChild(container);

    // Event listeners
    container.querySelector('.camera-shutter').addEventListener('click', onShutter);
    container.querySelector('.camera-close-btn').addEventListener('click', closeRoast);

    // Flip button - switch between front/back camera
    container.querySelector('.camera-flip-btn').addEventListener('click', async () => {
      // Stop current stream
      stopCamera();
      
      // Toggle camera
      currentCamera = currentCamera === 'user' ? 'environment' : 'user';
      
      // Restart camera
      await startCamera();
    });

    // Error click to retry
    const errorEl = container.querySelector('.camera-error');
    if (errorEl) {
      errorEl.addEventListener('click', startCamera);
    }

    // Start the real camera
    startCamera();
    let currentHue = 0;
    container.querySelector('.camera-filter-btn').addEventListener('click', () => {
      const vf = container.querySelector('.camera-viewfinder');
      if (!vf) return;
      // increment hue instead of random
      currentHue = (currentHue + 60) % 360;
      vf.style.filter = `hue-rotate(${currentHue}deg)`;
    });
  }

  function destroy() {
    stopCamera();
    container = null;
    shotCount = 0;
  }

  function init() {
    const origOpenApp = window.openApp;
    window.openApp = function(name) {
      if (name === 'Camera') {
        if (typeof isOn !== 'undefined' && !isOn) return;
        destroy();

        const screen = document.getElementById('screen');
        // Clear screen content but don't touch status bar (it's outside the screen)
        screen.innerHTML = '';

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'height:calc(100% - 83px);overflow:hidden;position:relative;';
        screen.appendChild(contentDiv);

        // Re-add brightness overlay and sun/moon (hidden by default)
        screen.insertAdjacentHTML('beforeend', `
          <div class="brightness-overlay" id="brightnessOverlay"></div>
          <div class="sun" id="sun"></div>
          <div class="moon" id="moon"></div>
        `);

        render(contentDiv);
      } else {
        origOpenApp(name);
      }
    };
  }

  return { init, destroy };
})();

RoastCameraApp.init();
