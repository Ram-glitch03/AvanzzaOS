// Avanzza OS — lógica del panel
let store = null;
let currentView = 'resumen';
let obsidianCache = null;

const $ = s => document.querySelector(s);
const main = $('#main');

// ---------- utilidades ----------
const fmtMoney = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: store?.settings?.currency || 'USD', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => new Intl.NumberFormat('es-MX').format(Math.round(n || 0));
const fmtTokens = n => !n ? '0' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(n);
const uid = p => p + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nowMonth = () => new Date().toISOString().slice(0, 7);
const inThisMonth = d => (d || '').slice(0, 7) === nowMonth();
const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 2200);
}
async function loadStore() {
  const r = await fetch('/api/store');
  if (r.status === 401) { showLogin(); throw new Error('sesión'); }
  store = await r.json();
}
async function saveStore(msg = 'Guardado') {
  const r = await fetch('/api/store', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(store) });
  if (r.status === 401) { showLogin(); return; }
  if (!r.ok) { toast('Error al guardar'); return; }
  if (currentUser && currentUser !== 'Local') { authInfo.lastEdit = { updatedBy: currentUser, updatedAt: new Date().toISOString() }; updateUserBox(); }
  if (msg) toast(msg);
}
const clientName = id => store.clients.find(c => c.id === id)?.name || 'General / Interno';
const memberName = id => store.team.find(t => t.id === id)?.name || '';

// ---------- cálculos ----------
const monthly = sub => sub.cycle === 'anual' ? (sub.price || 0) / 12 : (sub.price || 0);

// uso del mes por agente / cliente / suscripción (desde usageLog)
function usageThisMonth() { return store.usageLog.filter(u => inThisMonth(u.date)); }
function tokensByAgent(agentId) { return usageThisMonth().filter(u => u.agentId === agentId).reduce((a, u) => a + (u.tokens || 0), 0); }
function costByAgent(agentId) { return usageThisMonth().filter(u => u.agentId === agentId).reduce((a, u) => a + (u.cost || 0), 0); }
function runsByAgent(agentId) { return usageThisMonth().filter(u => u.agentId === agentId).reduce((a, u) => a + (u.runs || 0), 0); }
function tokensBySub(subId) {
  const agents = store.agents.filter(a => a.subscriptionId === subId).map(a => a.id);
  return usageThisMonth().filter(u => agents.includes(u.agentId)).reduce((a, u) => a + (u.tokens || 0), 0);
}

function clientRevenue(c) {
  const inv = store.invoices.filter(i => i.clientId === c.id && inThisMonth(i.issueDate)).reduce((a, i) => a + (i.amount || 0), 0);
  return (c.monthlyRetainer || 0) + inv;
}
function clientCost(c) {
  const subs = store.subscriptions.filter(s => s.clientId === c.id).reduce((a, s) => a + monthly(s), 0);
  const usage = usageThisMonth().filter(u => u.clientId === c.id).reduce((a, u) => a + (u.cost || 0), 0);
  const exp = store.expenses.filter(e => e.clientId === c.id && inThisMonth(e.date)).reduce((a, e) => a + (e.amount || 0), 0);
  return subs + usage + exp;
}

function finance() {
  const subsTotal = store.subscriptions.filter(s => s.status !== 'cancelado').reduce((a, s) => a + monthly(s), 0);
  const tokensCost = usageThisMonth().reduce((a, u) => a + (u.cost || 0), 0);
  const expenses = store.expenses.filter(e => inThisMonth(e.date)).reduce((a, e) => a + (e.amount || 0), 0);
  const egresos = subsTotal + tokensCost + expenses;
  const facturado = store.invoices.filter(i => inThisMonth(i.issueDate)).reduce((a, i) => a + (i.amount || 0), 0);
  const retainers = store.clients.reduce((a, c) => a + (c.monthlyRetainer || 0), 0);
  const cobrado = store.invoices.filter(i => i.status === 'pagada' && inThisMonth(i.issueDate)).reduce((a, i) => a + (i.amount || 0), 0);
  const porCobrar = store.invoices.filter(i => i.status !== 'pagada').reduce((a, i) => a + (i.amount || 0), 0);
  const ingreso = facturado + retainers;
  const horas = store.skills.reduce((a, s) => a + ((s.uses || 0) * (s.minutesSavedPerUse || 0)) / 60, 0);
  return { subsTotal, tokensCost, expenses, egresos, facturado, retainers, cobrado, porCobrar, ingreso,
    utilidad: ingreso - egresos, horas, valorTiempo: horas * (store.settings.hourlyRate || 0) };
}

// ---------- gráficas ----------
const tooltipEl = $('#tooltip');
function attachTooltips(root) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mousemove', e => {
      tooltipEl.innerHTML = el.dataset.tip; tooltipEl.classList.remove('hidden');
      tooltipEl.style.left = (e.clientX + 12) + 'px'; tooltipEl.style.top = (e.clientY - 10) + 'px';
    });
    el.addEventListener('mouseleave', () => tooltipEl.classList.add('hidden'));
  });
}
const C = n => getComputedStyle(document.documentElement).getPropertyValue(`--series-${n}`).trim();

function barChart(rows, series, fmt = fmtMoney) {
  if (!rows.length || !rows.some(r => r.values.some(x => x.v > 0)))
    return '<div class="empty">Sin datos todavía.</div>';
  const max = Math.max(...rows.flatMap(r => r.values.map(x => x.v)), 1);
  const labelW = 150, valueW = 74, barH = 14, gap = series.length > 1 ? 4 : 0;
  const rowH = series.length * barH + (series.length - 1) * gap + 12;
  const W = 560, chartW = W - labelW - valueW, H = rows.length * rowH + 4;
  let y = 2, out = '';
  for (const r of rows) {
    out += `<text x="${labelW - 10}" y="${y + rowH / 2 - 2}" text-anchor="end" dominant-baseline="middle" class="bar-label">${esc(r.label).slice(0, 24)}</text>`;
    r.values.forEach((x, i) => {
      const by = y + i * (barH + gap), w = Math.max((x.v / max) * chartW, x.v > 0 ? 3 : 0);
      out += `<rect x="${labelW}" y="${by}" width="${Math.max(w, 1)}" height="${barH}" rx="4" fill="${series[i].color}" data-tip="${esc(r.label)} — ${esc(series[i].name)}: <b>${fmt(x.v)}</b>"></rect>`;
      if (i === 0) out += `<text x="${labelW + w + 8}" y="${by + barH / 2 + 1}" dominant-baseline="middle" class="bar-value">${fmt(x.v)}</text>`;
    });
    y += rowH;
  }
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `${legend}<div class="chart"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><line x1="${labelW}" y1="0" x2="${labelW}" y2="${H}" class="axis-line"></line>${out}</svg></div>`;
}
function progressBar(pct, color) {
  const p = Math.min(Math.max(pct, 0), 100);
  return `<div class="progress" title="${p.toFixed(0)}%"><i style="width:${p}%;background:${color || C(1)}"></i></div>`;
}

// ---------- opciones para selects ----------
const clientOptions = () => [{ value: '', label: '— General / Interno —' }, ...store.clients.map(c => ({ value: c.id, label: c.name }))];
const teamOptions = () => [{ value: '', label: '— Sin asignar —' }, ...store.team.map(t => ({ value: t.id, label: t.name }))];
const agentOptions = () => store.agents.map(a => ({ value: a.id, label: a.name }));
const subOptions = () => [{ value: '', label: '— Sin suscripción —' }, ...store.subscriptions.map(s => ({ value: s.id, label: s.name }))];

