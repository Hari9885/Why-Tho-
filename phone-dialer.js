/**
 * phone-dialer.js — Rotary Roulette dial-to-call
 * Overrides openApp('Phone') in the phone interface.
 * Adapted from the standalone Rotary Roulette page.
 */

const PhoneDialerApp = (() => {
  // ── Constants ──
  const CX = 120, CY = 120;      // SVG centre (240/2)
  const DIAL_R = 90;              // radius to hole centres
  const HOLE_R = 13;              // visible hole radius
  const INNER_R = 50;             // inner hub radius
  const SLIP_THRESHOLD = 0.55;
  const STOP_TOL = 14;

  // ── State ──
  let container = null;
  let svgEl = null;
  let stopBox = null;
  let digits = new Array(10).fill(null);
  let currentDigit = 0;
  let dragging = false;
  let selectedDigit = null;
  let holeMaxRot = 0;
  let dialRotation = 0;
  let cumDelta = 0;
  let prevAngle = 0;
  let velBuf = [];
  let atStop = false;

  // Bound handlers for cleanup
  let boundMove = null;
  let boundEnd = null;

  // ── Geometry ──
  function holeStartAngleDeg(d) {
    return d === 0 ? 1 : 360 - d * 36;
  }
  function maxRotForDigit(d) {
    return d === 0 ? 359 : d * 36;
  }

  // ── SVG Helper ──
  function mk(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  // ── Detect theme ──
  function isDark() {
    return document.body.classList.contains('dark-theme');
  }
  function c(light, dark) { return isDark() ? dark : light; }

  // ── Draw Dial ──
  function drawDial(rot) {
    if (!svgEl) return;
    svgEl.innerHTML = '';

    // Outer plate
    svgEl.appendChild(mk('circle', {
      cx: CX, cy: CY, r: 115,
      fill: c('#c8c6c0', '#1a1a18'),
      stroke: c('#a0a09a', '#333331'),
      'stroke-width': 1.5
    }));
    // Groove ring
    svgEl.appendChild(mk('circle', {
      cx: CX, cy: CY, r: DIAL_R,
      fill: 'none',
      stroke: c('#b0aea8', '#2a2a28'),
      'stroke-width': 18
    }));
    // Inner hub
    svgEl.appendChild(mk('circle', {
      cx: CX, cy: CY, r: INNER_R,
      fill: c('#d0cec8', '#222220'),
      stroke: c('#a0a09a', '#333331'),
      'stroke-width': 1
    }));

    // Brand text
    const brand = mk('text', {
      x: CX, y: CY + 4,
      'text-anchor': 'middle',
      fill: c('#888', '#555553'),
      'font-size': 9,
      'font-family': 'Irish Grover, cursive',
      'letter-spacing': '2'
    });
    brand.textContent = 'WHY,THO?';
    svgEl.appendChild(brand);

    // Rotating group
    const g = mk('g', { transform: `rotate(${rot},${CX},${CY})` });

    for (let d = 0; d <= 9; d++) {
      const angDeg = holeStartAngleDeg(d);
      const ang = angDeg * Math.PI / 180;
      const hx = CX + DIAL_R * Math.cos(ang);
      const hy = CY + DIAL_R * Math.sin(ang);

      const isActive = selectedDigit === d && dragging;
      const isAtStop = isActive && atStop;

      // Hole shadow
      g.appendChild(mk('circle', {
        cx: hx, cy: hy, r: HOLE_R + 2,
        fill: c('#999', '#111110')
      }));

      // Hole body
      g.appendChild(mk('circle', {
        cx: hx, cy: hy, r: HOLE_R,
        fill: isAtStop ? c('#d1f5e8', '#0d2420') : (isActive ? c('#e0dff8', '#1e1c3a') : c('#b0aea8', '#0e0e0c')),
        stroke: isAtStop ? '#1D9E75' : (isActive ? '#7F77DD' : c('#888', '#3a3a38')),
        'stroke-width': isActive ? 1.5 : 1
      }));

      // Digit label
      const lbl = mk('text', {
        x: hx, y: hy + 4,
        'text-anchor': 'middle',
        fill: isAtStop ? '#5DCAA5' : (isActive ? '#AFA9EC' : c('#333', '#888680')),
        'font-size': 10,
        'font-family': 'Irish Grover, cursive',
        'font-weight': 400,
        'pointer-events': 'none'
      });
      lbl.textContent = d;
      g.appendChild(lbl);
    }

    svgEl.appendChild(g);

    // Stop line (fixed, right side)
    svgEl.appendChild(mk('line', {
      x1: CX + INNER_R + 4, y1: CY,
      x2: CX + 108, y2: CY,
      stroke: atStop ? '#1D9E75' : c('#c85050', '#5a3a3a'),
      'stroke-width': 1.5,
      'stroke-dasharray': '4,3'
    }));

    // Centre pin
    svgEl.appendChild(mk('circle', {
      cx: CX, cy: CY, r: 4,
      fill: c('#888', '#555553')
    }));
  }

  // ── Helpers ──
  function getAngle(e) {
    const r = svgEl.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(cy - r.top - r.height / 2, cx - r.left - r.width / 2) * 180 / Math.PI;
  }

  function getHoleAt(e) {
    const r = svgEl.getBoundingClientRect();
    const mx = e.touches ? e.touches[0].clientX : e.clientX;
    const my = e.touches ? e.touches[0].clientY : e.clientY;
    const sc = r.width / 240;
    for (let d = 0; d <= 9; d++) {
      const angDeg = (holeStartAngleDeg(d) + dialRotation) % 360;
      const ang = angDeg * Math.PI / 180;
      const hx = (CX + DIAL_R * Math.cos(ang)) * sc;
      const hy = (CY + DIAL_R * Math.sin(ang)) * sc;
      const dx = mx - r.left - hx;
      const dy = my - r.top - hy;
      if (Math.sqrt(dx * dx + dy * dy) < HOLE_R * sc * 2.5) return d;
    }
    return null;
  }

  function avgVel() {
    if (velBuf.length < 2) return 0;
    const span = velBuf[velBuf.length - 1].t - velBuf[0].t;
    if (span === 0) return 0;
    return velBuf.reduce((s, v) => s + v.d, 0) / span;
  }

  function setStatus(msg, type) {
    const el = container && container.querySelector('.rotary-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'rotary-status' + (type ? ' ' + type : '');
  }

  function updateDisplay() {
    const c = container && container.querySelector('.rotary-number-display');
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      if (i === 3 || i === 6) {
        const s = document.createElement('div');
        s.className = 'rotary-sep';
        s.textContent = '-';
        c.appendChild(s);
      }
      const slot = document.createElement('div');
      slot.className = 'rotary-digit-slot' +
        (i === currentDigit ? ' active' : digits[i] !== null ? ' done' : '');
      slot.textContent = digits[i] !== null ? digits[i] : (i === currentDigit ? '_' : '·');
      c.appendChild(slot);
    }
    const pl = container && container.querySelector('.rotary-prog-label');
    if (pl) pl.textContent = currentDigit < 10 ? `Digit ${currentDigit + 1} of 10` : 'All digits dialed';
  }

  // ── Event handlers ──
  function onStart(e) {
    if (currentDigit >= 10) return;
    e.preventDefault();
    const d = getHoleAt(e);
    if (d === null) return;

    selectedDigit = d;
    holeMaxRot = maxRotForDigit(d);
    dragging = true;
    atStop = false;
    prevAngle = getAngle(e);
    cumDelta = 0;
    velBuf = [];
    if (stopBox) stopBox.classList.remove('hit');
    setStatus('Dialing ' + d + ' — drag clockwise to the stop', '');
    drawDial(dialRotation);
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();

    const angle = getAngle(e);
    let delta = angle - prevAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    prevAngle = angle;

    if (delta > 0) cumDelta = Math.min(cumDelta + delta, holeMaxRot);
    else cumDelta = Math.max(0, cumDelta + Math.max(delta, -6));

    dialRotation = cumDelta;

    const speed = Math.abs(delta);
    velBuf.push({ d: speed, t: Date.now() });
    if (velBuf.length > 5) velBuf.shift();

    atStop = cumDelta >= holeMaxRot - STOP_TOL;
    if (stopBox) stopBox.classList.toggle('hit', atStop);

    const pct = Math.round(cumDelta / holeMaxRot * 100);
    const bar = container && container.querySelector('.rotary-prog-bar');
    if (bar) bar.style.width = (currentDigit / 10 * 100 + pct / 10) + '%';

    if (atStop) setStatus('At the stop — release!', 'good');
    else if (avgVel() > SLIP_THRESHOLD) setStatus('Slower... or it slips', 'warn');
    else if (cumDelta > 4) setStatus(pct + '% — keep going', '');

    drawDial(dialRotation);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    atStop = false;
    if (stopBox) stopBox.classList.remove('hit');

    const speed = avgVel();
    const reached = cumDelta >= holeMaxRot - STOP_TOL;

    if (speed > SLIP_THRESHOLD && !reached) {
      setStatus('Slipped! Too fast — try again', 'warn');
      animateTo(0, () => { selectedDigit = null; drawDial(0); });
      return;
    }
    if (!reached) {
      setStatus("Didn't reach the stop — pull further", 'warn');
      animateTo(0, () => { selectedDigit = null; drawDial(0); });
      return;
    }

    // Success
    digits[currentDigit] = selectedDigit;
    currentDigit++;
    setStatus(
      currentDigit < 10 ? 'Got ' + selectedDigit + '! Pick the next digit.' : 'All done!',
      'good'
    );
    animateTo(0, () => {
      selectedDigit = null;
      dialRotation = 0;
      drawDial(0);
      updateDisplay();
      if (currentDigit >= 10) showResult();
    });
  }

  function animateTo(target, cb) {
    const start = dialRotation;
    const t0 = Date.now();
    const dur = 400;
    function step() {
      const t = Math.min(1, (Date.now() - t0) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      dialRotation = start + (target - start) * ease;
      drawDial(dialRotation);
      if (t < 1) requestAnimationFrame(step);
      else { dialRotation = target; if (cb) cb(); }
    }
    requestAnimationFrame(step);
  }

  function showResult() {
    const n = digits.join('');
    const rn = container && container.querySelector('.rotary-result-num');
    const rb = container && container.querySelector('.rotary-result');
    if (rn) rn.textContent = '(' + n.slice(0, 3) + ') ' + n.slice(3, 6) + '-' + n.slice(6);
    if (rb) rb.style.display = 'block';
    const bar = container && container.querySelector('.rotary-prog-bar');
    if (bar) bar.style.width = '100%';
  }

  function resetDialer() {
    digits = new Array(10).fill(null);
    currentDigit = 0;
    dialRotation = 0;
    selectedDigit = null;
    dragging = false;
    atStop = false;
    if (stopBox) stopBox.classList.remove('hit');
    const rb = container && container.querySelector('.rotary-result');
    if (rb) rb.style.display = 'none';
    const bar = container && container.querySelector('.rotary-prog-bar');
    if (bar) bar.style.width = '0%';
    setStatus('Tap a hole and drag clockwise →', '');
    drawDial(0);
    updateDisplay();
  }

  function callNumber() {
    if (currentDigit < 10) {
      setStatus('Still dialing — ' + currentDigit + ' of 10 done', 'warn');
      return;
    }
    const num = digits.join('');
    setStatus('Calling (' + num.slice(0, 3) + ') ' + num.slice(3, 6) + '-' + num.slice(6) + '...', 'good');
  }

  function copyNumber() {
    const btn = container && container.querySelector('.rotary-copy-btn');
    navigator.clipboard && navigator.clipboard.writeText(digits.join(''));
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }
  }

  // ── Render ──
  function render(parentContainer) {
    container = document.createElement('div');
    container.className = 'rotary-app';

    container.innerHTML = `
      <div class="rotary-number-display"></div>
      <div class="rotary-dial-wrapper">
        <div class="rotary-finger-stop"></div>
        <svg class="rotary-dial-svg" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
      <div class="rotary-status">Tap a hole and drag clockwise →</div>
      <div class="rotary-prog-wrap"><div class="rotary-prog-bar" style="width:0%"></div></div>
      <div class="rotary-prog-label">Digit 1 of 10</div>
      <div class="rotary-controls">
        <button class="rotary-reset-btn">Reset</button>
        <button class="rotary-pri rotary-call-btn">Call →</button>
      </div>
      <div class="rotary-result">
        <div class="rotary-result-num"></div>
        <div class="rotary-result-lbl">Dialed with patience</div>
        <button class="rotary-copy-btn">Copy</button>
      </div>
    `;

    parentContainer.appendChild(container);

    svgEl = container.querySelector('.rotary-dial-svg');
    stopBox = container.querySelector('.rotary-finger-stop');

    // Button handlers
    container.querySelector('.rotary-reset-btn').addEventListener('click', resetDialer);
    container.querySelector('.rotary-call-btn').addEventListener('click', callNumber);
    container.querySelector('.rotary-copy-btn').addEventListener('click', copyNumber);

    // Dial handlers
    svgEl.addEventListener('mousedown', onStart);
    svgEl.addEventListener('touchstart', onStart, { passive: false });

    boundMove = onMove;
    boundEnd = onEnd;
    document.addEventListener('mousemove', boundMove);
    document.addEventListener('touchmove', boundMove, { passive: false });
    document.addEventListener('mouseup', boundEnd);
    document.addEventListener('touchend', boundEnd);

    drawDial(0);
    updateDisplay();
  }

  // ── Cleanup ──
  function destroy() {
    if (boundMove) {
      document.removeEventListener('mousemove', boundMove);
      document.removeEventListener('touchmove', boundMove);
    }
    if (boundEnd) {
      document.removeEventListener('mouseup', boundEnd);
      document.removeEventListener('touchend', boundEnd);
    }
    boundMove = null;
    boundEnd = null;
    container = null;
    svgEl = null;
    stopBox = null;
    digits = new Array(10).fill(null);
    currentDigit = 0;
    dragging = false;
    selectedDigit = null;
    dialRotation = 0;
    cumDelta = 0;
    atStop = false;
  }

  // ── Override openApp('Phone') ──
  function init() {
    const origOpenApp = window.openApp;
    window.openApp = function(name) {
      if (name === 'Phone') {
        if (typeof isOn !== 'undefined' && !isOn) return;
        destroy();

        const screen = document.getElementById('screen');
        screen.innerHTML = '';

        const contentDiv = document.createElement('div');
        contentDiv.id = 'phoneDialerContent';
        contentDiv.style.cssText = 'height:100%;overflow:hidden;position:relative;';
        screen.appendChild(contentDiv);

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

PhoneDialerApp.init();
