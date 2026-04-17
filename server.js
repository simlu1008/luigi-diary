require('dotenv').config();
const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const port = Number(process.env.PORT || 3000);
function resolveDataFilePath() {
  if (process.env.DATA_FILE) {
    return process.env.DATA_FILE;
  }

  const renderVolumePath = '/data/events.json';
  if (fs.existsSync('/data')) {
    return renderVolumePath;
  }

  return path.join(__dirname, 'data', 'events.json');
}

const dataFile = resolveDataFilePath();
const appUsername = process.env.APP_USERNAME || '';
const appPassword = process.env.APP_PASSWORD || '';
const isBasicAuthEnabled = Boolean(appUsername && appPassword);
const appPinRaw = String(process.env.APP_PIN || '').trim();
const isPinAuthEnabled = /^\d{4}$/.test(appPinRaw);
const pinSessionSecret = process.env.APP_PIN_SESSION_SECRET || `${appPinRaw}:luigi-diary`;
const authMode = isPinAuthEnabled ? 'pin' : isBasicAuthEnabled ? 'basic' : 'none';
const pinCookieName = 'luigi_pin_auth';

if ((appUsername && !appPassword) || (!appUsername && appPassword)) {
  console.warn('Auth ist nur aktiv, wenn APP_USERNAME und APP_PASSWORD beide gesetzt sind.');
}

if (appPinRaw && !isPinAuthEnabled) {
  console.warn('APP_PIN muss genau 4 Ziffern enthalten, sonst bleibt PIN-Auth deaktiviert.');
}

if (isPinAuthEnabled && isBasicAuthEnabled) {
  console.warn('APP_PIN ist gesetzt: PIN-Auth ist aktiv, Basic Auth wird ignoriert.');
}

function ensureDataFile() {
  const directory = path.dirname(dataFile);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ nextId: 1, events: [] }, null, 2));
  }
}

function readStore() {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(raw);
}

function writeStore(store) {
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function toLocalDate(value) {
  return new Date(value).toLocaleDateString('sv-SE');
}

function minutesBetween(startIso, endIso) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function minutesWithinRange(startIso, endIso, rangeStartIso, rangeEndIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();

  const clippedStart = Math.max(start, rangeStart);
  const clippedEnd = Math.min(end, rangeEnd);
  if (!Number.isFinite(clippedStart) || !Number.isFinite(clippedEnd)) return 0;
  if (clippedEnd <= clippedStart) return 0;
  return Math.floor((clippedEnd - clippedStart) / 60000);
}

function getOpenWalk(store) {
  return store.events.findLast((event) => event.type === 'walk' && !event.walkEnd);
}

function getOpenSleep(store) {
  return store.events.findLast((event) => event.type === 'sleep' && !event.sleepEnd);
}

function getOpenAlone(store) {
  return store.events.findLast((event) => event.type === 'alone' && !event.aloneEnd);
}

function serializeEvent(event) {
  return {
    id: event.id,
    type: event.type,
    created_at: event.createdAt,
    walk_start: event.walkStart,
    walk_end: event.walkEnd,
    duration_min: event.durationMin,
    pipi: event.pipi,
    pupu: event.pupu,
    pipi_at: event.pipiAt,
    pupu_at: event.pupuAt,
    sleep_start: event.sleepStart,
    sleep_end: event.sleepEnd,
    sleep_hours: event.type === 'sleep' && Number.isFinite(event.durationMin) ? Number((event.durationMin / 60).toFixed(2)) : null,
    alone_start: event.aloneStart,
    alone_end: event.aloneEnd,
    alone_hours: event.type === 'alone' && Number.isFinite(event.durationMin) ? Number((event.durationMin / 60).toFixed(2)) : null,
    feed_amount_g: event.feedAmountG,
    note: event.note,
  };
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toBooleanOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'ja'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nein'].includes(normalized)) return false;
  }
  return null;
}

function toIntegerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.floor(numeric));
}

function normalizeImportedEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'object') return null;

  const type = ['walk', 'feed', 'sleep', 'alone'].includes(rawEvent.type) ? rawEvent.type : null;
  if (!type) return null;

  const createdAt = toIsoOrNull(rawEvent.created_at ?? rawEvent.createdAt) || nowIso();
  const walkStart = toIsoOrNull(rawEvent.walk_start ?? rawEvent.walkStart);
  const walkEnd = toIsoOrNull(rawEvent.walk_end ?? rawEvent.walkEnd);
  const sleepStart = toIsoOrNull(rawEvent.sleep_start ?? rawEvent.sleepStart);
  const sleepEnd = toIsoOrNull(rawEvent.sleep_end ?? rawEvent.sleepEnd);
  const aloneStart = toIsoOrNull(rawEvent.alone_start ?? rawEvent.aloneStart);
  const aloneEnd = toIsoOrNull(rawEvent.alone_end ?? rawEvent.aloneEnd);
  const durationMin = toIntegerOrNull(rawEvent.duration_min ?? rawEvent.durationMin);
  const feedAmountG = toIntegerOrNull(rawEvent.feed_amount_g ?? rawEvent.feedAmountG ?? rawEvent.amount_g ?? rawEvent.amountG);
  const pipi = toBooleanOrNull(rawEvent.pipi);
  const pupu = toBooleanOrNull(rawEvent.pupu);
  const pipiAt = toIsoOrNull(rawEvent.pipi_at ?? rawEvent.pipiAt);
  const pupuAt = toIsoOrNull(rawEvent.pupu_at ?? rawEvent.pupuAt);
  const noteRaw = rawEvent.note;
  const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : null;

  if (type === 'feed') {
    return {
      type,
      createdAt,
      walkStart: null,
      walkEnd: null,
      durationMin: null,
      pipi: null,
      pupu: null,
      pipiAt: null,
      pupuAt: null,
      sleepStart: null,
      sleepEnd: null,
      aloneStart: null,
      aloneEnd: null,
      feedAmountG,
      note,
    };
  }

  if (type === 'sleep') {
    const effectiveDuration = durationMin ?? (sleepStart && sleepEnd ? minutesBetween(sleepStart, sleepEnd) : null);

    return {
      type,
      createdAt,
      walkStart: null,
      walkEnd: null,
      durationMin: effectiveDuration,
      pipi: null,
      pupu: null,
      pipiAt: null,
      pupuAt: null,
      sleepStart,
      sleepEnd,
      aloneStart: null,
      aloneEnd: null,
      feedAmountG: null,
      note,
    };
  }

  if (type === 'alone') {
    const effectiveDuration = durationMin ?? (aloneStart && aloneEnd ? minutesBetween(aloneStart, aloneEnd) : null);

    return {
      type,
      createdAt,
      walkStart: null,
      walkEnd: null,
      durationMin: effectiveDuration,
      pipi: null,
      pupu: null,
      pipiAt: null,
      pupuAt: null,
      sleepStart: null,
      sleepEnd: null,
      aloneStart,
      aloneEnd,
      feedAmountG: null,
      note,
    };
  }

  const effectiveWalkDuration = durationMin ?? (walkStart && walkEnd ? minutesBetween(walkStart, walkEnd) : null);

  return {
    type,
    createdAt,
    walkStart,
    walkEnd,
    durationMin: effectiveWalkDuration,
    pipi,
    pupu,
    pipiAt: pipi ? pipiAt ?? walkEnd : null,
    pupuAt: pupu ? pupuAt ?? walkEnd : null,
    sleepStart: null,
    sleepEnd: null,
    aloneStart: null,
    aloneEnd: null,
    feedAmountG: null,
    note,
  };
}

function eventFingerprint(event) {
  return [
    event.type,
    event.createdAt,
    event.walkStart,
    event.walkEnd,
    event.durationMin,
    event.pipi,
    event.pupu,
    event.pipiAt,
    event.pupuAt,
    event.sleepStart,
    event.sleepEnd,
    event.aloneStart,
    event.aloneEnd,
    event.feedAmountG,
    event.note,
  ].join('|');
}

function makeIsoFromRequest(value) {
  return toIsoOrNull(value);
}

function pushEvent(store, event) {
  const withId = {
    ...event,
    id: store.nextId,
  };

  store.nextId += 1;
  store.events.push(withId);
  writeStore(store);
  return withId;
}

function parseBasicAuthHeader(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const [scheme, encoded] = headerValue.split(' ');
  if (!scheme || !encoded || scheme.toLowerCase() !== 'basic') return null;

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;
    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};

  return cookieHeader.split(';').reduce((accumulator, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return accumulator;
    accumulator[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    return accumulator;
  }, {});
}

function signPinPayload(payload) {
  return crypto.createHmac('sha256', pinSessionSecret).update(payload).digest('hex');
}

function createPinToken() {
  const payload = 'ok';
  return `${payload}.${signPinPayload(payload)}`;
}

function isValidPinToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = signPinPayload(payload);
  const left = Buffer.from(signature, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) return false;

  return crypto.timingSafeEqual(left, right);
}

function isPinRequestAuthenticated(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return isValidPinToken(cookies[pinCookieName]);
}

function isSecureRequest(req) {
  if (req.secure) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return false;
}

function setPinSessionCookie(req, res) {
  const securePart = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${pinCookieName}=${encodeURIComponent(createPinToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${securePart}`
  );
}

function clearPinSessionCookie(req, res) {
  const securePart = isSecureRequest(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${pinCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`);
}

function isPinPublicPath(req) {
  return req.path === '/api/health' || req.path === '/auth/pin' || req.path === '/api/pin/verify' || req.path === '/api/pin/logout';
}

function isRequestAuthorized(req) {
  const credentials = parseBasicAuthHeader(req.headers.authorization);
  if (!credentials) return false;
  return credentials.username === appUsername && credentials.password === appPassword;
}

function respondUnauthorized(req, res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Luigi Diary"');
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Nicht autorisiert.' });
  }
  return res.status(401).send('Nicht autorisiert.');
}

app.use(express.json());
app.use((req, res, next) => {
  if (authMode === 'none') {
    return next();
  }

  if (authMode === 'basic') {
    if (req.path === '/api/health' || isRequestAuthorized(req)) {
      return next();
    }

    return respondUnauthorized(req, res);
  }

  if (isPinPublicPath(req) || isPinRequestAuthenticated(req)) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'PIN erforderlich.' });
  }

  return res.redirect('/auth/pin');
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/auth/pin', (req, res) => {
  if (authMode !== 'pin') {
    return res.redirect('/');
  }

  if (isPinRequestAuthenticated(req)) {
    return res.redirect('/');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Luigi Diary · PIN</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #f5f7fb; color: #111827; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
      .card { width: 100%; max-width: 360px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; box-sizing: border-box; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 14px; color: #6b7280; }
      input { width: 100%; box-sizing: border-box; padding: 12px; font-size: 20px; text-align: center; letter-spacing: 8px; border-radius: 12px; border: 1px solid #d1d5db; }
      button { margin-top: 12px; width: 100%; border: none; border-radius: 12px; padding: 12px; font-size: 16px; color: white; background: #2563eb; }
      .error { margin-top: 10px; color: #b91c1c; min-height: 20px; font-size: 14px; text-align: center; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <h1>🐶 Luigi Diary</h1>
        <p>Bitte 4-stelligen PIN eingeben</p>
        <form id="pin-form">
          <input id="pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code" enterkeyhint="done" required />
          <button type="submit">Öffnen</button>
          <div id="error" class="error"></div>
        </form>
      </section>
    </main>
    <script>
      const form = document.getElementById('pin-form');
      const input = document.getElementById('pin-input');
      const error = document.getElementById('error');
      input.focus();

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        error.textContent = '';
        const pin = input.value.trim();
        if (!/^\\d{4}$/.test(pin)) {
          error.textContent = 'PIN muss genau 4 Ziffern haben.';
          return;
        }

        const response = await fetch('/api/pin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });

        if (!response.ok) {
          error.textContent = 'PIN ist falsch.';
          input.value = '';
          input.focus();
          return;
        }

        window.location.replace('/');
      });
    </script>
  </body>
</html>`);
});

app.post('/api/pin/verify', (req, res) => {
  if (authMode !== 'pin') {
    return res.status(409).json({ error: 'PIN-Auth ist nicht aktiv.' });
  }

  const pin = String(req.body?.pin || '').trim();
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN muss genau 4 Ziffern haben.' });
  }

  if (pin !== appPinRaw) {
    return res.status(401).json({ error: 'PIN ist falsch.' });
  }

  setPinSessionCookie(req, res);
  return res.json({ ok: true });
});

app.post('/api/pin/logout', (req, res) => {
  clearPinSessionCookie(req, res);
  return res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/status', (_req, res) => {
  const store = readStore();
  const openWalk = getOpenWalk(store);
  const openSleep = getOpenSleep(store);
  const openAlone = getOpenAlone(store);
  res.json({
    hasOpenWalk: Boolean(openWalk),
    openWalk: openWalk
      ? {
          id: openWalk.id,
          walk_start: openWalk.walkStart,
        }
      : null,
    hasOpenSleep: Boolean(openSleep),
    openSleep: openSleep
      ? {
          id: openSleep.id,
          sleep_start: openSleep.sleepStart,
        }
      : null,
    hasOpenAlone: Boolean(openAlone),
    openAlone: openAlone
      ? {
          id: openAlone.id,
          alone_start: openAlone.aloneStart,
        }
      : null,
  });
});

app.post('/api/walk/start', (req, res) => {
  const store = readStore();
  const openWalk = getOpenWalk(store);
  if (openWalk) {
    return res.status(409).json({ error: 'Es läuft bereits ein Spaziergang.' });
  }

  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  const event = {
    type: 'walk',
    createdAt: nowIso(),
    walkStart: nowIso(),
    walkEnd: null,
    durationMin: null,
    pipi: null,
    pupu: null,
    pipiAt: null,
    pupuAt: null,
    sleepStart: null,
    sleepEnd: null,
    aloneStart: null,
    aloneEnd: null,
    feedAmountG: null,
    note: note || null,
  };

  const inserted = pushEvent(store, event);

  return res.status(201).json({ id: inserted.id });
});

app.post('/api/walk/end', (req, res) => {
  const store = readStore();
  const openWalk = getOpenWalk(store);
  if (!openWalk) {
    return res.status(409).json({ error: 'Kein aktiver Spaziergang.' });
  }

  const endTime = nowIso();
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  const pipi = req.body?.pipi === true;
  const pupu = req.body?.pupu === true;
  const pipiAt = makeIsoFromRequest(req.body?.pipi_at);
  const pupuAt = makeIsoFromRequest(req.body?.pupu_at);

  openWalk.walkEnd = endTime;
  openWalk.durationMin = minutesBetween(openWalk.walkStart, endTime);
  openWalk.pipi = pipi;
  openWalk.pupu = pupu;
  openWalk.pipiAt = pipi ? pipiAt || endTime : null;
  openWalk.pupuAt = pupu ? pupuAt || endTime : null;
  if (note) {
    openWalk.note = note;
  }

  writeStore(store);

  return res.json({
    id: openWalk.id,
    type: openWalk.type,
    created_at: openWalk.createdAt,
    walk_start: openWalk.walkStart,
    walk_end: openWalk.walkEnd,
    duration_min: openWalk.durationMin,
    pipi: openWalk.pipi,
    pupu: openWalk.pupu,
    pipi_at: openWalk.pipiAt,
    pupu_at: openWalk.pupuAt,
    note: openWalk.note,
  });
});

app.post('/api/feed', (req, res) => {
  const store = readStore();
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  const amountG = toIntegerOrNull(req.body?.amount_g);

  const event = {
    type: 'feed',
    createdAt: nowIso(),
    walkStart: null,
    walkEnd: null,
    durationMin: null,
    pipi: null,
    pupu: null,
    pipiAt: null,
    pupuAt: null,
    sleepStart: null,
    sleepEnd: null,
    aloneStart: null,
    aloneEnd: null,
    feedAmountG: amountG,
    note: note || null,
  };

  const inserted = pushEvent(store, event);

  return res.status(201).json({ id: inserted.id });
});

app.post('/api/sleep/start', (req, res) => {
  const store = readStore();
  const openSleep = getOpenSleep(store);
  if (openSleep) {
    return res.status(409).json({ error: 'Es gibt bereits eine offene Schlaf-Session.' });
  }

  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  const event = {
    type: 'sleep',
    createdAt: nowIso(),
    walkStart: null,
    walkEnd: null,
    durationMin: null,
    pipi: null,
    pupu: null,
    pipiAt: null,
    pupuAt: null,
    sleepStart: nowIso(),
    sleepEnd: null,
    aloneStart: null,
    aloneEnd: null,
    feedAmountG: null,
    note: note || null,
  };

  const inserted = pushEvent(store, event);
  return res.status(201).json({ id: inserted.id });
});

app.post('/api/sleep/end', (req, res) => {
  const store = readStore();
  const openSleep = getOpenSleep(store);
  if (!openSleep) {
    return res.status(409).json({ error: 'Keine aktive Schlaf-Session.' });
  }

  const endTime = nowIso();
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

  openSleep.sleepEnd = endTime;
  openSleep.durationMin = minutesBetween(openSleep.sleepStart, endTime);
  if (note) {
    openSleep.note = note;
  }

  writeStore(store);

  return res.json(serializeEvent(openSleep));
});

app.post('/api/alone/start', (req, res) => {
  const store = readStore();
  const openAlone = getOpenAlone(store);
  if (openAlone) {
    return res.status(409).json({ error: 'Es gibt bereits eine offene Alleine-Session.' });
  }

  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  const event = {
    type: 'alone',
    createdAt: nowIso(),
    walkStart: null,
    walkEnd: null,
    durationMin: null,
    pipi: null,
    pupu: null,
    pipiAt: null,
    pupuAt: null,
    sleepStart: null,
    sleepEnd: null,
    aloneStart: nowIso(),
    aloneEnd: null,
    feedAmountG: null,
    note: note || null,
  };

  const inserted = pushEvent(store, event);
  return res.status(201).json({ id: inserted.id });
});

app.post('/api/alone/end', (req, res) => {
  const store = readStore();
  const openAlone = getOpenAlone(store);
  if (!openAlone) {
    return res.status(409).json({ error: 'Keine aktive Alleine-Session.' });
  }

  const endTime = nowIso();
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

  openAlone.aloneEnd = endTime;
  openAlone.durationMin = minutesBetween(openAlone.aloneStart, endTime);
  if (note) {
    openAlone.note = note;
  }

  writeStore(store);

  return res.json(serializeEvent(openAlone));
});

app.post('/api/manual/event', (req, res) => {
  const store = readStore();
  const type = req.body?.type;

  if (!['walk', 'feed', 'sleep', 'alone'].includes(type)) {
    return res.status(400).json({ error: 'Ungültiger Typ. Erlaubt: walk, feed, sleep, alone.' });
  }

  const noteRaw = req.body?.note;
  const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : null;

  if (type === 'feed') {
    const createdAt = makeIsoFromRequest(req.body?.created_at) || nowIso();
    const event = {
      type,
      createdAt,
      walkStart: null,
      walkEnd: null,
      durationMin: null,
      pipi: null,
      pupu: null,
      pipiAt: null,
      pupuAt: null,
      sleepStart: null,
      sleepEnd: null,
      aloneStart: null,
      aloneEnd: null,
      feedAmountG: toIntegerOrNull(req.body?.amount_g),
      note,
    };
    const inserted = pushEvent(store, event);
    return res.status(201).json(serializeEvent(inserted));
  }

  if (type === 'walk') {
    const walkStart = makeIsoFromRequest(req.body?.walk_start);
    const walkEnd = makeIsoFromRequest(req.body?.walk_end);

    if (!walkStart || !walkEnd) {
      return res.status(400).json({ error: 'Für manuelle Spaziergänge sind `walk_start` und `walk_end` nötig.' });
    }

    const event = {
      type,
      createdAt: makeIsoFromRequest(req.body?.created_at) || walkStart,
      walkStart,
      walkEnd,
      durationMin: toIntegerOrNull(req.body?.duration_min) ?? minutesBetween(walkStart, walkEnd),
      pipi: toBooleanOrNull(req.body?.pipi),
      pupu: toBooleanOrNull(req.body?.pupu),
      pipiAt: null,
      pupuAt: null,
      sleepStart: null,
      sleepEnd: null,
      aloneStart: null,
      aloneEnd: null,
      feedAmountG: null,
      note,
    };

    event.pipiAt = event.pipi ? makeIsoFromRequest(req.body?.pipi_at) || walkEnd : null;
    event.pupuAt = event.pupu ? makeIsoFromRequest(req.body?.pupu_at) || walkEnd : null;

    const inserted = pushEvent(store, event);
    return res.status(201).json(serializeEvent(inserted));
  }

  const sleepStart = makeIsoFromRequest(req.body?.sleep_start);
  const sleepEnd = makeIsoFromRequest(req.body?.sleep_end);

  if (type === 'alone') {
    const aloneStart = makeIsoFromRequest(req.body?.alone_start);
    const aloneEnd = makeIsoFromRequest(req.body?.alone_end);

    if (!aloneStart || !aloneEnd) {
      return res.status(400).json({ error: 'Für manuelle Alleine-Daten sind `alone_start` und `alone_end` nötig.' });
    }

    const aloneDurationMin = toIntegerOrNull(req.body?.duration_min) ?? minutesBetween(aloneStart, aloneEnd);
    const event = {
      type: 'alone',
      createdAt: makeIsoFromRequest(req.body?.created_at) || aloneStart,
      walkStart: null,
      walkEnd: null,
      durationMin: aloneDurationMin,
      pipi: null,
      pupu: null,
      pipiAt: null,
      pupuAt: null,
      sleepStart: null,
      sleepEnd: null,
      aloneStart,
      aloneEnd,
      feedAmountG: null,
      note,
    };

    const inserted = pushEvent(store, event);
    return res.status(201).json(serializeEvent(inserted));
  }

  if (!sleepStart || !sleepEnd) {
    return res.status(400).json({ error: 'Für manuelle Schlafdaten sind `sleep_start` und `sleep_end` nötig.' });
  }

  const sleepDurationMin = toIntegerOrNull(req.body?.duration_min) ?? minutesBetween(sleepStart, sleepEnd);
  const event = {
    type: 'sleep',
    createdAt: makeIsoFromRequest(req.body?.created_at) || sleepStart,
    walkStart: null,
    walkEnd: null,
    durationMin: sleepDurationMin,
    pipi: null,
    pupu: null,
    pipiAt: null,
    pupuAt: null,
    sleepStart,
    sleepEnd,
    aloneStart: null,
    aloneEnd: null,
    feedAmountG: null,
    note,
  };

  const inserted = pushEvent(store, event);
  return res.status(201).json(serializeEvent(inserted));
});

app.post('/api/import/events', (req, res) => {
  const strategy = req.body?.strategy === 'replace' ? 'replace' : 'append';
  const rawEvents = Array.isArray(req.body?.events)
    ? req.body.events
    : Array.isArray(req.body)
      ? req.body
      : null;

  if (!rawEvents) {
    return res.status(400).json({ error: 'Ungültige Importdaten. Erwartet wird ein Array in `events`.' });
  }

  const store = readStore();
  const targetEvents = strategy === 'replace' ? [] : [...store.events];

  const knownFingerprints = new Set(targetEvents.map(eventFingerprint));
  let skipped = 0;
  let imported = 0;

  for (const rawEvent of rawEvents) {
    const normalized = normalizeImportedEvent(rawEvent);
    if (!normalized) {
      skipped += 1;
      continue;
    }

    const fingerprint = eventFingerprint(normalized);
    if (knownFingerprints.has(fingerprint)) {
      skipped += 1;
      continue;
    }

    knownFingerprints.add(fingerprint);
    targetEvents.push({ id: 0, ...normalized });
    imported += 1;
  }

  const sorted = targetEvents.sort((left, right) => {
    const leftDate = new Date(left.createdAt).getTime();
    const rightDate = new Date(right.createdAt).getTime();
    return leftDate - rightDate;
  });

  let nextId = 1;
  const reindexed = sorted.map((event) => ({
    ...event,
    id: nextId++,
  }));

  const nextStore = {
    nextId,
    events: reindexed,
  };

  writeStore(nextStore);

  return res.json({
    strategy,
    requested: rawEvents.length,
    imported,
    skipped,
    total: nextStore.events.length,
  });
});

app.get('/api/events', (req, res) => {
  const store = readStore();
  const includeAll = req.query.all === '1' || req.query.limit === 'all';
  const limitRaw = Number(req.query.limit || 30);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10000, limitRaw)) : 30;

  const sortedEvents = [...store.events].sort((left, right) => right.id - left.id);
  const selectedEvents = includeAll ? sortedEvents : sortedEvents.slice(0, limit);
  const events = selectedEvents.map(serializeEvent);

  res.json(events);
});

app.delete('/api/events/last', (_req, res) => {
  const store = readStore();

  if (store.events.length === 0) {
    return res.status(404).json({ error: 'Keine Einträge vorhanden.' });
  }

  let latestIndex = 0;
  for (let index = 1; index < store.events.length; index += 1) {
    if (store.events[index].id > store.events[latestIndex].id) {
      latestIndex = index;
    }
  }

  const [deletedEvent] = store.events.splice(latestIndex, 1);
  const maxId = store.events.reduce((max, event) => Math.max(max, event.id), 0);
  store.nextId = maxId + 1;
  writeStore(store);

  return res.json({
    deleted: serializeEvent(deletedEvent),
    remaining: store.events.length,
  });
});

app.delete('/api/events/:id', (req, res) => {
  const requestedId = Number(req.params.id);
  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    return res.status(400).json({ error: 'Ungültige ID.' });
  }

  const store = readStore();
  const index = store.events.findIndex((event) => event.id === requestedId);
  if (index < 0) {
    return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  }

  const [deletedEvent] = store.events.splice(index, 1);
  const maxId = store.events.reduce((max, event) => Math.max(max, event.id), 0);
  store.nextId = maxId + 1;
  writeStore(store);

  return res.json({
    deleted: serializeEvent(deletedEvent),
    remaining: store.events.length,
  });
});

app.patch('/api/events/:id', (req, res) => {
  const requestedId = Number(req.params.id);
  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    return res.status(400).json({ error: 'Ungültige ID.' });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Ungültige Daten.' });
  }

  const store = readStore();
  const event = store.events.find((entry) => entry.id === requestedId);
  if (!event) {
    return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'created_at')) {
    const createdAt = makeIsoFromRequest(req.body.created_at);
    if (!createdAt) {
      return res.status(400).json({ error: 'Ungültiger Zeitpunkt.' });
    }
    event.createdAt = createdAt;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'note')) {
    if (typeof req.body.note !== 'string') {
      return res.status(400).json({ error: 'Ungültige Notiz.' });
    }
    const trimmed = req.body.note.trim();
    event.note = trimmed || null;
  }

  if (event.type === 'feed') {
    if (Object.prototype.hasOwnProperty.call(req.body, 'amount_g')) {
      const nextAmount = toIntegerOrNull(req.body.amount_g);
      if (nextAmount === null && req.body.amount_g !== null && req.body.amount_g !== '') {
        return res.status(400).json({ error: 'Ungültige Futtermenge.' });
      }
      event.feedAmountG = nextAmount;
    }
  }

  if (event.type === 'walk') {
    if (Object.prototype.hasOwnProperty.call(req.body, 'walk_start')) {
      const walkStart = makeIsoFromRequest(req.body.walk_start);
      if (!walkStart) {
        return res.status(400).json({ error: 'Ungültiger Walk-Start.' });
      }
      event.walkStart = walkStart;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'walk_end')) {
      const walkEnd = makeIsoFromRequest(req.body.walk_end);
      if (!walkEnd) {
        return res.status(400).json({ error: 'Ungültiges Walk-Ende.' });
      }
      event.walkEnd = walkEnd;
    }

    if (event.walkStart && event.walkEnd && new Date(event.walkEnd).getTime() < new Date(event.walkStart).getTime()) {
      return res.status(400).json({ error: 'Walk-Ende muss nach Walk-Start liegen.' });
    }

    if (event.walkStart && event.walkEnd) {
      event.durationMin = minutesBetween(event.walkStart, event.walkEnd);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'pipi')) {
      const pipi = toBooleanOrNull(req.body.pipi);
      if (pipi === null) {
        return res.status(400).json({ error: 'Ungültiger Pipi-Wert.' });
      }
      event.pipi = pipi;
      event.pipiAt = pipi ? event.pipiAt || event.walkEnd : null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'pupu')) {
      const pupu = toBooleanOrNull(req.body.pupu);
      if (pupu === null) {
        return res.status(400).json({ error: 'Ungültiger Pupu-Wert.' });
      }
      event.pupu = pupu;
      event.pupuAt = pupu ? event.pupuAt || event.walkEnd : null;
    }

    if (event.pipi && !event.pipiAt) {
      event.pipiAt = event.walkEnd || nowIso();
    }
    if (event.pupu && !event.pupuAt) {
      event.pupuAt = event.walkEnd || nowIso();
    }
  }

  if (event.type === 'sleep') {
    if (Object.prototype.hasOwnProperty.call(req.body, 'sleep_start')) {
      const sleepStart = makeIsoFromRequest(req.body.sleep_start);
      if (!sleepStart) {
        return res.status(400).json({ error: 'Ungültiger Schlaf-Start.' });
      }
      event.sleepStart = sleepStart;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'sleep_end')) {
      const sleepEnd = makeIsoFromRequest(req.body.sleep_end);
      if (!sleepEnd) {
        return res.status(400).json({ error: 'Ungültiges Schlaf-Ende.' });
      }
      event.sleepEnd = sleepEnd;
    }

    if (event.sleepStart && event.sleepEnd && new Date(event.sleepEnd).getTime() < new Date(event.sleepStart).getTime()) {
      return res.status(400).json({ error: 'Schlaf-Ende muss nach Schlaf-Start liegen.' });
    }

    if (event.sleepStart && event.sleepEnd) {
      event.durationMin = minutesBetween(event.sleepStart, event.sleepEnd);
    }
  }

  if (event.type === 'alone') {
    if (Object.prototype.hasOwnProperty.call(req.body, 'alone_start')) {
      const aloneStart = makeIsoFromRequest(req.body.alone_start);
      if (!aloneStart) {
        return res.status(400).json({ error: 'Ungültiger Alleine-Start.' });
      }
      event.aloneStart = aloneStart;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'alone_end')) {
      const aloneEnd = makeIsoFromRequest(req.body.alone_end);
      if (!aloneEnd) {
        return res.status(400).json({ error: 'Ungültiges Alleine-Ende.' });
      }
      event.aloneEnd = aloneEnd;
    }

    if (event.aloneStart && event.aloneEnd && new Date(event.aloneEnd).getTime() < new Date(event.aloneStart).getTime()) {
      return res.status(400).json({ error: 'Alleine-Ende muss nach Alleine-Start liegen.' });
    }

    if (event.aloneStart && event.aloneEnd) {
      event.durationMin = minutesBetween(event.aloneStart, event.aloneEnd);
    }
  }

  writeStore(store);
  return res.json(serializeEvent(event));
});

app.delete('/api/events', (_req, res) => {
  const store = readStore();
  const deletedCount = store.events.length;

  store.events = [];
  store.nextId = 1;
  writeStore(store);

  return res.json({
    deletedCount,
    remaining: 0,
  });
});

app.get('/api/export/json', (_req, res) => {
  const store = readStore();
  const events = [...store.events].sort((left, right) => left.id - right.id).map(serializeEvent);
  const timestamp = nowIso().replaceAll(':', '-').replace('.', '-');
  const filename = `luigi-events-${timestamp}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify({ exported_at: nowIso(), total_events: events.length, events }, null, 2));
});

app.get('/api/export/csv', (_req, res) => {
  const store = readStore();
  const events = [...store.events].sort((left, right) => left.id - right.id).map(serializeEvent);
  const timestamp = nowIso().replaceAll(':', '-').replace('.', '-');
  const filename = `luigi-events-${timestamp}.csv`;

  const header = [
    'id',
    'type',
    'created_at',
    'walk_start',
    'walk_end',
    'sleep_start',
    'sleep_end',
    'alone_start',
    'alone_end',
    'duration_min',
    'sleep_hours',
    'alone_hours',
    'feed_amount_g',
    'pipi',
    'pupu',
    'pipi_at',
    'pupu_at',
    'note',
  ];
  const rows = events.map((event) =>
    [
      event.id,
      event.type,
      event.created_at,
      event.walk_start,
      event.walk_end,
      event.sleep_start,
      event.sleep_end,
      event.alone_start,
      event.alone_end,
      event.duration_min,
      event.sleep_hours,
      event.alone_hours,
      event.feed_amount_g,
      event.pipi,
      event.pupu,
      event.pipi_at,
      event.pupu_at,
      event.note,
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [header.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

app.get('/api/stats/today', (_req, res) => {
  const store = readStore();
  const now = new Date();
  const today = toLocalDate(nowIso());
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(24, 0, 0, 0);

  const eventsToday = store.events.filter((event) => toLocalDate(event.createdAt) === today);

  const walks = eventsToday.filter((event) => event.type === 'walk');
  const feeds = eventsToday.filter((event) => event.type === 'feed');
  const sleeps = store.events.filter(
    (event) =>
      event.type === 'sleep' &&
      event.sleepStart &&
      event.sleepEnd &&
      new Date(event.sleepStart) < todayEnd &&
      new Date(event.sleepEnd) > todayStart
  );

  const totalWalkMinutes = walks.reduce((sum, event) => sum + (event.durationMin || 0), 0);
  const totalFeedGrams = feeds.reduce((sum, event) => sum + (event.feedAmountG || 0), 0);
  const totalSleepMinutes = sleeps.reduce(
    (sum, event) => sum + minutesWithinRange(event.sleepStart, event.sleepEnd, todayStart.toISOString(), todayEnd.toISOString()),
    0
  );
  const pipiCount = walks.filter((event) => event.pipi === true).length;
  const pupuCount = walks.filter((event) => event.pupu === true).length;

  res.json({
    walks: walks.length,
    feeds: feeds.length,
    totalFeedGrams,
    totalWalkMinutes,
    sleepSessions: sleeps.length,
    totalSleepHours: Number((totalSleepMinutes / 60).toFixed(2)),
    pipiCount,
    pupuCount,
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Luigi Diary läuft auf http://localhost:${port}`);
});