// ---------- esquemas (CRUD genérico) ----------
const SCHEMAS = {
  agents: {
    title: 'Agentes', singular: 'agente', collection: 'agents',
    sub: 'Tus agentes de IA: qué hacen, con qué suscripción corren y dónde se usan más.',
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'platform', label: 'Plataforma', type: 'text' },
      { k: 'model', label: 'Modelo', type: 'text' },
      { k: 'purpose', label: 'Propósito', type: 'text' },
      { k: 'subscriptionId', label: 'Suscripción que consume', type: 'select', optionsFn: subOptions },
      { k: 'runsPerWeek', label: 'Ejecuciones por semana (estimado)', type: 'number' },
      { k: 'status', label: 'Estado', type: 'select', options: ['activo', 'pausado', 'ejemplo'] },
      { k: 'clientId', label: 'Cliente principal', type: 'select', optionsFn: clientOptions },
      { k: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { label: 'Agente', render: r => `<b>${esc(r.name)}</b><div class="note-cell">${esc(r.purpose || '')}</div>` },
      { label: 'Modelo', render: r => esc(r.model || '') },
      { label: 'Suscripción', render: r => esc(store.subscriptions.find(s => s.id === r.subscriptionId)?.name || '—') },
      { label: 'Tokens/mes', num: true, render: r => fmtTokens(tokensByAgent(r.id)) },
      { label: 'Se usa más en', render: r => esc(topClientForAgent(r.id)) },
      { label: 'Estado', render: r => `<span class="pill ${esc(r.status)}">${esc(r.status)}</span>` },
    ],
  },
  subscriptions: {
    title: 'Suscripciones', singular: 'suscripción', collection: 'subscriptions',
    sub: 'Cuánto pagas, cuándo renueva y cuántos tokens consume el stack que corre sobre cada una.',
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'category', label: 'Categoría', type: 'text' },
      { k: 'price', label: 'Precio', type: 'number', req: true },
      { k: 'cycle', label: 'Ciclo', type: 'select', options: ['mensual', 'anual'] },
      { k: 'metered', label: '¿Se paga por uso/tokens?', type: 'select', optionsFn: () => [{ value: false, label: 'No (tarifa fija)' }, { value: true, label: 'Sí (medido)' }] },
      { k: 'renewalDay', label: 'Día de renovación (1–31)', type: 'number' },
      { k: 'status', label: 'Estado', type: 'select', options: ['activo', 'cancelado', 'ejemplo'] },
      { k: 'clientId', label: 'Cliente asignado', type: 'select', optionsFn: clientOptions },
      { k: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { label: 'Suscripción', render: r => `<b>${esc(r.name)}</b><div class="note-cell">${esc(r.category || '')}</div>` },
      { label: 'Precio', num: true, render: r => `${fmtMoney(r.price)}<span class="note-cell"> /${r.cycle === 'anual' ? 'año' : 'mes'}</span>` },
      { label: 'Equiv/mes', num: true, render: r => fmtMoney(monthly(r)) },
      { label: 'Tokens/mes', num: true, render: r => fmtTokens(tokensBySub(r.id)) },
      { label: 'Renueva', render: r => r.renewalDay ? `día ${r.renewalDay}` : '—' },
      { label: 'Estado', render: r => `<span class="pill ${esc(r.status)}">${esc(r.status)}</span>` },
    ],
  },
  skills: {
    title: 'Skills', singular: 'skill', collection: 'skills',
    sub: 'Tus skills instaladas y cuánto tiempo te ahorra cada una. Registra "usos al mes" para medir el ROI.',
    tiles: () => { const f = finance(); return [
      ['Horas ahorradas/mes', f.horas.toFixed(1) + ' h'],
      ['Valor del tiempo', fmtMoney(f.valorTiempo), `a ${fmtMoney(store.settings.hourlyRate)}/hora`],
      ['Skills instaladas', store.skills.length],
    ]; },
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'description', label: 'Descripción', type: 'text' },
      { k: 'uses', label: 'Usos al mes', type: 'number' },
      { k: 'minutesSavedPerUse', label: 'Minutos ahorrados por uso', type: 'number' },
    ],
    columns: [
      { label: 'Skill', render: r => `<b>${esc(r.name)}</b><div class="note-cell">${esc(r.description || '')}</div>` },
      { label: 'Usos/mes', num: true, render: r => fmtNum(r.uses) },
      { label: 'Min/uso', num: true, render: r => fmtNum(r.minutesSavedPerUse) },
      { label: 'Horas/mes', num: true, render: r => ((r.uses || 0) * (r.minutesSavedPerUse || 0) / 60).toFixed(1) + ' h' },
      { label: 'Valor', num: true, render: r => fmtMoney((r.uses || 0) * (r.minutesSavedPerUse || 0) / 60 * (store.settings.hourlyRate || 0)) },
    ],
  },
  connections: {
    title: 'Conexiones', singular: 'conexión', collection: 'connections',
    sub: 'Integraciones y MCPs conectados a tus agentes.',
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'type', label: 'Tipo', type: 'select', options: ['MCP', 'API', 'Extensión', 'Local', 'Otro'] },
      { k: 'status', label: 'Estado', type: 'select', options: ['conectado', 'pendiente', 'desconectado'] },
      { k: 'linkedTo', label: 'Para qué se usa', type: 'text' },
      { k: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { label: 'Conexión', render: r => `<b>${esc(r.name)}</b>` },
      { label: 'Tipo', render: r => esc(r.type) },
      { label: 'Uso', render: r => `<span class="note-cell">${esc(r.linkedTo || '')}</span>` },
      { label: 'Estado', render: r => `<span class="pill ${esc(r.status)}">${esc(r.status)}</span>` },
    ],
  },
  clients: {
    title: 'Clientes', singular: 'cliente', collection: 'clients',
    sub: 'Cuánto te genera y cuánto te cuesta cada cliente (suscripciones + tokens + egresos asignados).',
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'contact', label: 'Contacto', type: 'text' },
      { k: 'monthlyRetainer', label: 'Iguala / retainer mensual', type: 'number' },
      { k: 'status', label: 'Estado', type: 'select', options: ['activo', 'prospecto', 'pausado', 'ejemplo'] },
      { k: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { label: 'Cliente', render: r => `<b>${esc(r.name)}</b><div class="note-cell">${esc(r.contact || '')}</div>` },
      { label: 'Ingreso/mes', num: true, render: r => fmtMoney(clientRevenue(r)) },
      { label: 'Costo/mes', num: true, render: r => fmtMoney(clientCost(r)) },
      { label: 'Margen', num: true, render: r => { const m = clientRevenue(r) - clientCost(r); return `<b style="color:${m >= 0 ? 'var(--good-text)' : 'var(--critical)'}">${fmtMoney(m)}</b>`; } },
      { label: 'Tareas', num: true, render: r => { const n = store.tasks.filter(t => t.clientId === r.id && t.status !== 'hecho').length; return n ? `${n} pend.` : '—'; } },
      { label: 'Estado', render: r => `<span class="pill ${esc(r.status)}">${esc(r.status)}</span>` },
    ],
  },
  team: {
    title: 'Equipo', singular: 'persona', collection: 'team',
    sub: 'Responsables a quienes puedes asignar tareas en Seguimiento.',
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'role', label: 'Rol', type: 'text' },
      { k: 'email', label: 'Email', type: 'text' },
    ],
    columns: [
      { label: 'Persona', render: r => `<b>${esc(r.name)}</b>` },
      { label: 'Rol', render: r => esc(r.role || '') },
      { label: 'Email', render: r => esc(r.email || '') },
      { label: 'Tareas activas', num: true, render: r => fmtNum(store.tasks.filter(t => t.assigneeId === r.id && t.status !== 'hecho').length) },
    ],
  },
  invoices: {
    title: 'Facturación', singular: 'factura', collection: 'invoices',
    sub: 'Todo lo que facturas y su estado de cobro.',
    fields: () => [
      { k: 'clientId', label: 'Cliente', type: 'select', optionsFn: clientOptions, req: true },
      { k: 'concept', label: 'Concepto', type: 'text', req: true },
      { k: 'amount', label: 'Monto', type: 'number', req: true },
      { k: 'issueDate', label: 'Fecha de emisión', type: 'date' },
      { k: 'dueDate', label: 'Fecha de vencimiento', type: 'date' },
      { k: 'status', label: 'Estado', type: 'select', options: ['pendiente', 'pagada', 'vencida'] },
    ],
    columns: [
      { label: 'Concepto', render: r => `<b>${esc(r.concept)}</b><div class="note-cell">${esc(clientName(r.clientId))}</div>` },
      { label: 'Monto', num: true, render: r => fmtMoney(r.amount) },
      { label: 'Emisión', render: r => esc(r.issueDate || '—') },
      { label: 'Vence', render: r => esc(r.dueDate || '—') },
      { label: 'Estado', render: r => `<span class="pill ${r.status === 'pagada' ? 'activo' : r.status === 'vencida' ? 'pausado' : 'pendiente'}">${esc(r.status)}</span>` },
    ],
  },
  expenses: {
    title: 'Egresos', singular: 'egreso', collection: 'expenses',
    sub: 'Gastos fuera de suscripciones: publicidad, servicios, honorarios, etc.',
    fields: () => [
      { k: 'concept', label: 'Concepto', type: 'text', req: true },
      { k: 'category', label: 'Categoría', type: 'text' },
      { k: 'amount', label: 'Monto', type: 'number', req: true },
      { k: 'date', label: 'Fecha', type: 'date' },
      { k: 'recurring', label: '¿Recurrente?', type: 'select', options: ['no', 'sí'] },
      { k: 'clientId', label: 'Atribuir a cliente', type: 'select', optionsFn: clientOptions },
    ],
    columns: [
      { label: 'Concepto', render: r => `<b>${esc(r.concept)}</b><div class="note-cell">${esc(r.category || '')}</div>` },
      { label: 'Monto', num: true, render: r => fmtMoney(r.amount) },
      { label: 'Fecha', render: r => esc(r.date || '—') },
      { label: 'Recurrente', render: r => esc(r.recurring || 'no') },
      { label: 'Cliente', render: r => esc(clientName(r.clientId)) },
    ],
  },
  projects: {
    title: 'Proyectos', singular: 'proyecto', collection: 'projects',
    sub: 'Presupuesto vs. avance de cada proyecto.',
    fields: () => [
      { k: 'name', label: 'Nombre', type: 'text', req: true },
      { k: 'clientId', label: 'Cliente', type: 'select', optionsFn: clientOptions },
      { k: 'budget', label: 'Presupuesto', type: 'number' },
      { k: 'spent', label: 'Gastado / avance ($)', type: 'number' },
      { k: 'status', label: 'Estado', type: 'select', options: ['activo', 'completado', 'pausado'] },
      { k: 'startDate', label: 'Inicio', type: 'date' },
      { k: 'endDate', label: 'Fin', type: 'date' },
    ],
    columns: [
      { label: 'Proyecto', render: r => `<b>${esc(r.name)}</b><div class="note-cell">${esc(clientName(r.clientId))}</div>` },
      { label: 'Presupuesto', num: true, render: r => fmtMoney(r.budget) },
      { label: 'Gastado', num: true, render: r => fmtMoney(r.spent) },
      { label: 'Avance', render: r => progressBar(r.budget ? (r.spent / r.budget) * 100 : 0, C(1)) },
      { label: 'Estado', render: r => `<span class="pill ${r.status === 'completado' ? 'activo' : r.status === 'pausado' ? 'pausado' : 'pendiente'}">${esc(r.status)}</span>` },
    ],
  },
};

