const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataFile = process.env.DATA_FILE || path.join(__dirname, 'data', 'events.json');
const appUsername = process.env.APP_USERNAME || '';
const appPassword = process.env.APP_PASSWORD || '';
const isAuthEnabled = Boolean(appUsername && appPassword);

if ((appUsername && !appPassword) || (!appUsername && appPassword)) {
  console.warn('Auth ist nur aktiv, wenn APP_USERNAME und APP_PASSWORD beide gesetzt sind.');
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
    sleep_start: event.sleepStart,
    sleep_end: event.sleepEnd,
    sleep_hours: event.type === 'sleep' && Number.isFinite(event.durationMin) ? Number((event.durationMin / 60).toFixed(2)) : null,
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

  const type = ['walk', 'feed', 'sleep'].includes(rawEvent.type) ? rawEvent.type : null;
  if (!type) return null;

  const createdAt = toIsoOrNull(rawEvent.created_at ?? rawEvent.createdAt) || nowIso();
  const walkStart = toIsoOrNull(rawEvent.walk_start ?? rawEvent.walkStart);
  const walkEnd = toIsoOrNull(rawEvent.walk_end ?? rawEvent.walkEnd);
  const sleepStart = toIsoOrNull(rawEvent.sleep_start ?? rawEvent.sleepStart);
  const sleepEnd = toIsoOrNull(rawEvent.sleep_end ?? rawEvent.sleepEnd);
  const durationMin = toIntegerOrNull(rawEvent.duration_min ?? rawEvent.durationMin);
  const pipi = toBooleanOrNull(rawEvent.pipi);
  const pupu = toBooleanOrNull(rawEvent.pupu);
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
      sleepStart: null,
      sleepEnd: null,
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
      sleepStart,
      sleepEnd,
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
    sleepStart: null,
    sleepEnd: null,
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
    event.sleepStart,
    event.sleepEnd,
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
  if (!isAuthEnabled || req.path === '/api/health') {
    return next();
  }

  if (isRequestAuthorized(req)) {
    return next();
  }

  return respondUnauthorized(req, res);
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/status', (_req, res) => {
  const store = readStore();
  const openWalk = getOpenWalk(store);
  const openSleep = getOpenSleep(store);
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
    sleepStart: null,
    sleepEnd: null,
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

  openWalk.walkEnd = endTime;
  openWalk.durationMin = minutesBetween(openWalk.walkStart, endTime);
  openWalk.pipi = req.body?.pipi === true;
  openWalk.pupu = req.body?.pupu === true;
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
    note: openWalk.note,
  });
});

app.post('/api/feed', (req, res) => {
  const store = readStore();
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

  const event = {
    type: 'feed',
    createdAt: nowIso(),
    walkStart: null,
    walkEnd: null,
    durationMin: null,
    pipi: null,
    pupu: null,
    sleepStart: null,
    sleepEnd: null,
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
    sleepStart: nowIso(),
    sleepEnd: null,
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

app.post('/api/manual/event', (req, res) => {
  const store = readStore();
  const type = req.body?.type;

  if (!['walk', 'feed', 'sleep'].includes(type)) {
    return res.status(400).json({ error: 'Ungültiger Typ. Erlaubt: walk, feed, sleep.' });
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
      sleepStart: null,
      sleepEnd: null,
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
      sleepStart: null,
      sleepEnd: null,
      note,
    };

    const inserted = pushEvent(store, event);
    return res.status(201).json(serializeEvent(inserted));
  }

  const sleepStart = makeIsoFromRequest(req.body?.sleep_start);
  const sleepEnd = makeIsoFromRequest(req.body?.sleep_end);

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
    sleepStart,
    sleepEnd,
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
    'duration_min',
    'sleep_hours',
    'pipi',
    'pupu',
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
      event.duration_min,
      event.sleep_hours,
      event.pipi,
      event.pupu,
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
  const totalSleepMinutes = sleeps.reduce(
    (sum, event) => sum + minutesWithinRange(event.sleepStart, event.sleepEnd, todayStart.toISOString(), todayEnd.toISOString()),
    0
  );
  const pipiCount = walks.filter((event) => event.pipi === true).length;
  const pupuCount = walks.filter((event) => event.pupu === true).length;

  res.json({
    walks: walks.length,
    feeds: feeds.length,
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
