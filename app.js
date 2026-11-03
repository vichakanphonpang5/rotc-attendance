'use strict';
/* =====================================================================
   ระบบเช็คชื่อนักศึกษาวิชาทหาร (นศท.) — Frontend PWA
   ===================================================================== */

const API_URL = (window.APP_CONFIG || {}).API_URL || '';
const ST = {
  present:  { t: 'มา',     s: '✓', c: 'ok' },
  sick:     { t: 'ลาป่วย', s: 'ป', c: 'warn' },
  personal: { t: 'ลากิจ',  s: 'ก', c: 'info' },
  absent:   { t: 'ขาด',    s: 'ข', c: 'bad' }
};
const STK = Object.keys(ST);
const TYPE = { class: 'เวลาเรียน', activity: 'กิจกรรม' };
const PERIOD = { am: 'เช้า', pm: 'เย็น' };
const SSTAT = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ส่งกลับแก้ไข' };
const ROLE = { viewer: 'ดูอย่างเดียว', leader: 'หัวหน้า นศท.', supervisor: 'ผู้กำกับ นศท.' };
const TH_M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const SETTING_FIELDS = [
  ['school_name', 'ชื่อโรงเรียน', 'text'],
  ['semester_name', 'ชื่อภาคเรียน (เช่น ภาคเรียนที่ 2/2569)', 'text'],
  ['semester_start', 'วันเริ่มภาคเรียน', 'date'],
  ['semester_end', 'วันสิ้นสุดภาคเรียน', 'date'],
  ['pass_percent', 'เกณฑ์ผ่าน (ร้อยละการมา)', 'number'],
  ['supervisor_name', 'ชื่อผู้กำกับ (ลงนามท้ายรายงาน)', 'text'],
  ['public_dashboard', 'ใครมีลิงก์ก็ดูหน้าภาพรวมได้ โดยไม่ต้องใช้รหัส', 'check'],
  ['enforce_time_window', 'หัวหน้า นศท. เช็คชื่อได้เฉพาะวันนี้ และในช่วงเวลาที่กำหนด', 'check'],
  ['morning_start', 'รอบเช้า เริ่ม', 'time'],
  ['morning_end', 'รอบเช้า สิ้นสุด', 'time'],
  ['evening_start', 'รอบเย็น เริ่ม', 'time'],
  ['evening_end', 'รอบเย็น สิ้นสุด', 'time']
];
const IC = {
  dash: '<svg viewBox="0 0 24 24"><path d="M4 20V11M10 20V5M16 20v-8M21 20H3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.5h6V4M9 13l2 2 4-4"/></svg>',
  approve: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  report: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  manage: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>',
  install: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
};

/* ---------------- utils ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const z2 = n => String(n).padStart(2, '0');
const isoDate = (d = new Date()) => d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate());
const nowHM = () => { const d = new Date(); return z2(d.getHours()) + ':' + z2(d.getMinutes()); };
const bool = v => String(v).toUpperCase() === 'TRUE';
const pctTxt = p => p == null ? '–' : p.toFixed(1) + '%';
function thDate(iso, long) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  return d + ' ' + (long ? TH_M : TH_MS)[m - 1] + ' ' + (y + 543);
}
function thMonth(ym) { const [y, m] = ym.split('-').map(Number); return TH_M[m - 1] + ' ' + (y + 543); }
function setting(k) { return (S.data && S.data.settings && S.data.settings[k]) || ''; }
function passPct() { return Number(setting('pass_percent')) || 80; }
function role() { return S.user ? S.user.role : null; }
function sortStudents(a, b) {
  return String(a.year).localeCompare(String(b.year), 'th', { numeric: true }) || String(a.name).localeCompare(String(b.name), 'th');
}
function activeStudents() { return S.data.students.filter(s => s.active).sort(sortStudents); }
function years() { return [...new Set(S.data.students.map(s => String(s.year)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th', { numeric: true })); }
function opt(list, val) { return list.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join(''); }
function seg(name, val, opts, small) {
  return `<div class="seg${small ? ' sm' : ''}">${opts.map(([v, t]) => `<button type="button" data-act="seg" data-name="${name}" data-v="${v}" class="${v === val ? 'on' : ''}">${t}</button>`).join('')}</div>`;
}
function sessKey(o) { return o.date + '_' + o.type + '_' + o.period; }
function sessSort(a, b) { return (b.date + b.period).localeCompare(a.date + a.period); }

const LS = {
  get(k, d) { try { const v = localStorage.getItem('rotc_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rotc_' + k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem('rotc_' + k); } catch (e) { } }
};

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 't ' + (kind || '');
  el.textContent = msg;
  $('#toast').appendChild(el);
  setTimeout(() => el.remove(), kind === 'bad' ? 4500 : 2800);
}

async function busy(fn) {
  document.body.classList.add('busy');
  try { return await fn(); } finally { document.body.classList.remove('busy'); }
}

/* ---------------- state ---------------- */
const S = {
  token: LS.get('token', null),
  user: LS.get('user', null),
  data: LS.get('data', null),
  queue: LS.get('queue', []),
  tab: 'dash', modal: null, loading: false, needLogin: false, lastLoad: 0,
  dash: { type: 'class', range: 'sem', year: '' },
  chk: null,
  rep: { kind: 'semester', type: 'class', student: '', month: isoDate().slice(0, 7), year: '' },
  man: 'students', users: null, showCodes: false, installEvt: null, syncing: false
};

/* ---------------- API ---------------- */
async function api(action, payload) {
  if (!API_URL || API_URL.indexOf('PASTE_') === 0) throw new Error('ยังไม่ได้ใส่ API_URL ในไฟล์ config.js');
  let r;
  try {
    r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action, token: S.token }, payload || {})) });
  } catch (e) {
    const er = new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); er.network = true; throw er;
  }
  let j;
  try { j = await r.json(); } catch (e) { throw new Error('เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (ตรวจสอบการ Deploy)'); }
  if (!j.ok) {
    const msg = String(j.error || 'เกิดข้อผิดพลาด');
    if (msg.indexOf('AUTH:') === 0) {
      const er = new Error(msg.slice(5)); er.auth = true;
      if (S.token) clearAuth();
      throw er;
    }
    throw new Error(msg);
  }
  return j.data;
}

function clearAuth() {
  S.token = null; S.user = null; S.users = null;
  LS.del('token'); LS.del('user');
  if (!['dash', 'report'].includes(S.tab)) S.tab = 'dash';
}