function topClientForAgent(agentId) {
  const map = {};
  usageThisMonth().filter(u => u.agentId === agentId).forEach(u => map[u.clientId] = (map[u.clientId] || 0) + (u.tokens || 0));
  const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
  return top ? clientName(top[0]) : '—';
}

// ---------- modal CRUD genérico ----------
function openModal(collection, item, preset) {
  const schema = SCHEMAS[collection];
  const isNew = !item;
  const data = item || Object.assign({}, preset);
  $('#modalTitle').textContent = (isNew ? 'Agregar ' : 'Editar ') + schema.singular;
  const form = $('#modalForm');
  form.innerHTML = schema.fields().map(f => {
    const val = data[f.k] ?? '';
    if (f.type === 'select') {
      const opts = f.optionsFn ? f.optionsFn() : f.options.map(o => ({ value: o, label: o }));
      return `<div class="field"><label>${f.label}</label><select name="${f.k}">${opts.map(o => `<option value="${esc(o.value)}" ${String(val) === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'textarea') return `<div class="field"><label>${f.label}</label><textarea name="${f.k}">${esc(val)}</textarea></div>`;
    return `<div class="field"><label>${f.label}</label><input name="${f.k}" type="${f.type}" ${f.type === 'number' ? 'step="any"' : ''} value="${esc(val)}" ${f.req ? 'required' : ''}></div>`;
  }).join('') + `<div class="modal-actions">
    ${!isNew ? '<button type="button" class="ghost" id="deleteItem">Eliminar</button>' : ''}
    <button type="button" class="ghost" id="cancelModal">Cancelar</button>
    <button type="submit" class="primary">Guardar</button></div>`;

  form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const obj = isNew ? Object.assign({ id: uid(collection.slice(0, 2)) }, preset) : data;
    for (const f of schema.fields()) {
      const raw = fd.get(f.k);
      obj[f.k] = f.type === 'number' ? (parseFloat(raw) || 0) : (raw === 'true' ? true : raw === 'false' ? false : raw);
    }
    if (isNew) store[collection].push(obj);
    closeModal(); await saveStore(); render();
  };
  $('#cancelModal').onclick = closeModal;
  const del = $('#deleteItem');
  if (del) del.onclick = async () => {
    if (!confirm(`¿Eliminar "${data.name || data.concept || data.title || 'este registro'}"?`)) return;
    store[collection] = store[collection].filter(x => x.id !== data.id);
    closeModal(); await saveStore('Eliminado'); render();
  };
  $('#modalWrap').classList.remove('hidden');
}
function closeModal() { $('#modalWrap').classList.add('hidden'); }
$('#modalClose').onclick = closeModal;
$('#modalWrap').addEventListener('click', e => { if (e.target.id === 'modalWrap') closeModal(); });

