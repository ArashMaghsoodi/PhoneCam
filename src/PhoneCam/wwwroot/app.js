'use strict';

const host = window.chrome.webview;
const $ = id => document.getElementById(id);
const canvas = $('video');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

const settings = { cameraId: null, size: null, fps: 30, bitRate: 8000000, rotation: 0, mirror: false, fit: 'contain', panelCollapsed: false };
let cameras = [];
let fullscreen = false;
let streaming = false;
let sessionSize = '';
// In full screen the panel starts hidden and floats over the image; the saved choice is for the window.
let panelOpenInFullscreen = false;
let noticeTimer = 0;

// ---------------------------------------------------------------- host messages

host.addEventListener('message', event => {
  const data = event.data;
  if (typeof data === 'string') {
    if (data.charCodeAt(0) === 86) onVideoPacket(data); // "V": video packet
    return;
  }
  handlers[data.type]?.(data);
});

const handlers = {
  settings(m) {
    Object.assign(settings, m.settings);
    fillCameraControls();
    syncViewControls();
    syncPanel();
  },
  notice(m) {
    showNotice(m.text);
  },
  status(m) {
    $('dot').dataset.state = m.state;
    $('status').textContent = m.text;
    $('placeholderText').textContent = m.text;
  },
  device(m) {
    $('device').textContent = m.model || 'Nessun telefono';
    if (!m.model) {
      cameras = [];
      fillCameraControls();
      $('restoreCameras').hidden = true;
    }
  },
  cameras(m) {
    cameras = m.items;
    fillCameraControls();
    const hidden = m.hidden ?? 0;
    $('restoreCameras').hidden = hidden === 0;
    $('restoreCameras').textContent = hidden === 1
      ? 'Mostra di nuovo l\'obiettivo escluso'
      : `Mostra di nuovo i ${hidden} obiettivi esclusi`;
  },
  session(m) {
    resetDecoder();
    streaming = true;
    sessionSize = `${m.width}×${m.height}`;
  },
  zoom(m) {
    $('zoomValue').textContent = `${formatNumber(m.value)}×`;
  },
  streamEnded() {
    streaming = false;
    resetDecoder();
    showPlaceholder(true);
  },
  fullscreen(m) {
    fullscreen = m.on;
    panelOpenInFullscreen = false;
    document.body.classList.toggle('fullscreen', fullscreen);
    $('fullscreen').textContent = fullscreen ? 'Esci da schermo intero' : 'Schermo intero';
    syncPanel();
  },
};

function send(message) {
  host.postMessage(message);
}

// ---------------------------------------------------------------- camera controls

const facingNames = { back: 'Posteriore', front: 'Anteriore', external: 'Esterna' };

function cameraLabel(camera) {
  const megapixels = Math.round(camera.sensorWidth * camera.sensorHeight / 1e6);
  const zoom = camera.zoomMax > camera.zoomMin
    ? ` · zoom ${formatNumber(camera.zoomMin)}–${formatNumber(camera.zoomMax)}×`
    : '';
  return `${facingNames[camera.facing] ?? camera.facing} · ${megapixels} MP${zoom} (id ${camera.id})`;
}

function sizeLabel(width, height) {
  const ratio = width / height;
  const near = target => Math.abs(ratio - target) < 0.02;
  const aspect = near(16 / 9) ? '16:9' : near(4 / 3) ? '4:3' : near(1) ? '1:1' : `${formatNumber(ratio)}:1`;
  const names = { 2160: '4K', 1440: '2K', 1080: 'Full HD', 720: 'HD' };
  const name = aspect === '16:9' && names[height] ? ` · ${names[height]}` : '';
  return `${width}×${height} (${aspect})${name}`;
}

