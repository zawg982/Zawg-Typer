/* main.js — ZWX Designer core
   Features:
   - DOM element creation (rect, circle, text, image, polygon, path)
   - Drag, resize (8 handles), rotate
   - Properties sync and editing
   - Layers list, rename, lock, visibility
   - Clipboard: copy/cut/paste, duplicate, delete
   - Undo/Redo (simple stack)
   - Save/Load (localStorage)
   - Export / Preview to new tab (actual HTML/CSS)
   - Grid toggle and snap-to-grid
*/

// --- Utilities ---
const $$ = (s, el = document) => el.querySelector(s);
const $all = (s, el = document) => Array.from((el || document).querySelectorAll(s));
const uid = (p = 'el') => p + '_' + Math.random().toString(36).slice(2, 9);

// state
const state = {
  elements: [],
  selected: null,
  clipboard: null,
  undoStack: [],
  redoStack: [],
  grid: false,
  snap: false
};

// DOM refs
const workspace = $$('#workspace');
const gridEl = $$('#grid');
const layersEl = $$('#layers');
const status = $$('#status');
const elCount = $$('#elCount');
const snapToggle = $$('#snapToggle');
const gridToggle = $$('#gridToggle');

// initial bindings
document.addEventListener('DOMContentLoaded', init);

// ---------- init ----------
function init() {
  bindToolButtons();
  bindTopButtons();
  bindQuickActions();
  bindProperties();
  bindKeyboardShortcuts();
  resizeWorkspace();
  window.addEventListener('resize', resizeWorkspace);
  renderLayers();
  updateStatus();
}

// ---------- UI Bindings ----------
function bindToolButtons() {
  $all('.tool').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tool;
      if (!t) return;
      setActiveTool(t);
    });
  });

  gridToggle.addEventListener('click', () => {
    state.grid = !state.grid;
    gridEl.style.display = state.grid ? 'block' : 'none';
    gridToggle.textContent = state.grid ? 'Grid: On' : 'Grid: Off';
  });

  snapToggle.addEventListener('click', () => {
    state.snap = !state.snap;
    snapToggle.textContent = state.snap ? 'Snap: On' : 'Snap: Off';
  });
}

function bindTopButtons(){
  $$('#previewBtn').addEventListener('click', preview);
  $$('#exportBtn').addEventListener('click', exportHTML);
  $$('#saveBtn').addEventListener('click', saveLocal);
  $$('#loadBtn').addEventListener('click', loadLocal);
  $$('#undoBtn').addEventListener('click', undo);
  $$('#redoBtn').addEventListener('click', redo);
}

function bindQuickActions(){
  $$('#duplicateBtn').addEventListener('click', duplicateSelected);
  $$('#deleteBtn').addEventListener('click', deleteSelected);
  $$('#bringFwd').addEventListener('click', () => changeZ(1));
  $$('#sendBack').addEventListener('click', () => changeZ(-1));
}

// properties panel apply
function bindProperties(){
  $$('#applyProps').addEventListener('click', () => {
    if (!state.selected) return;
    const elObj = findById(state.selected);
    if (!elObj) return;
    applyPropsToElement(elObj);
    pushUndo();
    refreshElement(elObj);
  });

  $$('#lockToggle').addEventListener('click', () => {
    if (!state.selected) return;
    const elObj = findById(state.selected);
    if (!elObj) return;
    elObj.locked = !elObj.locked;
    refreshElement(elObj);
    renderLayers();
  });
}

// keyboard
function bindKeyboardShortcuts(){
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelected(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'x') { e.preventDefault(); cutSelected(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteClipboard(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'shift')) { /* pass */ }
    if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }

    // arrow nudging
    if (state.selected && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();
      const el = findById(state.selected);
      if (!el || el.locked) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') el.y -= step;
      if (e.key === 'ArrowDown') el.y += step;
      if (e.key === 'ArrowLeft') el.x -= step;
      if (e.key === 'ArrowRight') el.x += step;
      snapIfNeeded(el);
      refreshElement(el);
    }
  });
}