// ---------- vista tabla ----------
function tableView(collection) {
  const schema = SCHEMAS[collection];
  const rows = store[collection];
  const tiles = schema.tiles ? `<div class="tiles">${schema.tiles().map(t => `<div class="tile"><div class="label">${t[0]}</div><div class="value">${t[1]}</div>${t[2] ? `<div class="delta">${t[2]}</div>` : ''}</div>`).join('')}</div>` : '';
  main.innerHTML = `
    <div class="view-head"><h1>${schema.title}</h1><button class="primary" id="addBtn">+ Agregar ${schema.singular}</button></div>
    <div class="view-sub">${schema.sub}</div>${tiles}
    <div class="table-card"><table>
      <thead><tr>${schema.columns.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr class="row-click" data-id="${r.id}">${schema.columns.map(c => `<td class="${c.num ? 'num' : ''}">${c.render(r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${schema.columns.length}" class="empty">Nada aquí todavía.</td></tr>`}</tbody>
    </table></div>`;
  $('#addBtn').onclick = () => openModal(collection);
  main.querySelectorAll('tr.row-click').forEach(tr => tr.onclick = () => openModal(collection, rows.find(r => r.id === tr.dataset.id)));
}

// ---------- Resumen ----------
function resumenView() {
  const f = finance();
  const today = new Date(), day = today.getDate();
  const renewals = store.subscriptions.filter(s => s.status !== 'cancelado' && s.renewalDay)
    .map(s => ({ ...s, in: (s.renewalDay - day + 31) % 31 })).sort((a, b) => a.in - b.in).slice(0, 4);
  const cats = {};
  store.subscriptions.filter(s => s.status !== 'cancelado').forEach(s => cats[s.category || 'Otros'] = (cats[s.category || 'Otros'] || 0) + monthly(s));
  store.expenses.filter(e => inThisMonth(e.date)).forEach(e => cats[e.category || 'Otros'] = (cats[e.category || 'Otros'] || 0) + (e.amount || 0));
  if (f.tokensCost > 0) cats['Tokens API'] = f.tokensCost;
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, values: [{ v }] }));
  const clientRows = store.clients.map(c => ({ label: c.name, values: [{ v: clientRevenue(c) }, { v: clientCost(c) }] }));
  const overdue = store.tasks.filter(t => t.status !== 'hecho' && t.dueDate && t.dueDate < today.toISOString().slice(0, 10)).length;

  main.innerHTML = `
    <div class="view-head"><h1>Resumen</h1></div>
    <div class="view-sub">El pulso de Avanzza — ${today.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="tiles">
      <div class="tile"><div class="label">Ingreso del mes</div><div class="value">${fmtMoney(f.ingreso)}</div><div class="delta">${fmtMoney(f.cobrado)} cobrado · ${fmtMoney(f.porCobrar)} por cobrar</div></div>
      <div class="tile"><div class="label">Egresos del mes</div><div class="value">${fmtMoney(f.egresos)}</div><div class="delta">${fmtMoney(f.subsTotal)} suscripciones · ${fmtMoney(f.expenses)} otros</div></div>
      <div class="tile"><div class="label">Utilidad</div><div class="value" style="color:${f.utilidad >= 0 ? 'var(--good-text)' : 'var(--critical)'}">${fmtMoney(f.utilidad)}</div><div class="delta ${f.utilidad >= 0 ? 'good' : 'bad'}">${f.ingreso > 0 ? Math.round(f.utilidad / f.ingreso * 100) + '% margen' : 'sin ingresos'}</div></div>
      <div class="tile"><div class="label">Tiempo ahorrado por skills</div><div class="value">${f.horas.toFixed(1)} h</div><div class="delta">≈ ${fmtMoney(f.valorTiempo)}</div></div>
    </div>
    <div class="tiles">
      <div class="tile"><div class="label">Clientes activos</div><div class="value">${store.clients.filter(c => c.status === 'activo').length}</div></div>
      <div class="tile"><div class="label">Tareas pendientes</div><div class="value">${store.tasks.filter(t => t.status !== 'hecho').length}</div>${overdue ? `<div class="delta bad">${overdue} vencida${overdue > 1 ? 's' : ''}</div>` : ''}</div>
      <div class="tile"><div class="label">Agentes activos</div><div class="value">${store.agents.filter(a => a.status === 'activo').length}</div></div>
      <div class="tile"><div class="label">Tokens consumidos/mes</div><div class="value">${fmtTokens(usageThisMonth().reduce((a, u) => a + (u.tokens || 0), 0))}</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h2>Egresos por categoría</h2>${barChart(catRows, [{ name: 'Egreso', color: C(1) }])}</div>
      <div class="card"><h2>Clientes: ingreso vs. costo</h2>${barChart(clientRows, [{ name: 'Ingreso', color: C(1) }, { name: 'Costo', color: C(3) }])}</div>
      <div class="card"><h2>Próximas renovaciones</h2>${renewals.length ? `<table><tbody>${renewals.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${r.in === 0 ? '<span class="pill pausado">hoy</span>' : 'en ' + r.in + ' día' + (r.in === 1 ? '' : 's')}</td><td class="num">${fmtMoney(monthly(r))}/mes</td></tr>`).join('')}</tbody></table>` : '<div class="empty">Sin renovaciones.</div>'}</div>
      <div class="card"><h2>Foco de hoy</h2>${focusList()}</div>
    </div>`;
  attachTooltips(main);
}
function focusList() {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = store.tasks.filter(t => t.status !== 'hecho').sort((a, b) => (a.dueDate || '9999') < (b.dueDate || '9999') ? -1 : 1).slice(0, 5);
  if (!tasks.length) return '<div class="empty">Sin tareas pendientes.</div>';
  return `<table><tbody>${tasks.map(t => `<tr><td><span class="dot ${t.priority}"></span><b>${esc(t.title)}</b><div class="note-cell">${esc(clientName(t.clientId))}${t.assigneeId ? ' · ' + esc(memberName(t.assigneeId)) : ''}</div></td><td class="num">${t.dueDate ? (t.dueDate < today ? `<span style="color:var(--critical)">${t.dueDate}</span>` : t.dueDate) : '—'}</td></tr>`).join('')}</tbody></table>`;
}

// ---------- Finanzas ----------
function finanzasView() {
  const f = finance();
  const catE = {};
  store.expenses.filter(e => inThisMonth(e.date)).forEach(e => catE[e.category || 'Otros'] = (catE[e.category || 'Otros'] || 0) + (e.amount || 0));
  store.subscriptions.filter(s => s.status !== 'cancelado').forEach(s => catE['Suscripciones'] = (catE['Suscripciones'] || 0) + monthly(s));
  if (f.tokensCost) catE['Tokens API'] = (catE['Tokens API'] || 0) + f.tokensCost;
  const catRows = Object.entries(catE).sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, values: [{ v }] }));
  const invByClient = {};
  store.invoices.filter(i => inThisMonth(i.issueDate)).forEach(i => invByClient[i.clientId] = (invByClient[i.clientId] || 0) + (i.amount || 0));
  store.clients.forEach(c => { if (c.monthlyRetainer) invByClient[c.id] = (invByClient[c.id] || 0) + c.monthlyRetainer; });
  const facRows = Object.entries(invByClient).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ label: clientName(id), values: [{ v }] }));

  main.innerHTML = `
    <div class="view-head"><h1>Finanzas</h1><div style="display:flex;gap:8px"><button class="ghost" id="goInv">Facturación</button><button class="ghost" id="goExp">Egresos</button></div></div>
    <div class="view-sub">Vista del mes en curso. Facturación, egresos y utilidad de ${new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}.</div>
    <div class="tiles">
      <div class="tile"><div class="label">Facturado</div><div class="value">${fmtMoney(f.facturado)}</div></div>
      <div class="tile"><div class="label">Cobrado</div><div class="value" style="color:var(--good-text)">${fmtMoney(f.cobrado)}</div></div>
      <div class="tile"><div class="label">Por cobrar</div><div class="value" style="color:${f.porCobrar ? 'var(--warning)' : 'inherit'}">${fmtMoney(f.porCobrar)}</div></div>
      <div class="tile"><div class="label">Egresos</div><div class="value">${fmtMoney(f.egresos)}</div></div>
      <div class="tile"><div class="label">Utilidad neta</div><div class="value" style="color:${f.utilidad >= 0 ? 'var(--good-text)' : 'var(--critical)'}">${fmtMoney(f.utilidad)}</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h2>Ingreso vs. egreso</h2>${barChart([{ label: 'Ingreso', values: [{ v: f.ingreso }] }, { label: 'Egreso', values: [{ v: f.egresos }] }, { label: 'Utilidad', values: [{ v: Math.max(f.utilidad, 0) }] }], [{ name: 'Monto', color: C(1) }])}</div>
      <div class="card"><h2>Egresos por categoría</h2>${barChart(catRows, [{ name: 'Egreso', color: C(3) }])}</div>
      <div class="card"><h2>Facturación por cliente</h2>${barChart(facRows, [{ name: 'Ingreso', color: C(2) }])}</div>
      <div class="card"><h2>Cuentas por cobrar</h2>${arList()}</div>
    </div>
    <div class="card" style="margin-top:4px"><h2>Facturación reciente</h2>${invoiceMiniTable()}</div>`;
  attachTooltips(main);
  $('#goInv').onclick = () => nav('facturacion');
  $('#goExp').onclick = () => nav('egresos');
}
function arList() {
  const pend = store.invoices.filter(i => i.status !== 'pagada').sort((a, b) => (a.dueDate || '') < (b.dueDate || '') ? -1 : 1);
  if (!pend.length) return '<div class="empty">Todo cobrado. 🎉</div>';
  const today = new Date().toISOString().slice(0, 10);
  return `<table><tbody>${pend.map(i => `<tr><td><b>${esc(clientName(i.clientId))}</b><div class="note-cell">${esc(i.concept)}</div></td><td>${i.dueDate ? (i.dueDate < today ? `<span class="pill pausado">vencida</span>` : i.dueDate) : '—'}</td><td class="num">${fmtMoney(i.amount)}</td></tr>`).join('')}</tbody></table>`;
}
function invoiceMiniTable() {
  const rows = store.invoices.slice().sort((a, b) => (b.issueDate || '') < (a.issueDate || '') ? -1 : 1).slice(0, 8);
  if (!rows.length) return '<div class="empty">Sin facturas. Agrégalas en Facturación.</div>';
  return `<table><thead><tr><th>Concepto</th><th>Cliente</th><th>Emisión</th><th class="num">Monto</th><th>Estado</th></tr></thead><tbody>${rows.map(i => `<tr class="row-click" data-id="${i.id}"><td><b>${esc(i.concept)}</b></td><td>${esc(clientName(i.clientId))}</td><td>${esc(i.issueDate || '—')}</td><td class="num">${fmtMoney(i.amount)}</td><td><span class="pill ${i.status === 'pagada' ? 'activo' : i.status === 'vencida' ? 'pausado' : 'pendiente'}">${esc(i.status)}</span></td></tr>`).join('')}</tbody></table>`;
}