function fillCameraControls() {
  const cameraSelect = $('camera');
  cameraSelect.replaceChildren(...cameras.map(c => new Option(cameraLabel(c), c.id)));
  if (cameras.length && !cameras.some(c => c.id === settings.cameraId))
    settings.cameraId = cameras[0].id;
  cameraSelect.value = settings.cameraId ?? '';

  const camera = cameras.find(c => c.id === settings.cameraId);
  const sizes = (camera?.sizes ?? [])
    .map(value => {
      const [w, h] = value.split('x').map(Number);
      return { value, w, h };
    })
    // Phones declare dozens of sizes; the usual 16:9 and 4:3 ones are enough here.
    .filter(s => s.w >= 640 && (Math.abs(s.w / s.h - 16 / 9) < 0.02 || Math.abs(s.w / s.h - 4 / 3) < 0.02))
    .sort((a, b) => b.w * b.h - a.w * a.h || b.w - a.w);
  const sizeSelect = $('size');
  sizeSelect.replaceChildren(...sizes.map(s => new Option(sizeLabel(s.w, s.h), s.value)));
  if (sizes.length && !sizes.some(s => s.value === settings.size))
    settings.size = (sizes.find(s => s.w === 1920 && s.h === 1080) ?? sizes.find(s => s.w <= 1920) ?? sizes[0]).value;
  sizeSelect.value = settings.size ?? '';

  const fpsValues = [...new Set([...(camera?.fps ?? []), 30])].filter(f => f >= 15).sort((a, b) => a - b);
  const fpsSelect = $('fps');
  fpsSelect.replaceChildren(...fpsValues.map(f => new Option(String(f), String(f))));
  if (!fpsValues.includes(settings.fps))
    settings.fps = 30;
  fpsSelect.value = String(settings.fps);

  $('quality').value = String(settings.bitRate);
  for (const id of ['camera', 'size', 'fps'])
    $(id).disabled = cameras.length === 0;
}

let applyTimer = 0;
function applySoon() {
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => send({
    type: 'apply',
    settings: { cameraId: settings.cameraId, size: settings.size, fps: settings.fps, bitRate: settings.bitRate },
  }), 300);
}

$('camera').addEventListener('change', () => {
  settings.cameraId = $('camera').value;
  fillCameraControls();
  applySoon();
});
$('size').addEventListener('change', () => { settings.size = $('size').value; applySoon(); });
$('fps').addEventListener('change', () => { settings.fps = Number($('fps').value); applySoon(); });
$('quality').addEventListener('change', () => { settings.bitRate = Number($('quality').value); applySoon(); });

$('restoreCameras').addEventListener('click', () => send({ type: 'restoreCameras' }));
$('zoomIn').addEventListener('click', () => send({ type: 'zoom', dir: 'in' }));
$('zoomOut').addEventListener('click', () => send({ type: 'zoom', dir: 'out' }));
$('torch').addEventListener('change', () => send({ type: 'torch', on: $('torch').checked }));

// ---------------------------------------------------------------- view controls

function rotate() {
  settings.rotation = (settings.rotation + 90) % 360;
  viewChanged();
}

function toggleMirror() {
  settings.mirror = !settings.mirror;
  viewChanged();
}

function toggleFit() {
  settings.fit = settings.fit === 'contain' ? 'cover' : 'contain';
  viewChanged();
}

function viewChanged() {
  syncViewControls();
  sendView();
}

function sendView() {
  send({
    type: 'view',
    settings: { rotation: settings.rotation, mirror: settings.mirror, fit: settings.fit, panelCollapsed: settings.panelCollapsed },
  });
}

function syncViewControls() {
  canvas.style.objectFit = settings.fit;
  $('fit').textContent = settings.fit === 'contain' ? 'Riempi' : 'Adatta';
  $('mirror').setAttribute('aria-pressed', String(settings.mirror));
  $('rotate').textContent = settings.rotation ? `Ruota ${settings.rotation}°` : 'Ruota';
}

function togglePanel() {
  if (fullscreen) {
    panelOpenInFullscreen = !panelOpenInFullscreen;
  } else {
    settings.panelCollapsed = !settings.panelCollapsed;
    sendView();
  }
  syncPanel();
}