async function loadData(silent) {
  S.loading = true;
  if (!silent) render();
  try {
    const d = await api('getData');
    if (d.tokenInvalid && S.token) { clearAuth(); toast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warn'); }
    S.data = d; S.needLogin = false; S.lastLoad = Date.now();
    LS.set('data', d);
    if (d.user) { S.user = d.user; LS.set('user', d.user); }
    if (!S.chk) initChk(); else if (!S.chk.dirty) loadChk();
  } catch (e) {
    if (e.auth) { S.needLogin = true; S.data = null; LS.del('data'); }
    else toast(e.network && S.data ? 'ออฟไลน์ — แสดงข้อมูลล่าสุดที่บันทึกไว้' : e.message, e.network ? 'warn' : 'bad');
  } finally {
    S.loading = false;
    render();
  }
}

async function loadUsers() {
  try { S.users = await api('listUsers'); } catch (e) { toast(e.message, 'bad'); S.users = []; }
  render();
}

async function syncQueue() {
  if (S.syncing || !S.queue.length || !navigator.onLine || !S.token) return;
  S.syncing = true;
  let sent = 0;
  for (const q of S.queue.slice()) {
    try {
      await api(q.action, q.payload);
      S.queue = S.queue.filter(x => x.key !== q.key); sent++;
    } catch (e) {
      if (e.network || e.auth) break;
      S.queue = S.queue.filter(x => x.key !== q.key);
      toast('ส่งรายการค้างไม่สำเร็จ (' + q.label + '): ' + e.message, 'bad');
    }
    LS.set('queue', S.queue);
  }
  S.syncing = false;
  if (sent) { toast('ส่งรายการที่ค้างไว้ ' + sent + ' รายการแล้ว', 'ok'); await loadData(true); }
  else render();
}

/* ---------------- stats ---------------- */
function rangeOf(r) {
  if (r === 'sem') return { from: setting('semester_start'), to: setting('semester_end'), label: setting('semester_name') };
  if (r === 'month') { const ym = isoDate().slice(0, 7); return { from: ym + '-01', to: ym + '-31', label: 'เดือน' + thMonth(ym) }; }
  return { from: '', to: '', label: 'ทั้งหมด' };
}

function calcStats(type, from, to, year, list) {
  const sess = S.data.sessions
    .filter(s => s.status === 'approved' && (type === 'both' || s.type === type) && (!from || s.date >= from) && (!to || s.date <= to))
    .sort((a, b) => (a.date + a.period).localeCompare(b.date + b.period));
  const studs = list || S.data.students.filter(s => !year || String(s.year) === String(year));
  const pass = passPct();
  let rows = studs.map(st => {
    const c = { st, present: 0, sick: 0, personal: 0, absent: 0, total: 0 };
    sess.forEach(s => { const v = s.records[st.id]; if (v && c[v] != null) { c[v]++; c.total++; } });
    c.pct = c.total ? c.present * 100 / c.total : null;
    c.pass = c.pct == null ? null : c.pct >= pass;
    return c;
  });
  if (!list) rows = rows.filter(r => r.st.active || r.total > 0);
  rows.sort((a, b) => sortStudents(a.st, b.st));
  return { sess, rows };
}

function countOf(records) {
  const c = { present: 0, sick: 0, personal: 0, absent: 0 };
  Object.values(records || {}).forEach(v => { if (c[v] != null) c[v]++; });
  return c;
}
function chips(c) { return `<div class="cnts">${STK.map(k => `<span class="tag ${ST[k].c}">${ST[k].t} ${c[k] || 0}</span>`).join('')}</div>`; }
function notPresentNames(records) {
  const byId = {}; S.data.students.forEach(s => byId[s.id] = s.name);
  const g = { sick: [], personal: [], absent: [] };
  Object.entries(records || {}).forEach(([id, v]) => { if (g[v]) g[v].push(byId[id] || '(ไม่พบชื่อ)'); });
  const parts = Object.entries(g).filter(([, a]) => a.length).map(([k, a]) => `<b>${ST[k].t}:</b> ${a.map(esc).join(', ')}`);
  return parts.length ? `<div class="names">${parts.join('<br>')}</div>` : '';
}

/* ---------------- check state ---------------- */
function initChk() {
  S.chk = { type: 'class', date: isoDate(), period: nowHM() < '12:00' ? 'am' : 'pm', activity: '', rec: {}, dirty: false };
  loadChk();
}
function loadChk() {
  const c = S.chk; if (!c || !S.data) return;
  const id = sessKey(c);
  const q = S.queue.find(x => x.key === id);
  const ex = S.data.sessions.find(s => s.id === id);
  const src = q ? q.payload : ex;
  c.rec = src ? Object.assign({}, src.records) : {};
  c.activity = src ? (src.activity || '') : '';
  c.dirty = false;
}
function confirmDiscard() {
  return !S.chk || !S.chk.dirty || confirm('การเช็คชื่อที่ยังไม่บันทึกจะหายไป ต้องการดำเนินการต่อหรือไม่?');
}

async function saveChk() {
  const c = S.chk;
  const studs = activeStudents();
  const missing = studs.filter(s => !c.rec[s.id]).length;
  if (missing) return toast('ยังเช็คไม่ครบอีก ' + missing + ' คน', 'bad');
  if (c.type === 'activity' && !c.activity.trim()) return toast('กรุณาใส่ชื่อกิจกรรม', 'bad');
  const records = {}; studs.forEach(s => records[s.id] = c.rec[s.id]);
  const payload = { date: c.date, type: c.type, period: c.period, activity: c.activity.trim(), records, recordedAt: Date.now() };
  const label = TYPE[c.type] + ' ' + thDate(c.date) + ' ' + PERIOD[c.period];
  await busy(async () => {
    try {
      await api('saveSession', payload);
      toast(role() === 'supervisor' ? 'บันทึกและอนุมัติแล้ว' : 'ส่งให้ผู้กำกับอนุมัติแล้ว', 'ok');
      c.dirty = false;
      await loadData(true);
    } catch (e) {
      if (!e.network) throw e;
      const key = sessKey(payload);
      S.queue = S.queue.filter(x => x.key !== key).concat([{ key, label, action: 'saveSession', payload }]);
      LS.set('queue', S.queue);
      c.dirty = false;
      toast('ออฟไลน์: บันทึกไว้ในเครื่องแล้ว จะส่งให้อัตโนมัติเมื่อมีสัญญาณ', 'warn');
      render();
    }
  });
}

/* ---------------- print ---------------- */
function doPrint() {
  const land = S.rep.kind === 'month';
  $('#print').innerHTML = `<div class="rp">${reportHTML()}</div>`;
  let st = $('#pageStyle');
  if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  st.textContent = '@page{size:A4 ' + (land ? 'landscape' : 'portrait') + ';margin:12mm}';
  setTimeout(() => window.print(), 80);
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function render() {
  const app = $('#app');
  const ms = $('.modal') ? $('.modal').scrollTop : 0;
  if (S.needLogin && !S.user) { app.innerHTML = loginScreen(); return; }
  if (!S.data) {
    app.innerHTML = header() + `<main class="main"><div class="empty">${S.loading ? 'กำลังโหลดข้อมูล…' : 'โหลดข้อมูลไม่สำเร็จ <br><br><button class="btn" data-act="refresh">ลองใหม่</button>'}</div></main>` + modalHTML();
    return;
  }
  const tabs = availableTabs();
  if (!tabs.find(t => t.id === S.tab)) S.tab = 'dash';
  const views = { dash: viewDash, check: viewCheck, approve: viewApprove, report: viewReport, manage: viewManage };
  app.innerHTML = header() + banner() + `<main class="main${S.tab === 'check' ? ' has-bar' : ''}">${views[S.tab]()}</main>` + nav(tabs) + modalHTML();
  if (ms && $('.modal')) $('.modal').scrollTop = ms;
  fitPaper();
}

function fitPaper() {
  const w = $('.paper-wrap'), p = $('.paper');
  if (!w || !p) return;
  p.style.zoom = 1;
  const avail = w.clientWidth - 24, need = p.offsetWidth;
  if (need > avail) p.style.zoom = (avail / need).toFixed(3);
}
window.addEventListener('resize', () => fitPaper());

function availableTabs() {
  const r = role();
  return [
    { id: 'dash', t: 'ภาพรวม' },
    { id: 'check', t: 'เช็คชื่อ', roles: ['leader', 'supervisor'] },
    { id: 'approve', t: 'อนุมัติ', roles: ['supervisor'] },
    { id: 'report', t: 'รายงาน' },
    { id: 'manage', t: 'จัดการ', roles: ['supervisor'] }
  ].filter(t => !t.roles || t.roles.includes(r));
}

function header() {
  const u = S.user;
  return `<header class="top">
    <div class="brand"><img src="icons/icon-192.png" alt=""><div><b>เช็คชื่อ นศท.</b><small>${esc(setting('school_name') || 'นักศึกษาวิชาทหาร')}</small></div></div>
    <div class="who">
      ${S.installEvt ? `<button class="icon-btn" data-act="install" title="ติดตั้งแอป">${IC.install}</button>` : ''}
      <button class="icon-btn${S.loading ? ' spin' : ''}" data-act="refresh" title="รีเฟรช">${IC.refresh}</button>
      ${u ? `<button class="chip" data-act="me">${esc(u.name)}</button>` : `<button class="btn sm gold" data-act="login">เข้าสู่ระบบ</button>`}
    </div></header>`;
}

function banner() {
  let h = '';
  if (!navigator.onLine) h += `<div class="banner warn">ออฟไลน์ — แสดงข้อมูลล่าสุดที่บันทึกไว้</div>`;
  if (S.queue.length) h += `<div class="banner info"><span>มี ${S.queue.length} รายการรอส่งขึ้นระบบ</span><button data-act="sync">ส่งเดี๋ยวนี้</button></div>`;
  return h;
}

function nav(tabs) {
  const pend = role() === 'supervisor' ? S.data.sessions.filter(s => s.status === 'pending').length : 0;
  return `<nav class="nav">${tabs.map(t => `<button class="${S.tab === t.id ? 'on' : ''}" data-act="tab" data-v="${t.id}">${IC[t.id]}${t.t}${t.id === 'approve' && pend ? `<span class="badge">${pend}</span>` : ''}</button>`).join('')}</nav>`;
}

function loginScreen() {
  return `<div class="login-wrap"><div class="login-card">
    <img src="icons/icon-512.png" alt="">
    <h2>ระบบเช็คชื่อ<br>นักศึกษาวิชาทหาร</h2>
    <form data-form="login">
      <input name="code" type="password" placeholder="รหัสเข้าใช้งาน" autocomplete="current-password" required>
      <button class="btn full gold">เข้าสู่ระบบ</button>
    </form>
    <p class="muted">ติดต่อผู้กำกับ นศท. เพื่อขอรหัส</p>
  </div></div>`;
}

/* ---------- Dashboard ---------- */
function viewDash() {
  const ds = S.dash, rng = rangeOf(ds.range), pass = passPct();
  const { sess, rows } = calcStats(ds.type, rng.from, rng.to, ds.year);
  const valid = rows.filter(r => r.total > 0);
  const avg = valid.length ? valid.reduce((a, r) => a + r.pct, 0) / valid.length : null;
  const below = valid.filter(r => !r.pass).length;
  const pend = role() ? S.data.sessions.filter(s => s.status === 'pending').length : 0;
  const latest = sess[sess.length - 1];

  let h = seg('dashType', ds.type, [['class', 'เวลาเรียน'], ['activity', 'กิจกรรม']]);
  h += `<div class="filters">
    <select data-ch="dashRange">${opt([['sem', setting('semester_name') || 'ภาคเรียนนี้'], ['month', 'เดือนนี้'], ['all', 'ทั้งหมด']], ds.range)}</select>
    <select data-ch="dashYear">${opt([['', 'ทุกชั้นปี']].concat(years().map(y => [y, 'ชั้นปี ' + y])), ds.year)}</select>
  </div>`;
  if (role() === 'supervisor' && pend) h += `<button class="alert warn" style="width:100%;border:0;text-align:left;cursor:pointer" data-act="tab" data-v="approve">มี <b>${pend}</b> รายการรออนุมัติ — แตะเพื่อตรวจ →</button>`;
  else if (role() === 'leader' && pend) h += `<div class="alert info">มี ${pend} รายการกำลังรอผู้กำกับอนุมัติ</div>`;

  h += `<div class="kpis">
    <div class="kpi"><b>${rows.length}</b><small>นักศึกษา (คน)</small></div>
    <div class="kpi"><b>${sess.length}</b><small>เช็คแล้ว (ครั้ง)</small></div>
    <div class="kpi"><b>${avg == null ? '–' : avg.toFixed(1) + '%'}</b><small>มาเฉลี่ย</small></div>
    <div class="kpi"><b class="${below ? 'bad' : ''}">${below}</b><small>ต่ำกว่า ${pass}% (คน)</small></div>
  </div>`;

  if (latest) {
    h += `<div class="card"><div class="card-h">ล่าสุด <small>${thDate(latest.date, true)} · รอบ${PERIOD[latest.period]}${latest.activity ? ' · ' + esc(latest.activity) : ''}</small></div>
      ${chips(countOf(latest.records))}${notPresentNames(latest.records)}</div>`;
  }

  h += `<div class="card"><div class="card-h">รายชื่อ <small>เกณฑ์ผ่าน ${pass}% · แตะเพื่อดูประวัติ</small></div>`;
  if (!rows.length) h += `<div class="empty">ยังไม่มีรายชื่อนักศึกษา</div>`;
  else {
    h += `<div class="slist">` + rows.map(r => {
      const cls = r.pct == null ? 'na' : r.pass ? 'ok' : 'bad';
      return `<button class="srow-d" data-act="student" data-id="${esc(r.st.id)}">
        <div class="nm"><b>${esc(r.st.name)}</b><small>ชั้นปี ${esc(r.st.year)} · มา ${r.present} · ลาป่วย ${r.sick} · ลากิจ ${r.personal} · ขาด ${r.absent}</small>
          <div class="bar"><i class="${r.pass === false ? 'bad' : ''}" style="width:${r.pct || 0}%"></i><span class="mk" style="left:${pass}%"></span></div></div>
        <div class="pc ${cls}">${pctTxt(r.pct)}</div></button>`;
    }).join('') + `</div>`;
  }
  return h + `</div>`;
}

/* ---------- Check ---------- */
function viewCheck() {
  const c = S.chk, r = role(), isLeader = r === 'leader';
  const enforce = isLeader && bool(setting('enforce_time_window'));
  if (enforce && c.date !== isoDate()) { c.date = isoDate(); loadChk(); }
  const id = sessKey(c);
  const ex = S.data.sessions.find(s => s.id === id);
  const queued = S.queue.find(x => x.key === id);
  const locked = isLeader && ex && ex.status === 'approved' && !queued;
  const win = c.period === 'am' ? [setting('morning_start'), setting('morning_end')] : [setting('evening_start'), setting('evening_end')];
  const hm = nowHM();
  const outWin = enforce && (hm < win[0] || hm > win[1]);
  const studs = activeStudents();

  let h = seg('chkType', c.type, [['class', 'เวลาเรียน'], ['activity', 'กิจกรรม']]);
  h += `<div class="card form-grid">
    <label>วันที่<input type="date" data-ch="chkDate" value="${c.date}" max="${isoDate()}"${enforce ? ' disabled' : ''}></label>
    <label>รอบ${seg('chkPeriod', c.period, [['am', 'เช้า'], ['pm', 'เย็น']], true)}</label>
    ${c.type === 'activity' ? `<label class="full">ชื่อกิจกรรม<input type="text" data-in="chkActivity" value="${esc(c.activity)}" placeholder="เช่น ฝึกภาคสนาม, จิตอาสา"${locked ? ' disabled' : ''}></label>` : ''}
  </div>`;

  if (queued) h += `<div class="alert info">รายการนี้บันทึกไว้ในเครื่อง รอส่งขึ้นระบบเมื่อมีสัญญาณ</div>`;
  else if (ex) {
    const cls = { pending: 'warn', approved: 'ok', rejected: 'bad' }[ex.status];
    h += `<div class="alert ${cls}"><b>${SSTAT[ex.status]}</b> · เช็คโดย ${esc(ex.createdBy)}${ex.approvedBy && ex.status === 'approved' ? ' · อนุมัติโดย ' + esc(ex.approvedBy) : ''}
      ${ex.status === 'rejected' ? `<br>เหตุผลที่ส่งกลับ: ${esc(ex.note || '-')} — แก้ไขแล้วกดบันทึกเพื่อส่งใหม่` : ''}
      ${locked ? '<br>ผู้กำกับอนุมัติแล้ว จึงแก้ไขไม่ได้' : ''}</div>`;
  }
  if (enforce) h += outWin
    ? `<div class="alert bad">ขณะนี้ (${hm} น.) อยู่นอกช่วงเวลาเช็คชื่อรอบ${PERIOD[c.period]} (${win[0]}–${win[1]} น.)</div>`
    : `<div class="muted" style="margin:-4px 0 10px">ช่วงเวลาเช็คชื่อรอบ${PERIOD[c.period]}: ${win[0]}–${win[1]} น.</div>`;

  if (!studs.length) {
    h += `<div class="card empty">ยังไม่มีรายชื่อนักศึกษา${r === 'supervisor' ? `<br><br><button class="btn" data-act="tab" data-v="manage">เพิ่มรายชื่อ</button>` : ''}</div>`;
  } else {
    h += `<div class="toolbar"><button class="btn gold" data-act="allPresent"${locked ? ' disabled' : ''}>✓ มาครบทุกคน</button><button class="btn ghost" data-act="clearChk"${locked ? ' disabled' : ''}>ล้าง</button></div>`;
    h += `<div class="card" style="padding:6px 10px">`;
    let lastY = null;
    studs.forEach((s, i) => {
      if (String(s.year) !== lastY) { lastY = String(s.year); h += `<div class="ygroup">ชั้นปี ${esc(s.year)}</div>`; }
      h += srow(s, i + 1, c.rec, locked, 'mark');
    });
    h += `</div>`;
    if (r === 'supervisor' && ex) h += `<button class="btn ghost danger full" data-act="delSess" data-id="${esc(ex.id)}">ลบรายการเช็คชื่อนี้</button><div style="height:12px"></div>`;

    const cnt = countOf(c.rec), done = studs.filter(s => c.rec[s.id]).length;
    h += `<div class="savebar"><div class="in">
      <div class="cnts">${STK.map(k => `<span class="tag ${ST[k].c}">${ST[k].t} ${cnt[k]}</span>`).join('')}<span class="muted">${done}/${studs.length}</span></div>
      <button class="btn full ${r === 'supervisor' ? 'ok' : ''}" data-act="saveChk"${locked || outWin ? ' disabled' : ''}>${r === 'supervisor' ? 'บันทึก (อนุมัติทันที)' : 'บันทึกและส่งให้ผู้กำกับอนุมัติ'}</button>
    </div></div>`;
  }

  const recent = S.data.sessions.slice().sort(sessSort).slice(0, 8);
  if (recent.length) {
    h += `<div class="card recent"><div class="card-h">รายการล่าสุด <small>แตะเพื่อเปิด</small></div>` + recent.map(s =>
      `<button class="li" data-act="openSess" data-id="${esc(s.id)}"><span><span class="tag ${s.type}">${TYPE[s.type]}</span> ${thDate(s.date)} · ${PERIOD[s.period]}</span><span class="tag ${s.status}">${SSTAT[s.status]}</span></button>`).join('') + `</div>`;
  }
  return h;
}

function srow(s, i, rec, locked, act) {
  const v = rec[s.id];
  return `<div class="srow ${v ? 'st-' + v : 'unset'}"><div class="sname"><span class="no">${i}</span>${esc(s.name)}</div>
    <div class="sbtns">${STK.map(k => `<button class="sb ${k}${v === k ? ' on' : ''}" data-act="${act}" data-id="${esc(s.id)}" data-st="${k}"${locked ? ' disabled' : ''}>${ST[k].t}</button>`).join('')}</div></div>`;
}

/* ---------- Approve ---------- */
function viewApprove() {
  const pend = S.data.sessions.filter(s => s.status === 'pending').sort(sessSort);
  if (!pend.length) return `<div class="empty big">✅<br>ไม่มีรายการรออนุมัติ</div>`;
  return `<div class="row-between"><b>รออนุมัติ ${pend.length} รายการ</b><button class="btn sm ok" data-act="approveAll">อนุมัติทั้งหมด</button></div>` +
    pend.map(s => `<div class="card">
      <div class="sess-h"><span class="tag ${s.type}">${TYPE[s.type]}</span><b>${thDate(s.date, true)}</b> · รอบ${PERIOD[s.period]}</div>
      ${s.activity ? `<div class="muted">กิจกรรม: ${esc(s.activity)}</div>` : ''}
      <div class="muted">เช็คโดย ${esc(s.createdBy)} · ${esc(s.createdAt)}</div>
      ${chips(countOf(s.records))}${notPresentNames(s.records)}
      <div class="btns">
        <button class="btn ghost" data-act="apvOpen" data-id="${esc(s.id)}">ตรวจ/แก้ไข</button>
        <button class="btn ghost danger" data-act="reject" data-id="${esc(s.id)}">ส่งกลับ</button>
        <button class="btn ok" data-act="approve" data-id="${esc(s.id)}">อนุมัติ</button>
      </div></div>`).join('');
}

/* ---------- Report ---------- */
function viewReport() {
  const r = S.rep;
  const studs = S.data.students.slice().sort(sortStudents);
  if (!studs.find(s => s.id === r.student) && studs[0]) r.student = studs[0].id;
  return `<div class="card form-grid">
    <label>ชนิดรายงาน<select data-ch="repKind">${opt([['individual', 'รายบุคคล'], ['month', 'สรุปรายเดือน'], ['semester', 'สรุปรายภาคเรียน']], r.kind)}</select></label>
    <label>ประเภท<select data-ch="repType">${opt([['class', 'เวลาเรียน'], ['activity', 'กิจกรรม'], ['both', 'ทั้งสองประเภท']], r.type)}</select></label>
    ${r.kind === 'individual'
      ? `<label class="full">นักศึกษา<select data-ch="repStudent">${opt(studs.map(s => [s.id, s.name + ' (ปี ' + s.year + ')']), r.student)}</select></label>`
      : `<label>ชั้นปี<select data-ch="repYear">${opt([['', 'ทุกชั้นปี']].concat(years().map(y => [y, 'ชั้นปี ' + y])), r.year)}</select></label>`}
    ${r.kind === 'month' ? `<label>เดือน<input type="month" data-ch="repMonth" value="${r.month}"></label>` : ''}
    <div class="full"><button class="btn full gold" data-act="print">พิมพ์ / บันทึกเป็น PDF</button>
    <p class="hint">ในหน้าต่างพิมพ์ ให้เลือกเครื่องพิมพ์เป็น “บันทึกเป็น PDF / Save as PDF”</p></div>
  </div>
  <div class="paper-wrap"><div class="paper rp${r.kind === 'month' ? ' land' : ''}">${reportHTML()}</div></div>`;
}

function reportHTML() {
  const r = S.rep;
  const types = r.type === 'both' ? ['class', 'activity'] : [r.type];
  if (r.kind === 'individual') return repIndividual(r.student, types);
  if (r.kind === 'month') return repMonth(r.month, types, r.year);
  return repSemester(types, r.year);
}
function typeTitle(types) { return types.length > 1 ? 'เวลาเรียนและกิจกรรม' : TYPE[types[0]]; }
function repHead(title, sub) {
  return `<div class="r-head"><div class="r-school">${esc(setting('school_name'))}</div><div class="r-title">${title}</div><div class="r-sub">${sub}</div></div>`;
}
function repSign() {
  const n = setting('supervisor_name');
  return `<div class="r-sign"><div>ลงชื่อ ..................................................<br>( ${n ? esc(n) : '..................................................'} )<br>ผู้กำกับนักศึกษาวิชาทหาร</div></div>
    <div class="r-foot">พิมพ์จากระบบเช็คชื่อ นศท. เมื่อ ${thDate(isoDate(), true)} เวลา ${nowHM()} น. · นับเฉพาะรายการที่ผู้กำกับอนุมัติแล้ว · ร้อยละ = จำนวนครั้งที่มา ÷ จำนวนครั้งที่เช็คทั้งหมด</div>`;
}
function resultCell(x) { return `<td class="${x.pass === false ? 'fail' : ''}">${x.pass == null ? '-' : x.pass ? 'ผ่าน' : 'ไม่ผ่าน'}</td>`; }

function repSemester(types, year) {
  const rng = rangeOf('sem');
  let h = repHead('รายงานสรุป' + typeTitle(types) + ' นักศึกษาวิชาทหาร',
    `${esc(setting('semester_name'))} (${thDate(rng.from, true)} – ${thDate(rng.to, true)})${year ? ' · ชั้นปีที่ ' + esc(year) : ''}`);
  types.forEach(t => {
    const { sess, rows } = calcStats(t, rng.from, rng.to, year);
    const ok = rows.filter(x => x.pass === true).length, ng = rows.filter(x => x.pass === false).length;
    h += `<div class="r-sec">${TYPE[t]} (เช็คทั้งหมด ${sess.length} ครั้ง)</div>
    <table><thead><tr><th>ที่</th><th>ชื่อ-สกุล</th><th>ชั้นปี</th><th>ครั้งที่เช็ค</th><th>มา</th><th>ลาป่วย</th><th>ลากิจ</th><th>ขาด</th><th>ร้อยละ</th><th>ผล</th></tr></thead><tbody>
    ${rows.map((x, i) => `<tr><td>${i + 1}</td><td class="l">${esc(x.st.name)}</td><td>${esc(x.st.year)}</td><td>${x.total}</td><td>${x.present}</td><td>${x.sick}</td><td>${x.personal}</td><td>${x.absent}</td><td>${pctTxt(x.pct)}</td>${resultCell(x)}</tr>`).join('') || '<tr><td colspan="10">ไม่มีข้อมูล</td></tr>'}
    </tbody></table>
    <p class="r-note">ผ่านเกณฑ์ ${ok} คน · ไม่ผ่านเกณฑ์ ${ng} คน (เกณฑ์ร้อยละ ${passPct()})</p>`;
  });
  return h + repSign();
}

function repMonth(ym, types, year) {
  const from = ym + '-01', to = ym + '-31';
  let h = repHead('รายงานสรุป' + typeTitle(types) + ' นักศึกษาวิชาทหาร ประจำเดือน' + thMonth(ym),
    `${esc(setting('semester_name'))}${year ? ' · ชั้นปีที่ ' + esc(year) : ''}`);
  types.forEach(t => {
    const { sess, rows } = calcStats(t, from, to, year);
    h += `<div class="r-sec">${TYPE[t]} (เช็คทั้งหมด ${sess.length} ครั้ง)</div>`;
    if (!sess.length) { h += `<p class="r-note">ไม่มีข้อมูลในเดือนนี้</p>`; return; }
    const dates = [];
    sess.forEach(s => { const d = dates.find(x => x.date === s.date); d ? d.n++ : dates.push({ date: s.date, n: 1 }); });
    h += `<table class="mx"><thead>
      <tr><th rowspan="2">ที่</th><th rowspan="2">ชื่อ-สกุล</th><th rowspan="2">ปี</th>
        ${dates.map(d => `<th colspan="${d.n}">${Number(d.date.slice(8))}</th>`).join('')}
        <th rowspan="2">มา</th><th rowspan="2">ป</th><th rowspan="2">ก</th><th rowspan="2">ข</th><th rowspan="2">ร้อยละ</th></tr>
      <tr>${sess.map(s => `<th>${s.period === 'am' ? 'ช' : 'ย'}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((x, i) => `<tr><td>${i + 1}</td><td class="l">${esc(x.st.name)}</td><td>${esc(x.st.year)}</td>
        ${sess.map(s => { const v = s.records[x.st.id]; return `<td class="c${v ? ' s-' + v : ''}">${v ? ST[v].s : '-'}</td>`; }).join('')}
        <td>${x.present}</td><td>${x.sick}</td><td>${x.personal}</td><td>${x.absent}</td><td class="${x.pass === false ? 'fail' : ''}">${pctTxt(x.pct)}</td></tr>`).join('')}
      </tbody></table>
      <p class="r-note">สัญลักษณ์: ✓ = มา, ป = ลาป่วย, ก = ลากิจ, ข = ขาด, - = ไม่มีรายชื่อในครั้งนั้น · ช = รอบเช้า, ย = รอบเย็น</p>`;
    if (t === 'activity') {
      h += `<p class="r-note">กิจกรรม: ${sess.map(s => `${thDate(s.date)} (${PERIOD[s.period]}) ${esc(s.activity)}`).join(' · ')}</p>`;
    }
  });
  return h + repSign();
}

function repIndividual(id, types) {
  const st = S.data.students.find(s => s.id === id);
  if (!st) return '<p>ไม่พบนักศึกษา</p>';
  const rng = rangeOf('sem');
  let h = repHead('รายงาน' + typeTitle(types) + ' รายบุคคล นักศึกษาวิชาทหาร',
    `${esc(setting('semester_name'))} (${thDate(rng.from, true)} – ${thDate(rng.to, true)})`);
  h += `<table class="r-info"><tr><td>ชื่อ-สกุล</td><td><b>${esc(st.name)}</b></td><td style="padding-left:30px">ชั้นปีที่</td><td><b>${esc(st.year)}</b></td></tr></table>`;
  h += `<div class="r-sec">สรุป</div><table><thead><tr><th>ประเภท</th><th>ครั้งที่เช็ค</th><th>มา</th><th>ลาป่วย</th><th>ลากิจ</th><th>ขาด</th><th>ร้อยละ</th><th>ผล</th></tr></thead><tbody>`;
  types.forEach(t => {
    const x = calcStats(t, rng.from, rng.to, '', [st]).rows[0];
    h += `<tr><td>${TYPE[t]}</td><td>${x.total}</td><td>${x.present}</td><td>${x.sick}</td><td>${x.personal}</td><td>${x.absent}</td><td>${pctTxt(x.pct)}</td>${resultCell(x)}</tr>`;
  });
  h += `</tbody></table>`;
  const sess = calcStats(types.length > 1 ? 'both' : types[0], rng.from, rng.to, '', [st]).sess.filter(s => s.records[st.id]);
  h += `<div class="r-sec">รายละเอียด</div><table><thead><tr><th>ที่</th><th>วันที่</th><th>รอบ</th><th>ประเภท</th><th>กิจกรรม</th><th>สถานะ</th></tr></thead><tbody>
    ${sess.map((s, i) => { const v = s.records[st.id]; return `<tr><td>${i + 1}</td><td>${thDate(s.date, true)}</td><td>${PERIOD[s.period]}</td><td>${TYPE[s.type]}</td><td class="l">${esc(s.activity || '-')}</td><td class="${v === 'absent' ? 'fail' : ''}">${ST[v].t}</td></tr>`; }).join('') || '<tr><td colspan="6">ไม่มีข้อมูล</td></tr>'}
  </tbody></table>`;
  return h + repSign();
}

/* ---------- Manage ---------- */
function viewManage() {
  let h = seg('manTab', S.man, [['students', 'นักศึกษา'], ['users', 'รหัสผู้ใช้'], ['settings', 'ตั้งค่า']]);
  if (S.man === 'students') h += manStudents();
  else if (S.man === 'users') h += manUsers();
  else h += manSettings();
  return h;
}

function manStudents() {
  const studs = S.data.students.slice().sort(sortStudents);
  let h = `<div class="card"><div class="card-h">เพิ่มรายชื่อ <small>วางได้หลายคน บรรทัดละ 1 คน</small></div>
    <form data-form="addStudents">
      <textarea name="names" rows="4" placeholder="นายสมชาย ใจดี&#10;นางสาวสมหญิง รักชาติ"></textarea>
      <div class="form-grid"><label>ชั้นปี<select name="year">${opt([1, 2, 3, 4, 5].map(y => [y, 'ชั้นปี ' + y]), 1)}</select></label>
      <div style="display:flex;align-items:flex-end"><button class="btn full">เพิ่มรายชื่อ</button></div></div>
    </form></div>`;
  h += `<div class="card"><div class="card-h">รายชื่อทั้งหมด <small>${studs.filter(s => s.active).length} คนที่ยังเรียนอยู่</small></div>`;
  if (!studs.length) h += `<div class="empty">ยังไม่มีรายชื่อ</div>`;
  let lastY = null;
  studs.forEach(s => {
    if (String(s.year) !== lastY) { lastY = String(s.year); h += `<div class="ygroup">ชั้นปี ${esc(s.year)}</div>`; }
    h += `<div class="mrow${s.active ? '' : ' off'}"><div class="nm"><b>${esc(s.name)}</b>${s.active ? '' : ' <span class="tag">ไม่ได้เรียนแล้ว</span>'}</div>
      <button class="btn sm ghost" data-act="stEdit" data-id="${esc(s.id)}">แก้ไข</button></div>`;
  });
  return h + `</div>`;
}

function manUsers() {
  if (!S.users) { setTimeout(loadUsers, 0); return `<div class="empty">กำลังโหลด…</div>`; }
  const mask = c => S.showCodes ? c : '•'.repeat(Math.max(0, c.length - 2)) + c.slice(-2);
  const byRole = { supervisor: 1, leader: 2, viewer: 3 };
  const list = S.users.slice().sort((a, b) => byRole[a.role] - byRole[b.role] || a.name.localeCompare(b.name, 'th'));
  return `<div class="card"><div class="card-h">สิทธิ์การใช้งาน</div><ul class="rolehelp">
      <li><b>ผู้กำกับ นศท.</b> ทำได้ทุกอย่าง และเช็คชื่อแล้วอนุมัติทันที</li>
      <li><b>หัวหน้า นศท.</b> เช็คชื่อแทนครูได้ แต่ต้องรอผู้กำกับอนุมัติ</li>
      <li><b>ดูอย่างเดียว</b> ดูภาพรวมและรายงานได้ (ใช้เมื่อปิดการดูแบบสาธารณะ)</li></ul></div>
    <div class="row-between"><button class="btn sm ghost" data-act="showCodes">${S.showCodes ? 'ซ่อนรหัส' : 'แสดงรหัส'}</button><button class="btn sm" data-act="userEdit">+ เพิ่มผู้ใช้</button></div>
    <div class="card">${list.map(u => `<div class="mrow${u.active ? '' : ' off'}"><div class="nm"><b>${esc(u.name)}</b><br>
      <span class="tag ${u.role === 'supervisor' ? 'ok' : u.role === 'leader' ? 'warn' : ''}">${ROLE[u.role] || u.role}</span> <span class="code">${esc(mask(u.code))}</span></div>
      <button class="btn sm ghost" data-act="userEdit" data-code="${esc(u.code)}">แก้ไข</button></div>`).join('') || '<div class="empty">ยังไม่มีผู้ใช้</div>'}</div>`;
}

function manSettings() {
  return `<form class="card" data-form="settings">${SETTING_FIELDS.map(([k, label, type]) => type === 'check'
    ? `<label class="checkline"><input type="checkbox" name="${k}"${bool(setting(k)) ? ' checked' : ''}> ${label}</label>`
    : `<label>${label}<input type="${type}" name="${k}" value="${esc(setting(k))}"${type === 'number' ? ' min="1" max="100"' : ''}></label>`).join('')}
    <button class="btn full">บันทึกการตั้งค่า</button></form>`;
}

/* ---------- Modals ---------- */
function modalHTML() {
  const m = S.modal;
  if (!m) return '';
  let b = '';
  const x = `<button class="x" data-act="close" aria-label="ปิด">×</button>`;
  if (m.kind === 'login') {
    b = `${x}<h3>เข้าสู่ระบบ</h3><p class="muted">กรอกรหัสที่ได้รับจากผู้กำกับ นศท.</p>
      <form data-form="login"><input id="codeIn" name="code" type="password" placeholder="รหัสเข้าใช้งาน" autocomplete="current-password" required>
      <button class="btn full gold">เข้าสู่ระบบ</button></form>`;
  } else if (m.kind === 'me') {
    b = `${x}<h3>${esc(S.user.name)}</h3><p class="muted">สิทธิ์: ${ROLE[S.user.role]}</p>
      <div class="btns"><button class="btn ghost" data-act="refresh">รีเฟรชข้อมูล</button><button class="btn danger" data-act="logout">ออกจากระบบ</button></div>`;
  } else if (m.kind === 'student') {
    b = x + modalStudent(m.id);
  } else if (m.kind === 'apv') {
    const s = S.data.sessions.find(z => z.id === m.id);
    if (!s) { S.modal = null; return ''; }
    const studs = S.data.students.filter(st => st.active || m.rec[st.id]).sort(sortStudents);
    b = `${x}<h3>ตรวจรายการ</h3><p class="muted">${TYPE[s.type]} · ${thDate(s.date, true)} · รอบ${PERIOD[s.period]}${s.activity ? ' · ' + esc(s.activity) : ''}<br>เช็คโดย ${esc(s.createdBy)}</p>
      ${chips(countOf(m.rec))}<div style="margin-top:8px">${studs.map((st, i) => srow(st, i + 1, m.rec, false, 'amark')).join('')}</div>
      <div class="btns"><button class="btn ghost danger" data-act="reject" data-id="${esc(s.id)}">ส่งกลับ</button><button class="btn ok" data-act="apvSave">อนุมัติ</button></div>`;
  } else if (m.kind === 'stEdit') {
    const s = S.data.students.find(z => z.id === m.id) || { id: '', name: '', year: '1', active: true };
    b = `${x}<h3>${s.id ? 'แก้ไขรายชื่อ' : 'เพิ่มรายชื่อ'}</h3>
      <form data-form="stEdit"><input type="hidden" name="id" value="${esc(s.id)}">
        <label>ชื่อ-สกุล<input type="text" name="name" value="${esc(s.name)}" required></label>
        <label>ชั้นปี<input type="text" name="year" value="${esc(s.year)}" inputmode="numeric" required></label>
        <label class="checkline"><input type="checkbox" name="active"${s.active ? ' checked' : ''}> ยังเรียนอยู่ (แสดงในหน้าเช็คชื่อ)</label>
        <div class="btns">${s.id ? `<button type="button" class="btn ghost danger" data-act="stDel" data-id="${esc(s.id)}">ลบ</button>` : ''}<button class="btn">บันทึก</button></div>
      </form>`;
  } else if (m.kind === 'userEdit') {
    const u = (S.users || []).find(z => z.code === m.code) || { code: '', name: '', role: 'leader', active: true };
    b = `${x}<h3>${u.code ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</h3>
      <form data-form="userEdit"><input type="hidden" name="original" value="${esc(u.code)}">
        <label>ชื่อ<input type="text" name="name" value="${esc(u.name)}" required placeholder="เช่น นศท.สมชาย (หัวหน้าปี 3)"></label>
        <label>รหัสเข้าใช้งาน (อย่างน้อย 4 ตัว)<input type="text" name="code" value="${esc(u.code)}" minlength="4" required autocomplete="off"></label>
        <label>สิทธิ์<select name="role">${opt(Object.entries(ROLE), u.role)}</select></label>
        <label class="checkline"><input type="checkbox" name="active"${u.active ? ' checked' : ''}> เปิดใช้งาน</label>
        <div class="btns">${u.code ? `<button type="button" class="btn ghost danger" data-act="userDel" data-code="${esc(u.code)}">ลบ</button>` : ''}<button class="btn">บันทึก</button></div>
      </form>`;
  }
  return `<div class="modal-bg" data-act="closeBg"><div class="modal" role="dialog">${b}</div></div>`;
}

function modalStudent(id) {
  const st = S.data.students.find(s => s.id === id);
  if (!st) return '<p>ไม่พบข้อมูล</p>';
  const rng = rangeOf('sem');
  const minis = ['class', 'activity'].map(t => {
    const r = calcStats(t, rng.from, rng.to, '', [st]).rows[0];
    return `<div class="mini"><small>${TYPE[t]}</small><div class="big ${r.pass == null ? '' : r.pass ? 'ok' : 'bad'}">${pctTxt(r.pct)}</div>
      <small>มา ${r.present} · ลาป่วย ${r.sick} · ลากิจ ${r.personal} · ขาด ${r.absent}</small></div>`;
  }).join('');
  const hist = calcStats('both', rng.from, rng.to, '', [st]).sess.filter(s => s.records[st.id]).sort(sessSort);
  return `<h3>${esc(st.name)}</h3><p class="muted">ชั้นปี ${esc(st.year)} · ${esc(setting('semester_name'))}</p>
    <div class="minis">${minis}</div>
    <table class="hist">${hist.map(s => { const v = s.records[st.id]; return `<tr><td>${thDate(s.date)}</td><td>${PERIOD[s.period]}</td><td>${TYPE[s.type]}${s.activity ? '<br><small class="muted">' + esc(s.activity) + '</small>' : ''}</td><td style="text-align:right"><span class="tag ${ST[v].c}">${ST[v].t}</span></td></tr>`; }).join('') || '<tr><td class="muted">ยังไม่มีประวัติในภาคเรียนนี้</td></tr>'}</table>
    <div class="btns"><button class="btn gold" data-act="printStudent" data-id="${esc(st.id)}">พิมพ์รายงานรายบุคคล (PDF)</button></div>`;
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
const ACT = {
  tab: el => { if (S.tab === 'check' && el.dataset.v !== 'check' && !confirmDiscard()) return; if (S.tab === 'check' && S.chk.dirty) loadChk(); S.tab = el.dataset.v; S.modal = null; window.scrollTo(0, 0); render(); },
  seg: el => {
    const n = el.dataset.name, v = el.dataset.v;
    if (n === 'dashType') S.dash.type = v;
    else if (n === 'chkType' || n === 'chkPeriod') {
      const k = n === 'chkType' ? 'type' : 'period';
      if (S.chk[k] === v || !confirmDiscard()) return;
      S.chk[k] = v; loadChk();
    } else if (n === 'manTab') S.man = v;
    render();
  },
  login: () => { S.modal = { kind: 'login' }; render(); setTimeout(() => { const i = $('#codeIn'); if (i) i.focus(); }, 60); },
  me: () => { S.modal = { kind: 'me' }; render(); },
  close: () => { S.modal = null; render(); },
  closeBg: () => { S.modal = null; render(); },
  refresh: () => { S.modal = null; S.users = null; return loadData().then(syncQueue); },
  logout: async () => { try { await api('logout'); } catch (e) { } clearAuth(); S.modal = null; toast('ออกจากระบบแล้ว'); await loadData(); },
  install: async () => { const ev = S.installEvt; if (!ev) return; S.installEvt = null; ev.prompt(); render(); },
  sync: () => syncQueue(),
  student: el => { S.modal = { kind: 'student', id: el.dataset.id }; render(); },
  printStudent: el => { Object.assign(S.rep, { kind: 'individual', student: el.dataset.id, type: 'both' }); S.modal = null; S.tab = 'report'; render(); doPrint(); },
  print: () => doPrint(),

  mark: el => { S.chk.rec[el.dataset.id] = el.dataset.st; S.chk.dirty = true; render(); },
  allPresent: () => { activeStudents().forEach(s => S.chk.rec[s.id] = 'present'); S.chk.dirty = true; render(); },
  clearChk: () => { S.chk.rec = {}; S.chk.dirty = true; render(); },
  saveChk: () => saveChk(),
  openSess: el => {
    const s = S.data.sessions.find(x => x.id === el.dataset.id);
    if (!s || !confirmDiscard()) return;
    Object.assign(S.chk, { date: s.date, type: s.type, period: s.period });
    loadChk(); render(); window.scrollTo(0, 0);
  },
  delSess: el => {
    if (!confirm('ลบรายการเช็คชื่อนี้ทั้งหมด? ไม่สามารถกู้คืนได้')) return;
    return busy(async () => { await api('deleteSession', { id: el.dataset.id }); toast('ลบแล้ว'); S.chk.dirty = false; await loadData(true); });
  },

  approve: el => busy(async () => { await api('approveSession', { id: el.dataset.id }); toast('อนุมัติแล้ว', 'ok'); await loadData(true); }),
  approveAll: () => {
    const n = S.data.sessions.filter(s => s.status === 'pending').length;
    if (!confirm('อนุมัติทั้งหมด ' + n + ' รายการ?')) return;
    return busy(async () => { await api('approveAll'); toast('อนุมัติทั้งหมดแล้ว', 'ok'); await loadData(true); });
  },
  reject: el => {
    const note = prompt('เหตุผลที่ส่งกลับให้หัวหน้าแก้ไข (ไม่บังคับ)', '');
    if (note === null) return;
    return busy(async () => { await api('rejectSession', { id: el.dataset.id, note }); S.modal = null; toast('ส่งกลับแล้ว'); await loadData(true); });
  },
  apvOpen: el => { const s = S.data.sessions.find(x => x.id === el.dataset.id); if (!s) return; S.modal = { kind: 'apv', id: s.id, rec: Object.assign({}, s.records) }; render(); },
  amark: el => { S.modal.rec[el.dataset.id] = el.dataset.st; render(); },
  apvSave: () => busy(async () => { await api('approveSession', { id: S.modal.id, records: S.modal.rec }); S.modal = null; toast('อนุมัติแล้ว', 'ok'); await loadData(true); }),

  stEdit: el => { S.modal = { kind: 'stEdit', id: el.dataset.id || '' }; render(); },
  stDel: el => {
    if (!confirm('ลบรายชื่อนี้?\nประวัติการเช็คชื่อของคนนี้จะไม่แสดงในรายงานอีก\n(ถ้าแค่ย้าย/ลาออก แนะนำให้เอาเครื่องหมาย "ยังเรียนอยู่" ออกแทน)')) return;
    return busy(async () => { await api('deleteStudent', { id: el.dataset.id }); S.modal = null; toast('ลบแล้ว'); await loadData(true); });
  },
  userEdit: el => { S.modal = { kind: 'userEdit', code: el.dataset.code || '' }; render(); },
  userDel: el => {
    if (!confirm('ลบผู้ใช้นี้? รหัสนี้จะใช้เข้าระบบไม่ได้อีก')) return;
    return busy(async () => { await api('deleteUser', { code: el.dataset.code }); S.modal = null; toast('ลบแล้ว'); await loadUsers(); });
  },
  showCodes: () => { S.showCodes = !S.showCodes; render(); }
};

const CH = {
  chkDate: v => { if (!confirmDiscard()) return; S.chk.date = v || isoDate(); loadChk(); },
  dashRange: v => S.dash.range = v,
  dashYear: v => S.dash.year = v,
  repKind: v => S.rep.kind = v,
  repType: v => S.rep.type = v,
  repStudent: v => S.rep.student = v,
  repMonth: v => S.rep.month = v || isoDate().slice(0, 7),
  repYear: v => S.rep.year = v
};
const IN = { chkActivity: v => { S.chk.activity = v; S.chk.dirty = true; } };

const FORM = {
  login: fd => busy(async () => {
    const d = await api('login', { code: fd.get('code') });
    S.token = d.token; S.user = d.user;
    LS.set('token', d.token); LS.set('user', d.user);
    S.modal = null; S.needLogin = false;
    S.tab = d.user.role === 'leader' ? 'check' : 'dash';
    toast('ยินดีต้อนรับ ' + d.user.name, 'ok');
    await loadData();
    syncQueue();
  }),
  addStudents: fd => {
    const names = String(fd.get('names') || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!names.length) return toast('กรุณาใส่รายชื่อ', 'bad');
    return busy(async () => { await api('addStudents', { names, year: fd.get('year') }); toast('เพิ่ม ' + names.length + ' คนแล้ว', 'ok'); await loadData(true); });
  },
  stEdit: fd => busy(async () => {
    await api('saveStudent', { student: { id: fd.get('id'), name: fd.get('name'), year: fd.get('year'), active: fd.get('active') ? 'TRUE' : 'FALSE' } });
    S.modal = null; toast('บันทึกแล้ว', 'ok'); await loadData(true);
  }),
  userEdit: fd => busy(async () => {
    await api('saveUser', { originalCode: fd.get('original'), user: { code: fd.get('code'), name: fd.get('name'), role: fd.get('role'), active: fd.get('active') ? 'TRUE' : 'FALSE' } });
    S.modal = null; toast('บันทึกแล้ว', 'ok'); await loadUsers();
  }),
  settings: fd => busy(async () => {
    const o = {};
    SETTING_FIELDS.forEach(([k, , type]) => { o[k] = type === 'check' ? (fd.get(k) ? 'TRUE' : 'FALSE') : String(fd.get(k) || '').trim(); });
    await api('saveSettings', { settings: o });
    toast('บันทึกการตั้งค่าแล้ว', 'ok'); await loadData(true);
  })
};

/* ---------------- wiring ---------------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.dataset.act === 'closeBg' && e.target !== el) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  try { await fn(el, e); } catch (err) { toast(err.message || String(err), 'bad'); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-ch]');
  if (!el || !CH[el.dataset.ch]) return;
  CH[el.dataset.ch](el.value, el);
  render();
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-in]');
  if (el && IN[el.dataset.in]) IN[el.dataset.in](el.value);
});
document.addEventListener('submit', async e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  try { await FORM[f.dataset.form](new FormData(f), f); } catch (err) { toast(err.message || String(err), 'bad'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.modal) { S.modal = null; render(); } });
window.addEventListener('online', () => { render(); syncQueue(); loadData(true); });
window.addEventListener('offline', () => render());
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; render(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - S.lastLoad > 60000) { loadData(true).then(syncQueue); }
});
window.addEventListener('beforeunload', e => { if (S.chk && S.chk.dirty) { e.preventDefault(); e.returnValue = ''; } });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}

/* ---------------- start ---------------- */
if (S.data) initChk();
render();
loadData(!!S.data).then(syncQueue);
