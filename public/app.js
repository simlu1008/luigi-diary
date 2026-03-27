async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(translateServerError(data.error || t('genericApiError')));
  }
  return data;
}

const MINUTES_PER_DAY = 24 * 60;
let currentRangeDays = 7;
const LANGUAGE_STORAGE_KEY = 'luigi-language';
const SUPPORTED_LANGUAGES = ['de', 'en'];
let currentLanguage = 'en';
let currentWalkPipiAt = null;
let currentWalkPupuAt = null;
let lastPipiDoneAt = null;
let lastPupuDoneAt = null;
let eliminationStatusIntervalId = null;

const TRANSLATIONS = {
  de: {
    appTitle: '🐶 Luigi Diary',
    appSubtitle: 'Spaziergänge & Fütterung schnell vom Handy erfassen',
    languageLabel: 'Sprache',
    languageAria: 'Sprache wählen',
    headingStatus: 'Status',
    headingActions: 'Aktionen',
    headingToday: 'Heute',
    headingTimeline: '24h Zeitstrahl',
    headingRange: 'Zeitraum-Auswertung',
    headingManual: 'Manuell nachtragen',
    headingEvents: 'Letzte Einträge',
    headingData: 'Daten',
    labelPipi: 'Pipi gemacht',
    labelPupu: 'Pupu gemacht',
    walkNotePlaceholder: 'Notiz (optional)',
    feedNotePlaceholder: 'Füttern-Notiz (z. B. 150g)',
    sleepNotePlaceholder: 'Schlaf-Notiz (optional)',
    buttonStartWalk: '🚶 Spaziergang starten',
    buttonEndWalk: '✅ Spaziergang beenden',
    buttonFeed: '🍽️ Gefüttert',
    buttonStartSleep: '🌙 Schlafen gestartet',
    buttonEndSleep: '⏰ Aufgestanden',
    statWalksLabel: 'Spaziergänge',
    statFeedsLabel: 'Fütterungen',
    statMinutesLabel: 'Minuten draußen',
    statSleepHoursLabel: 'Schlafstunden',
    statSleepSessionsLabel: 'Schlaf-Sessions',
    statPipiLabel: 'mit Pipi',
    statPupuLabel: 'mit Pupu',
    timelineSubtitle: 'Ein Blick auf heute: Dauer draußen, Füttern, Pipi & Pupu.',
    legendWalk: 'Spaziergang',
    legendSleep: 'Schlaf',
    legendFeed: 'Füttern',
    legendPipi: 'Pipi',
    legendPupu: 'Pupu',
    legendNow: 'Jetzt',
    rangeSubtitle: 'Tagesvergleich als 24h-Zeitstrahl pro Tag.',
    range7: '7 Tage',
    range30: '30 Tage',
    trendAvgMinutesLabel: 'Ø Minuten/Tag',
    trendAvgSleepHoursLabel: 'Ø Schlafstunden/Tag',
    trendTotalWalksLabel: 'Spaziergänge gesamt',
    trendTotalFeedsLabel: 'Fütterungen gesamt',
    trendActiveDaysLabel: 'Tage mit Aktivität',
    manualSubtitle: 'Für alte Daten (z. B. gestern) kannst du Einträge mit Uhrzeit nachtragen.',
    manualLabelType: 'Typ',
    manualTypeWalk: 'Spaziergang',
    manualTypeFeed: 'Füttern',
    manualTypeSleep: 'Schlafen',
    manualLabelCreated: 'Zeitpunkt (optional)',
    manualLabelStart: 'Start (Walk/Sleep)',
    manualLabelEnd: 'Ende (Walk/Sleep)',
    manualLabelPipi: 'Pipi (nur Walk)',
    manualLabelPupu: 'Pupu (nur Walk)',
    manualLabelNote: 'Notiz',
    manualNotePlaceholder: 'z. B. nachgetragen',
    buttonManualSave: '➕ Eintrag speichern',
    dataSubtitle: 'Alle Einträge bleiben gespeichert und können exportiert werden.',
    buttonBackupJson: '💾 Backup erstellen (JSON)',
    buttonExportJson: '⬇️ Export JSON',
    buttonExportCsv: '⬇️ Export CSV',
    buttonDeleteLast: '↩️ Letzten Eintrag löschen',
    buttonDeleteAll: '🗑️ Alle Daten löschen',
    deleteHint: 'Tipp: Vor dem Löschen zuerst ein Backup erstellen.',
    buttonImportAppend: '📥 Import anhängen',
    buttonImportReplace: '♻️ Import ersetzen',
    importHint: '`Anhängen` ergänzt neue Einträge, `Ersetzen` überschreibt alles mit der Datei.',
    statusLoadingWalk: 'Lade Status…',
    statusLoadingSleep: 'Lade Schlafstatus…',
    statusOpenWalk: 'Aktiver Spaziergang seit {time}',
    statusNoWalk: 'Aktuell kein aktiver Spaziergang.',
    statusOpenSleep: 'Aktiver Schlaf seit {time}',
    statusNoSleep: 'Aktuell keine aktive Schlaf-Session.',
    statusLastPipi: 'Letztes Pipi: {since}',
    statusLastPupu: 'Letztes Pupu: {since}',
    statusNever: 'noch kein Eintrag',
    timeJustNow: 'gerade eben',
    timeMinutesAgo: 'vor {minutes} min',
    timeHoursAgo: 'vor {hours} h',
    timeHoursMinutesAgo: 'vor {hours} h {minutes} min',
    timeDaysAgo: 'vor {days} d',
    timeDaysHoursAgo: 'vor {days} d {hours} h',
    eventFeed: '🍽️ Füttern · {time}{note}',
    eventSleep: '😴 Schlaf · {start} bis {end} · {hours} h{note}',
    eventWalk: '🚶 Spaziergang · {start} · {minutes} min · {pipi}, {pupu}{note}',
    notePrefix: ' · {note}',
    pipiYes: 'Pipi',
    pipiNo: 'kein Pipi',
    pupuYes: 'Pupu',
    pupuNo: 'kein Pupu',
    markerWalk: 'Spaziergang {start} bis {end} ({minutes} min)',
    markerSleep: 'Schlaf {start} bis {end} ({hours} h)',
    markerPipi: 'Pipi · {time}',
    markerPupu: 'Pupu · {time}',
    markerFeed: 'Füttern · {time}{note}',
    markerNow: 'Jetzt · {time}',
    rangeSummary: '{walks} Spaziergänge · {minutes} min · {feeds} Fütterungen · {sleepHours} h Schlaf',
    importSelectFile: 'Bitte zuerst eine Datei auswählen.',
    importOnlyJsonCsv: 'Nur .json oder .csv werden unterstützt.',
    importReadFailed: 'Datei konnte nicht gelesen werden (Format prüfen).',
    importNoEvents: 'Keine importierbaren Events gefunden.',
    importDone: 'Import fertig: {imported} importiert, {skipped} übersprungen, {total} gesamt.',
    importFailed: 'Import fehlgeschlagen: {error}',
    backupCreating: 'Erstelle Snapshot...',
    downloadFailed: 'Download fehlgeschlagen',
    backupSaved: 'Backup gespeichert: {fileName}',
    backupFailed: 'Backup fehlgeschlagen: {error}',
    manualNeedsRange: 'Bitte für diesen Typ Start und Ende ausfüllen.',
    manualEndAfterStart: 'Ende muss nach dem Start liegen.',
    manualSaved: 'Manueller Eintrag gespeichert.',
    manualSaveFailed: 'Speichern fehlgeschlagen: {error}',
    confirmDeleteLast: 'Wirklich den letzten Eintrag löschen?',
    confirmDeleteAll: 'Wirklich ALLE Daten löschen? Dieser Schritt kann nicht rückgängig gemacht werden.',
    confirmReplaceImport: 'Wirklich alle vorhandenen Daten durch die Importdatei ersetzen?',
    deleteLastDone: 'Letzter Eintrag gelöscht. Noch {remaining} Einträge vorhanden.',
    deleteAllDone: '{deletedCount} Einträge gelöscht. Daten sind jetzt leer.',
    deleteFailed: 'Löschen fehlgeschlagen: {error}',
    loadError: 'Fehler beim Laden: {error}',
    genericApiError: 'Fehler bei API Anfrage',
  },
  en: {
    appTitle: '🐶 Luigi Diary',
    appSubtitle: 'Quickly track walks and feeding from your phone',
    languageLabel: 'Language',
    languageAria: 'Choose language',
    headingStatus: 'Status',
    headingActions: 'Actions',
    headingToday: 'Today',
    headingTimeline: '24h Timeline',
    headingRange: 'Range Analytics',
    headingManual: 'Manual Entry',
    headingEvents: 'Recent Entries',
    headingData: 'Data',
    labelPipi: 'Pee done',
    labelPupu: 'Poop done',
    walkNotePlaceholder: 'Note (optional)',
    feedNotePlaceholder: 'Feeding note (e.g. 150g)',
    sleepNotePlaceholder: 'Sleep note (optional)',
    buttonStartWalk: '🚶 Start walk',
    buttonEndWalk: '✅ End walk',
    buttonFeed: '🍽️ Fed',
    buttonStartSleep: '🌙 Started sleep',
    buttonEndSleep: '⏰ Woke up',
    statWalksLabel: 'Walks',
    statFeedsLabel: 'Feedings',
    statMinutesLabel: 'Minutes outside',
    statSleepHoursLabel: 'Sleep hours',
    statSleepSessionsLabel: 'Sleep sessions',
    statPipiLabel: 'with pee',
    statPupuLabel: 'with poop',
    timelineSubtitle: 'Today at a glance: outside duration, feeding, pee & poop.',
    legendWalk: 'Walk',
    legendSleep: 'Sleep',
    legendFeed: 'Feed',
    legendPipi: 'Pee',
    legendPupu: 'Poop',
    legendNow: 'Now',
    rangeSubtitle: 'Day-by-day comparison as a 24h timeline per day.',
    range7: '7 days',
    range30: '30 days',
    trendAvgMinutesLabel: 'Avg minutes/day',
    trendAvgSleepHoursLabel: 'Avg sleep hours/day',
    trendTotalWalksLabel: 'Total walks',
    trendTotalFeedsLabel: 'Total feedings',
    trendActiveDaysLabel: 'Active days',
    manualSubtitle: 'For older data (e.g. yesterday), add entries with exact times.',
    manualLabelType: 'Type',
    manualTypeWalk: 'Walk',
    manualTypeFeed: 'Feed',
    manualTypeSleep: 'Sleep',
    manualLabelCreated: 'Timestamp (optional)',
    manualLabelStart: 'Start (Walk/Sleep)',
    manualLabelEnd: 'End (Walk/Sleep)',
    manualLabelPipi: 'Pee (walk only)',
    manualLabelPupu: 'Poop (walk only)',
    manualLabelNote: 'Note',
    manualNotePlaceholder: 'e.g. backfilled',
    buttonManualSave: '➕ Save entry',
    dataSubtitle: 'All entries are stored and can be exported.',
    buttonBackupJson: '💾 Create backup (JSON)',
    buttonExportJson: '⬇️ Export JSON',
    buttonExportCsv: '⬇️ Export CSV',
    buttonDeleteLast: '↩️ Delete last entry',
    buttonDeleteAll: '🗑️ Delete all data',
    deleteHint: 'Tip: create a backup before deleting.',
    buttonImportAppend: '📥 Append import',
    buttonImportReplace: '♻️ Replace with import',
    importHint: '`Append` adds new entries, `Replace` overwrites everything with the file.',
    statusLoadingWalk: 'Loading status…',
    statusLoadingSleep: 'Loading sleep status…',
    statusOpenWalk: 'Active walk since {time}',
    statusNoWalk: 'No active walk right now.',
    statusOpenSleep: 'Active sleep since {time}',
    statusNoSleep: 'No active sleep session right now.',
    statusLastPipi: 'Last pee: {since}',
    statusLastPupu: 'Last poop: {since}',
    statusNever: 'no entry yet',
    timeJustNow: 'just now',
    timeMinutesAgo: '{minutes} min ago',
    timeHoursAgo: '{hours} h ago',
    timeHoursMinutesAgo: '{hours} h {minutes} min ago',
    timeDaysAgo: '{days} d ago',
    timeDaysHoursAgo: '{days} d {hours} h ago',
    eventFeed: '🍽️ Feed · {time}{note}',
    eventSleep: '😴 Sleep · {start} to {end} · {hours} h{note}',
    eventWalk: '🚶 Walk · {start} · {minutes} min · {pipi}, {pupu}{note}',
    notePrefix: ' · {note}',
    pipiYes: 'pee',
    pipiNo: 'no pee',
    pupuYes: 'poop',
    pupuNo: 'no poop',
    markerWalk: 'Walk {start} to {end} ({minutes} min)',
    markerSleep: 'Sleep {start} to {end} ({hours} h)',
    markerPipi: 'Pee · {time}',
    markerPupu: 'Poop · {time}',
    markerFeed: 'Feed · {time}{note}',
    markerNow: 'Now · {time}',
    rangeSummary: '{walks} walks · {minutes} min · {feeds} feedings · {sleepHours} h sleep',
    importSelectFile: 'Please select a file first.',
    importOnlyJsonCsv: 'Only .json or .csv are supported.',
    importReadFailed: 'Could not read file (please check format).',
    importNoEvents: 'No importable events found.',
    importDone: 'Import complete: {imported} imported, {skipped} skipped, {total} total.',
    importFailed: 'Import failed: {error}',
    backupCreating: 'Creating snapshot...',
    downloadFailed: 'Download failed',
    backupSaved: 'Backup saved: {fileName}',
    backupFailed: 'Backup failed: {error}',
    manualNeedsRange: 'Please fill start and end for this type.',
    manualEndAfterStart: 'End must be after start.',
    manualSaved: 'Manual entry saved.',
    manualSaveFailed: 'Save failed: {error}',
    confirmDeleteLast: 'Delete the last entry?',
    confirmDeleteAll: 'Delete ALL data? This cannot be undone.',
    confirmReplaceImport: 'Replace all existing data with the import file?',
    deleteLastDone: 'Last entry deleted. {remaining} entries remaining.',
    deleteAllDone: '{deletedCount} entries deleted. Data is now empty.',
    deleteFailed: 'Delete failed: {error}',
    loadError: 'Error while loading: {error}',
    genericApiError: 'API request failed',
  },
};