function syncPanel() {
  const visible = fullscreen ? panelOpenInFullscreen : !settings.panelCollapsed;
  document.body.classList.toggle('panel-hidden', !visible);
  $('showPanel').hidden = visible;
  $('hidePanel').setAttribute('aria-expanded', String(visible));
}

function showNotice(text) {
  const notice = $('notice');
  notice.textContent = text;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 8000);
}

function toggleFullscreen() {
  send({ type: 'fullscreen', on: !fullscreen });
}

$('rotate').addEventListener('click', rotate);
$('mirror').addEventListener('click', toggleMirror);
$('fit').addEventListener('click', toggleFit);
$('fullscreen').addEventListener('click', toggleFullscreen);
$('stage').addEventListener('dblclick', toggleFullscreen);
$('hidePanel').addEventListener('click', togglePanel);
$('showPanel').addEventListener('click', togglePanel);
$('showPanel').addEventListener('dblclick', e => e.stopPropagation());

document.addEventListener('keydown', e => {
  if (e.key === 'F11') {
    toggleFullscreen();
    e.preventDefault();
    return;
  }
  if (e.key === 'Escape' && fullscreen) {
    send({ type: 'fullscreen', on: false });
    e.preventDefault();
    return;
  }
  // Letters and arrows belong to a focused drop-down list.
  if (e.target instanceof HTMLSelectElement)
    return;
  switch (e.key) {
    case '+': case '=': send({ type: 'zoom', dir: 'in' }); break;
    case '-': send({ type: 'zoom', dir: 'out' }); break;
    case 'r': case 'R': rotate(); break;
    case 'm': case 'M': toggleMirror(); break;
    case 'a': case 'A': toggleFit(); break;
    case 'p': case 'P': togglePanel(); break;
    default: return;
  }
  e.preventDefault();
});

let idleTimer = 0;
document.addEventListener('mousemove', () => {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 2000);
});

// ---------------------------------------------------------------- decoding

let decoder = null;
let codec = '';
let lastConfig = null; // SPS/PPS, reused if the decoder must be rebuilt without a new config packet
let waitingForKeyFrame = true;
let latestFrame = null;
let drawScheduled = false;
let frameSize = '';
const counters = { decoded: 0, window: 0, dropped: 0, errors: 0, lastError: '' };

// Packet format: "V<flags>,<pts>,<base64>" with flags bit 0 = keyframe, bit 1 = starts with SPS/PPS.
function onVideoPacket(message) {
  const c1 = message.indexOf(',');
  const c2 = message.indexOf(',', c1 + 1);
  const flags = Number(message.slice(1, c1));
  const pts = Number(message.slice(c1 + 1, c2));
  let data = base64ToBytes(message.slice(c2 + 1));
  const keyFrame = (flags & 1) !== 0;

  if (flags & 2) {
    const packetCodec = codecFromAnnexB(data);
    const sliceStart = firstSliceOffset(data);
    if (sliceStart > 0)
      lastConfig = data.slice(0, sliceStart);
    if (packetCodec && (packetCodec !== codec || decoder?.state !== 'configured'))
      configureDecoder(packetCodec);
  } else if (decoder?.state !== 'configured' && keyFrame && lastConfig && codec) {
    configureDecoder(codec);
    const merged = new Uint8Array(lastConfig.length + data.length);
    merged.set(lastConfig);
    merged.set(data, lastConfig.length);
    data = merged;
  }

  if (decoder?.state !== 'configured')
    return;
  if (waitingForKeyFrame) {
    if (!keyFrame) {
      counters.dropped++;
      return;
    }
    waitingForKeyFrame = false;
  }
  if (decoder.decodeQueueSize > 10) {
    // Too far behind: drop to the next keyframe rather than showing old images.
    counters.dropped++;
    waitingForKeyFrame = true;
    send({ type: 'keyframe' });
    return;
  }
  decoder.decode(new EncodedVideoChunk({ type: keyFrame ? 'key' : 'delta', timestamp: pts, data }));
}

