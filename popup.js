const $ = (id) => document.getElementById(id);
const fmt = (ms) => `${Math.floor(ms / 60000)}د ${Math.floor((ms % 60000) / 1000)}ث`;

async function msg(payload) {
  return await chrome.runtime.sendMessage(payload);
}

function cleanSite(s) {
  return s.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
}

async function load() {
  const data = await msg({ type: 'GET_DASHBOARD' });
  if (!data.ok) return;
  const { settings, usage, locks, today, events, now } = data;

  $('enabled').checked = !!settings.enabled;
  $('dailyLimit').value = settings.dailyLimitMinutes;
  $('blockMinutes').value = settings.blockMinutes;
  $('sites').value = settings.blockedSites.join('\n');

  const todayUsage = usage[today] || {};
  const limitMs = settings.dailyLimitMinutes * 60000;
  $('usageList').innerHTML = '';
  let totalMs = 0; let lockedN = 0;

  settings.blockedSites.forEach(site => {
    const item = todayUsage[site] || { ms: 0, visits: 0 };
    totalMs += item.ms || 0;
    const pct = Math.min(100, Math.round((item.ms / limitMs) * 100));
    const locked = locks[site] && locks[site].until > now;
    if (locked) lockedN++;
    const remain = locked ? Math.ceil((locks[site].until - now) / 60000) : 0;
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="row"><b class="ltr">${site}</b><span>${fmt(item.ms)} / ${settings.dailyLimitMinutes}د</span></div>
      <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      <div class="mini"><span>زيارات: ${item.visits || 0}</span>${locked ? `<button data-unlock="${site}" class="unlock">محظور ${remain}د — فك</button>` : `<span>${pct}%</span>`}</div>`;
    div.className = 'siteRow';
    $('usageList').appendChild(div);
  });

  $('totalTime').textContent = fmt(totalMs).replace('ث','');
  $('lockedCount').textContent = lockedN;

  document.querySelectorAll('.unlock').forEach(btn => {
    btn.addEventListener('click', async () => {
      await msg({ type: 'UNLOCK_SITE', site: btn.dataset.unlock });
      load();
    });
  });

  $('events').innerHTML = (events || []).slice(0, 8).map(e => {
    const t = new Date(e.at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    return `<div class="event"><b>${e.domain || 'النظام'}</b> — ${e.message}<br><span>${t}</span></div>`;
  }).join('') || '<p class="empty">لا توجد أحداث بعد.</p>';
}

$('save').addEventListener('click', async () => {
  const settings = {
    enabled: $('enabled').checked,
    dailyLimitMinutes: Math.max(1, parseInt($('dailyLimit').value || '20', 10)),
    blockMinutes: Math.max(1, parseInt($('blockMinutes').value || '60', 10)),
    blockedSites: $('sites').value.split('\n').map(cleanSite).filter(Boolean)
  };
  await msg({ type: 'SAVE_SETTINGS', settings });
  $('save').textContent = 'تم الحفظ ✅';
  setTimeout(() => $('save').textContent = 'حفظ الإعدادات', 1200);
  load();
});

$('enabled').addEventListener('change', async () => {
  await msg({ type: 'SAVE_SETTINGS', settings: { enabled: $('enabled').checked } });
  load();
});

$('reset').addEventListener('click', async () => {
  await msg({ type: 'RESET_TODAY' });
  load();
});

load();
setInterval(load, 10000);