const SERVER_ERROR_TRANSLATIONS_EN = {
  'Es läuft bereits ein Spaziergang.': 'A walk is already active.',
  'Kein aktiver Spaziergang.': 'No active walk.',
  'Es gibt bereits eine offene Schlaf-Session.': 'There is already an open sleep session.',
  'Keine aktive Schlaf-Session.': 'No active sleep session.',
  'Ungültiger Typ. Erlaubt: walk, feed, sleep.': 'Invalid type. Allowed: walk, feed, sleep.',
  'Für manuelle Spaziergänge sind `walk_start` und `walk_end` nötig.': 'Manual walk entries require `walk_start` and `walk_end`.',
  'Für manuelle Schlafdaten sind `sleep_start` und `sleep_end` nötig.': 'Manual sleep entries require `sleep_start` and `sleep_end`.',
  'Ungültige Importdaten. Erwartet wird ein Array in `events`.': 'Invalid import data. Expected an array in `events`.',
  'Keine Einträge vorhanden.': 'No entries available.',
};

function t(key, variables = {}) {
  const dictionary = TRANSLATIONS[currentLanguage] || TRANSLATIONS.de;
  const fallbackDictionary = TRANSLATIONS.de;
  const template = dictionary[key] ?? fallbackDictionary[key] ?? key;

  return template.replace(/\{(\w+)\}/g, (_match, variableName) => {
    const value = variables[variableName];
    return value === undefined || value === null ? '' : String(value);
  });
}