// ---------- Tools & element creation ----------
let activeTool = 'select';
function setActiveTool(t){
  activeTool = t;
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  if (t !== 'select') workspace.style.cursor = 'crosshair';
  else workspace.style.cursor = 'default';
}

function createElement(type, options = {}) {
  const id = uid(type);
  const elObj = {
    id, type,
    x: options.x || 60,
    y: options.y || 60,
    w: options.w || (type === 'text' ? 160 : 120),
    h: options.h || (type === 'text' ? 40 : 80),
    rotation: options.rotation || 0,
    fill: options.fill || '#6dd3ff',
    stroke: options.stroke || '#072233',
    strokeW: options.strokeW === undefined ? 2 : options.strokeW,
    opacity: options.opacity === undefined ? 1 : options.opacity,
    locked: false,
    visible: true,
    meta: {}
  };

  // type specific
  if (type === 'text') { elObj.meta.text = options.text || 'Double-click to edit'; elObj.meta.fontSize = options.fontSize || 18; elObj.meta.font = options.font || 'Arial'; elObj.fill = options.fill || '#071226'; }
  if (type === 'image') { elObj.meta.src = options.src || 'https://via.placeholder.com/300x200.png?text=Image'; }
  if (type === 'polygon') { elObj.meta.sides = options.sides || 5; elObj.meta.radius = options.radius || Math.min(elObj.w, elObj.h) / 2; }
  if (type === 'path') { elObj.meta.points = options.points || []; elObj.meta.closed = options.closed || true; }

  state.elements.push(elObj);
  pushUndo();
  renderElement(elObj);
  selectElement(id);
  renderLayers();
  updateStatus();
  return elObj;
}

// ---------- DOM render & interactivity ----------
function renderElement(obj) {
  // remove if exists
  let existing = $(`#${obj.id}`, workspace);
  if (existing) existing.remove();

  // wrapper
  const elWrap = document.createElement('div');
  elWrap.className = 'el';
  elWrap.id = obj.id;
  elWrap.style.left = obj.x + 'px';
  elWrap.style.top = obj.y + 'px';
  elWrap.style.width = (obj.w || 100) + 'px';
  elWrap.style.height = (obj.h || 60) + 'px';
  elWrap.style.opacity = obj.opacity;
  elWrap.style.transform = `rotate(${obj.rotation}deg)`;
  elWrap.dataset.type = obj.type;
  if (!obj.visible) elWrap.style.display = 'none';

  // content
  if (obj.type === 'rect') {
    elWrap.style.background = obj.fill;
    elWrap.style.border = `${obj.strokeW}px solid ${obj.stroke}`;
  } else if (obj.type === 'circle') {
    elWrap.style.borderRadius = '50%';
    elWrap.style.background = obj.fill;
    elWrap.style.border = `${obj.strokeW}px solid ${obj.stroke}`;
  } else if (obj.type === 'text') {
    elWrap.style.background = 'transparent';
    elWrap.style.border = `${obj.strokeW}px solid ${obj.stroke}`;
    const t = document.createElement('div');
    t.className = 'label';
    t.contentEditable = true;
    t.innerText = obj.meta.text || 'Text';
    t.style.fontSize = (obj.meta.fontSize || 16) + 'px';
    t.style.fontFamily = obj.meta.font || 'Arial';
    t.style.textAlign = obj.meta.align || 'left';
    t.style.color = obj.fill;
    t.addEventListener('input', (ev) => {
      obj.meta.text = ev.target.innerText;
      pushUndo();
    });
    elWrap.appendChild(t);
  } else if (obj.type === 'image') {
    elWrap.style.background = '#111';
    elWrap.style.border = `${obj.strokeW}px solid ${obj.stroke}`;
    const img = document.createElement('img');
    img.className = 'img';
    img.src = obj.meta.src;
    img.alt = 'image';
    elWrap.appendChild(img);
  } else if (obj.type === 'polygon' || obj.type === 'path') {
    // create svg inside element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${obj.w} ${obj.h}`);
    const shape = document.createElementNS(svgNS, obj.type === 'polygon' ? 'polygon' : 'polyline');
    if (obj.type === 'polygon'){
      const pts = polygonPoints(obj.meta.sides || 5, obj.w, obj.h, obj.meta.radius || Math.min(obj.w,obj.h)/2);
      shape.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
      shape.setAttribute('fill', obj.fill);
      shape.setAttribute('stroke', obj.stroke);
      shape.setAttribute('stroke-width', obj.strokeW);
    } else {
      const pts = (obj.meta.points || []).map(p => `${p.x},${p.y}`).join(' ');
      shape.setAttribute('points', pts);
      shape.setAttribute('fill', obj.meta.closed ? obj.fill : 'none');
      shape.setAttribute('stroke', obj.stroke);
      shape.setAttribute('stroke-width', obj.strokeW);
      shape.setAttribute('fill-rule','nonzero');
    }
    svg.appendChild(shape);
    elWrap.appendChild(svg);
  }

  // selection handles
  const handles = ['nw','n','ne','e','se','s','sw','w'];
  handles.forEach(h => {
    const d = document.createElement('div');
    d.className = 'handle ' + h;
    d.dataset.dir = h;
    elWrap.appendChild(d);
  });
  const rot = document.createElement('div');
  rot.className = 'rotate-handle';
  elWrap.appendChild(rot);

  // attach behaviors
  workspace.appendChild(elWrap);
  attachElementEvents(elWrap, obj);
}