// ---------- Uso & Tokens ----------
function usoView() {
  const byAgent = store.agents.map(a => ({ label: a.name, values: [{ v: tokensByAgent(a.id) }] })).filter(r => r.values[0].v > 0);
  const byClient = {};
  usageThisMonth().forEach(u => byClient[u.clientId] = (byClient[u.clientId] || 0) + (u.tokens || 0));
  const clientRows = Object.entries(byClient).sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ label: clientName(id), values: [{ v }] }));
  const total = usageThisMonth().reduce((a, u) => a + (u.tokens || 0), 0);
  const cost = usageThisMonth().reduce((a, u) => a + (u.cost || 0), 0);
  main.innerHTML = `
    <div class="view-head"><h1>Uso &amp; Tokens</h1><button class="primary" id="addBtn">+ Registrar uso</button></div>
    <div class="view-sub">Registra cada sesión/lote de trabajo para saber dónde y cuánto consumes. Filtra por agente y cliente.</div>
    <div class="tiles">
      <div class="tile"><div class="label">Tokens este mes</div><div class="value">${fmtTokens(total)}</div></div>
      <div class="tile"><div class="label">Costo de tokens</div><div class="value">${fmtMoney(cost)}</div></div>
      <div class="tile"><div class="label">Registros</div><div class="value">${usageThisMonth().length}</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h2>Tokens por agente</h2>${barChart(byAgent, [{ name: 'Tokens', color: C(1) }], fmtTokens)}</div>
      <div class="card"><h2>Tokens por cliente</h2>${barChart(clientRows, [{ name: 'Tokens', color: C(2) }], fmtTokens)}</div>
    </div>
    <div class="table-card"><table><thead><tr><th>Fecha</th><th>Agente</th><th>Cliente</th><th class="num">Runs</th><th class="num">Tokens</th><th class="num">Costo</th><th>Notas</th></tr></thead>
      <tbody>${store.usageLog.slice().sort((a, b) => (b.date || '') < (a.date || '') ? -1 : 1).map(u => `<tr class="row-click" data-id="${u.id}"><td>${esc(u.date || '—')}</td><td><b>${esc(store.agents.find(a => a.id === u.agentId)?.name || '?')}</b></td><td>${esc(clientName(u.clientId))}</td><td class="num">${fmtNum(u.runs)}</td><td class="num">${fmtTokens(u.tokens)}</td><td class="num">${fmtMoney(u.cost)}</td><td class="note-cell">${esc(u.notes || '')}</td></tr>`).join('') || `<tr><td colspan="7" class="empty">Sin registros. Agrega uno para empezar a medir.</td></tr>`}</tbody></table></div>`;
  $('#addBtn').onclick = () => openUsageModal();
  main.querySelectorAll('tr.row-click').forEach(tr => tr.onclick = () => openUsageModal(store.usageLog.find(u => u.id === tr.dataset.id)));
  attachTooltips(main);
}
function openUsageModal(item) {
  SCHEMAS.usageLog = SCHEMAS.usageLog || {
    singular: 'uso', collection: 'usageLog',
    fields: () => [
      { k: 'date', label: 'Fecha', type: 'date' },
      { k: 'agentId', label: 'Agente', type: 'select', optionsFn: agentOptions, req: true },
      { k: 'clientId', label: 'Cliente', type: 'select', optionsFn: clientOptions },
      { k: 'runs', label: 'Ejecuciones', type: 'number' },
      { k: 'tokens', label: 'Tokens', type: 'number' },
      { k: 'cost', label: 'Costo ($, si es medido)', type: 'number' },
      { k: 'notes', label: 'Notas', type: 'textarea' },
    ],
  };
  openModal('usageLog', item, item ? undefined : { date: new Date().toISOString().slice(0, 10) });
}

// ---------- Seguimiento (Kanban) ----------
let kanbanFilter = 'todos';
function seguimientoView() {
  const cols = [...store.clients, { id: '', name: 'General / Interno', status: 'activo' }];
  main.innerHTML = `
    <div class="view-head"><h1>Seguimiento</h1><button class="primary" id="addTask">+ Nueva tarea</button></div>
    <div class="view-sub">Tablero por cliente. Arrastra una tarjeta para moverla de cliente. Clic para editar.</div>
    <div class="kanban-controls">
      <label style="font-size:12px;color:var(--muted)">Prioridad:</label>
      <select id="kanFilter" class="kc-tag" style="padding:4px 8px">
        <option value="todos">Todas</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
      </select>
      <span style="font-size:12px;color:var(--muted)">${store.tasks.filter(t => t.status !== 'hecho').length} tareas abiertas</span>
    </div>
    <div class="kanban" id="board">${cols.map(c => kanColumn(c)).join('')}</div>`;
  $('#kanFilter').value = kanbanFilter;
  $('#kanFilter').onchange = e => { kanbanFilter = e.target.value; seguimientoView(); };
  $('#addTask').onclick = () => openTaskModal(null, store.clients[0]?.id || '');
  wireKanban();
}
function kanColumn(c) {
  let tasks = store.tasks.filter(t => t.clientId === c.id);
  if (kanbanFilter !== 'todos') tasks = tasks.filter(t => t.priority === kanbanFilter);
  const order = { alta: 0, media: 1, baja: 2 };
  tasks.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
  const today = new Date().toISOString().slice(0, 10);
  return `<div class="kan-col" data-client="${esc(c.id)}">
    <div class="kan-col-head"><span class="title">${esc(c.name)}</span><span class="count">${tasks.length}</span></div>
    ${tasks.map(t => {
      const overdue = t.status !== 'hecho' && t.dueDate && t.dueDate < today;
      const st = (t.status || 'pendiente').replace(/\s/g, '');
      return `<div class="kan-card ${t.status === 'hecho' ? 'done' : ''} ${overdue ? 'overdue' : ''}" draggable="true" data-id="${t.id}">
        <div class="kc-title"><span class="dot ${t.priority}"></span>${esc(t.title)}</div>
        <div class="kc-meta">
          <span class="kc-tag ${st}">${esc(t.status || 'pendiente')}</span>
          ${t.dueDate ? `<span style="${overdue ? 'color:var(--critical);font-weight:600' : ''}">📅 ${esc(t.dueDate)}</span>` : ''}
          ${t.assigneeId ? `<span class="kc-avatar" title="${esc(memberName(t.assigneeId))}">${esc(initials(memberName(t.assigneeId)))}</span>` : ''}
        </div>${t.notes ? `<div class="note-cell">${esc(t.notes)}</div>` : ''}
      </div>`;
    }).join('')}
    <button class="add-card" data-add="${esc(c.id)}">+ tarea</button>
  </div>`;
}
function wireKanban() {
  let dragId = null;
  main.querySelectorAll('.kan-card').forEach(card => {
    card.addEventListener('dragstart', () => { dragId = card.dataset.id; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', () => openTaskModal(store.tasks.find(t => t.id === card.dataset.id)));
  });
  main.querySelectorAll('.kan-col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.classList.remove('drag-over');
      const t = store.tasks.find(x => x.id === dragId);
      if (t && t.clientId !== col.dataset.client) { t.clientId = col.dataset.client; await saveStore('Tarea movida'); seguimientoView(); }
    });
  });
  main.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openTaskModal(null, b.dataset.add); }));
}
function openTaskModal(item, presetClient) {
  SCHEMAS.tasks = SCHEMAS.tasks || {
    singular: 'tarea', collection: 'tasks',
    fields: () => [
      { k: 'title', label: 'Tarea', type: 'text', req: true },
      { k: 'clientId', label: 'Cliente', type: 'select', optionsFn: clientOptions },
      { k: 'assigneeId', label: 'Responsable', type: 'select', optionsFn: teamOptions },
      { k: 'dueDate', label: 'Fecha límite', type: 'date' },
      { k: 'priority', label: 'Prioridad', type: 'select', options: ['alta', 'media', 'baja'] },
      { k: 'status', label: 'Estado', type: 'select', options: ['pendiente', 'en curso', 'hecho'] },
      { k: 'notes', label: 'Notas', type: 'textarea' },
    ],
  };
  const preset = item ? undefined : { clientId: presetClient || '', priority: 'media', status: 'pendiente' };
  openModal('tasks', item, preset);
}

