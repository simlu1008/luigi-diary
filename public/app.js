async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Fehler bei API Anfrage');
  }
  return data;
}

const MINUTES_PER_DAY = 24 * 60;
let currentRangeDays = 7;

function parseTimestamp(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withUtcSuffix = new Date(`${value}Z`);
  if (!Number.isNaN(withUtcSuffix.getTime())) return withUtcSuffix;

  return null;
}

function localDayKey(date) {
  return date.toLocaleDateString('sv-SE');
}

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function percentFromMinute(minute) {
  return (clamp(minute, 0, MINUTES_PER_DAY) / MINUTES_PER_DAY) * 100;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = parseTimestamp(value);
  if (!date) return '-';
  return date.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function toHoursText(minutes) {
  return (minutes / 60).toFixed(2);
}

function eventLabel(event) {
  if (event.type === 'feed') {
    return `🍽️ Füttern · ${formatDateTime(event.created_at)}${event.note ? ` · ${event.note}` : ''}`;
  }

  if (event.type === 'sleep') {
    const duration = event.duration_min ?? 0;
    return `😴 Schlaf · ${formatDateTime(event.sleep_start)} bis ${formatDateTime(event.sleep_end)} · ${toHoursText(duration)} h${event.note ? ` · ${event.note}` : ''}`;
  }

  const pipi = event.pipi ? 'Pipi' : 'kein Pipi';
  const pupu = event.pupu ? 'Pupu' : 'kein Pupu';
  const duration = event.duration_min ?? 0;
  return `🚶 Spaziergang · ${formatDateTime(event.walk_start)} · ${duration} min · ${pipi}, ${pupu}${event.note ? ` · ${event.note}` : ''}`;
}

function createTimelineMarker({ minute, cssClass, title }) {
  const marker = document.createElement('div');
  marker.className = `timeline-marker ${cssClass}`;
  marker.style.left = `${percentFromMinute(minute)}%`;
  marker.title = title;
  return marker;
}

function createWalkSegment(startMinute, endMinute, title) {
  const segment = document.createElement('div');
  segment.className = 'timeline-walk';

  const safeStart = clamp(startMinute, 0, MINUTES_PER_DAY);
  const safeEnd = clamp(Math.max(endMinute, safeStart + 1), 0, MINUTES_PER_DAY);

  segment.style.left = `${percentFromMinute(safeStart)}%`;
  segment.style.width = `${Math.max(percentFromMinute(safeEnd) - percentFromMinute(safeStart), 0.2)}%`;
  segment.title = title;
  return segment;
}

function createSleepSegment(startMinute, endMinute, title) {
  const segment = document.createElement('div');
  segment.className = 'timeline-sleep';

  const safeStart = clamp(startMinute, 0, MINUTES_PER_DAY);
  const safeEnd = clamp(Math.max(endMinute, safeStart + 1), 0, MINUTES_PER_DAY);

  segment.style.left = `${percentFromMinute(safeStart)}%`;
  segment.style.width = `${Math.max(percentFromMinute(safeEnd) - percentFromMinute(safeStart), 0.2)}%`;
  segment.title = title;
  return segment;
}

function getEventInterval(event, now) {
  if (event.type === 'walk') {
    return {
      start: parseTimestamp(event.walk_start),
      end: parseTimestamp(event.walk_end) || now,
    };
  }

  if (event.type === 'sleep') {
    return {
      start: parseTimestamp(event.sleep_start),
      end: parseTimestamp(event.sleep_end) || now,
    };
  }

  return { start: null, end: null };
}

function eventTouchesDay(event, dayStart, dayEnd, now) {
  if (event.type === 'feed') {
    const createdAt = parseTimestamp(event.created_at);
    return Boolean(createdAt && createdAt >= dayStart && createdAt < dayEnd);
  }

  const interval = getEventInterval(event, now);
  if (!interval.start || !interval.end) return false;
  return interval.start < dayEnd && interval.end > dayStart;
}

function intervalMinutesWithinDay(event, dayStart, dayEnd, now) {
  const interval = getEventInterval(event, now);
  if (!interval.start || !interval.end) return 0;

  const clippedStart = interval.start < dayStart ? dayStart : interval.start;
  const clippedEnd = interval.end > dayEnd ? dayEnd : interval.end;

  if (clippedEnd <= clippedStart) return 0;
  return Math.floor((clippedEnd.getTime() - clippedStart.getTime()) / 60000);
}

function renderTimelineIntoTrack(track, events, dayStart, options = {}) {
  if (!track) return;
  track.innerHTML = '';

  if (options.compact) {
    track.classList.add('compact');
  } else {
    track.classList.remove('compact');
  }

  const now = new Date();
  const dayEnd = new Date(dayStart.getTime() + MINUTES_PER_DAY * 60000);
  const dayEvents = events.filter((event) => eventTouchesDay(event, dayStart, dayEnd, now));

  for (const event of dayEvents) {
    if (event.type === 'walk') {
      const interval = getEventInterval(event, now);
      const walkStart = interval.start;
      const walkEnd = interval.end;
      if (!walkStart) continue;

      const clippedStart = walkStart < dayStart ? dayStart : walkStart;
      const clippedEnd = walkEnd > dayEnd ? dayEnd : walkEnd;
      const startMinute = minuteOfDay(clippedStart);
      const endMinute = minuteOfDay(clippedEnd);
      const duration = event.duration_min ?? Math.max(0, Math.round(endMinute - startMinute));
      const walkEndInDay = walkEnd >= dayStart && walkEnd < dayEnd;

      track.appendChild(
        createWalkSegment(
          startMinute,
          endMinute,
          `Spaziergang ${formatDateTime(event.walk_start)} bis ${formatDateTime(event.walk_end || now.toISOString())} (${duration} min)`
        )
      );

      if (event.pipi && event.walk_end && walkEndInDay) {
        const walkEndMinute = minuteOfDay(walkEnd);
        track.appendChild(
          createTimelineMarker({
            minute: walkEndMinute,
            cssClass: 'timeline-pipi',
            title: `Pipi · ${formatDateTime(event.walk_end)}`,
          })
        );
      }

      if (event.pupu && event.walk_end && walkEndInDay) {
        const walkEndMinute = minuteOfDay(walkEnd);
        track.appendChild(
          createTimelineMarker({
            minute: walkEndMinute,
            cssClass: 'timeline-pupu',
            title: `Pupu · ${formatDateTime(event.walk_end)}`,
          })
        );
      }
    }

    if (event.type === 'sleep') {
      const interval = getEventInterval(event, now);
      const sleepStart = interval.start;
      const sleepEnd = interval.end;
      if (!sleepStart || !sleepEnd) continue;

      const clippedStart = sleepStart < dayStart ? dayStart : sleepStart;
      const clippedEnd = sleepEnd > dayEnd ? dayEnd : sleepEnd;
      const startMinute = minuteOfDay(clippedStart);
      const endMinute = minuteOfDay(clippedEnd);
      const duration = event.duration_min ?? intervalMinutesWithinDay(event, dayStart, dayEnd, now);

      track.appendChild(
        createSleepSegment(
          startMinute,
          endMinute,
          `Schlaf ${formatDateTime(event.sleep_start)} bis ${formatDateTime(event.sleep_end || now.toISOString())} (${toHoursText(duration)} h)`
        )
      );
    }

    if (event.type === 'feed') {
      const createdAt = parseTimestamp(event.created_at);
      if (!createdAt) continue;

      track.appendChild(
        createTimelineMarker({
          minute: minuteOfDay(createdAt),
          cssClass: 'timeline-feed',
          title: `Füttern · ${formatDateTime(event.created_at)}${event.note ? ` · ${event.note}` : ''}`,
        })
      );
    }
  }

  if (localDayKey(dayStart) === localDayKey(now)) {
    track.appendChild(
      createTimelineMarker({
        minute: minuteOfDay(now),
        cssClass: 'timeline-now',
        title: `Jetzt · ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      })
    );
  }
}

function renderTimeline(events) {
  const track = document.getElementById('timeline-track');
  const dayStart = startOfDay(new Date());
  renderTimelineIntoTrack(track, events, dayStart, { compact: false });
}

function createTimelineAxis(compact = true) {
  const axis = document.createElement('div');
  axis.className = compact ? 'timeline-axis compact' : 'timeline-axis';

  ['00:00', '06:00', '12:00', '18:00', '24:00'].forEach((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    axis.appendChild(span);
  });

  return axis;
}

function renderRangeTrends(events, rangeDays) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const rangeStart = new Date(todayStart.getTime() - (rangeDays - 1) * MINUTES_PER_DAY * 60000);
  const rangeEnd = new Date(todayStart.getTime() + MINUTES_PER_DAY * 60000);

  const rangeEvents = events.filter((event) => eventTouchesDay(event, rangeStart, rangeEnd, now));
  const walks = rangeEvents.filter((event) => event.type === 'walk');
  const feeds = rangeEvents.filter((event) => event.type === 'feed');
  const sleeps = rangeEvents.filter((event) => event.type === 'sleep');

  let totalWalkMinutes = 0;
  let totalSleepMinutes = 0;
  let activeDays = 0;

  for (let offset = 0; offset < rangeDays; offset += 1) {
    const dayStart = new Date(todayStart.getTime() - offset * MINUTES_PER_DAY * 60000);
    const dayEnd = new Date(dayStart.getTime() + MINUTES_PER_DAY * 60000);
    const dayWalkMinutes = walks.reduce((sum, event) => sum + intervalMinutesWithinDay(event, dayStart, dayEnd, now), 0);
    const daySleepMinutes = sleeps.reduce((sum, event) => sum + intervalMinutesWithinDay(event, dayStart, dayEnd, now), 0);
    const dayFeeds = feeds.filter((event) => {
      const createdAt = parseTimestamp(event.created_at);
      return Boolean(createdAt && createdAt >= dayStart && createdAt < dayEnd);
    }).length;
    totalWalkMinutes += dayWalkMinutes;
    totalSleepMinutes += daySleepMinutes;
    if (dayWalkMinutes > 0 || daySleepMinutes > 0 || dayFeeds > 0) {
      activeDays += 1;
    }
  }

  document.getElementById('trend-avg-minutes').textContent = String(Math.round(totalWalkMinutes / rangeDays));
  document.getElementById('trend-total-walks').textContent = String(walks.length);
  document.getElementById('trend-total-feeds').textContent = String(feeds.length);
  document.getElementById('trend-active-days').textContent = String(activeDays);
  const sleepTrendElement = document.getElementById('trend-avg-sleep-hours');
  if (sleepTrendElement) {
    sleepTrendElement.textContent = (totalSleepMinutes / 60 / rangeDays).toFixed(2);
  }
}

function renderRangeTimelines(events, rangeDays) {
  const container = document.getElementById('week-timelines');
  if (!container) return;

  container.innerHTML = '';

  const now = new Date();
  const todayStart = startOfDay(now);

  for (let offset = 0; offset < rangeDays; offset += 1) {
    const dayStart = new Date(todayStart.getTime() - offset * MINUTES_PER_DAY * 60000);
    const dayEnd = new Date(dayStart.getTime() + MINUTES_PER_DAY * 60000);
    const dayEvents = events.filter((event) => eventTouchesDay(event, dayStart, dayEnd, now));

    const row = document.createElement('div');
    row.className = 'timeline-day-row';

    const header = document.createElement('div');
    header.className = 'timeline-day-header';

    const label = document.createElement('strong');
    label.textContent = dayStart.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });

    const walks = dayEvents.filter((event) => event.type === 'walk');
    const sleeps = dayEvents.filter((event) => event.type === 'sleep');
    const feeds = dayEvents.filter((event) => event.type === 'feed').length;
    const minutes = walks.reduce((sum, event) => sum + intervalMinutesWithinDay(event, dayStart, dayEnd, now), 0);
    const sleepHours = sleeps.reduce((sum, event) => sum + intervalMinutesWithinDay(event, dayStart, dayEnd, now), 0) / 60;

    const summary = document.createElement('span');
    summary.className = 'timeline-day-summary';
    summary.textContent = `${walks.length} Spaziergänge · ${minutes} min · ${feeds} Fütterungen · ${sleepHours.toFixed(1)} h Schlaf`;

    header.appendChild(label);
    header.appendChild(summary);

    const track = document.createElement('div');
    track.className = 'timeline-track compact';
    renderTimelineIntoTrack(track, events, dayStart, { compact: true });

    row.appendChild(header);
    row.appendChild(track);
    row.appendChild(createTimelineAxis(true));
    container.appendChild(row);
  }
}

function updateRangeButtons() {
  const range7Button = document.getElementById('range-7');
  const range30Button = document.getElementById('range-30');

  range7Button.classList.toggle('active', currentRangeDays === 7);
  range30Button.classList.toggle('active', currentRangeDays === 30);
}

function parseCsvRows(csvText) {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.trim());
  if (lines.length < 2) return [];

  function splitCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (character === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (character === ',' && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += character;
    }

    values.push(current);
    return values;
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const records = [];

  for (const line of lines.slice(1)) {
    const columns = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] ?? '';
    });
    records.push(row);
  }

  return records;
}

async function importFromFile(strategy) {
  const fileInput = document.getElementById('import-file');
  const resultEl = document.getElementById('import-result');
  const file = fileInput.files?.[0];

  if (!file) {
    resultEl.textContent = 'Bitte zuerst eine Datei auswählen.';
    return;
  }

  const text = await file.text();
  let events = [];

  try {
    if (file.name.toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(text);
      events = Array.isArray(parsed) ? parsed : Array.isArray(parsed.events) ? parsed.events : [];
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      events = parseCsvRows(text);
    } else {
      resultEl.textContent = 'Nur .json oder .csv werden unterstützt.';
      return;
    }
  } catch {
    resultEl.textContent = 'Datei konnte nicht gelesen werden (Format prüfen).';
    return;
  }

  if (!Array.isArray(events) || events.length === 0) {
    resultEl.textContent = 'Keine importierbaren Events gefunden.';
    return;
  }

  try {
    const result = await api('/api/import/events', {
      method: 'POST',
      body: JSON.stringify({ strategy, events }),
    });

    resultEl.textContent = `Import fertig: ${result.imported} importiert, ${result.skipped} übersprungen, ${result.total} gesamt.`;
    fileInput.value = '';
    await refreshAll();
  } catch (error) {
    resultEl.textContent = `Import fehlgeschlagen: ${error.message}`;
  }
}

async function refreshAll() {
  const [status, stats, events] = await Promise.all([
    api('/api/status'),
    api('/api/stats/today'),
    api('/api/events?all=1'),
  ]);

  const walkStatusEl = document.getElementById('walk-status');
  const sleepStatusEl = document.getElementById('sleep-status');

  walkStatusEl.textContent = status.hasOpenWalk
    ? `Aktiver Spaziergang seit ${formatDateTime(status.openWalk.walk_start)}`
    : 'Aktuell kein aktiver Spaziergang.';

  sleepStatusEl.textContent = status.hasOpenSleep
    ? `Aktiver Schlaf seit ${formatDateTime(status.openSleep.sleep_start)}`
    : 'Aktuell keine aktive Schlaf-Session.';

  document.getElementById('walks').textContent = String(stats.walks);
  document.getElementById('feeds').textContent = String(stats.feeds);
  document.getElementById('minutes').textContent = String(stats.totalWalkMinutes);
  document.getElementById('sleep-hours').textContent = String(stats.totalSleepHours ?? 0);
  document.getElementById('sleep-sessions').textContent = String(stats.sleepSessions ?? 0);
  document.getElementById('pipi-count').textContent = String(stats.pipiCount);
  document.getElementById('pupu-count').textContent = String(stats.pupuCount);

  const eventsList = document.getElementById('events');
  eventsList.innerHTML = '';
  for (const event of events.slice(0, 30)) {
    const li = document.createElement('li');
    li.textContent = eventLabel(event);
    eventsList.appendChild(li);
  }

  renderTimeline(events);
  renderRangeTimelines(events, currentRangeDays);
  renderRangeTrends(events, currentRangeDays);
  updateRangeButtons();
}

function triggerDownload(url) {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function downloadWithFeedback(url, statusElementId, fallbackFileName) {
  const statusEl = document.getElementById(statusElementId);
  if (statusEl) statusEl.textContent = 'Erstelle Snapshot...';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Download fehlgeschlagen');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') || '';
    const nameMatch = contentDisposition.match(/filename="([^"]+)"/i);
    const fileName = nameMatch?.[1] || fallbackFileName;

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    if (statusEl) statusEl.textContent = `Backup gespeichert: ${fileName}`;
  } catch (error) {
    if (statusEl) statusEl.textContent = `Backup fehlgeschlagen: ${error.message}`;
  }
}

function toIsoFromLocalInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function clearManualFieldErrors() {
  ['manual-created-at', 'manual-start', 'manual-end', 'manual-type'].forEach((fieldId) => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.classList.remove('is-invalid');
    }
  });

  const inlineError = document.getElementById('manual-inline-error');
  if (inlineError) {
    inlineError.textContent = '';
  }
}

function setManualFieldError(fieldIds, message) {
  clearManualFieldErrors();
  fieldIds.forEach((fieldId) => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.classList.add('is-invalid');
    }
  });

  const inlineError = document.getElementById('manual-inline-error');
  if (inlineError) {
    inlineError.textContent = message;
  }
}

function updateManualFormVisibility() {
  const type = document.getElementById('manual-type').value;
  const startInput = document.getElementById('manual-start');
  const endInput = document.getElementById('manual-end');
  const pipiInput = document.getElementById('manual-pipi');
  const pupuInput = document.getElementById('manual-pupu');

  const needsRange = type === 'walk' || type === 'sleep';
  startInput.disabled = !needsRange;
  endInput.disabled = !needsRange;

  const isWalk = type === 'walk';
  pipiInput.disabled = !isWalk;
  pupuInput.disabled = !isWalk;

  if (!needsRange) {
    startInput.value = '';
    endInput.value = '';
  }

  if (!isWalk) {
    pipiInput.checked = false;
    pupuInput.checked = false;
  }

  clearManualFieldErrors();
}

async function submitManualEvent() {
  const type = document.getElementById('manual-type').value;
  const createdAt = toIsoFromLocalInput(document.getElementById('manual-created-at').value);
  const start = toIsoFromLocalInput(document.getElementById('manual-start').value);
  const end = toIsoFromLocalInput(document.getElementById('manual-end').value);
  const pipi = document.getElementById('manual-pipi').checked;
  const pupu = document.getElementById('manual-pupu').checked;
  const note = document.getElementById('manual-note').value.trim();
  const resultEl = document.getElementById('manual-result');
  clearManualFieldErrors();
  resultEl.textContent = '';

  if ((type === 'walk' || type === 'sleep') && (!start || !end)) {
    setManualFieldError(['manual-start', 'manual-end'], 'Bitte für diesen Typ Start und Ende ausfüllen.');
    return;
  }

  if ((type === 'walk' || type === 'sleep') && parseTimestamp(end) <= parseTimestamp(start)) {
    setManualFieldError(['manual-start', 'manual-end'], 'Ende muss nach dem Start liegen.');
    return;
  }

  const payload = {
    type,
    created_at: createdAt,
    note,
  };

  if (type === 'walk') {
    payload.walk_start = start;
    payload.walk_end = end;
    payload.pipi = pipi;
    payload.pupu = pupu;
  }

  if (type === 'sleep') {
    payload.sleep_start = start;
    payload.sleep_end = end;
  }

  try {
    await api('/api/manual/event', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    resultEl.textContent = 'Manueller Eintrag gespeichert.';
    await refreshAll();
  } catch (error) {
    resultEl.textContent = `Speichern fehlgeschlagen: ${error.message}`;
  }
}

function bindActions() {
  const startWalkButton = document.getElementById('start-walk');
  const endWalkButton = document.getElementById('end-walk');
  const feedButton = document.getElementById('feed');
  const startSleepButton = document.getElementById('start-sleep');
  const endSleepButton = document.getElementById('end-sleep');
  const backupButton = document.getElementById('backup-json');
  const exportJsonButton = document.getElementById('export-json');
  const exportCsvButton = document.getElementById('export-csv');
  const importAppendButton = document.getElementById('import-append');
  const importReplaceButton = document.getElementById('import-replace');
  const manualSaveButton = document.getElementById('manual-save');
  const manualTypeSelect = document.getElementById('manual-type');
  const range7Button = document.getElementById('range-7');
  const range30Button = document.getElementById('range-30');

  updateManualFormVisibility();
  manualTypeSelect.addEventListener('change', updateManualFormVisibility);

  startWalkButton.addEventListener('click', async () => {
    try {
      await api('/api/walk/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  });

  endWalkButton.addEventListener('click', async () => {
    const pipi = document.getElementById('pipi').checked;
    const pupu = document.getElementById('pupu').checked;
    const note = document.getElementById('walk-note').value.trim();

    try {
      await api('/api/walk/end', {
        method: 'POST',
        body: JSON.stringify({ pipi, pupu, note }),
      });

      document.getElementById('pipi').checked = false;
      document.getElementById('pupu').checked = false;
      document.getElementById('walk-note').value = '';
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  });

  feedButton.addEventListener('click', async () => {
    const note = document.getElementById('feed-note').value.trim();

    try {
      await api('/api/feed', {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      document.getElementById('feed-note').value = '';
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  });

  startSleepButton.addEventListener('click', async () => {
    try {
      await api('/api/sleep/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  });

  endSleepButton.addEventListener('click', async () => {
    const note = document.getElementById('sleep-note').value.trim();

    try {
      await api('/api/sleep/end', {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      document.getElementById('sleep-note').value = '';
      await refreshAll();
    } catch (error) {
      alert(error.message);
    }
  });

  backupButton.addEventListener('click', async () => {
    await downloadWithFeedback('/api/export/json', 'backup-result', `luigi-backup-${Date.now()}.json`);
  });

  exportJsonButton.addEventListener('click', () => {
    triggerDownload('/api/export/json');
  });

  exportCsvButton.addEventListener('click', () => {
    triggerDownload('/api/export/csv');
  });

  importAppendButton.addEventListener('click', async () => {
    await importFromFile('append');
  });

  importReplaceButton.addEventListener('click', async () => {
    const confirmed = window.confirm('Wirklich alle vorhandenen Daten durch die Importdatei ersetzen?');
    if (!confirmed) return;
    await importFromFile('replace');
  });

  manualSaveButton.addEventListener('click', async () => {
    await submitManualEvent();
  });

  range7Button.addEventListener('click', async () => {
    currentRangeDays = 7;
    await refreshAll();
  });

  range30Button.addEventListener('click', async () => {
    currentRangeDays = 30;
    await refreshAll();
  });
}

bindActions();
refreshAll().catch((error) => {
  alert(`Fehler beim Laden: ${error.message}`);
});