// attach events for an element DOM
function attachElementEvents(elWrap, obj){
  // click/selection
  elWrap.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    if (obj.locked) return;
    selectElement(obj.id);
    if (activeTool !== 'select') {
      // if a creation tool was active, ignore drag select
      return;
    }
    startDrag(e, elWrap, obj);
  });

  // double-click for editing text images
  elWrap.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (obj.type === 'text') {
      const label = elWrap.querySelector('.label');
      if (label) label.focus();
    } else if (obj.type === 'image') {
      const url = prompt('Image URL', obj.meta.src);
      if (url) { obj.meta.src = url; renderElement(obj); pushUndo(); }
    }
  });

  // handle resize handles
  const hs = elWrap.querySelectorAll('.handle');
  hs.forEach(h => {
    h.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (obj.locked) return;
      startResize(ev, elWrap, obj, h.dataset.dir);
    });
  });

  // rotation
  const rot = elWrap.querySelector('.rotate-handle');
  if (rot) {
    rot.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (obj.locked) return;
      startRotate(ev, elWrap, obj);
    });
  }
}

// helpers: find object by id
function findById(id){ return state.elements.find(s => s.id === id); }

// clear and re-render all elements
function refreshAll(){
  workspace.querySelectorAll('.el').forEach(n => n.remove());
  state.elements.forEach(e => renderElement(e));
  renderLayers();
  updateStatus();
}

function refreshElement(elObj){
  const dom = $(`#${elObj.id}`, workspace);
  if (!dom) { renderElement(elObj); return; }
  dom.style.left = elObj.x + 'px';
  dom.style.top = elObj.y + 'px';
  dom.style.width = elObj.w + 'px';
  dom.style.height = elObj.h + 'px';
  dom.style.transform = `rotate(${elObj.rotation}deg)`;
  dom.style.opacity = elObj.opacity;
  dom.style.display = elObj.visible ? 'block' : 'none';
  if (elObj.type === 'rect' || elObj.type === 'circle') {
    dom.style.background = elObj.fill;
    dom.style.border = `${elObj.strokeW}px solid ${elObj.stroke}`;
  }
  if (elObj.type === 'image') {
    const img = dom.querySelector('img');
    if (img) img.src = elObj.meta.src;
    dom.style.border = `${elObj.strokeW}px solid ${elObj.stroke}`;
  }
  if (elObj.type === 'text') {
    const label = dom.querySelector('.label');
    if (label) {
      label.innerText = elObj.meta.text;
      label.style.fontSize = (elObj.meta.fontSize || 16) + 'px';
      label.style.fontFamily = elObj.meta.font || 'Arial';
      label.style.color = elObj.fill;
    }
    dom.style.border = `${elObj.strokeW}px solid ${elObj.stroke}`;
  }
  if (elObj.type === 'polygon' || elObj.type === 'path') {
    const svg = dom.querySelector('svg');
    if (svg) {
      const shape = svg.querySelector(obj.type === 'polygon' ? 'polygon' : 'polyline');
      // re-render path/polygon
      svg.innerHTML = '';
      const svgNS = "http://www.w3.org/2000/svg";
      const s = document.createElementNS(svgNS, elObj.type === 'polygon' ? 'polygon' : 'polyline');
      if (elObj.type === 'polygon') {
        const pts = polygonPoints(elObj.meta.sides || 5, elObj.w, elObj.h, elObj.meta.radius || Math.min(elObj.w, elObj.h)/2);
        s.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
        s.setAttribute('fill', elObj.fill);
      } else {
        const pts = (elObj.meta.points || []).map(p => `${p.x},${p.y}`).join(' ');
        s.setAttribute('points', pts);
        s.setAttribute('fill', elObj.meta.closed ? elObj.fill : 'none');
      }
      s.setAttribute('stroke', elObj.stroke);
      s.setAttribute('stroke-width', elObj.strokeW);
      svg.appendChild(s);
    }
  }
  // selection class
  dom.classList.toggle('selected', state.selected === elObj.id);
}