function getLocale() {
  return currentLanguage === 'en' ? 'en-US' : 'de-DE';
}

function translateServerError(message) {
  if (currentLanguage !== 'en') {
    return message;
  }
  return SERVER_ERROR_TRANSLATIONS_EN[message] || message;
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

function setPlaceholder(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.placeholder = text;
  }
}

function applyStaticTranslations() {
  document.title = 'Luigi Diary';
  setText('app-title', t('appTitle'));
  setText('app-subtitle', t('appSubtitle'));
  setText('language-label', t('languageLabel'));
  setText('heading-status', t('headingStatus'));
  setText('heading-actions', t('headingActions'));
  setText('heading-today', t('headingToday'));
  setText('heading-timeline', t('headingTimeline'));
  setText('heading-range', t('headingRange'));
  setText('heading-manual', t('headingManual'));
  setText('heading-events', t('headingEvents'));
  setText('heading-data', t('headingData'));
  setText('label-pipi', t('labelPipi'));
  setText('label-pupu', t('labelPupu'));
  setText('start-walk', t('buttonStartWalk'));
  setText('end-walk', t('buttonEndWalk'));
  setText('feed', t('buttonFeed'));
  setText('start-sleep', t('buttonStartSleep'));
  setText('end-sleep', t('buttonEndSleep'));
  setText('stat-walks-label', t('statWalksLabel'));
  setText('stat-feeds-label', t('statFeedsLabel'));
  setText('stat-minutes-label', t('statMinutesLabel'));
  setText('stat-sleep-hours-label', t('statSleepHoursLabel'));
  setText('stat-sleep-sessions-label', t('statSleepSessionsLabel'));
  setText('stat-pipi-label', t('statPipiLabel'));
  setText('stat-pupu-label', t('statPupuLabel'));
  setText('timeline-subtitle', t('timelineSubtitle'));
  setText('legend-walk', t('legendWalk'));
  setText('legend-sleep', t('legendSleep'));
  setText('legend-feed', t('legendFeed'));
  setText('legend-pipi', t('legendPipi'));
  setText('legend-pupu', t('legendPupu'));
  setText('legend-now', t('legendNow'));
  setText('range-subtitle', t('rangeSubtitle'));
  setText('range-7', t('range7'));
  setText('range-30', t('range30'));
  setText('trend-avg-minutes-label', t('trendAvgMinutesLabel'));
  setText('trend-avg-sleep-hours-label', t('trendAvgSleepHoursLabel'));
  setText('trend-total-walks-label', t('trendTotalWalksLabel'));
  setText('trend-total-feeds-label', t('trendTotalFeedsLabel'));
  setText('trend-active-days-label', t('trendActiveDaysLabel'));
  setText('manual-subtitle', t('manualSubtitle'));
  setText('manual-label-type', t('manualLabelType'));
  setText('manual-type-walk', t('manualTypeWalk'));
  setText('manual-type-feed', t('manualTypeFeed'));
  setText('manual-type-sleep', t('manualTypeSleep'));
  setText('manual-label-created', t('manualLabelCreated'));
  setText('manual-label-start', t('manualLabelStart'));
  setText('manual-label-end', t('manualLabelEnd'));
  setText('manual-label-pipi', t('manualLabelPipi'));
  setText('manual-label-pupu', t('manualLabelPupu'));
  setText('manual-label-note', t('manualLabelNote'));
  setText('manual-save', t('buttonManualSave'));
  setText('data-subtitle', t('dataSubtitle'));
  setText('backup-json', t('buttonBackupJson'));
  setText('export-json', t('buttonExportJson'));
  setText('export-csv', t('buttonExportCsv'));
  setText('delete-last', t('buttonDeleteLast'));
  setText('delete-all', t('buttonDeleteAll'));
  setText('delete-hint', t('deleteHint'));
  setText('import-append', t('buttonImportAppend'));
  setText('import-replace', t('buttonImportReplace'));
  setText('import-hint', t('importHint'));

  setPlaceholder('walk-note', t('walkNotePlaceholder'));
  setPlaceholder('feed-note', t('feedNotePlaceholder'));
  setPlaceholder('sleep-note', t('sleepNotePlaceholder'));
  setPlaceholder('manual-note', t('manualNotePlaceholder'));

  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.setAttribute('aria-label', t('languageAria'));
  }

  renderEliminationStatus();
}

function initLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
    currentLanguage = savedLanguage;
  }

  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
}

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
  return date.toLocaleString(getLocale(), { dateStyle: 'short', timeStyle: 'short' });
}

function formatElapsedSince(dateValue) {
  if (!dateValue) {
    return t('statusNever');
  }

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - dateValue.getTime()) / 60000));
  if (elapsedMinutes < 1) {
    return t('timeJustNow');
  }

  if (elapsedMinutes < 60) {
    return t('timeMinutesAgo', { minutes: elapsedMinutes });
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  if (hours < 24) {
    if (minutes === 0) {
      return t('timeHoursAgo', { hours });
    }
    return t('timeHoursMinutesAgo', { hours, minutes });
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return t('timeDaysAgo', { days });
  }
  return t('timeDaysHoursAgo', { days, hours: remainingHours });
}

function extractLastEliminationTimestamp(events, fieldName, fallbackFieldName) {
  let latestDate = null;

  for (const event of events) {
    if (event.type !== 'walk' || event[fieldName] !== true) continue;
    const eventTimeRaw = event[`${fieldName}_at`] || event[fallbackFieldName] || event.created_at;
    const eventTime = parseTimestamp(eventTimeRaw);
    if (!eventTime) continue;

    if (!latestDate || eventTime > latestDate) {
      latestDate = eventTime;
    }
  }

  return latestDate;
}

