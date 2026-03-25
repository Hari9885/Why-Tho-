/**
 * alarm.js — Alarm App Module
 * Overrides the base openAlarm() to provide full alarm functionality:
 *   - Set alarms with time + song selection
 *   - Alarm rings and plays the song (via speech synthesis as fallback)
 *   - Voice recognition: user must sing/say the lyrics to dismiss
 *
 * This file is loaded AFTER the base script in index.html,
 * so it overrides the original openAlarm() function.
 */

const AlarmApp = (() => {
  // ---- State ----
  let alarms = JSON.parse(localStorage.getItem('whytho_alarms') || '[]');
  let songs = {};               // loaded from data/lyrics.json
  let alarmCheckInterval = null;
  let activeRinging = null;     // { alarmIndex, recognition, synthInterval, audio }
  let screenBackup = '';        // to restore screen after ringing

  // ---- Match config ----
  const MATCH_THRESHOLD = 0.15; // 15% token overlap to dismiss

  // ---- Load songs data ----
  function loadSongs() {
    return fetch('data/lyrics.json')
      .then(r => r.json())
      .then(data => { songs = data; })
      .catch(() => {
        // Fallback: embed a minimal set if fetch fails
        songs = {
          twinkle_twinkle: {
            title: 'Twinkle Twinkle Little Star',
            lyrics: 'twinkle twinkle little star how i wonder what you are',
            audio: null
          },
          happy_birthday: {
            title: 'Happy Birthday',
            lyrics: 'happy birthday to you happy birthday to you happy birthday dear friend happy birthday to you',
            audio: null
          }
        };
      });
  }

  // ---- Save / Load alarms ----
  function saveAlarms() {
    localStorage.setItem('whytho_alarms', JSON.stringify(alarms));
  }

  // ---- Render: Alarm List ----
  function renderList(container) {
    container.innerHTML = '';
    const app = document.createElement('div');
    app.className = 'alarm-app';

    // Header
    const header = document.createElement('div');
    header.className = 'alarm-header';
    header.innerHTML = `<h2>⏰ Alarms</h2>`;
    const addBtn = document.createElement('button');
    addBtn.className = 'alarm-add-btn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => renderSetScreen(container));
    header.appendChild(addBtn);
    app.appendChild(header);

    // List
    if (alarms.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'alarm-empty';
      empty.innerHTML = `<div class="alarm-empty-icon">⏰</div><div>No alarms set</div><div style="font-size:10px">Tap + to create one</div>`;
      app.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'alarm-list';

      alarms.forEach((alarm, idx) => {
        const item = document.createElement('div');
        item.className = 'alarm-item';

        const songData = songs[alarm.songId];
        const songName = songData ? songData.title : alarm.songId;

        item.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="alarm-delete-btn" data-idx="${idx}">✕</button>
            <div class="alarm-item-left">
              <div class="alarm-time">${alarm.time}</div>
              <div class="alarm-song-name">🎵 ${songName}</div>
            </div>
          </div>
          <label class="alarm-toggle">
            <input type="checkbox" ${alarm.enabled ? 'checked' : ''} data-idx="${idx}">
            <span class="slider"></span>
          </label>
        `;
        list.appendChild(item);
      });

      // Event delegation
      list.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          const i = parseInt(e.target.dataset.idx);
          alarms[i].enabled = e.target.checked;
          saveAlarms();
        }
      });
      list.addEventListener('click', (e) => {
        if (e.target.classList.contains('alarm-delete-btn')) {
          const i = parseInt(e.target.dataset.idx);
          alarms.splice(i, 1);
          saveAlarms();
          renderList(container);
        }
      });

      app.appendChild(list);
    }

    container.appendChild(app);
  }

  // ---- Render: Set Alarm Screen ----
  function renderSetScreen(container) {
    container.innerHTML = '';
    const screen = document.createElement('div');
    screen.className = 'alarm-set-screen';

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'alarm-back-btn';
    backBtn.textContent = '← Back';
    backBtn.addEventListener('click', () => renderList(container));
    screen.appendChild(backBtn);

    // Title
    const title = document.createElement('div');
    title.className = 'alarm-set-title';
    title.textContent = 'Set New Alarm';
    screen.appendChild(title);

    // Form
    const form = document.createElement('div');
    form.className = 'alarm-form';

    // Time picker
    const timeField = document.createElement('div');
    timeField.className = 'alarm-field';
    timeField.innerHTML = `<label>Time</label><input type="time" id="alarmTimeInput">`;
    form.appendChild(timeField);

    // Song selector
    const songField = document.createElement('div');
    songField.className = 'alarm-field';
    let songOptions = '';
    Object.keys(songs).forEach(key => {
      songOptions += `<option value="${key}">${songs[key].title}</option>`;
    });
    songField.innerHTML = `<label>Alarm Song</label><select id="alarmSongSelect">${songOptions}</select>`;
    form.appendChild(songField);

    // Preview button
    const previewBtn = document.createElement('button');
    previewBtn.className = 'alarm-preview-btn';
    previewBtn.textContent = '▶ Preview Song Lyrics';
    previewBtn.addEventListener('click', () => {
      const songId = document.getElementById('alarmSongSelect').value;
      const song = songs[songId];
      if (song) {
        // Use speech synthesis to "play" the lyrics as a preview
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(song.lyrics);
        utter.rate = 0.45;
        window.speechSynthesis.speak(utter);
        previewBtn.textContent = '⏹ Stop Preview';
        utter.onend = () => { previewBtn.textContent = '▶ Preview Song Lyrics'; };
        previewBtn.onclick = () => {
          window.speechSynthesis.cancel();
          previewBtn.textContent = '▶ Preview Song Lyrics';
          previewBtn.onclick = null;
        };
      }
    });
    form.appendChild(previewBtn);

    // Lyrics hint
    const lyricsHint = document.createElement('div');
    lyricsHint.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);margin-top:4px;font-style:italic;';
    lyricsHint.textContent = 'ℹ️ To dismiss, you\'ll need to sing/say the lyrics aloud.';
    form.appendChild(lyricsHint);

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'alarm-save-btn';
    saveBtn.textContent = 'Save Alarm';
    saveBtn.addEventListener('click', () => {
      const timeVal = document.getElementById('alarmTimeInput').value;
      const songVal = document.getElementById('alarmSongSelect').value;
      if (!timeVal) {
        saveBtn.textContent = '⚠️ Please set a time!';
        setTimeout(() => { saveBtn.textContent = 'Save Alarm'; }, 1500);
        return;
      }
      alarms.push({ time: timeVal, songId: songVal, enabled: true });
      saveAlarms();
      renderList(container);
    });
    form.appendChild(saveBtn);

    screen.appendChild(form);
    container.appendChild(screen);
  }

  // ---- Alarm Checker (runs every second) ----
  function startAlarmChecker() {
    if (alarmCheckInterval) return;
    alarmCheckInterval = setInterval(() => {
      if (activeRinging) return; // already ringing
      const now = new Date();
      const hhmm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const seconds = now.getSeconds();
      // Only trigger on the 0th second of the minute
      if (seconds !== 0) return;

      alarms.forEach((alarm, idx) => {
        if (alarm.enabled && alarm.time === hhmm) {
          triggerAlarm(idx);
        }
      });
    }, 1000);
  }

  // ---- Trigger Alarm: Ringing Screen ----
  function triggerAlarm(alarmIndex) {
    const alarm = alarms[alarmIndex];
    const song = songs[alarm.songId];
    if (!song) return;

    // Save screen content to restore later
    const screen = document.getElementById('screen');
    screenBackup = screen.innerHTML;

    // Build ringing overlay
    const ringing = document.createElement('div');
    ringing.className = 'alarm-ringing';
    ringing.id = 'alarmRingingOverlay';

    ringing.innerHTML = `
      <div class="alarm-ringing-time">${alarm.time}</div>
      <div class="alarm-ringing-song">🎵 ${song.title}</div>
      <div class="alarm-mic-container">
        <div class="alarm-mic-pulse"></div>
        <div class="alarm-mic-pulse"></div>
        <div class="alarm-mic-pulse"></div>
        <div class="alarm-mic-icon">🎤</div>
      </div>
      <div class="alarm-ringing-prompt">Sing the song to dismiss!</div>
      <div class="alarm-ringing-lyrics-hint">"${song.lyrics.substring(0, 80)}..."</div>
      <div class="alarm-transcript" id="alarmTranscript">Listening...</div>
      <div class="alarm-match-bar-container">
        <div class="alarm-match-bar" id="alarmMatchBar"></div>
      </div>
      <div class="alarm-match-label" id="alarmMatchLabel">0% match</div>
    `;

    screen.appendChild(ringing);

    // Start playing the song via speech synthesis (looped)
    const synthInterval = startSongPlayback(song.lyrics);

    // Start voice recognition
    const recognition = startVoiceRecognition(song.lyrics, alarmIndex);

    activeRinging = { alarmIndex, recognition, synthInterval };
  }

  // ---- Play song via speech synthesis (loops) ----
  function startSongPlayback(lyrics) {
    function speak() {
      const utter = new SpeechSynthesisUtterance(lyrics);
      utter.rate = 0.425;
      utter.pitch = 1.1;
      utter.volume = 1;
      utter.onend = () => {
        // Loop: speak again if still ringing
        if (activeRinging) {
          setTimeout(speak, 1000);
        }
      };
      window.speechSynthesis.speak(utter);
    }
    speak();

    // Return a handle so we can stop it
    return {
      stop: () => { window.speechSynthesis.cancel(); }
    };
  }

  // ---- Voice Recognition ----
  function startVoiceRecognition(expectedLyrics, alarmIndex) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback: show a manual dismiss button if no speech API
      showManualDismiss(alarmIndex);
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    let allRecognizedText = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          allRecognizedText += ' ' + transcript;
        } else {
          interim = transcript;
        }
      }

      // Update live transcript display
      const transcriptEl = document.getElementById('alarmTranscript');
      if (transcriptEl) {
        transcriptEl.textContent = interim || allRecognizedText.slice(-60);
      }

      // Calculate match score
      const score = calculateMatchScore(allRecognizedText + ' ' + interim, expectedLyrics);
      updateMatchBar(score);

      // Check if threshold met
      if (score >= MATCH_THRESHOLD) {
        dismissAlarm(alarmIndex);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-available') {
        showManualDismiss(alarmIndex);
      }
      // For "no-speech" or "aborted", just restart
      if (activeRinging && (event.error === 'no-speech' || event.error === 'aborted')) {
        try { recognition.start(); } catch(e) {}
      }
    };

    recognition.onend = () => {
      // Restart if still ringing (recognition auto-stops periodically)
      if (activeRinging) {
        try { recognition.start(); } catch(e) {}
      }
    };

    try {
      recognition.start();
    } catch(e) {
      showManualDismiss(alarmIndex);
    }

    return recognition;
  }

  // ---- Match Score: token overlap ----
  function calculateMatchScore(spokenText, expectedLyrics) {
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
    const spokenTokens = normalize(spokenText);
    const expectedTokens = normalize(expectedLyrics);

    if (expectedTokens.length === 0) return 0;

    // Count how many expected tokens appear in spoken text
    let matchCount = 0;
    const spokenSet = new Set(spokenTokens);

    // Also check order-aware matching: consecutive overlaps
    let expectedIndex = 0;
    for (const token of spokenTokens) {
      if (expectedIndex < expectedTokens.length && token === expectedTokens[expectedIndex]) {
        expectedIndex++;
      }
    }
    const orderScore = expectedIndex / expectedTokens.length;

    // Simple token overlap
    expectedTokens.forEach(t => { if (spokenSet.has(t)) matchCount++; });
    const overlapScore = matchCount / expectedTokens.length;

    // Blend both scores (order matters a bit more)
    return overlapScore * 0.5 + orderScore * 0.5;
  }

  // ---- Update match bar UI ----
  function updateMatchBar(score) {
    const bar = document.getElementById('alarmMatchBar');
    const label = document.getElementById('alarmMatchLabel');
    if (bar) {
      const pct = Math.min(100, Math.round(score * 100));
      bar.style.width = pct + '%';
      if (pct > 70) bar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
      else if (pct > 40) bar.style.background = 'linear-gradient(90deg, #e94560, #f59e0b)';
    }
    if (label) {
      label.textContent = Math.round(score * 100) + '% match';
    }
  }

  // ---- Manual dismiss fallback ----
  function showManualDismiss(alarmIndex) {
    const ringing = document.getElementById('alarmRingingOverlay');
    if (!ringing) return;
    const prompt = ringing.querySelector('.alarm-ringing-prompt');
    if (prompt) {
      prompt.textContent = 'Voice recognition unavailable';
    }
    const transcript = document.getElementById('alarmTranscript');
    if (transcript) {
      transcript.innerHTML = '';
      const btn = document.createElement('button');
      btn.textContent = 'Dismiss Alarm';
      btn.style.cssText = 'padding:8px 20px;border:none;border-radius:10px;background:#e94560;color:white;font-size:13px;cursor:pointer;margin-top:8px;';
      btn.addEventListener('click', () => dismissAlarm(alarmIndex));
      transcript.appendChild(btn);
    }
  }

  // ---- Dismiss Alarm ----
  function dismissAlarm(alarmIndex) {
    if (!activeRinging) return;

    // Stop speech synthesis
    if (activeRinging.synthInterval) activeRinging.synthInterval.stop();

    // Stop recognition
    if (activeRinging.recognition) {
      try { activeRinging.recognition.stop(); } catch(e) {}
    }

    // Disable this alarm (one-shot)
    alarms[alarmIndex].enabled = false;
    saveAlarms();

    // Show success screen
    const screen = document.getElementById('screen');
    const ringing = document.getElementById('alarmRingingOverlay');
    if (ringing) ringing.remove();

    const success = document.createElement('div');
    success.className = 'alarm-dismiss-success';
    success.innerHTML = `
      <div class="alarm-dismiss-icon">☀️</div>
      <div class="alarm-dismiss-text">Good morning!</div>
      <div class="alarm-dismiss-sub">Alarm dismissed successfully</div>
    `;
    screen.appendChild(success);

    activeRinging = null;

    // Auto-close success after 3 seconds → go home
    setTimeout(() => {
      success.remove();
      // Restore original screen
      if (screenBackup) {
        screen.innerHTML = screenBackup;
        screenBackup = '';
      }
    }, 3000);
  }

  // ---- Override openAlarm() ----
  function init() {
    loadSongs().then(() => {
      // Override the global openAlarm function
      window.openAlarm = function() {
        if (typeof isOn !== 'undefined' && !isOn) return;
        const screen = document.getElementById('screen');
        // Clear screen but keep status bar intact
        const statusBar = document.getElementById('statusBar');
        screen.innerHTML = '';
        if (statusBar) {
          screen.appendChild(statusBar);
        }

        const contentDiv = document.createElement('div');
        contentDiv.id = 'alarmContent';
        contentDiv.style.cssText = 'height:calc(100% - 83px);overflow:hidden;position:relative;';
        screen.appendChild(contentDiv);

        // Re-add brightness overlay and sun/moon (hidden by default)
        screen.insertAdjacentHTML('beforeend', `
          <div class="brightness-overlay" id="brightnessOverlay"></div>
          <div class="sun" id="sun"></div>
          <div class="moon" id="moon"></div>
        `);

        renderList(contentDiv);
      };

      // Start the alarm checker
      startAlarmChecker();
    });
  }

  // ---- Public API (for potential external use) ----
  return { init, triggerAlarm };
})();

// Initialize when script loads
AlarmApp.init();
