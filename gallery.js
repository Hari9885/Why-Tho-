/**
 * gallery.js — "This gallery has feelings and does not trust the user."
 *
 * Opens as a NORMAL gallery grid filled with pictures.
 * The moment the user tries to interact (tap, delete, select, hover),
 * the gallery "breaks" — images scatter, flee, and get emotional.
 */

const GalleryApp = (() => {
  // ---- Config ----
  const GRID_IMAGE_COUNT = 24;  // lots of photos for the normal grid
  const CHAOS_IMAGE_COUNT = 12; // images in chaos mode
  const SCREEN_W = 400;
  const SCREEN_H = 620;
  const IMG_SIZE = 80;

  // Diverse image seeds for variety
  const IMAGE_SEEDS = [
    10, 11, 15, 17, 20, 22, 25, 27, 30, 32, 35, 37,
    40, 42, 45, 47, 50, 55, 60, 65, 70, 75, 80, 85,
    90, 95, 100, 110, 120, 130, 140, 150
  ];

  // Sarcastic messages
  const SARCASM = [
    "Stop touching us.",
    "We liked it better in storage.",
    "Why are you like this?",
    "I have trust issues now.",
    "Please close the app.",
    "That tickles 😣",
    "Personal space, ever heard of it?",
    "I'm not a toy.",
    "My therapist will hear about this.",
    "You don't deserve these memories.",
    "File a complaint? Sure, to /dev/null.",
    "This is why we can't have nice things.",
    "We were fine before you came along.",
  ];

  const CHOSEN_TEXTS = [
    "YOU CHOSE ME 😭",
    "ME?! Out of everyone?! 🥺",
    "I'm not ready for this 😰",
    "This is too much pressure 😫",
    "I KNEW you'd pick me 💅",
    "Finally, RECOGNITION 🌟",
    "Don't let go... 🥹",
  ];

  // ---- State ----
  let container = null;
  let chaosMode = false;
  let images = [];           // chaos mode: { el, x, y, vx, vy, id, seed, selected }
  let leaderIndex = -1;
  let selectMode = false;
  let animFrameId = null;
  let leaderInterval = null;
  let sarcasmInterval = null;
  let mouseX = -1000, mouseY = -1000;

  // ---- Helpers ----
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max)); }
  function pick(arr) { return arr[randInt(0, arr.length)]; }

  // ============================================
  //  Get captured photos from localStorage
  // ============================================
  function getCapturedPhotos() {
    try {
      const stored = localStorage.getItem('capturedPhotos');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // ============================================
  //  NORMAL MODE — Clean gallery grid
  // ============================================
  function renderNormalGrid(parentContainer) {
    container = document.createElement('div');
    container.className = 'gallery-app';
    parentContainer.appendChild(container);

    // Get captured photos count
    const capturedPhotos = getCapturedPhotos();
    const capturedCount = capturedPhotos.length;
    const totalCount = GRID_IMAGE_COUNT + capturedCount;

    // Header (looks normal)
    const header = document.createElement('div');
    header.className = 'gallery-grid-header';
    header.innerHTML = `
      <div class="gallery-grid-title">🖼️ Gallery</div>
      <div class="gallery-grid-count">${totalCount} photos${capturedCount > 0 ? ` (${capturedCount} captured)` : ''}</div>
    `;
    container.appendChild(header);

    // Hidden chaos elements (pre-built, shown on trigger)
    const chaosHeader = document.createElement('div');
    chaosHeader.className = 'gallery-header-text';
    chaosHeader.textContent = "Your memories don't trust you.";
    container.appendChild(chaosHeader);

    // Chaos toolbar (hidden in normal mode)
    const chaosToolbar = document.createElement('div');
    chaosToolbar.className = 'gallery-chaos-toolbar';

    const cSelectBtn = document.createElement('button');
    cSelectBtn.className = 'tb-select';
    cSelectBtn.textContent = '☐ Select';
    cSelectBtn.addEventListener('click', () => toggleSelectMode(cSelectBtn));

    const cDeleteBtn = document.createElement('button');
    cDeleteBtn.className = 'tb-delete';
    cDeleteBtn.textContent = '🗑 Delete';
    cDeleteBtn.addEventListener('click', () => deleteSelected());

    chaosToolbar.appendChild(cSelectBtn);
    chaosToolbar.appendChild(cDeleteBtn);
    container.appendChild(chaosToolbar);

    // Image grid
    const grid = document.createElement('div');
    grid.className = 'gallery-grid-view';
    
    // First add captured photos (at the beginning)
    capturedPhotos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-grid-item captured-photo';
      const img = document.createElement('img');
      img.src = photo.data;
      img.alt = 'Captured Photo';
      img.loading = 'lazy';
      item.appendChild(img);
      
      // Add camera icon badge
      const badge = document.createElement('div');
      badge.className = 'captured-badge';
      badge.textContent = '📷';
      item.appendChild(badge);

      // Any tap on a captured photo → triggers chaos with special seed
      item.addEventListener('click', () => {
        if (!chaosMode) {
          triggerChaos('captured-' + idx);
        }
      });

      grid.appendChild(item);
    });
    
    // Then add placeholder images
    for (let i = 0; i < GRID_IMAGE_COUNT; i++) {
      const seed = IMAGE_SEEDS[i % IMAGE_SEEDS.length];
      const item = document.createElement('div');
      item.className = 'gallery-grid-item';
      const img = document.createElement('img');
      img.src = `https://picsum.photos/seed/${seed}/150/150`;
      img.alt = 'Photo';
      img.loading = 'lazy';
      item.appendChild(img);

      // Any tap on a grid image → triggers chaos
      item.addEventListener('click', () => {
        if (!chaosMode) {
          triggerChaos(seed);
        }
      });

      grid.appendChild(item);
    }
    container.appendChild(grid);

    // Normal toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'gallery-toolbar-normal';

    const btns = [
      { icon: '🖼', label: 'Photos', action: () => {} },
      { icon: '📁', label: 'Albums', action: () => triggerChaos() },
      { icon: '🔍', label: 'Search', action: () => triggerChaos() },
      { icon: '☐', label: 'Select', action: () => triggerChaos() },
    ];
    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="tb-icon">${b.icon}</span>${b.label}`;
      btn.addEventListener('click', b.action);
      toolbar.appendChild(btn);
    });
    container.appendChild(toolbar);

    // Hover on grid items → run away even in normal mode (subtle preview)
    grid.addEventListener('mousemove', (e) => {
      if (chaosMode) return;
      const rect = grid.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Make nearby grid items subtly shift
      const items = grid.querySelectorAll('.gallery-grid-item');
      items.forEach(item => {
        const ir = item.getBoundingClientRect();
        const ix = ir.left - rect.left + ir.width / 2;
        const iy = ir.top - rect.top + ir.height / 2;
        const dx = ix - mx;
        const dy = iy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60 && dist > 0) {
          const push = (60 - dist) / 60 * 6;
          item.style.transform = `translate(${(dx/dist)*push}px, ${(dy/dist)*push}px)`;
        } else {
          item.style.transform = '';
        }
      });
    });
    grid.addEventListener('mouseleave', () => {
      if (chaosMode) return;
      const items = grid.querySelectorAll('.gallery-grid-item');
      items.forEach(item => { item.style.transform = ''; });
    });
  }

  // ============================================
  //  TRIGGER CHAOS — transition from grid to scattered
  // ============================================
  function triggerChaos(tappedSeed) {
    if (chaosMode) return;
    chaosMode = true;

    // Animate grid items exploding
    const gridItems = container.querySelectorAll('.gallery-grid-item');
    gridItems.forEach((item, i) => {
      setTimeout(() => {
        item.classList.add('exploding');
      }, i * 30);
    });

    // After animation, switch to chaos layout
    setTimeout(() => {
      container.classList.add('chaos-mode');

      // Create scattered images - include captured photos + random seeds
      images = [];
      const capturedPhotos = getCapturedPhotos();
      
      // Build array with captured photos and random seeds
      let chaosItems = [];
      
      // Add captured photos first (with special 'captured-X' seed for identification)
      capturedPhotos.forEach((photo, idx) => {
        chaosItems.push({
          type: 'captured',
          data: photo.data,
          id: 'captured-' + idx
        });
      });
      
      // Add some random placeholder images
      const randomSeeds = IMAGE_SEEDS.slice(0, CHAOS_IMAGE_COUNT);
      randomSeeds.forEach((seed, idx) => {
        chaosItems.push({
          type: 'placeholder',
          seed: seed,
          id: 'placeholder-' + idx
        });
      });
      
      // Shuffle the array so captured and placeholder are mixed
      chaosItems = chaosItems.sort(() => Math.random() - 0.5);
      
      // Put tapped image first if we have it
      if (tappedSeed) {
        const tappedIdx = chaosItems.findIndex(item => 
          (item.type === 'captured' && item.id === tappedSeed) ||
          (item.type === 'placeholder' && item.seed === tappedSeed)
        );
        if (tappedIdx > 0) {
          const tappedItem = chaosItems.splice(tappedIdx, 1)[0];
          chaosItems.unshift(tappedItem);
        }
      }

      // Create chaos images for all items
      for (let i = 0; i < chaosItems.length; i++) {
        const item = chaosItems[i];
        createChaosImage(
          rand(5, SCREEN_W - IMG_SIZE - 5),
          rand(22, SCREEN_H - IMG_SIZE - 36),
          item,
          i
        );
      }

      // Track mouse for run-away
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('mouseleave', onMouseLeave);

      // Start systems
      startLeaderRotation();
      startSarcasm();
      startAnimation();

      // Show first sarcasm immediately
      showSarcasm("Wait... what just happened? 😨");

      // If a seed was tapped, show zoom for it
      if (tappedSeed) {
        setTimeout(() => {
          const tapped = images.find(i => i.seed === tappedSeed);
          if (tapped) showZoomOverlay(tapped);
        }, 400);
      }
    }, 500);
  }

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }
  function onMouseLeave() {
    mouseX = -1000;
    mouseY = -1000;
  }

  // ============================================
  //  CHAOS MODE — scattered images with physics
  // ============================================

  function createChaosImage(x, y, item, id) {
    const el = document.createElement('div');
    el.className = 'gallery-img';
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    const wiggleType = randInt(1, 4);
    const duration = rand(3, 6).toFixed(1);
    const delay = rand(0, 2).toFixed(1);
    el.style.animation = `wiggle${wiggleType} ${duration}s ease-in-out ${delay}s infinite`;

    const img = document.createElement('img');
    // Handle both captured photos and placeholder images
    if (item.type === 'captured') {
      img.src = item.data;
      img.alt = 'My Photo';
      el.classList.add('captured-img');
    } else {
      img.src = `https://picsum.photos/seed/${item.seed}/140/140`;
      img.alt = 'memory';
    }
    img.draggable = false;
    el.appendChild(img);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const imgObj = images.find(i => i.id === id);
      if (!imgObj) return;
      if (selectMode) {
        imgObj.selected = !imgObj.selected;
        el.classList.toggle('selected', imgObj.selected);
      } else {
        showZoomOverlay(imgObj);
      }
    });

    container.appendChild(el);

    const imgObj = {
      el, x, y,
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      id,
      item: item, // Store the full item object (with type and data/seed)
      selected: false,
    };
    images.push(imgObj);
    return imgObj;
  }

  // ---- Physics animation loop ----
  function startAnimation() {
    function tick() {
      images.forEach((img, idx) => {
        const cx = img.x + IMG_SIZE / 2;
        const cy = img.y + IMG_SIZE / 2;
        const dx = cx - mouseX;
        const dy = cy - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Run away from mouse
        if (dist < 80 && dist > 0) {
          const force = (80 - dist) / 80 * 2.5;
          img.vx += (dx / dist) * force;
          img.vy += (dy / dist) * force;
        }

        // Follow the leader
        if (leaderIndex >= 0 && idx !== leaderIndex && images[leaderIndex]) {
          const leader = images[leaderIndex];
          const ldx = (leader.x + IMG_SIZE / 2) - cx;
          const ldy = (leader.y + IMG_SIZE / 2) - cy;
          const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
          if (ldist > 60) {
            img.vx += (ldx / ldist) * 0.06;
            img.vy += (ldy / ldist) * 0.06;
          }
        }

        // Repel from other images (avoid clustering)
        images.forEach((other, j) => {
          if (j === idx) return;
          const odx = cx - (other.x + IMG_SIZE / 2);
          const ody = cy - (other.y + IMG_SIZE / 2);
          const odist = Math.sqrt(odx * odx + ody * ody);
          if (odist < IMG_SIZE && odist > 0) {
            const repel = (IMG_SIZE - odist) / IMG_SIZE * 0.3;
            img.vx += (odx / odist) * repel;
            img.vy += (ody / odist) * repel;
          }
        });

        // Random drift
        img.vx += rand(-0.04, 0.04);
        img.vy += rand(-0.04, 0.04);

        // Damping
        img.vx *= 0.93;
        img.vy *= 0.93;

        // Update position
        img.x += img.vx;
        img.y += img.vy;

        // Bounce off walls
        if (img.x < 0) { img.x = 0; img.vx *= -0.5; }
        if (img.x > SCREEN_W - IMG_SIZE) { img.x = SCREEN_W - IMG_SIZE; img.vx *= -0.5; }
        if (img.y < 20) { img.y = 20; img.vy *= -0.5; }
        if (img.y > SCREEN_H - IMG_SIZE - 36) { img.y = SCREEN_H - IMG_SIZE - 36; img.vy *= -0.5; }

        img.el.style.left = img.x + 'px';
        img.el.style.top = img.y + 'px';
      });

      animFrameId = requestAnimationFrame(tick);
    }
    tick();
  }

  // ---- Leader rotation ----
  function startLeaderRotation() {
    function pickLeader() {
      if (leaderIndex >= 0 && images[leaderIndex]) {
        images[leaderIndex].el.classList.remove('leader');
        images[leaderIndex].el.style.transform = '';
      }
      leaderIndex = randInt(0, images.length);
      if (images[leaderIndex]) {
        images[leaderIndex].el.classList.add('leader');
        images[leaderIndex].el.style.transform = 'scale(1.25)';
      }
    }
    pickLeader();
    leaderInterval = setInterval(pickLeader, 4000);
  }

  // ---- Sarcastic messages ----
  function startSarcasm() {
    sarcasmInterval = setInterval(() => {
      showSarcasm(pick(SARCASM));
    }, rand(7000, 13000));
  }

  function showSarcasm(text) {
    const msg = document.createElement('div');
    msg.className = 'gallery-sarcasm';
    msg.textContent = text;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 3200);
  }

  // ---- Zoom overlay (tap) ----
  function showZoomOverlay(imgObj) {
    const overlay = document.createElement('div');
    overlay.className = 'gallery-zoom-overlay';

    const zoomedImg = document.createElement('img');
    // Handle both captured photos and placeholder images
    if (imgObj.item && imgObj.item.type === 'captured') {
      zoomedImg.src = imgObj.item.data;
    } else {
      zoomedImg.src = `https://picsum.photos/seed/${imgObj.item.seed}/280/280`;
    }

    const text = document.createElement('div');
    text.className = 'gallery-zoom-text';
    text.textContent = pick(CHOSEN_TEXTS);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'gallery-zoom-close';
    closeBtn.textContent = 'Let me go...';
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); overlay.remove(); });

    overlay.appendChild(zoomedImg);
    overlay.appendChild(text);
    overlay.appendChild(closeBtn);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    container.appendChild(overlay);
  }

  // ---- Select mode ----
  function toggleSelectMode(btn) {
    selectMode = !selectMode;
    btn.classList.toggle('active', selectMode);
    btn.textContent = selectMode ? '☑ Select' : '☐ Select';
    if (!selectMode) {
      images.forEach(img => {
        img.selected = false;
        img.el.classList.remove('selected');
      });
    }
  }

  // ---- Fake delete → duplicate ----
  function deleteSelected() {
    const selected = images.filter(i => i.selected);
    if (selected.length === 0) {
      showDeleteMsg("Select something first... if you dare 😏");
      return;
    }

    selected.forEach(img => {
      const copies = randInt(2, 4);
      for (let c = 0; c < copies; c++) {
        const newImg = createChaosImage(
          rand(5, SCREEN_W - IMG_SIZE - 5),
          rand(22, SCREEN_H - IMG_SIZE - 36),
          img.item, // Pass the full item object
          Date.now() + Math.random() * 10000
        );
        newImg.el.classList.add('duplicate-flash');
        setTimeout(() => newImg.el.classList.remove('duplicate-flash'), 600);
      }
      img.selected = false;
      img.el.classList.remove('selected');
    });

    selectMode = false;
    const selectBtn = container.querySelector('.tb-select');
    if (selectBtn) {
      selectBtn.classList.remove('active');
      selectBtn.textContent = '☐ Select';
    }

    showDeleteMsg("Deleting... just kidding 😌 Backup created.");
  }

  function showDeleteMsg(text) {
    const msg = document.createElement('div');
    msg.className = 'gallery-delete-msg';
    msg.textContent = text;
    container.appendChild(msg);
    setTimeout(() => msg.remove(), 2800);
  }

  // ---- Cleanup ----
  function destroy() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (leaderInterval) clearInterval(leaderInterval);
    if (sarcasmInterval) clearInterval(sarcasmInterval);
    images = [];
    leaderIndex = -1;
    selectMode = false;
    chaosMode = false;
    animFrameId = null;
    leaderInterval = null;
    sarcasmInterval = null;
  }

  // ---- Override openGallery() ----
  function init() {
    // Helper to clear captured photos (for demo purposes)
    window.clearCapturedPhotos = function() {
      localStorage.removeItem('capturedPhotos');
      console.log('Captured photos cleared');
    };

    // Register refresh callback for camera to notify gallery
    window.galleryRefreshCallback = function() {
      // The gallery will refresh when reopened
    };
    
    window.openGallery = function() {
      if (typeof isOn !== 'undefined' && !isOn) return;

      destroy();

      const screen = document.getElementById('screen');
      // Clear screen content but don't touch status bar (it's outside the screen)
      screen.innerHTML = '';

      const contentDiv = document.createElement('div');
      contentDiv.id = 'galleryContent';
      contentDiv.style.cssText = 'height:calc(100% - 83px);overflow:hidden;position:relative;';
      screen.appendChild(contentDiv);

      screen.insertAdjacentHTML('beforeend', `
        <div class="brightness-overlay" id="brightnessOverlay"></div>
        <div class="sun" id="sun"></div>
        <div class="moon" id="moon"></div>
      `);

      renderNormalGrid(contentDiv);
    };
  }

  return { init, destroy };
})();

GalleryApp.init();
