const DEFAULT_SETTINGS = {
  dailyLimitMinutes: 20,
  blockMinutes: 60,
  warningAtPercent: 80,
  enabled: true,
  blockedSites: [
    "youtube.com",
    "tiktok.com",
    "facebook.com",
    "instagram.com",
    "x.com",
    "twitter.com"
  ],
  temporaryUnblock: {}
};

let activeTabId = null;
let activeDomain = null;
let activeSince = Date.now();

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function normalizeDomain(hostname) {
  if (!hostname) return "";
  return hostname.replace(/^www\./, "").toLowerCase();
}

function getDomain(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "";
    return normalizeDomain(u.hostname);
  } catch { return ""; }
}

function domainMatches(domain, site) {
  domain = normalizeDomain(domain);
  site = normalizeDomain(site);
  return domain === site || domain.endsWith(`.${site}`);
}

async function getState() {
  const data = await chrome.storage.local.get(["settings", "usage", "locks", "events"]);
  return {
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
    usage: data.usage || {},
    locks: data.locks || {},
    events: data.events || []
  };
}

async function saveState(partial) {
  await chrome.storage.local.set(partial);
}

async function ensureDefaults() {
  const { settings } = await getState();
  await chrome.storage.local.set({ settings });
}

async function logEvent(type, domain, message) {
  const { events } = await getState();
  events.unshift({ type, domain, message, at: Date.now() });
  await saveState({ events: events.slice(0, 80) });
}

async function addUsage(domain, ms) {
  if (!domain || ms <= 500) return;
  const { settings, usage, locks } = await getState();
  if (!settings.enabled) return;
  const targetSite = settings.blockedSites.find(site => domainMatches(domain, site));
  if (!targetSite) return;

  const day = todayKey();
  usage[day] ||= {};
  usage[day][targetSite] ||= { ms: 0, visits: 0, warned: false };
  usage[day][targetSite].ms += ms;

  const limitMs = settings.dailyLimitMinutes * 60 * 1000;
  const warningMs = limitMs * (settings.warningAtPercent / 100);

  if (!usage[day][targetSite].warned && usage[day][targetSite].ms >= warningMs && usage[day][targetSite].ms < limitMs) {
    usage[day][targetSite].warned = true;
    await logEvent("warning", targetSite, `وصلت إلى ${settings.warningAtPercent}% من الحد اليومي.`);
  }

  if (usage[day][targetSite].ms >= limitMs) {
    const until = Date.now() + settings.blockMinutes * 60 * 1000;
    locks[targetSite] = { until, reason: "daily_limit", createdAt: Date.now() };
    await logEvent("blocked", targetSite, `تم حظر الموقع لمدة ${settings.blockMinutes} دقيقة.`);
    await updateDynamicRules();
  }

  await saveState({ usage, locks });
}

async function countVisit(domain) {
  const { settings, usage } = await getState();
  const targetSite = settings.blockedSites.find(site => domainMatches(domain, site));
  if (!targetSite) return;
  const day = todayKey();
  usage[day] ||= {};
  usage[day][targetSite] ||= { ms: 0, visits: 0, warned: false };
  usage[day][targetSite].visits += 1;
  await saveState({ usage });
}

async function flushActiveTime() {
  const now = Date.now();
  const elapsed = now - activeSince;
  if (activeDomain) await addUsage(activeDomain, elapsed);
  activeSince = now;
}

async function setActiveTab(tabId) {
  await flushActiveTime();
  activeTabId = tabId;
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = getDomain(tab.url || "");
    if (domain !== activeDomain) await countVisit(domain);
    activeDomain = domain;
  } catch {
    activeDomain = null;
  }
  activeSince = Date.now();
}

async function cleanExpiredLocks() {
  const { locks } = await getState();
  const now = Date.now();
  let changed = false;
  for (const [site, lock] of Object.entries(locks)) {
    if (!lock || lock.until <= now) {
      delete locks[site];
      changed = true;
      await logEvent("unblocked", site, "تم فك الحظر تلقائيًا.");
    }
  }
  if (changed) {
    await saveState({ locks });
    await updateDynamicRules();
  }
}

async function updateDynamicRules() {
  const { settings, locks } = await getState();
  const now = Date.now();
  const removeIds = Array.from({ length: 900 }, (_, i) => i + 1);
  const addRules = [];
  let id = 1;

  if (settings.enabled) {
    for (const [site, lock] of Object.entries(locks)) {
      if (lock.until > now) {
        addRules.push({
          id: id++,
          priority: 1,
          action: {
            type: "redirect",
            redirect: { extensionPath: `/blocked.html?site=${encodeURIComponent(site)}` }
          },
          condition: {
            urlFilter: `||${site}^`,
            resourceTypes: ["main_frame"]
          }
        });
      }
    }
  }
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await updateDynamicRules();
  chrome.alarms.create("radar_tick", { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  await updateDynamicRules();
  chrome.alarms.create("radar_tick", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "radar_tick") {
    await flushActiveTime();
    await cleanExpiredLocks();
  }
});

chrome.tabs.onActivated.addListener(info => setActiveTab(info.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) setActiveTab(tabId);
});
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await flushActiveTime();
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    activeDomain = null;
    activeTabId = null;
    activeSince = Date.now();
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) await setActiveTab(tab.id);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "GET_DASHBOARD") {
      await flushActiveTime();
      await cleanExpiredLocks();
      const state = await getState();
      sendResponse({ ok: true, ...state, today: todayKey(), now: Date.now() });
    }
    if (msg.type === "SAVE_SETTINGS") {
      const state = await getState();
      const settings = { ...state.settings, ...msg.settings };
      settings.blockedSites = [...new Set((settings.blockedSites || []).map(normalizeDomain).filter(Boolean))];
      await saveState({ settings });
      await updateDynamicRules();
      sendResponse({ ok: true });
    }
    if (msg.type === "UNLOCK_SITE") {
      const { locks } = await getState();
      delete locks[msg.site];
      await saveState({ locks });
      await logEvent("manual_unblock", msg.site, "تم فك الحظر يدويًا.");
      await updateDynamicRules();
      sendResponse({ ok: true });
    }
    if (msg.type === "RESET_TODAY") {
      const { usage, locks } = await getState();
      delete usage[todayKey()];
      for (const k of Object.keys(locks)) delete locks[k];
      await saveState({ usage, locks });
      await updateDynamicRules();
      sendResponse({ ok: true });
    }
  })();
  return true;
});