// ---------- Obsidian ----------
async function obsidianView() {
  main.innerHTML = `<div class="view-head"><h1>Obsidian</h1></div><div class="view-sub">Cargando tu vault…</div>`;
  if (!obsidianCache) obsidianCache = await (await fetch('/api/obsidian/notes')).json();
  const o = obsidianCache;
  if (!o.connected) {
    main.innerHTML = `<div class="view-head"><h1>Obsidian</h1></div><div class="card"><div class="empty">No se encontró el vault en <code>${esc(store.settings.vaultPath)}</code>. Corrige la ruta en Ajustes cuando tu bóveda esté lista.</div></div>`;
    return;
  }
  main.innerHTML = `
    <div class="view-head"><h1>Obsidian</h1></div>
    <div class="view-sub">Vault conectado: <b>${esc(o.vault.split('/').pop())}</b> · ${o.notes.length} nota${o.notes.length === 1 ? '' : 's'}</div>
    <div class="obsidian-layout">
      <div class="card"><input class="search-input" id="noteSearch" placeholder="Buscar notas…"><div class="note-list" id="noteList"></div></div>
      <div class="card"><h2 id="noteTitle">Selecciona una nota</h2><div class="note-content" id="noteContent"></div></div>
    </div>`;
  const renderList = q => {
    const notes = o.notes.filter(n => !q || n.path.toLowerCase().includes(q.toLowerCase()));
    $('#noteList').innerHTML = notes.map(n => `<div class="note-item" data-path="${esc(n.path)}"><div class="name">${esc(n.name)}</div><div class="meta">${esc(n.path)} · ${new Date(n.modified).toLocaleDateString('es-MX')}</div></div>`).join('') || '<div class="empty">Sin resultados.</div>';
    $('#noteList').querySelectorAll('.note-item').forEach(el => el.onclick = async () => {
      $('#noteList').querySelectorAll('.note-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      const note = await (await fetch('/api/obsidian/note?path=' + encodeURIComponent(el.dataset.path))).json();
      $('#noteTitle').textContent = el.dataset.path; $('#noteContent').textContent = note.content || '(vacía)';
    });
  };
  renderList('');
  $('#noteSearch').oninput = e => renderList(e.target.value);
}

// ---------- Ajustes ----------
function ajustesView() {
  const s = store.settings;
  main.innerHTML = `
    <div class="view-head"><h1>Ajustes</h1></div>
    <div class="view-sub">Personaliza Avanzza OS. Todo vive en <code>data/store.json</code> — local, tuyo, exportable.</div>
    <div class="card" style="max-width:560px"><form id="settingsForm" style="display:grid;gap:12px">
      <div class="field"><label>Nombre del negocio</label><input name="businessName" value="${esc(s.businessName)}"></div>
      <div class="field"><label>Moneda (USD, MXN, EUR…)</label><input name="currency" value="${esc(s.currency)}"></div>
      <div class="field"><label>Valor de tu hora (ROI de skills)</label><input name="hourlyRate" type="number" step="any" value="${esc(s.hourlyRate)}"></div>
      <div class="field"><label>Tasa de impuesto % (IVA)</label><input name="taxRate" type="number" step="any" value="${esc(s.taxRate)}"></div>
      <div class="field"><label>Ruta del vault de Obsidian</label><input name="vaultPath" value="${esc(s.vaultPath)}"></div>
      <div class="modal-actions"><button type="submit" class="primary">Guardar ajustes</button></div>
    </form></div>
    <div class="card" style="max-width:560px;margin-top:12px"><h2>Respaldo</h2>
      <p style="color:var(--muted);font-size:13px;margin-bottom:10px">Exporta o importa todos tus datos como JSON.</p>
      <div style="display:flex;gap:8px"><button class="ghost" id="exportBtn2">Exportar JSON</button><button class="ghost" id="importBtn">Importar JSON</button><input type="file" id="importFile" accept=".json" class="hidden"></div>
    </div>`;
  $('#settingsForm').onsubmit = async e => {
    e.preventDefault(); const fd = new FormData(e.target);
    s.businessName = fd.get('businessName'); s.currency = (fd.get('currency') || 'USD').toUpperCase().trim();
    s.hourlyRate = parseFloat(fd.get('hourlyRate')) || 0; s.taxRate = parseFloat(fd.get('taxRate')) || 0;
    s.vaultPath = fd.get('vaultPath').trim(); obsidianCache = null;
    await saveStore('Ajustes guardados');
  };
  $('#exportBtn2').onclick = exportJSON;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { const data = JSON.parse(await file.text()); if (!data.settings) throw new Error('formato inválido'); store = data; await saveStore('Respaldo importado'); render(); }
    catch (err) { toast('Error al importar: ' + err.message); }
  };
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `avanzza-os-${new Date().toISOString().slice(0, 10)}.json`; a.click();
}
$('#exportBtn').onclick = exportJSON;

// ========== COMERCIAL: Productos, Paquetes, Cotizaciones ==========
const servicePrice = sv => (sv.hours || 0) * (sv.hourlyRate || 0);
const serviceById = id => store.services.find(s => s.id === id);
function packageHours(pk) { return (pk.items || []).reduce((a, it) => { const s = serviceById(it.serviceId); return a + (s ? s.hours * (it.qty || 1) : 0); }, 0); }
function packageBase(pk) { return (pk.items || []).reduce((a, it) => { const s = serviceById(it.serviceId); return a + (s ? servicePrice(s) * (it.qty || 1) : 0); }, 0); }
function packagePrice(pk) { return packageBase(pk) * (1 - (pk.discountPct || 0) / 100); }

SCHEMAS.services = {
  title: 'Productos', singular: 'producto', collection: 'services',
  sub: 'Catálogo de servicios que ofreces. El precio se calcula solo: horas de implementación × costo por hora.',
  fields: () => [
    { k: 'name', label: 'Nombre del servicio', type: 'text', req: true },
    { k: 'category', label: 'Categoría', type: 'text' },
    { k: 'description', label: 'Descripción', type: 'text' },
    { k: 'hours', label: 'Tiempo de implementación (horas)', type: 'number' },
    { k: 'hourlyRate', label: 'Costo por hora', type: 'number' },
    { k: 'status', label: 'Estado', type: 'select', options: ['activo', 'ejemplo', 'archivado'] },
    { k: 'notes', label: 'Notas', type: 'textarea' },
  ],
  columns: [
    { label: 'Servicio', render: r => `<b>${esc(r.name)}</b><div class="note-cell">${esc(r.description || '')}</div>` },
    { label: 'Categoría', render: r => esc(r.category || '') },
    { label: 'Horas', num: true, render: r => fmtNum(r.hours) + ' h' },
    { label: 'Costo/hora', num: true, render: r => fmtMoney(r.hourlyRate) },
    { label: 'Precio', num: true, render: r => `<b>${fmtMoney(servicePrice(r))}</b>` },
    { label: 'Estado', render: r => `<span class="pill ${r.status === 'activo' ? 'activo' : 'ejemplo'}">${esc(r.status)}</span>` },
  ],
  tiles: () => [
    ['Servicios en catálogo', store.services.length],
    ['Precio promedio', fmtMoney(store.services.reduce((a, s) => a + servicePrice(s), 0) / (store.services.length || 1))],
    ['Horas promedio', (store.services.reduce((a, s) => a + (s.hours || 0), 0) / (store.services.length || 1)).toFixed(1) + ' h'],
  ],
};

