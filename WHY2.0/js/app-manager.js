/**
 * app-manager.js — App registry and navigation
 * Provides a central place to register apps and switch between them.
 */

const AppManager = (() => {
  const apps = {};     // name → { icon, label, renderFn, onDestroy? }
  let currentApp = null;

  /**
   * Register an app.
   * @param {string} name   - unique app id
   * @param {object} config - { icon, label, renderFn, onDestroy? }
   *   renderFn(container)  - called with the screen content div to render app UI
   *   onDestroy()          - optional cleanup when navigating away
   */
  function registerApp(name, config) {
    apps[name] = config;
  }

  /**
   * Open an app by name.
   */
  function openApp(name) {
    if (!Phone.isPoweredOn()) return;
    const app = apps[name];
    if (!app) {
      Phone.showToast(`App "${name}" not found`);
      return;
    }

    // Destroy current app if needed
    if (currentApp && apps[currentApp] && apps[currentApp].onDestroy) {
      apps[currentApp].onDestroy();
    }

    currentApp = name;
    const container = _getContentContainer();
    container.innerHTML = '';
    app.renderFn(container);
  }

  /**
   * Go back to home screen.
   */
  function goHome() {
    if (currentApp && apps[currentApp] && apps[currentApp].onDestroy) {
      apps[currentApp].onDestroy();
    }
    currentApp = null;
    _renderHomeScreen();
  }

  /**
   * Get (or create) the content area below the status bar.
   */
  function _getContentContainer() {
    const screen = document.getElementById('screen');
    let content = document.getElementById('appContent');
    if (!content) {
      content = document.createElement('div');
      content.id = 'appContent';
      content.style.cssText = 'height:calc(100% - 30px);overflow:hidden;position:relative;';
      // Remove old app grid if present
      const oldApps = screen.querySelector('.apps');
      if (oldApps) oldApps.remove();
      screen.appendChild(content);
    }
    return content;
  }

  /**
   * Render the home screen grid with all registered apps.
   */
  function _renderHomeScreen() {
    const screen = document.getElementById('screen');

    // Restore status bar if missing
    if (!document.getElementById('statusBar')) {
      const status = document.createElement('div');
      status.className = 'status';
      status.id = 'statusBar';
      status.innerHTML = `
        <span id="menuIcon" style="cursor:pointer;font-size:15px;">☰</span>
        <span id="time">--:--</span>
        <span>🔋100%</span>
      `;
      screen.prepend(status);
    }

    // Remove old content container
    const oldContent = document.getElementById('appContent');
    if (oldContent) oldContent.remove();

    // Remove any existing apps grid
    const oldApps = screen.querySelector('.apps');
    if (oldApps) oldApps.remove();

    // Build grid
    const grid = document.createElement('div');
    grid.className = 'apps';

    // Ordered list: put built-in placeholder apps + registered apps
    const appOrder = ['Phone', 'Messages', 'Music', 'Camera', 'Settings', 'Gallery', 'Calendar', 'Alarm'];
    const defaultIcons = {
      Phone: '📞', Messages: '💬', Music: '🎵', Camera: '📷',
      Settings: '⚙️', Gallery: '🖼️', Calendar: '📅', Alarm: '⏰'
    };

    appOrder.forEach(name => {
      const app = apps[name];
      const icon = app ? app.icon : (defaultIcons[name] || '📱');
      const label = app ? app.label : name;

      const div = document.createElement('div');
      div.className = 'app';
      div.innerHTML = `<span>${icon}</span><span class="app-label">${label}</span>`;
      div.addEventListener('click', () => openApp(name));
      grid.appendChild(div);
    });

    // Any additional registered apps not in defaults
    Object.keys(apps).forEach(name => {
      if (!appOrder.includes(name)) {
        const app = apps[name];
        const div = document.createElement('div');
        div.className = 'app';
        div.innerHTML = `<span>${app.icon}</span><span class="app-label">${app.label}</span>`;
        div.addEventListener('click', () => openApp(name));
        grid.appendChild(div);
      }
    });

    screen.appendChild(grid);

    // Keep brightness & sun/moon elements
    if (!document.getElementById('sun')) {
      screen.insertAdjacentHTML('beforeend', `
        <div class="sun" id="sun"></div>
        <div class="moon" id="moon"></div>
      `);
    }
    if (!document.getElementById('brightnessOverlay')) {
      const ov = document.createElement('div');
      ov.className = 'brightness-overlay';
      ov.id = 'brightnessOverlay';
      screen.prepend(ov);
    }
  }

  return { registerApp, openApp, goHome };
})();
