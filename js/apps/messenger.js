/**
 * messenger.js — Pointless Pro Messenger
 * Overrides openApp('Messages') in the phone interface.
 * Chat with "Priya K." — send messages or tap 💡 for a "Did You Know" fact.
 */

const MessengerApp = (() => {
  let container = null;
  let sending = false;
  let lastFactIndex = -1;

  /* ═══════════════════════════════════════════
     100 POINTLESS PRO "DID YOU KNOW" QUOTES
  ═══════════════════════════════════════════ */
  const FACTS = [
    "the Rock isn't actually a rock, but a person",
    "you can breathe in a swimming pool, but only when it's empty",
    "100% of human beings ever born were born on Earth",
    "every single Friday comes after a Thursday, without a single exception",
    "all blind people have never seen a single colour in their entire life",
    "water is technically wet, but only if something else is also wet at the same time",
    "dead people were all alive at some point before they became dead",
    "every tall person was once a short person before they grew",
    "the Sun only shines during the day because that's when we call it daytime",
    "all dogs that have ever barked have also never spoken a single word of English",
    "if you remove all the furniture from a room, the room becomes empty",
    "you are currently older than you have ever been at any previous point in your life",
    "every person who has ever walked also had to start walking from a standing position",
    "the ocean is wet on the inside",
    "all cats that are currently alive have not yet died",
    "fire is hot unless it is not fire, in which case it is just something else",
    "people who sleep are doing so with their eyes closed the majority of the time",
    "a car with no wheels technically cannot be driven anywhere",
    "your future is entirely ahead of you and has not happened yet",
    "bald people require significantly less shampoo per hair-wash session",
    "all mountains are tall relative to the ground directly underneath them",
    "you have never met anyone you haven't met",
    "a window that is open is not currently closed",
    "every breakfast you have ever eaten was eaten in the morning",
    "stairs only go up or down, never sideways",
    "if no one is in the room, there are zero people in that room",
    "every person named John has a name, specifically John",
    "frozen water is just water that is currently a solid",
    "all birds that can fly are not currently on the ground when they are flying",
    "a phone with no battery is the same as a very flat expensive brick",
    "anyone who has ever finished a race started it at some earlier point",
    "gravity only pulls things down, never sideways or diagonally",
    "every word in every dictionary was added by someone at some point",
    "you are reading this with your eyes, unless you are not",
    "a door that is closed is blocking whatever is directly behind it",
    "all presidents of the United States have been American, at least legally",
    "the past is the only part of time that has already happened",
    "every shoe that fits your left foot will not fit your right foot without adjusting",
    "cheese is milk that decided to become something more serious",
    "you have spent exactly 100% of your life alive so far",
    "the moon is always somewhere in the sky, even when you can't see it from your specific location",
    "a broken clock is correct two times a day if it was set correctly before it broke",
    "all people who are currently sitting were recently standing before they sat down",
    "any soup that has been fully eaten no longer exists as soup",
    "a mirror will only show your reflection if you are standing in front of it",
    "nobody has ever woken up without having first been asleep",
    "a book with no words in it is technically just paper held together by glue",
    "everyone who is currently an adult was once a child unless they were never born",
    "all socks come in pairs but are worn one at a time per foot",
    "the tallest building in any city is the one that is taller than all the other buildings",
    "you will never be as young as you are right now ever again after this exact second",
    "an empty glass has nothing in it except air, which most people don't count",
    "running is just walking but faster and with more airtime between steps",
    "every number between one and ten is also between zero and eleven",
    "your shadow is always the same shape as you but flatter and less useful",
    "a pencil with no lead cannot write anything, but it can still be used as a very thin stick",
    "anyone who has ever swum in the ocean was surrounded by ocean water during that swim",
    "vegetables are plants that humans decided to call vegetables",
    "the tallest person in any room is the tallest person in that room",
    "every night follows a day that happened just before it",
    "a person with two eyes has twice as many eyes as a person with one eye",
    "music played quietly is just the same music but with less volume",
    "all children who have ever gone to school were children at the time",
    "you cannot see anything behind your own head without the use of a mirror or second person",
    "every sentence that ends in a question mark is technically a question",
    "an umbrella used on a sunny day is just a portable shade device",
    "all people who have ever sneezed have also done it using their nose",
    "a cup of tea that has gone cold is just cold tea and not hot tea anymore",
    "any ladder tall enough to reach the roof will also be tall enough to reach every point below the roof",
    "people who are currently asleep are not aware that they are asleep",
    "the smallest country in the world is smaller than every other country",
    "every flight that has ever landed was also airborne at some earlier point",
    "a clock that runs fast will always be ahead of every clock that doesn't",
    "if you have never been to a country, you have technically never been there",
    "all twins are born on the same day unless one is born just after midnight",
    "a person who is not hungry is technically not in need of food at that moment",
    "every library contains books, except empty ones which contain no books",
    "your left hand and your right hand are on opposite sides of your body",
    "a sandwich with nothing in it is just two pieces of bread facing each other",
    "the floor is always below you unless you are already on the ground floor",
    "people who eat breakfast are consuming their first meal of the day",
    "every photo ever taken is a picture of the past since it was taken before now",
    "a light bulb that is off is not currently producing any light",
    "all triangles have exactly three sides, regardless of size or personal preference",
    "you can only see your own face if someone shows it to you or you look in a mirror",
    "every parent was once a child before they became the parent",
    "a pencil that is new is shorter after it has been used",
    "anyone taller than six feet is above average in terms of specifically six feet",
    "all coffee that has ever been drunk was once not yet drunk",
    "a song that has ended is no longer playing",
    "every bus that has ever arrived was at some point on the way to arriving",
    "the sky looks blue during the day, which is also when it looks the most like the sky",
    "a person with no siblings is an only child for their entire life",
    "any door that opens inward will not open outward using the same motion",
    "all words you have ever said out loud were said using your mouth",
    "a river that has dried up no longer has water in it from the river",
    "every weekend follows a week that happened just before it on a Friday",
    "the number zero is less than every positive number currently known to mathematics",
    "a password you have forgotten is no longer something you remember"
  ];

  const REPLIES = [
    'haha 😂', 'wait what 😭', 'no way', 'seriously?? 💀',
    'ok but why tho', 'lmaooo', 'bro…', '???',
    "that's so you 😭", 'i-', 'ok and?', 'noted 💀'
  ];

  /* ── Helpers ── */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomFact() {
    let idx;
    do {
      idx = Math.floor(Math.random() * FACTS.length);
    } while (idx === lastFactIndex);
    lastFactIndex = idx;
    return FACTS[idx];
  }

  function getTime() {
    const n = new Date();
    let h = n.getHours();
    const m = n.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  /* ── DOM Helpers ── */
  function getMsgArea() {
    return container ? container.querySelector('.messenger-messages') : null;
  }

  function getTypingEl() {
    return container ? container.querySelector('.messenger-typing') : null;
  }

  function scrollBottom() {
    const area = getMsgArea();
    if (area) {
      requestAnimationFrame(() => {
        area.scrollTop = area.scrollHeight;
      });
    }
  }

  function showTyping(show) {
    const el = getTypingEl();
    if (el) {
      el.style.display = show ? 'flex' : 'none';
      if (show) scrollBottom();
    }
  }

  function addMessage(text, side, isFact) {
    const area = getMsgArea();
    const typingEl = getTypingEl();
    if (!area) return;

    const row = document.createElement('div');
    row.className = 'messenger-msg-row' + (side === 'mine' ? ' mine' : '');

    if (side !== 'mine') {
      const av = document.createElement('div');
      av.className = 'messenger-msg-avatar';
      av.textContent = 'PK';
      row.appendChild(av);
    }

    const wrap = document.createElement('div');
    wrap.className = 'messenger-bubble-wrap';
    if (side === 'mine') wrap.style.alignItems = 'flex-end';

    const bubble = document.createElement('div');
    if (side === 'mine') {
      bubble.className = 'messenger-bubble mine';
    } else if (isFact) {
      bubble.className = 'messenger-bubble fact';
    } else {
      bubble.className = 'messenger-bubble theirs';
    }

    if (isFact) {
      const label = document.createElement('span');
      label.className = 'messenger-fact-label';
      label.textContent = 'did you know';
      bubble.appendChild(label);
      bubble.appendChild(document.createTextNode(text));
    } else {
      bubble.textContent = text;
    }

    const time = document.createElement('div');
    time.className = 'messenger-msg-time';
    time.textContent = getTime();

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    row.appendChild(wrap);

    // Insert before typing indicator
    if (typingEl) {
      area.insertBefore(row, typingEl);
    } else {
      area.appendChild(row);
    }
    scrollBottom();
  }

  /* ── Send regular message ── */
  function sendMessage() {
    if (!container) return;
    const input = container.querySelector('.messenger-msg-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'mine');
    input.value = '';

    showTyping(true);
    const delay = 1000 + Math.random() * 800;
    setTimeout(() => {
      if (!container) return;
      showTyping(false);
      addMessage(pick(REPLIES), 'theirs');
    }, delay);
  }

  /* ── Fact button ── */
  function sendFact() {
    if (sending || !container) return;
    sending = true;

    showTyping(true);
    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      if (!container) { sending = false; return; }
      showTyping(false);
      addMessage(randomFact(), 'theirs', true);
      sending = false;
    }, delay);
  }

  /* ── Render ── */
  function render(parentEl) {
    container = document.createElement('div');
    container.className = 'messenger-app';

    container.innerHTML = `
      <div class="messenger-header">
        <button class="messenger-back-btn" id="messengerBackBtn">&#8249;</button>
        <div class="messenger-avatar">PK</div>
        <div class="messenger-header-info">
          <div class="messenger-contact-name">Priya K.</div>
          <div class="messenger-contact-status">online</div>
        </div>
        <div class="messenger-header-actions">
          <span>&#9742;</span>
          <span>&#8942;</span>
        </div>
      </div>

      <div class="messenger-messages">
        <div class="messenger-date-divider">Today</div>

        <div class="messenger-msg-row">
          <div class="messenger-msg-avatar">PK</div>
          <div class="messenger-bubble-wrap">
            <div class="messenger-bubble theirs">hey what's up 👀</div>
            <div class="messenger-msg-time">10:42 AM</div>
          </div>
        </div>

        <div class="messenger-msg-row mine">
          <div class="messenger-bubble-wrap" style="align-items:flex-end">
            <div class="messenger-bubble mine">not much, just working on an app 😅</div>
            <div class="messenger-msg-time">10:43 AM</div>
          </div>
        </div>

        <div class="messenger-msg-row">
          <div class="messenger-msg-avatar">PK</div>
          <div class="messenger-bubble-wrap">
            <div class="messenger-bubble theirs">ooh what kind of app?</div>
            <div class="messenger-msg-time">10:43 AM</div>
          </div>
        </div>

        <div class="messenger-msg-row mine">
          <div class="messenger-bubble-wrap" style="align-items:flex-end">
            <div class="messenger-bubble mine">it's called Pointless Pro 😂 you'll see</div>
            <div class="messenger-msg-time">10:44 AM</div>
          </div>
        </div>

        <div class="messenger-typing">
          <div class="messenger-msg-avatar">PK</div>
          <div class="messenger-typing-bubble">
            <div class="messenger-dot"></div>
            <div class="messenger-dot"></div>
            <div class="messenger-dot"></div>
          </div>
        </div>
      </div>

      <div class="messenger-input-bar">
        <button class="messenger-icon-btn messenger-fact-btn" id="messengerFactBtn">
          💡
          <div class="messenger-tooltip">send a Did You Know</div>
        </button>
        <input class="messenger-msg-input" id="messengerMsgInput" placeholder="Message" autocomplete="off" />
        <button class="messenger-icon-btn messenger-send-btn" id="messengerSendBtn">&#10148;</button>
      </div>
    `;

    parentEl.appendChild(container);

    /* ── Bind events ── */
    const sendBtn = container.querySelector('#messengerSendBtn');
    const factBtn = container.querySelector('#messengerFactBtn');
    const input   = container.querySelector('#messengerMsgInput');
    const backBtn = container.querySelector('#messengerBackBtn');

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (factBtn) factBtn.addEventListener('click', sendFact);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Go back to home screen
        if (typeof goHome === 'function') {
          goHome();
        } else {
          location.reload();
        }
      });
    }

    scrollBottom();
  }

  function destroy() {
    container = null;
    sending = false;
  }

  /* ── Init: override openApp('Messages') ── */
  function init() {
    const origOpenApp = window.openApp;
    window.openApp = function(name) {
      if (name === 'Messages') {
        if (typeof isOn !== 'undefined' && !isOn) return;
        destroy();

        const screen = document.getElementById('screen');
        screen.innerHTML = '';

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'height:100%;overflow:hidden;position:relative;';
        screen.appendChild(contentDiv);

        render(contentDiv);
      } else {
        origOpenApp(name);
      }
    };
  }

  return { init, destroy };
})();

MessengerApp.init();