// ---------- Selection ----------
workspace.addEventListener('mousedown', (e) => {
  // deselect if click on empty space
  if (e.target === workspace || e.target.id === 'grid') {
    selectElement(null);
  }

  // if active tool is creation, create element where clicked
  if (activeTool !== 'select') {
    const rect = workspace.getBoundingClientRect();
    const x = e.clientX - rect.left + workspace.scrollLeft;
    const y = e.clientY - rect.top + workspace.scrollTop;
    if (activeTool === 'rect') createElement('rect', { x, y});
    if (activeTool === 'circle') createElement('circle', { x, y});
    if (activeTool === 'text') createElement('text', { x, y});
    if (activeTool === 'image') createElement('image', { x, y});
    if (activeTool === 'polygon') {
      const sides = parseInt(prompt('Polygon sides', '5')) || 5;
      createElement('polygon', { x, y, w:120, h:120, sides, radius:50 });
    }
    if (activeTool === 'path') {
      const points = prompt('Enter points as x,y x,y ...', '10,10 110,40 60,110');
      const pts = (points || '').split(/\s+/).map(p => {
        const [px,py] = p.split(',');
        return { x: parseFloat(px)||0, y: parseFloat(py)||0 };
      });
      createElement('path', { x, y, w:120, h:120, points: pts, closed: true });
    }
    setActiveTool('select');
  }
});

function selectElement(id) {
  state.selected = id;
  // toggle classes
  $all('.el').forEach(n => n.classList.toggle('selected', n.id === id));
  // show props
  if (!id) {
    $$('#propId').value = '';
    $$('#propType').value = '';
    $$('#textControls').style.display = 'none';
    $$('#polygonControls').style.display = 'none';
    status.textContent = 'No selection';
  } else {
    const el = findById(id);
    if (!el) return;
    $$('#propId').value = el.id;
    $$('#propType').value = el.type;
    $$('#propX').value = Math.round(el.x);
    $$('#propY').value = Math.round(el.y);
    $$('#propW').value = Math.round(el.w);
    $$('#propH').value = Math.round(el.h);
    $$('#propRot').value = Math.round(el.rotation);
    $$('#propFill').value = toHex(el.fill);
    $$('#propStroke').value = toHex(el.stroke);
    $$('#propStrokeW').value = el.strokeW;
    $$('#propOpacity').value = el.opacity;
    // extra controls
    if (el.type === 'text') {
      $$('#textControls').style.display = 'flex';
      $$('#propFont').value = el.meta.font || 'Arial';
      $$('#propFontSize').value = el.meta.fontSize || 16;
      $$('#propTextAlign').value = el.meta.align || 'left';
    } else $$('#textControls').style.display = 'none';
    if (el.type === 'polygon') {
      $$('#polygonControls').style.display = 'flex';
      $$('#propSides').value = el.meta.sides || 5;
      $$('#propRadius').value = el.meta.radius || Math.min(el.w, el.h) / 2;
    } else $$('#polygonControls').style.display = 'none';
    status.textContent = `Selected: ${el.id} (${el.type})`;
  }
  renderLayers();
}

