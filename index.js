/* ============================================
   PORTFOLIO WEBSITE - COMPLETE INDEX.JS
   Frontend Script with Bot Status Integration
   ============================================ */

// ============================================
// 1. CONFIGURATION
// ============================================

const DEFAULT_CONFIG = {
  BOTS_MODE: "widget_guess",
  BOTS_MANUAL_VALUE: 1,
  BOTS_LABEL: "Bots (Terlihat)"
};

// ============================================
// BOT API CONFIGURATION (FIXED - Single Declaration)
// ============================================

const BOT_API_CONFIG = (() => {
  const hostname = window.location.hostname;
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      BASE_URL: 'http://localhost:3000/api/bot',
      UPDATE_INTERVAL: 30000
    };
  }
  
  // ============================================
  // PRODUCTION - CORS Proxy (NO PC REQUIRED!)
  // ============================================
  const PTERODACTYL_API = 'http://104.234.236.62:30040';
  
  return {
    BASE_URL: `https://api.allorigins.win/raw?url=${encodeURIComponent(PTERODACTYL_API + '/api/bot')}`,
    UPDATE_INTERVAL: 30000
  };
})();

console.log('🌐 Bot API Base URL:', BOT_API_CONFIG.BASE_URL);


// ============================================
// 2. PAGE INITIALIZATION
// ============================================

window.onload = () => {
  console.log('🚀 Portfolio website loaded');
  
  // Init scroll animations
  initScrollAnimations();
  
  // Init Discord widgets
  initAllDiscordWidgets();
  
  // Init bot status checker
  initBotStatusChecker();
};

function initScrollAnimations() {
  function onScroll() {
    document.querySelectorAll(".anim, .card").forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 40) {
        el.classList.add("visible");
      }
    });
  }
  
  window.addEventListener("scroll", onScroll);
  onScroll(); // Trigger immediately
}


// ============================================
// 3. DISCORD WIDGET UTILITIES
// ============================================

function extractInviteCode(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts.pop() || "";
  } catch {
    return "";
  }
}

async function iconAndCountsFromInvite(inviteUrl) {
  const code = extractInviteCode(inviteUrl);
  if (!code) return { icon: null, total: null };
  
  try {
    const r = await fetch(
      `https://discord.com/api/v10/invites/${code}?with_counts=true&with_expiration=true`,
      { cache: 'no-store' }
    );
    
    if (!r.ok) return { icon: null, total: null };
    
    const j = await r.json();
    let iconUrl = null;
    
    if (j?.guild?.id && j?.guild?.icon) {
      const ext = j.guild.icon.startsWith('a_') ? 'gif' : 'png';
      iconUrl = `https://cdn.discordapp.com/icons/${j.guild.id}/${j.guild.icon}.${ext}?size=64`;
    }
    
    return {
      icon: iconUrl,
      total: j?.approximate_member_count ?? null
    };
  } catch {
    return { icon: null, total: null };
  }
}

function guessBotCount(widgetMembers) {
  const COMMON = [
    "bot", "mee6", "dyno", "carl", "probot", "arcane",
    "tatsu", "ticket", "yagpdb", "owo", "koya",
    "unbelieva", "slash", "music"
  ];
  
  return (widgetMembers || []).reduce((n, m) => {
    const username = (m?.username || "").toLowerCase();
    const isBot = username.includes("bot") || 
                  COMMON.some(x => username.includes(x));
    return n + (isBot ? 1 : 0);
  }, 0);
}


// ============================================
// 4. DISCORD CARD TEMPLATE
// ============================================