function renderEliminationStatus() {
  const pipiStatusEl = document.getElementById('last-pipi-status');
  const pupuStatusEl = document.getElementById('last-pupu-status');
  if (!pipiStatusEl || !pupuStatusEl) return;

  pipiStatusEl.textContent = t('statusLastPipi', { since: formatElapsedSince(lastPipiDoneAt) });
  pupuStatusEl.textContent = t('statusLastPupu', { since: formatElapsedSince(lastPupuDoneAt) });
}

function startEliminationStatusTicker() {
  if (eliminationStatusIntervalId) {
    clearInterval(eliminationStatusIntervalId);
  }
  eliminationStatusIntervalId = setInterval(() => {
    renderEliminationStatus();
  }, 60000);
}

function toHoursText(minutes) {
  return (minutes / 60).toFixed(2);
}

function eventLabel(event) {
  const note = event.note ? t('notePrefix', { note: event.note }) : '';

  if (event.type === 'feed') {
    return t('eventFeed', { time: formatDateTime(event.created_at), note });
  }

  if (event.type === 'sleep') {
    const duration = event.duration_min ?? 0;
    return t('eventSleep', {
      start: formatDateTime(event.sleep_start),
      end: formatDateTime(event.sleep_end),
      hours: toHoursText(duration),
      note,
    });
  }

  const pipi = event.pipi ? t('pipiYes') : t('pipiNo');
  const pupu = event.pupu ? t('pupuYes') : t('pupuNo');
  const duration = event.duration_min ?? 0;
  return t('eventWalk', {
    start: formatDateTime(event.walk_start),
    minutes: duration,
    pipi,
    pupu,
    note,
  });
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
      const pipiAtRaw = event.pipi_at || event.walk_end;
      const pupuAtRaw = event.pupu_at || event.walk_end;
      const pipiAt = parseTimestamp(pipiAtRaw);
      const pupuAt = parseTimestamp(pupuAtRaw);

      track.appendChild(
        createWalkSegment(
          startMinute,
          endMinute,
          t('markerWalk', {
            start: formatDateTime(event.walk_start),
            end: formatDateTime(event.walk_end || now.toISOString()),
            minutes: duration,
          })
        )
      );

      if (event.pipi && pipiAt && pipiAt >= dayStart && pipiAt < dayEnd) {
        const pipiMinute = minuteOfDay(pipiAt);
        track.appendChild(
          createTimelineMarker({
            minute: pipiMinute,
            cssClass: 'timeline-pipi',
            title: t('markerPipi', { time: formatDateTime(pipiAtRaw) }),
          })
        );
      }

      if (event.pupu && pupuAt && pupuAt >= dayStart && pupuAt < dayEnd) {
        const pupuMinute = minuteOfDay(pupuAt);
        track.appendChild(
          createTimelineMarker({
            minute: pupuMinute,
            cssClass: 'timeline-pupu',
            title: t('markerPupu', { time: formatDateTime(pupuAtRaw) }),
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
          t('markerSleep', {
            start: formatDateTime(event.sleep_start),
            end: formatDateTime(event.sleep_end || now.toISOString()),
            hours: toHoursText(duration),
          })
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
          title: t('markerFeed', {
            time: formatDateTime(event.created_at),
            note: event.note ? t('notePrefix', { note: event.note }) : '',
          }),
        })
      );
    }
  }

  if (localDayKey(dayStart) === localDayKey(now)) {
    track.appendChild(
      createTimelineMarker({
        minute: minuteOfDay(now),
        cssClass: 'timeline-now',
        title: t('markerNow', { time: now.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' }) }),
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
    label.textContent = dayStart.toLocaleDateString(getLocale(), {
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
    summary.textContent = t('rangeSummary', {
      walks: walks.length,
      minutes,
      feeds,
      sleepHours: sleepHours.toFixed(1),
    });

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
    resultEl.textContent = t('importSelectFile');
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
      resultEl.textContent = t('importOnlyJsonCsv');
      return;
    }
  } catch {
    resultEl.textContent = t('importReadFailed');
    return;
  }

  if (!Array.isArray(events) || events.length === 0) {
    resultEl.textContent = t('importNoEvents');
    return;
  }

  try {
    const result = await api('/api/import/events', {
      method: 'POST',
      body: JSON.stringify({ strategy, events }),
    });

    resultEl.textContent = t('importDone', {
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
    });
    fileInput.value = '';
    await refreshAll();
  } catch (error) {
    resultEl.textContent = t('importFailed', { error: error.message });
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
    ? t('statusOpenWalk', { time: formatDateTime(status.openWalk.walk_start) })
    : t('statusNoWalk');

  if (!status.hasOpenWalk) {
    currentWalkPipiAt = null;
    currentWalkPupuAt = null;
  }

  sleepStatusEl.textContent = status.hasOpenSleep
    ? t('statusOpenSleep', { time: formatDateTime(status.openSleep.sleep_start) })
    : t('statusNoSleep');

  lastPipiDoneAt = extractLastEliminationTimestamp(events, 'pipi', 'walk_end');
  lastPupuDoneAt = extractLastEliminationTimestamp(events, 'pupu', 'walk_end');
  renderEliminationStatus();

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
  if (statusEl) statusEl.textContent = t('backupCreating');

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(t('downloadFailed'));
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

    if (statusEl) statusEl.textContent = t('backupSaved', { fileName });
  } catch (error) {
    if (statusEl) statusEl.textContent = t('backupFailed', { error: error.message });
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
    setManualFieldError(['manual-start', 'manual-end'], t('manualNeedsRange'));
    return;
  }

  if ((type === 'walk' || type === 'sleep') && parseTimestamp(end) <= parseTimestamp(start)) {
    setManualFieldError(['manual-start', 'manual-end'], t('manualEndAfterStart'));
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

    resultEl.textContent = t('manualSaved');
    await refreshAll();
  } catch (error) {
    resultEl.textContent = t('manualSaveFailed', { error: error.message });
  }
}

function bindActions() {
  const startWalkButton = document.getElementById('start-walk');
  const endWalkButton = document.getElementById('end-walk');
  const pipiCheckbox = document.getElementById('pipi');
  const pupuCheckbox = document.getElementById('pupu');
  const feedButton = document.getElementById('feed');
  const startSleepButton = document.getElementById('start-sleep');
  const endSleepButton = document.getElementById('end-sleep');
  const backupButton = document.getElementById('backup-json');
  const exportJsonButton = document.getElementById('export-json');
  const exportCsvButton = document.getElementById('export-csv');
  const deleteLastButton = document.getElementById('delete-last');
  const deleteAllButton = document.getElementById('delete-all');
  const importAppendButton = document.getElementById('import-append');
  const importReplaceButton = document.getElementById('import-replace');
  const manualSaveButton = document.getElementById('manual-save');
  const manualTypeSelect = document.getElementById('manual-type');
  const range7Button = document.getElementById('range-7');
  const range30Button = document.getElementById('range-30');
  const deleteResultEl = document.getElementById('delete-result');
  const languageSelect = document.getElementById('language-select');

  updateManualFormVisibility();
  manualTypeSelect.addEventListener('change', updateManualFormVisibility);
  languageSelect.addEventListener('change', async (event) => {
    const nextLanguage = event.target.value;
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) return;
    currentLanguage = nextLanguage;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    applyStaticTranslations();
    await refreshAll();
  });

  pipiCheckbox.addEventListener('change', () => {
    currentWalkPipiAt = pipiCheckbox.checked ? new Date().toISOString() : null;
  });

  pupuCheckbox.addEventListener('change', () => {
    currentWalkPupuAt = pupuCheckbox.checked ? new Date().toISOString() : null;
  });

  startWalkButton.addEventListener('click', async () => {
    try {
      await api('/api/walk/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      pipiCheckbox.checked = false;
      pupuCheckbox.checked = false;
      currentWalkPipiAt = null;
      currentWalkPupuAt = null;
      await refreshAll();
    } catch (error) {
      alert(translateServerError(error.message));
    }
  });

  endWalkButton.addEventListener('click', async () => {
    const pipi = pipiCheckbox.checked;
    const pupu = pupuCheckbox.checked;
    const note = document.getElementById('walk-note').value.trim();

    try {
      await api('/api/walk/end', {
        method: 'POST',
        body: JSON.stringify({
          pipi,
          pupu,
          pipi_at: pipi ? currentWalkPipiAt || new Date().toISOString() : null,
          pupu_at: pupu ? currentWalkPupuAt || new Date().toISOString() : null,
          note,
        }),
      });

      pipiCheckbox.checked = false;
      pupuCheckbox.checked = false;
      currentWalkPipiAt = null;
      currentWalkPupuAt = null;
      document.getElementById('walk-note').value = '';
      await refreshAll();
    } catch (error) {
      alert(translateServerError(error.message));
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
      alert(translateServerError(error.message));
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
      alert(translateServerError(error.message));
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
      alert(translateServerError(error.message));
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

  deleteLastButton.addEventListener('click', async () => {
    const confirmed = window.confirm(t('confirmDeleteLast'));
    if (!confirmed) return;

    deleteResultEl.textContent = '';
    try {
      const result = await api('/api/events/last', {
        method: 'DELETE',
      });
      deleteResultEl.textContent = t('deleteLastDone', { remaining: result.remaining });
      await refreshAll();
    } catch (error) {
      deleteResultEl.textContent = t('deleteFailed', { error: error.message });
    }
  });

  deleteAllButton.addEventListener('click', async () => {
    const confirmed = window.confirm(t('confirmDeleteAll'));
    if (!confirmed) return;

    deleteResultEl.textContent = '';
    try {
      const result = await api('/api/events', {
        method: 'DELETE',
      });
      deleteResultEl.textContent = t('deleteAllDone', { deletedCount: result.deletedCount });
      await refreshAll();
    } catch (error) {
      deleteResultEl.textContent = t('deleteFailed', { error: error.message });
    }
  });

  importAppendButton.addEventListener('click', async () => {
    await importFromFile('append');
  });

  importReplaceButton.addEventListener('click', async () => {
    const confirmed = window.confirm(t('confirmReplaceImport'));
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

initLanguage();
applyStaticTranslations();
bindActions();
startEliminationStatusTicker();
refreshAll().catch((error) => {
  alert(t('loadError', { error: error.message }));
});