function updateStatus(){
  elCount.textContent = state.elements.length;
}

// ---------- Drag/Resize/Rotate implementations ----------
function startDrag(e, dom, obj) {
  e.preventDefault();
  if (obj.locked) return;
  const rect = workspace.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const origX = obj.x;
  const origY = obj.y;

  function move(ev){
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    obj.x = origX + dx;
    obj.y = origY + dy;
    snapIfNeeded(obj);
    refreshElement(obj);
  }
  function up(){
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    pushUndo();
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function startResize(e, dom, obj, dir) {
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  const orig = { x: obj.x, y: obj.y, w: obj.w, h: obj.h, rot: obj.rotation };

  function move(ev){
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
    if (dir.includes('e')) nw = Math.max(10, orig.w + dx);
    if (dir.includes('s')) nh = Math.max(10, orig.h + dy);
    if (dir.includes('w')) { nw = Math.max(10, orig.w - dx); nx = orig.x + dx; }
    if (dir.includes('n')) { nh = Math.max(10, orig.h - dy); ny = orig.y + dy; }
    obj.x = nx; obj.y = ny; obj.w = nw; obj.h = nh;
    if (obj.type === 'polygon') obj.meta.radius = Math.min(nw, nh)/2;
    snapIfNeeded(obj);
    refreshElement(obj);
    selectElement(obj.id);
  }
  function up(){
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    pushUndo();
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function startRotate(e, dom, obj) {
  e.preventDefault();
  const rect = dom.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180/Math.PI;
  const origRot = obj.rotation;
  function move(ev){
    const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180/Math.PI;
    const delta = angle - startAngle;
    obj.rotation = Math.round(origRot + delta);
    refreshElement(obj);
    selectElement(obj.id);
  }
  function up(){
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    pushUndo();
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// snapping
function snapIfNeeded(obj) {
  if (!state.snap) return;
  const grid = 10;
  obj.x = Math.round(obj.x / grid) * grid;
  obj.y = Math.round(obj.y / grid) * grid;
  obj.w = Math.round(obj.w / grid) * grid;
  obj.h = Math.round(obj.h / grid) * grid;
}

// ---------- Layers UI ----------
function renderLayers(){
  layersEl.innerHTML = '';
  // topmost last -> display reversed so top displays first
  const reversed = state.elements.slice().reverse();
  reversed.forEach((elObj) => {
    const item = document.createElement('div');
    item.className = 'layer-item';
    if (state.selected === elObj.id) item.style.background = 'rgba(109,211,255,0.04)';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = elObj.id;
    const eye = document.createElement('button');
    eye.className = 'eye';
    eye.textContent = elObj.visible ? '👁' : '🚫';
    eye.title = 'Toggle visibility';
    eye.addEventListener('click', (ev) => {
      ev.stopPropagation();
      elObj.visible = !elObj.visible;
      refreshElement(elObj);
      renderLayers();
    });
    const lockBtn = document.createElement('button'); lockBtn.textContent = elObj.locked ? '🔒' : '🔓';
    lockBtn.title = 'Lock/Unlock';
    lockBtn.addEventListener('click', (ev) => { ev.stopPropagation(); elObj.locked = !elObj.locked; refreshElement(elObj); renderLayers(); });
    item.appendChild(name); item.appendChild(eye); item.appendChild(lockBtn);
    item.addEventListener('click', () => selectElement(elObj.id));
    layersEl.appendChild(item);
  });
}

// ---------- Properties apply ----------
function applyPropsToElement(elObj){
  elObj.x = parseFloat($$('#propX').value) || elObj.x;
  elObj.y = parseFloat($$('#propY').value) || elObj.y;
  elObj.w = parseFloat($$('#propW').value) || elObj.w;
  elObj.h = parseFloat($$('#propH').value) || elObj.h;
  elObj.rotation = parseFloat($$('#propRot').value) || elObj.rotation;
  elObj.fill = $$('#propFill').value || elObj.fill;
  elObj.stroke = $$('#propStroke').value || elObj.stroke;
  elObj.strokeW = parseFloat($$('#propStrokeW').value) || elObj.strokeW;
  elObj.opacity = parseFloat($$('#propOpacity').value) || elObj.opacity;
  if (elObj.type === 'text') {
    elObj.meta.font = $$('#propFont').value || elObj.meta.font;
    elObj.meta.fontSize = parseInt($$('#propFontSize').value) || elObj.meta.fontSize;
    elObj.meta.align = $$('#propTextAlign').value;
    const dom = $(`#${elObj.id}`, workspace);
    if (dom) {
      const label = dom.querySelector('.label'); if (label) { label.style.fontSize = elObj.meta.fontSize + 'px'; label.style.fontFamily = elObj.meta.font; label.style.textAlign = elObj.meta.align; }
    }
  }
  if (elObj.type === 'polygon') {
    elObj.meta.sides = parseInt($$('#propSides').value) || elObj.meta.sides;
    elObj.meta.radius = parseFloat($$('#propRadius').value) || elObj.meta.radius;
  }
  refreshElement(elObj);
}

// ---------- Clipboard / Duplicate / Delete ----------
function copySelected(){
  if (!state.selected) return;
  const s = findById(state.selected);
  state.clipboard = JSON.parse(JSON.stringify(s));
  notify('Copied');
}
function cutSelected(){
  if (!state.selected) return;
  copySelected();
  deleteSelected();
}
function pasteClipboard(){
  if (!state.clipboard) return;
  const c = JSON.parse(JSON.stringify(state.clipboard));
  c.id = uid(c.type);
  c.x += 20; c.y += 20;
  state.elements.push(c);
  renderElement(c);
  pushUndo();
  selectElement(c.id);
}
function duplicateSelected(){
  if (!state.selected) return;
  const s = findById(state.selected);
  const copy = JSON.parse(JSON.stringify(s));
  copy.id = uid(copy.type);
  copy.x += 20; copy.y += 20;
  state.elements.push(copy);
  renderElement(copy);
  pushUndo();
  selectElement(copy.id);
}
function deleteSelected(){
  if (!state.selected) return;
  const id = state.selected;
  state.elements = state.elements.filter(e => e.id !== id);
  const dom = $(`#${id}`, workspace);
  if (dom) dom.remove();
  state.selected = null;
  renderLayers();
  updateStatus();
  pushUndo();
}

// z order change
function changeZ(dir){
  if (!state.selected) return;
  const idx = state.elements.findIndex(e => e.id === state.selected);
  if (idx < 0) return;
  const newIdx = Math.min(Math.max(0, idx + dir), state.elements.length - 1);
  const [item] = state.elements.splice(idx,1);
  state.elements.splice(newIdx,0,item);
  refreshAll();
  pushUndo();
}

// ---------- Undo / Redo ----------
function pushUndo(){
  const snapshot = JSON.stringify(state.elements);
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 50) state.undoStack.shift();
  // clear redo
  state.redoStack = [];
}
function undo(){
  if (!state.undoStack.length) return;
  const last = state.undoStack.pop();
  state.redoStack.push(JSON.stringify(state.elements));
  state.elements = JSON.parse(last);
  refreshAll();
}
function redo(){
  if (!state.redoStack.length) return;
  const next = state.redoStack.pop();
  state.undoStack.push(JSON.stringify(state.elements));
  state.elements = JSON.parse(next);
  refreshAll();
}

// ---------- Save/Load ----------
function saveLocal(){
  localStorage.setItem('zwx_design', JSON.stringify(state.elements));
  notify('Saved to localStorage');
}
function loadLocal(){
  const raw = localStorage.getItem('zwx_design');
  if (!raw) { notify('No saved design'); return; }
  try {
    state.elements = JSON.parse(raw);
    refreshAll();
    notify('Loaded design');
  } catch(e){ notify('Load failed'); }
}

// ---------- Export & Preview ----------
function exportHTML(){
  const html = generateExportHTML();
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  // download
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zwx-export.html';
  a.click();
  URL.revokeObjectURL(url);
}
function preview(){
  const html = generateExportHTML();
  const w = window.open();
  w.document.write(html);
  w.document.close();
}

function generateExportHTML(){
  // simple exported HTML with absolute positioning inside container
  const containerStyles = `position:relative;width:1000px;height:700px;background:#fff;border:1px solid #ddd;overflow:hidden;`;
  const elHtml = state.elements.map(el => elementToHTML(el)).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZWX Preview</title>
  <style>body{margin:20px;font-family:Arial,Helvetica,sans-serif;background:#f5f7fa}#stage{${containerStyles}}.export-el{position:absolute;box-sizing:border-box}</style>
  </head><body><div id="stage">${elHtml}</div></body></html>`;
}

function elementToHTML(el){
  const style = `left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;transform:rotate(${el.rotation}deg);opacity:${el.opacity};`;
  if (el.type === 'rect') {
    return `<div class="export-el" style="${style}background:${el.fill};border:${el.strokeW}px solid ${el.stroke}"></div>`;
  }
  if (el.type === 'circle') {
    return `<div class="export-el" style="${style}border-radius:50%;background:${el.fill};border:${el.strokeW}px solid ${el.stroke}"></div>`;
  }
  if (el.type === 'text') {
    return `<div class="export-el" style="${style};background:transparent;color:${el.fill};font-family:${el.meta.font};font-size:${el.meta.fontSize}px">${escapeHtml(el.meta.text||'')}</div>`;
  }
  if (el.type === 'image') {
    return `<img class="export-el" src="${el.meta.src}" style="${style};object-fit:contain;border:${el.strokeW}px solid ${el.stroke}">`;
  }
  if (el.type === 'polygon') {
    const pts = polygonPoints(el.meta.sides||5, el.w, el.h, el.meta.radius||Math.min(el.w,el.h)/2).map(p=>`${p.x},${p.y}`).join(' ');
    return `<svg class="export-el" style="${style}" viewBox="0 0 ${el.w} ${el.h}" preserveAspectRatio="none"><polygon points="${pts}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeW}"/></svg>`;
  }
  if (el.type === 'path') {
    const pts = (el.meta.points||[]).map(p=>`${p.x},${p.y}`).join(' ');
    const fill = el.meta.closed ? el.fill : 'none';
    return `<svg class="export-el" style="${style}" viewBox="0 0 ${el.w} ${el.h}" preserveAspectRatio="none"><polyline points="${pts}" fill="${fill}" stroke="${el.stroke}" stroke-width="${el.strokeW}"/></svg>`;
  }
  return '';
}

// ---------- helpers ----------
function polygonPoints(sides, w, h, radius){
  const cx = w/2, cy = h/2;
  const pts = [];
  for (let i=0;i<sides;i++){
    const a = (i/sides) * Math.PI*2 - Math.PI/2;
    pts.push({x: cx + Math.cos(a)*radius + (w/2-radius), y: cy + Math.sin(a)*radius + (h/2-radius)});
  }
  return pts;
}

function toHex(col){
  if (!col) return '#000000';
  // assume already hex
  return col;
}

function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function notify(msg){
  const old = status.textContent;
  status.textContent = msg;
  setTimeout(()=> status.textContent = old, 1800);
}

function resizeWorkspace(){
  // keep workspace height reasonable
  const w = $$('#workspace');
  if (w) {
    // nothing complex required here because workspace is flexible
  }
}

// find element in state by id
function $ (sel, root=document) { return root.querySelector(sel); }

// update element count & status
function updateStatus(){ $$('#elCount').textContent = state.elements.length; renderLayers(); }

// ---------- selection helper when DOM element clicked ----------
workspace.addEventListener('click', (e) => {
  // if clicked element node has id and is an element wrapper, select it
  const el = e.target.closest('.el');
  if (el && el.id) selectElement(el.id);
});

// initial demo content
createElement('rect', { x: 40, y: 40, w: 200, h: 120, fill: '#ffd166', stroke: '#6a4c93' });
createElement('circle', { x: 320, y: 60, w: 120, h: 120, fill: '#6dd3ff', stroke: '#064a5b' });
createElement('text', { x: 80, y: 220, w: 260, h: 60, text: 'Hello ZWX', fontSize: 22, fill: '#072233' });

// Keep UI responsive
updateStatus();