function configureDecoder(newCodec) {
  if (decoder && decoder.state !== 'closed')
    decoder.close();
  decoder = new VideoDecoder({ output: onFrame, error: onDecoderError });
  decoder.configure({ codec: newCodec, optimizeForLatency: true, hardwareAcceleration: 'prefer-hardware' });
  codec = newCodec;
  waitingForKeyFrame = true;
}

function onDecoderError(error) {
  counters.errors++;
  counters.lastError = error.message;
  send({ type: 'log', text: `decoder: ${error.message}` });
  decoder = null;
  waitingForKeyFrame = true;
  send({ type: 'keyframe' });
}

function resetDecoder() {
  if (decoder && decoder.state !== 'closed')
    decoder.close();
  decoder = null;
  codec = '';
  lastConfig = null;
  waitingForKeyFrame = true;
  if (latestFrame) {
    latestFrame.close();
    latestFrame = null;
  }
}

function onFrame(frame) {
  counters.decoded++;
  counters.window++;
  if (latestFrame)
    latestFrame.close();
  latestFrame = frame;
  if (!drawScheduled) {
    drawScheduled = true;
    requestAnimationFrame(draw);
  }
}

function draw() {
  drawScheduled = false;
  const frame = latestFrame;
  latestFrame = null;
  if (!frame)
    return;
  const w = frame.displayWidth;
  const h = frame.displayHeight;
  const sideways = settings.rotation % 180 !== 0;
  const cw = sideways ? h : w;
  const ch = sideways ? w : h;
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  // Mirror in screen space, after the rotation.
  ctx.setTransform(1, 0, 0, 1, cw / 2, ch / 2);
  if (settings.mirror)
    ctx.scale(-1, 1);
  ctx.rotate(settings.rotation * Math.PI / 180);
  ctx.drawImage(frame, -w / 2, -h / 2, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  frameSize = `${w}×${h}`;
  frame.close();
  showPlaceholder(false);
}

function showPlaceholder(show) {
  const placeholder = $('placeholder');
  if (placeholder.hidden === !show)
    return;
  placeholder.hidden = !show;
  if (show)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function base64ToBytes(text) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(text);
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function codecFromAnnexB(data) {
  for (let i = 0; i + 6 < data.length; i++) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1) {
      if ((data[i + 3] & 0x1f) === 7)
        return `avc1.${hex(data[i + 4])}${hex(data[i + 5])}${hex(data[i + 6])}`;
      i += 2;
    }
  }
  return null;
}

function firstSliceOffset(data) {
  for (let i = 0; i + 3 < data.length; i++) {
    if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1) {
      const type = data[i + 3] & 0x1f;
      if (type === 1 || type === 5)
        return i > 0 && data[i - 1] === 0 ? i - 1 : i;
      i += 2;
    }
  }
  return -1;
}

const hex = value => value.toString(16).padStart(2, '0');
const formatNumber = value => Number(value).toLocaleString('it-IT', { maximumFractionDigits: 1 });

// ---------------------------------------------------------------- stats

setInterval(() => {
  const fps = counters.window;
  counters.window = 0;
  const size = frameSize || sessionSize;
  $('stats').textContent = streaming && size
    ? `${size} · ${fps} fps${counters.dropped ? ` · scartati ${counters.dropped}` : ''}`
    : '';
  send({ type: 'stats', decoded: counters.decoded, fps, dropped: counters.dropped, errors: counters.errors, lastError: counters.lastError, codec, frameSize });
}, 1000);

if (!('VideoDecoder' in window)) {
  handlers.status({ state: 'error', text: 'Questa versione di WebView2 non decodifica video (WebCodecs assente)' });
  send({ type: 'log', text: 'WebCodecs non disponibile' });
}

send({ type: 'ready' });