function ensureDiscordCardStructure(cardEl) {
  if (cardEl.querySelector(".dc-header")) return;
  
  cardEl.innerHTML = `
    <div class="dc-header">
      <div class="dc-logo">
        <img class="dc-icon" alt="Server Icon">
      </div>
      <div class="dc-title-wrap">
        <div class="dc-title dc-name">Discord Server</div>
        <div class="dc-sub">ID: —</div>
      </div>
      <a class="dc-join" target="_blank" rel="noopener">Join Server</a>
    </div>

    <div class="dc-stats">
      <div class="dc-stat">
        <div class="dc-val dc-online">--</div>
        <div class="dc-label">Online</div>
      </div>
      <div class="dc-stat">
        <div class="dc-val dc-total">--</div>
        <div class="dc-label">Total Anggota</div>
      </div>
      <div class="dc-stat">
        <div class="dc-val dc-bots">--</div>
        <div class="dc-label">Bots</div>
      </div>
    </div>

    <div class="dc-avatars"></div>
    <div class="dc-note">Auto refresh tiap 60 detik.</div>
  `;
}


// ============================================
// 5. DISCORD WIDGET LOADER
// ============================================

async function loadDiscordWidget(widgetElement) {
  ensureDiscordCardStructure(widgetElement);

  const guildId = widgetElement.dataset.guildId;
  const inviteFallback = widgetElement.dataset.invite || "#";
  
  const els = {
    name: widgetElement.querySelector('.dc-name'),
    sub: widgetElement.querySelector('.dc-sub'),
    join: widgetElement.querySelector('.dc-join'),
    online: widgetElement.querySelector('.dc-online'),
    total: widgetElement.querySelector('.dc-total'),
    bots: widgetElement.querySelector('.dc-bots'),
    avatars: widgetElement.querySelector('.dc-avatars'),
    icon: widgetElement.querySelector('.dc-icon')
  };

  if (!guildId) {
    els.sub.textContent = "Server ID belum diatur";
    els.join.setAttribute("disabled", "");
    return;
  }

  els.sub.textContent = "ID: " + guildId;

  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${guildId}/widget.json`,
      { cache: "no-store" }
    );
    
    if (!res.ok) throw new Error("Widget off atau ID salah");
    
    const data = await res.json();

    els.name.textContent = data.name || "Discord Server";
    els.online.textContent = data.presence_count ?? 
      (data.members ? data.members.length : "--");

    // Render avatars
    els.avatars.innerHTML = "";
    (data.members || []).slice(0, 24).forEach(m => {
      const img = document.createElement("img");
      img.alt = m.username || "user";
      img.src = m.avatar_url || "icons/lua.svg";
      els.avatars.appendChild(img);
    });

    const invite = data.instant_invite || inviteFallback || "#";
    els.join.href = invite;
    
    if (invite !== "#") {
      els.join.removeAttribute("disabled");
    } else {
      els.join.setAttribute("disabled", "");
    }

    // Get metadata from invite
    const meta = invite !== "#" 
      ? await iconAndCountsFromInvite(invite)
      : { icon: null, total: null };
    
    els.total.textContent = meta.total ?? "--";
    els.icon.src = meta.icon || "icons/lua.svg";
    els.icon.alt = (data.name || "Discord") + " Icon";

    els.bots.textContent = guessBotCount(data.members || []);
    
  } catch {
    els.name.textContent = "Discord Server (Widget tidak aktif)";
    els.online.textContent = "--";
    els.total.textContent = "--";
    els.bots.textContent = "--";
    els.join.setAttribute("disabled", "");
    els.avatars.innerHTML = "";
    els.icon.src = "icons/lua.svg";
  }
}

function initAllDiscordWidgets() {
  console.log('🔄 Initializing Discord widgets...');
  
  document.querySelectorAll('.discord-card[data-guild-id]').forEach(widget => {
    loadDiscordWidget(widget);
    setInterval(() => loadDiscordWidget(widget), 60000);
  });
}


// ============================================
// 6. THEME & BACKGROUND SWITCHER
// ============================================

(function initThemeSwitcher() {
  const THEME_KEY = "theme";
  const BG_KEY = "bgStyle";
  const b = document.body;

  const initTheme = localStorage.getItem(THEME_KEY) || b.dataset.theme || "dark";
  const initBg = localStorage.getItem(BG_KEY) || b.dataset.bg || "A";
  
  b.dataset.theme = initTheme;
  b.dataset.bg = initBg;

  const panel = document.createElement("div");
  panel.id = "style-switcher";
  panel.innerHTML = `
    <button id="themeToggle" title="Light/Dark">🌙</button>
    <span class="sep"></span>
    <span class="label-emoji" title="Pilih Style">🎨</span>
    <select id="bgSelect" title="Pilih Style Background">
      <option value="A">A · Neo Gradient</option>
      <option value="B">B · Carbon Mesh</option>
      <option value="C">C · Blur Glass</option>
      <option value="D">D · Subtle Dots</option>
      <option value="E">E · Solid</option>
    </select>
  `;
  
  document.body.appendChild(panel);

  const themeBtn = panel.querySelector("#themeToggle");
  const bgSel = panel.querySelector("#bgSelect");

  const setIcon = () => {
    themeBtn.textContent = (b.dataset.theme === "light" ? "🌙" : "☀️");
  };
  
  bgSel.value = initBg;
  setIcon();

  themeBtn.addEventListener("click", () => {
    const next = b.dataset.theme === "light" ? "dark" : "light";
    b.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    setIcon();
  });

  bgSel.addEventListener("change", e => {
    const v = e.target.value;
    b.dataset.bg = v;
    localStorage.setItem(BG_KEY, v);
  });
})();


// ============================================
// 7. INTERACTIVE BACKGROUND GLOW
// ============================================

(function initBackgroundGlow() {
  const root = document.documentElement;
  let x = 50, y = 50, tx = 50, ty = 50, o = 0, to = 0;
  
  const lerp = (a, b, t) => a + (b - a) * t;

  function raf() {
    x = lerp(x, tx, 0.12);
    y = lerp(y, ty, 0.12);
    o = lerp(o, to, 0.15);
    
    root.style.setProperty('--bgfx-x', x + '%');
    root.style.setProperty('--bgfx-y', y + '%');
    root.style.setProperty('--bgfx-o', o.toFixed(3));
    
    requestAnimationFrame(raf);
  }

  function show(eX, eY, viewportW, viewportH) {
    tx = (eX / viewportW) * 100;
    ty = (eY / viewportH) * 100;
    to = 0.85;
  }
  
  function hide() {
    to = 0;
  }

  window.addEventListener('mousemove', e => {
    show(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
  });
  
  window.addEventListener('mouseenter', e => {
    show(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
  });
  
  window.addEventListener('mouseleave', hide);

  // Touch support
  window.addEventListener('touchstart', e => {
    const t = e.touches[0];
    show(t.clientX, t.clientY, window.innerWidth, window.innerHeight);
  }, { passive: true });
  
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    show(t.clientX, t.clientY, window.innerWidth, window.innerHeight);
  }, { passive: true });
  
  window.addEventListener('touchend', hide);

  raf();
})();


// ============================================
// 8. BOT STATUS CHECKER - REALTIME
// ============================================

// Fetch bot status from API
async function fetchBotStatus(botId) {
  try {
    const url = `${BOT_API_CONFIG.BASE_URL}/${botId}`;
    
    console.log(`🔄 Fetching bot status: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Response is not JSON');
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Bot ${botId}: ${data.data.status}`);
      updateBotUI(botId, data.data);
    } else {
      console.warn(`⚠️ API returned success=false for ${botId}`);
      updateBotUI(botId, { status: 'offline' });
    }
  } catch (error) {
    console.error(`❌ Error fetching bot ${botId}:`, error.message);
    updateBotUI(botId, { status: 'offline' });
  }
}

// Update bot card UI with fetched data
function updateBotUI(botId, botData) {
  const botCard = document.querySelector(`.bot-card[data-bot-id="${botId}"]`);
  
  if (!botCard) {
    console.warn(`⚠️ Bot card not found: ${botId}`);
    return;
  }
  
  console.log(`🔄 Updating UI for ${botId}`, botData);

  // Update bot name
  const botName = botCard.querySelector('[data-bot-name]');
  if (botName && botData.username) {
    botName.textContent = botData.username;
  }

  // Update bot tag
  const botTag = botCard.querySelector('[data-bot-tag]');
  if (botTag && botData.tag) {
    botTag.textContent = '@' + botData.tag;
  }

  // Update avatar
  const avatar = botCard.querySelector('[data-bot-avatar]');
  if (avatar && botData.avatar) {
    avatar.src = botData.avatar;
    avatar.alt = `${botData.username || 'Bot'} Avatar`;
  }

  // Update status indicator
  const statusDot = botCard.querySelector('.bot-status');
  if (statusDot) {
    statusDot.className = 'bot-status';
    
    if (botData.status === 'online') {
      statusDot.classList.add('bot-status-online');
      statusDot.title = 'Online';
    } else {
      statusDot.classList.add('bot-status-offline');
      statusDot.title = 'Offline';
    }
  }

  // Update stats
  const statsMap = {
    guilds: `${botData.guilds || 0}+ Servers`,
    users: `${formatNumber(botData.users || 0)} Users`,
    uptime: formatUptime(botData.uptime || 0)
  };

  Object.keys(statsMap).forEach(key => {
    const elem = botCard.querySelector(`[data-stat="${key}"]`);
    if (elem) {
      elem.textContent = statsMap[key];
    }
  });

  // Update commands
  if (botData.commands && Array.isArray(botData.commands) && botData.commands.length > 0) {
    const commandsList = botCard.querySelector('.commands-list');
    
    if (commandsList) {
      commandsList.innerHTML = '';
      
      botData.commands.forEach(cmd => {
        const code = document.createElement('code');
        code.className = 'command-item';
        code.textContent = cmd.name || cmd;
        code.title = cmd.description || '';
        commandsList.appendChild(code);
      });
    }
  }

  // ============================================
  // 🆕 UPDATE INVITE LINK (TAMBAHKAN DI SINI!)
  // ============================================
  const inviteLink = botCard.querySelector('[data-invite-link]');
  if (inviteLink && botData.inviteLink) {
    inviteLink.href = botData.inviteLink;
    inviteLink.removeAttribute('disabled');
    console.log(`🔗 Updated invite link for ${botId}: ${botData.inviteLink}`);
  } else if (inviteLink) {
    // Jika tidak ada invite link dari API, disable button
    inviteLink.setAttribute('disabled', '');
    inviteLink.href = '#';
    console.warn(`⚠️ No invite link available for ${botId}`);
  }

  // Update last check time
  const lastUpdate = botCard.querySelector('[data-last-update]');
  if (lastUpdate) {
    const timeText = botData.lastUpdate 
      ? `Last checked: ${getTimeAgo(botData.lastUpdate)}`
      : 'Last checked: just now';
    lastUpdate.textContent = timeText;
  }

  console.log(`✅ UI updated successfully for ${botId}`);
}

// Format uptime seconds to human readable
function formatUptime(seconds) {
  if (!seconds || seconds === 0) return '0m';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Format number with K/M suffix
function formatNumber(num) {
  if (!num || num === 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Get time ago from timestamp
function getTimeAgo(timestamp) {
  try {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'unknown';
  }
}

// Initialize bot status checker for all bots
function initBotStatusChecker() {
  console.log('🤖 Initializing bot status checker...');

  const botCards = document.querySelectorAll('.bot-card[data-bot-id]');
  
  if (botCards.length === 0) {
    console.warn('⚠️ No bot cards found, status checker disabled');
    return;
  }

  console.log(`✅ Found ${botCards.length} bot card(s)`);

  botCards.forEach(botCard => {
    const botId = botCard.dataset.botId;
    
    if (!botId) {
      console.warn('⚠️ Bot card missing data-bot-id attribute');
      return;
    }
    
    console.log(`✅ Initializing bot: ${botId}`);
    
    // Fetch immediately
    fetchBotStatus(botId);
    
    // Auto-update every 30 seconds
    setInterval(() => {
      fetchBotStatus(botId);
    }, BOT_API_CONFIG.UPDATE_INTERVAL);
  });
}


// ============================================
// 9. DOM READY INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Content Loaded');
  // Note: Main initialization handled by window.onload
});


// ============================================
// END OF FILE
// ============================================

console.log('✅ index.js loaded successfully');