// ---- Paquetes ----
function paquetesView() {
  main.innerHTML = `
    <div class="view-head"><h1>Paquetes</h1><button class="primary" id="addPkg">+ Nuevo paquete</button></div>
    <div class="view-sub">Combos armados a partir de tus productos, con descuento opcional. Clic para editar.</div>
    <div class="card-grid" id="pkgGrid">${store.packages.map(pkgCard).join('') || '<div class="empty">Aún no tienes paquetes.</div>'}</div>`;
  $('#addPkg').onclick = () => openPackageEditor(null);
  main.querySelectorAll('.pkg-card').forEach(c => c.onclick = () => openPackageEditor(store.packages.find(p => p.id === c.dataset.id)));
}
function pkgCard(pk) {
  const base = packageBase(pk), price = packagePrice(pk);
  return `<div class="pkg-card" data-id="${pk.id}">
    <h3>${esc(pk.name)}</h3>
    <div class="desc">${esc(pk.description || '')}</div>
    <ul>${(pk.items || []).map(it => { const s = serviceById(it.serviceId); return s ? `<li>${esc(s.name)}${it.qty > 1 ? ' ×' + it.qty : ''}</li>` : ''; }).join('')}</ul>
    <div class="price">${pk.discountPct ? `<s>${fmtMoney(base)}</s>` : ''}${fmtMoney(price)}</div>
    <div class="desc">${fmtNum(packageHours(pk))} h de implementación${pk.discountPct ? ` · ${pk.discountPct}% desc.` : ''}</div>
  </div>`;
}
function openPackageEditor(pkg) {
  const isNew = !pkg;
  const pk = pkg ? JSON.parse(JSON.stringify(pkg)) : { id: uid('pk'), name: '', description: '', discountPct: 0, status: 'activo', items: [] };
  const svcOpts = store.services.map(s => `<option value="${s.id}">${esc(s.name)} — ${fmtMoney(servicePrice(s))}</option>`).join('');
  function renderRows() {
    return pk.items.map((it, i) => {
      const s = serviceById(it.serviceId);
      return `<tr class="pkline" data-i="${i}">
        <td><select data-f="serviceId">${store.services.map(x => `<option value="${x.id}" ${x.id === it.serviceId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></td>
        <td class="num" style="width:90px"><input class="num" type="number" min="1" step="1" data-f="qty" value="${it.qty || 1}"></td>
        <td class="num line-total">${fmtMoney((s ? servicePrice(s) : 0) * (it.qty || 1))}</td>
        <td><button class="del-row" data-del="${i}">✕</button></td></tr>`;
    }).join('');
  }
  function draw() {
    main.innerHTML = `
      <div class="view-head"><h1>${isNew ? 'Nuevo paquete' : 'Editar paquete'}</h1><button class="ghost" id="back">← Volver</button></div>
      <div class="card">
        <div class="builder-meta">
          <div class="field"><label>Nombre</label><input id="pkName" value="${esc(pk.name)}"></div>
          <div class="field"><label>Descuento %</label><input id="pkDisc" type="number" step="any" value="${esc(pk.discountPct || 0)}"></div>
          <div class="field"><label>Estado</label><select id="pkStatus">${['activo', 'ejemplo', 'archivado'].map(o => `<option ${o === pk.status ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <div class="field" style="margin-bottom:14px"><label>Descripción</label><input id="pkDesc" value="${esc(pk.description || '')}"></div>
        <table class="line-table"><thead><tr><th>Servicio</th><th class="num">Cantidad</th><th class="num">Subtotal</th><th></th></tr></thead>
          <tbody id="pkBody">${renderRows() || '<tr><td colspan="4" class="empty">Agrega servicios al paquete.</td></tr>'}</tbody></table>
        <div class="builder-actions">
          <select id="pkAdd" class="kc-tag" style="padding:7px"><option value="">+ Agregar servicio…</option>${svcOpts}</select>
        </div>
        <div class="totals">
          <div class="row"><span>Suma de servicios</span><span id="pkBase">${fmtMoney(packageBase(pk))}</span></div>
          <div class="row"><span>Descuento (${pk.discountPct || 0}%)</span><span id="pkDiscVal">− ${fmtMoney(packageBase(pk) * (pk.discountPct || 0) / 100)}</span></div>
          <div class="row grand"><span>Precio del paquete</span><span id="pkGrand">${fmtMoney(packagePrice(pk))}</span></div>
          <div class="row"><span>Horas totales</span><span id="pkHours">${fmtNum(packageHours(pk))} h</span></div>
        </div>
        <div class="builder-actions" style="margin-top:18px">
          <button class="primary" id="pkSave">Guardar paquete</button>
          ${!isNew ? '<button class="ghost" id="pkDel">Eliminar</button>' : ''}
        </div>
      </div>`;
    wire();
  }
  function sync() {
    pk.name = $('#pkName').value; pk.description = $('#pkDesc').value;
    pk.discountPct = parseFloat($('#pkDisc').value) || 0; pk.status = $('#pkStatus').value;
    main.querySelectorAll('.pkline').forEach(tr => {
      const it = pk.items[+tr.dataset.i];
      it.serviceId = tr.querySelector('[data-f=serviceId]').value;
      it.qty = parseInt(tr.querySelector('[data-f=qty]').value) || 1;
    });
  }
  function recalc() {
    sync();
    main.querySelectorAll('.pkline').forEach(tr => { const it = pk.items[+tr.dataset.i]; const s = serviceById(it.serviceId); tr.querySelector('.line-total').textContent = fmtMoney((s ? servicePrice(s) : 0) * (it.qty || 1)); });
    $('#pkBase').textContent = fmtMoney(packageBase(pk));
    $('#pkDiscVal').textContent = '− ' + fmtMoney(packageBase(pk) * (pk.discountPct || 0) / 100);
    $('#pkGrand').textContent = fmtMoney(packagePrice(pk));
    $('#pkHours').textContent = fmtNum(packageHours(pk)) + ' h';
  }
  function wire() {
    $('#back').onclick = () => nav('paquetes');
    ['pkName', 'pkDesc', 'pkDisc', 'pkStatus'].forEach(id => $('#' + id).oninput = recalc);
    main.querySelectorAll('.pkline [data-f]').forEach(el => el.oninput = recalc);
    main.querySelectorAll('.pkline [data-f=serviceId]').forEach(el => el.onchange = recalc);
    main.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { sync(); pk.items.splice(+b.dataset.del, 1); draw(); });
    $('#pkAdd').onchange = e => { if (e.target.value) { sync(); pk.items.push({ serviceId: e.target.value, qty: 1 }); draw(); } };
    $('#pkSave').onclick = async () => { sync(); if (isNew) store.packages.push(pk); else store.packages[store.packages.findIndex(p => p.id === pk.id)] = pk; await saveStore('Paquete guardado'); nav('paquetes'); };
    const del = $('#pkDel'); if (del) del.onclick = async () => { if (!confirm('¿Eliminar paquete?')) return; store.packages = store.packages.filter(p => p.id !== pk.id); await saveStore('Eliminado'); nav('paquetes'); };
  }
  draw();
}

// ---- Cotizaciones ----
function quoteTotals(q) {
  const subtotal = (q.items || []).reduce((a, it) => a + (it.hours || 0) * (it.hourlyRate || 0) * (it.qty || 1), 0);
  const discount = subtotal * (q.discountPct || 0) / 100;
  const base = subtotal - discount;
  const tax = base * (q.taxPct || 0) / 100;
  const hours = (q.items || []).reduce((a, it) => a + (it.hours || 0) * (it.qty || 1), 0);
  return { subtotal, discount, base, tax, total: base + tax, hours };
}
function cotizacionesView() {
  const rows = store.quotes.slice().sort((a, b) => (b.date || '') < (a.date || '') ? -1 : 1);
  main.innerHTML = `
    <div class="view-head"><h1>Cotizaciones</h1><button class="primary" id="addQuote">+ Nueva cotización</button></div>
    <div class="view-sub">Arma cotizaciones eligiendo servicios y ajustando horas; el total se calcula solo. Imprime o exporta a PDF para enviar.</div>
    <div class="table-card"><table><thead><tr><th>Cotización</th><th>Cliente</th><th>Fecha</th><th class="num">Total</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(q => { const t = quoteTotals(q); return `<tr class="row-click" data-id="${q.id}"><td><b>${esc(q.title || 'Sin título')}</b><div class="note-cell">${(q.items || []).length} servicio(s) · ${fmtNum(t.hours)} h</div></td><td>${esc(clientName(q.clientId))}</td><td>${esc(q.date || '—')}</td><td class="num"><b>${fmtMoney(t.total)}</b></td><td><span class="pill ${q.status === 'aceptada' ? 'activo' : q.status === 'rechazada' ? 'pausado' : 'pendiente'}">${esc(q.status)}</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Aún no hay cotizaciones.</td></tr>'}</tbody></table></div>`;
  $('#addQuote').onclick = () => openQuoteEditor(null);
  main.querySelectorAll('tr.row-click').forEach(tr => tr.onclick = () => openQuoteEditor(store.quotes.find(q => q.id === tr.dataset.id)));
}
function openQuoteEditor(quote) {
  const isNew = !quote;
  const q = quote ? JSON.parse(JSON.stringify(quote)) : { id: uid('qt'), clientId: store.clients[0]?.id || '', title: '', date: new Date().toISOString().slice(0, 10), validUntil: '', status: 'borrador', discountPct: 0, taxPct: store.settings.taxRate || 0, notes: '', items: [] };
  const svcOpts = extra => `<option value="">— servicio —</option>` + store.services.map(s => `<option value="${s.id}" ${extra === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  function rowHtml(it, i) {
    const lt = (it.hours || 0) * (it.hourlyRate || 0) * (it.qty || 1);
    return `<tr class="qline" data-i="${i}">
      <td style="min-width:150px"><select data-f="serviceId">${svcOpts(it.serviceId)}</select></td>
      <td><input data-f="description" value="${esc(it.description || '')}"></td>
      <td class="num"><input class="num w-h" type="number" step="any" data-f="hours" value="${esc(it.hours || 0)}"></td>
      <td class="num"><input class="num w-h" type="number" step="any" data-f="hourlyRate" value="${esc(it.hourlyRate || 0)}"></td>
      <td class="num"><input class="num w-h" type="number" step="1" data-f="qty" value="${it.qty || 1}"></td>
      <td class="num line-total">${fmtMoney(lt)}</td>
      <td><button class="del-row" data-del="${i}">✕</button></td></tr>`;
  }
  function draw() {
    const t = quoteTotals(q);
    main.innerHTML = `
      <div class="view-head"><h1>${isNew ? 'Nueva cotización' : 'Editar cotización'}</h1>
        <div style="display:flex;gap:8px"><button class="ghost no-print" id="qPrint">Imprimir / PDF</button><button class="ghost no-print" id="back">← Volver</button></div></div>
      <div class="card">
        <div class="print-only" style="margin-bottom:12px"><h2 style="font-size:20px">${esc(store.settings.businessName || 'Avanzza')}</h2><div class="desc">Cotización</div></div>
        <div class="builder-meta">
          <div class="field"><label>Cliente</label><select id="qClient">${clientOptions().map(o => `<option value="${o.value}" ${o.value === q.clientId ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Título</label><input id="qTitle" value="${esc(q.title)}"></div>
          <div class="field"><label>Fecha</label><input id="qDate" type="date" value="${esc(q.date)}"></div>
          <div class="field"><label>Válida hasta</label><input id="qValid" type="date" value="${esc(q.validUntil || '')}"></div>
          <div class="field"><label>Estado</label><select id="qStatus">${['borrador', 'enviada', 'aceptada', 'rechazada'].map(o => `<option ${o === q.status ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <table class="line-table"><thead><tr><th>Servicio</th><th>Descripción</th><th class="num">Horas</th><th class="num">$/hora</th><th class="num">Cant.</th><th class="num">Importe</th><th class="no-print"></th></tr></thead>
          <tbody id="qBody">${q.items.map(rowHtml).join('') || '<tr><td colspan="7" class="empty">Agrega servicios abajo.</td></tr>'}</tbody></table>
        <div class="builder-actions no-print">
          <select id="qAddSvc" class="kc-tag" style="padding:7px"><option value="">+ Agregar servicio…</option>${store.services.map(s => `<option value="${s.id}">${esc(s.name)} — ${fmtNum(s.hours)}h</option>`).join('')}</select>
          <select id="qAddPkg" class="kc-tag" style="padding:7px"><option value="">+ Agregar paquete…</option>${store.packages.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
          <button class="ghost" id="qAddBlank">+ Línea vacía</button>
        </div>
        <div class="totals">
          <div class="row"><span>Subtotal</span><span id="qSub">${fmtMoney(t.subtotal)}</span></div>
          <div class="row"><span>Descuento <input id="qDisc" type="number" step="any" value="${esc(q.discountPct || 0)}">%</span><span id="qDiscVal">− ${fmtMoney(t.discount)}</span></div>
          <div class="row"><span>IVA <input id="qTax" type="number" step="any" value="${esc(q.taxPct || 0)}">%</span><span id="qTaxVal">${fmtMoney(t.tax)}</span></div>
          <div class="row grand"><span>Total</span><span id="qGrand">${fmtMoney(t.total)}</span></div>
          <div class="row"><span>Horas totales</span><span id="qHours">${fmtNum(t.hours)} h</span></div>
        </div>
        <div class="field" style="margin-top:14px"><label>Notas / condiciones</label><textarea id="qNotes">${esc(q.notes || '')}</textarea></div>
        <div class="builder-actions no-print" style="margin-top:14px">
          <button class="primary" id="qSave">Guardar cotización</button>
          ${!isNew ? '<button class="ghost" id="qDel">Eliminar</button>' : ''}
        </div>
      </div>`;
    wire();
  }
  function sync() {
    q.clientId = $('#qClient').value; q.title = $('#qTitle').value; q.date = $('#qDate').value;
    q.validUntil = $('#qValid').value; q.status = $('#qStatus').value; q.notes = $('#qNotes').value;
    q.discountPct = parseFloat($('#qDisc').value) || 0; q.taxPct = parseFloat($('#qTax').value) || 0;
    main.querySelectorAll('.qline').forEach(tr => {
      const it = q.items[+tr.dataset.i];
      it.serviceId = tr.querySelector('[data-f=serviceId]').value;
      it.description = tr.querySelector('[data-f=description]').value;
      it.hours = parseFloat(tr.querySelector('[data-f=hours]').value) || 0;
      it.hourlyRate = parseFloat(tr.querySelector('[data-f=hourlyRate]').value) || 0;
      it.qty = parseInt(tr.querySelector('[data-f=qty]').value) || 1;
    });
  }
  function recalc() {
    sync();
    main.querySelectorAll('.qline').forEach(tr => { const it = q.items[+tr.dataset.i]; tr.querySelector('.line-total').textContent = fmtMoney((it.hours || 0) * (it.hourlyRate || 0) * (it.qty || 1)); });
    const t = quoteTotals(q);
    $('#qSub').textContent = fmtMoney(t.subtotal); $('#qDiscVal').textContent = '− ' + fmtMoney(t.discount);
    $('#qTaxVal').textContent = fmtMoney(t.tax); $('#qGrand').textContent = fmtMoney(t.total); $('#qHours').textContent = fmtNum(t.hours) + ' h';
  }
  function wire() {
    $('#back').onclick = () => nav('cotizaciones');
    $('#qPrint').onclick = () => { sync(); window.print(); };
    ['qClient', 'qTitle', 'qDate', 'qValid', 'qStatus', 'qDisc', 'qTax', 'qNotes'].forEach(id => { const el = $('#' + id); if (el) el.oninput = recalc; });
    main.querySelectorAll('.qline [data-f]').forEach(el => el.oninput = recalc);
    main.querySelectorAll('.qline [data-f=serviceId]').forEach(el => el.onchange = e => {
      sync(); const it = q.items[+e.target.closest('.qline').dataset.i]; const s = serviceById(e.target.value);
      if (s) { it.description = s.name; it.hours = s.hours; it.hourlyRate = s.hourlyRate; } draw();
    });
    main.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { sync(); q.items.splice(+b.dataset.del, 1); draw(); });
    $('#qAddSvc').onchange = e => { if (e.target.value) { sync(); const s = serviceById(e.target.value); q.items.push({ serviceId: s.id, description: s.name, hours: s.hours, hourlyRate: s.hourlyRate, qty: 1 }); draw(); } };
    $('#qAddPkg').onchange = e => { if (e.target.value) { sync(); const p = store.packages.find(x => x.id === e.target.value); (p.items || []).forEach(it => { const s = serviceById(it.serviceId); if (s) q.items.push({ serviceId: s.id, description: s.name, hours: s.hours, hourlyRate: s.hourlyRate, qty: it.qty || 1 }); }); draw(); } };
    $('#qAddBlank').onclick = () => { sync(); q.items.push({ serviceId: '', description: '', hours: 0, hourlyRate: store.settings.hourlyRate || 0, qty: 1 }); draw(); };
    $('#qSave').onclick = async () => { sync(); if (isNew) store.quotes.push(q); else store.quotes[store.quotes.findIndex(x => x.id === q.id)] = q; await saveStore('Cotización guardada'); nav('cotizaciones'); };
    const del = $('#qDel'); if (del) del.onclick = async () => { if (!confirm('¿Eliminar cotización?')) return; store.quotes = store.quotes.filter(x => x.id !== q.id); await saveStore('Eliminado'); nav('cotizaciones'); };
  }
  draw();
}

// ---------- navegación ----------
const VIEWS = {
  resumen: resumenView, finanzas: finanzasView,
  clientes: () => tableView('clients'), seguimiento: seguimientoView, proyectos: () => tableView('projects'),
  productos: () => tableView('services'), paquetes: paquetesView, cotizaciones: cotizacionesView,
  agentes: () => tableView('agents'), uso: usoView, suscripciones: () => tableView('subscriptions'),
  skills: () => tableView('skills'), conexiones: () => tableView('connections'),
  facturacion: () => tableView('invoices'), egresos: () => tableView('expenses'),
  obsidian: obsidianView, equipo: () => tableView('team'), ajustes: ajustesView,
};
function render() { (VIEWS[currentView] || resumenView)(); }
function nav(view) {
  currentView = view;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  render();
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) nav(b.dataset.view); });

// ---------- autenticación ----------
let currentUser = null;
let authInfo = { authEnabled: false, users: [], lastEdit: {} };

async function fetchMe() {
  try { authInfo = await (await fetch('/api/me')).json(); currentUser = authInfo.user; }
  catch (e) { authInfo = { authEnabled: false, users: [], lastEdit: {} }; currentUser = 'Local'; }
}
function showLogin() {
  const sel = $('#authUser');
  sel.innerHTML = (authInfo.users || []).map(u => `<option value="${esc(u)}">${esc(u)}</option>`).join('');
  $('#authWrap').classList.remove('hidden');
  $('#authPass').value = '';
  setTimeout(() => $('#authPass').focus(), 50);
}
$('#authForm').onsubmit = async e => {
  e.preventDefault();
  const err = $('#authError'); err.classList.add('hidden');
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: $('#authUser').value, password: $('#authPass').value }) });
  if (!r.ok) { const d = await r.json().catch(() => ({})); err.textContent = d.error || 'No se pudo iniciar sesión'; err.classList.remove('hidden'); return; }
  const d = await r.json();
  currentUser = d.user;
  $('#authWrap').classList.add('hidden');
  await boot();
};
$('#logoutBtn').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.reload(); };

function updateUserBox() {
  if (!authInfo.authEnabled) { $('#userBox').classList.add('hidden'); return; }
  $('#userBox').classList.remove('hidden');
  $('#userName').textContent = currentUser;
  $('#userAvatar').textContent = initials(currentUser);
  const le = authInfo.lastEdit || {};
  $('#lastEdit').textContent = le.updatedBy ? `Última edición: ${le.updatedBy}${le.updatedAt ? ' · ' + new Date(le.updatedAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}` : '';
}

// ---------- arranque ----------
async function boot() {
  await fetchMe();
  if (authInfo.authEnabled && !currentUser) { showLogin(); return; }
  await loadStore();
  updateUserBox();
  render();
}
boot();
