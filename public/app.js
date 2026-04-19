const FOOD_CONFIGS = {
  youngPackMini: {
    months: [2, 3, 4, 6, 9, 12],
    weights: [2, 3, 5, 7.5, 10, 15],
    maxTargetWeightKg: 15,
    unsupportedKey: 'foodUnsupportedTargetWeightYoungPackMini',
    table: {
      2: { 2: 40, 3: 55, 5: 85, 7.5: 105, 10: 130, 15: 175 },
      3: { 2: 50, 3: 55, 5: 95, 7.5: 125, 10: 155, 15: 210 },
      4: { 2: 50, 3: 70, 5: 105, 7.5: 135, 10: 170, 15: 230 },
      6: { 2: 55, 3: 75, 5: 105, 7.5: 145, 10: 180, 15: 230 },
      9: { 2: 55, 3: 70, 5: 105, 7.5: 145, 10: 180, 15: 225 },
      12: { 2: 50, 3: 70, 5: 105, 7.5: 140, 10: 175, 15: 210 },
    },
  },
  platinumMenuPuppyChicken: {
    months: [2, 4, 6, 8, 10, 12],
    weights: [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 60, 80],
    maxTargetWeightKg: 80,
    unsupportedKey: 'foodUnsupportedTargetWeightPlatinumPuppyChicken',
    table: {
      2: { 2.5: 88, 5: 175, 7.5: 263, 10: 200, 12.5: 250, 15: 300, 20: 340, 25: 425, 30: 510, 40: 520, 60: 780, 80: 1040 },
      4: { 2.5: 113, 5: 225, 7.5: 338, 10: 380, 12.5: 475, 15: 570, 20: 640, 25: 800, 30: 960, 40: 1000, 60: 1500, 80: 2000 },
      6: { 2.5: 145, 5: 290, 7.5: 435, 10: 420, 12.5: 525, 15: 630, 20: 680, 25: 850, 30: 1020, 40: 1160, 60: 1740, 80: 2320 },
      8: { 2.5: 125, 5: 250, 7.5: 375, 10: 400, 12.5: 500, 15: 600, 20: 760, 25: 950, 30: 1140, 40: 1280, 60: 1920, 80: 2560 },
      10: { 2.5: 125, 5: 250, 7.5: 375, 10: 400, 12.5: 500, 15: 600, 20: 680, 25: 850, 30: 1020, 40: 1360, 60: 2040, 80: 2720 },
      12: { 2.5: 125, 5: 250, 7.5: 375, 10: 400, 12.5: 500, 15: 600, 20: 680, 25: 850, 30: 1020, 40: 1200, 60: 1800, 80: 2400 },
    },
  },
};

const FOOD_PROFILE_DEFINITIONS = {
  youngPackMini: {
    key: 'youngPackMini',
    enabledInputId: 'settings-food-young-enabled',
    chipInputIds: ['settings-food-young-chip-1', 'settings-food-young-chip-2', 'settings-food-young-chip-3'],
    defaultQuickAddValues: [25, 30, 50],
    defaultWeightFactorPercent: 100,
    labelKey: 'foodNameYoungPackMini',
  },
  platinumMenuPuppyChicken: {
    key: 'platinumMenuPuppyChicken',
    enabledInputId: 'settings-food-platinum-enabled',
    chipInputIds: ['settings-food-platinum-chip-1', 'settings-food-platinum-chip-2', 'settings-food-platinum-chip-3'],
    defaultQuickAddValues: [150, 200, 250],
    defaultWeightFactorPercent: 100,
    labelKey: 'foodNamePlatinumMenuPuppyChicken',
  },
};

function createDefaultFoodProfiles() {
  return {
    youngPackMini: {
      enabled: true,
      quickAddValues: [...FOOD_PROFILE_DEFINITIONS.youngPackMini.defaultQuickAddValues],
      weightFactorPercent: FOOD_PROFILE_DEFINITIONS.youngPackMini.defaultWeightFactorPercent,
    },
    platinumMenuPuppyChicken: {
      enabled: false,
      quickAddValues: [...FOOD_PROFILE_DEFINITIONS.platinumMenuPuppyChicken.defaultQuickAddValues],
      weightFactorPercent: FOOD_PROFILE_DEFINITIONS.platinumMenuPuppyChicken.defaultWeightFactorPercent,
    },
  };
}

function sanitizeWeightFactor(value, fallbackValue) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }
  return fallbackValue;
}

function sanitizeQuickAddValues(values, fallbackValues) {
  const result = [];
  const source = Array.isArray(values) ? values : [];

  for (let index = 0; index < 3; index += 1) {
    const parsedValue = Number(source[index]);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      result.push(Math.floor(parsedValue));
    } else {
      result.push(fallbackValues[index]);
    }
  }

  return result;
}

function normalizeFoodProfiles(rawProfiles) {
  const defaults = createDefaultFoodProfiles();
  const normalized = { ...defaults };

  for (const [key, definition] of Object.entries(FOOD_PROFILE_DEFINITIONS)) {
    const rawProfile = rawProfiles?.[key] ?? {};
    normalized[key] = {
      enabled: rawProfile?.enabled === true,
      quickAddValues: sanitizeQuickAddValues(rawProfile?.quickAddValues, definition.defaultQuickAddValues),
      weightFactorPercent: sanitizeWeightFactor(rawProfile?.weightFactorPercent, definition.defaultWeightFactorPercent),
    };
  }

  return normalized;
}

function getFoodDisplayName(foodKey) {
  const definition = FOOD_PROFILE_DEFINITIONS[foodKey];
  if (!definition) return foodKey;
  return t(definition.labelKey);
}

function formatKg(value) {
  return Number(value).toLocaleString(getLocale(), { maximumFractionDigits: 1 });
}

function getAgeInMonths(birthDateValue) {
  if (!birthDateValue) return null;
  const birthDate = new Date(`${birthDateValue}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  if (birthDate > now) return null;

  let months = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
  if (now.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

function getInterpolatedGrams(weights, tableRow, targetWeightKg) {
  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];

  if (targetWeightKg <= firstWeight) {
    return {
      gramsPerDay: tableRow[firstWeight],
      isInterpolated: false,
      lowerWeightKg: firstWeight,
      upperWeightKg: firstWeight,
    };
  }

  if (targetWeightKg >= lastWeight) {
    return {
      gramsPerDay: tableRow[lastWeight],
      isInterpolated: false,
      lowerWeightKg: lastWeight,
      upperWeightKg: lastWeight,
    };
  }

  for (let index = 0; index < weights.length - 1; index += 1) {
    const lowerWeightKg = weights[index];
    const upperWeightKg = weights[index + 1];

    if (Math.abs(targetWeightKg - lowerWeightKg) < 0.001) {
      return {
        gramsPerDay: tableRow[lowerWeightKg],
        isInterpolated: false,
        lowerWeightKg,
        upperWeightKg: lowerWeightKg,
      };
    }

    if (Math.abs(targetWeightKg - upperWeightKg) < 0.001) {
      return {
        gramsPerDay: tableRow[upperWeightKg],
        isInterpolated: false,
        lowerWeightKg: upperWeightKg,
        upperWeightKg,
      };
    }

    if (targetWeightKg > lowerWeightKg && targetWeightKg < upperWeightKg) {
      const lowerGrams = tableRow[lowerWeightKg];
      const upperGrams = tableRow[upperWeightKg];
      const ratio = (targetWeightKg - lowerWeightKg) / (upperWeightKg - lowerWeightKg);
      return {
        gramsPerDay: Math.round(lowerGrams + (upperGrams - lowerGrams) * ratio),
        isInterpolated: true,
        lowerWeightKg,
        upperWeightKg,
      };
    }
  }

  return {
    gramsPerDay: tableRow[lastWeight],
    isInterpolated: false,
    lowerWeightKg: lastWeight,
    upperWeightKg: lastWeight,
  };
}

function getMonthBracket(ageInMonths, months) {
  let bracket = months[0];
  for (const month of months) {
    if (ageInMonths >= month) {
      bracket = month;
    }
  }
  return bracket;
}

function getFoodRecommendation(foodConfig) {
  const ageInMonths = getAgeInMonths(appSettings.birthDate);
  if (ageInMonths === null) {
    return { errorKey: 'foodMissingBirthDate' };
  }

  const targetWeightKg = appSettings.targetWeightKg;
  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0) {
    return { errorKey: 'foodMissingTargetWeight' };
  }

  if (targetWeightKg > foodConfig.maxTargetWeightKg) {
    return { errorKey: foodConfig.unsupportedKey };
  }

  const minMonth = foodConfig.months[0];
  const maxMonth = foodConfig.months[foodConfig.months.length - 1];
  const monthBracket = getMonthBracket(Math.max(minMonth, Math.min(maxMonth, ageInMonths)), foodConfig.months);
  const interpolation = getInterpolatedGrams(foodConfig.weights, foodConfig.table[monthBracket], targetWeightKg);

  return {
    gramsPerDay: interpolation.gramsPerDay,
    ageInMonths,
    monthBracket,
    targetWeightKg,
    isInterpolated: interpolation.isInterpolated,
    lowerWeightKg: interpolation.lowerWeightKg,
    upperWeightKg: interpolation.upperWeightKg,
  };
}

function getYoungPackMiniRecommendation() {
  return getFoodRecommendation(FOOD_CONFIGS.youngPackMini);
}

function getPlatinumMenuPuppyChickenRecommendation() {
  return getFoodRecommendation(FOOD_CONFIGS.platinumMenuPuppyChicken);
}

function updateFoodRecommendationCard(summaryElementId, amountElementId, recommendation) {
  const summaryEl = document.getElementById(summaryElementId);
  const amountEl = document.getElementById(amountElementId);
  if (!summaryEl || !amountEl) return;

  if (recommendation.errorKey) {
    summaryEl.textContent = t('foodSummaryPending');
    amountEl.textContent = t(recommendation.errorKey);
    return;
  }

  summaryEl.textContent = t('foodSummaryGrams', { grams: recommendation.gramsPerDay });
  const targetWeightText = formatKg(recommendation.targetWeightKg);

  amountEl.textContent = recommendation.isInterpolated
    ? t('foodRecommendationInterpolated', {
      grams: recommendation.gramsPerDay,
      age: recommendation.ageInMonths,
      targetWeight: targetWeightText,
      lowerWeight: formatKg(recommendation.lowerWeightKg),
      upperWeight: formatKg(recommendation.upperWeightKg),
    })
    : t('foodRecommendationExact', {
      grams: recommendation.gramsPerDay,
      age: recommendation.ageInMonths,
      targetWeight: targetWeightText,
    });
}

function updateFoodRecommendationUi() {
  updateFoodRecommendationCard('food-accordion-summary-1', 'food-recommendation-amount-1', getYoungPackMiniRecommendation());
  updateFoodRecommendationCard('food-accordion-summary-2', 'food-recommendation-amount-2', getPlatinumMenuPuppyChickenRecommendation());
}

function setupFoodAccordion() {
  const buttons = document.querySelectorAll('.food-accordion-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    const panelId = btn.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    if (btn.dataset.bound === 'true') {
      return;
    }

    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      updateFoodRecommendationUi();
    });
  });

  updateFoodRecommendationUi();
}

function getActiveFoodProfileKeys() {
  return Object.keys(FOOD_PROFILE_DEFINITIONS).filter((foodKey) => appSettings.foodProfiles?.[foodKey]?.enabled);
}

function initializeFeedMixAmounts() {
  const nextMix = {};
  const activeKeys = getActiveFoodProfileKeys();
  activeKeys.forEach((foodKey) => {
    const existingValue = Number(feedMixAmounts?.[foodKey]);
    nextMix[foodKey] = Number.isFinite(existingValue) && existingValue > 0 ? existingValue : 0;
  });
  feedMixAmounts = nextMix;
}

function getFoodRecommendationByKey(foodKey) {
  if (foodKey === 'youngPackMini') return getYoungPackMiniRecommendation();
  if (foodKey === 'platinumMenuPuppyChicken') return getPlatinumMenuPuppyChickenRecommendation();
  return { errorKey: 'foodMissingTargetWeight' };
}

function getFoodRecommendedDailyGrams(foodKey) {
  const recommendation = getFoodRecommendationByKey(foodKey);
  if (recommendation?.errorKey) return null;
  const grams = Number(recommendation?.gramsPerDay);
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

function getPendingFeedMixRawTotal() {
  return Object.values(feedMixAmounts).reduce((sum, value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
}

function getPendingFeedMixProgressShare() {
  return Object.entries(feedMixAmounts).reduce((sum, [foodKey, value]) => {
    const amount = Number(value);
    const recommendationGrams = getFoodRecommendedDailyGrams(foodKey);
    if (!Number.isFinite(amount) || amount <= 0 || !recommendationGrams) return sum;
    return sum + amount / recommendationGrams;
  }, 0);
}

function getFoodReferenceTarget() {
  const activeKeys = getActiveFoodProfileKeys();
  for (const foodKey of activeKeys) {
    const gramsPerDay = getFoodRecommendedDailyGrams(foodKey);
    if (gramsPerDay) {
      return { foodKey, gramsPerDay };
    }
  }
  return null;
}

function getEffectiveDailyTargetGrams() {
  const referenceTarget = getFoodReferenceTarget();
  if (referenceTarget?.gramsPerDay) return referenceTarget.gramsPerDay;
  const fallback = Number(appSettings.dailyTargetG);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
}

function getPendingFeedMixEquivalentGrams() {
  const progressShare = getPendingFeedMixProgressShare();
  const effectiveTarget = getEffectiveDailyTargetGrams();
  if (!effectiveTarget || progressShare <= 0) return 0;
  return Math.round(progressShare * effectiveTarget);
}

function getRemainingGramsForFood(progressShare, foodKey) {
  const recommendationGrams = getFoodRecommendedDailyGrams(foodKey);
  if (!recommendationGrams) return null;
  const remainingShare = Math.max(0, 1 - progressShare);
  return Math.round(remainingShare * recommendationGrams);
}

function getFeedReferenceLabel() {
  const referenceTarget = getFoodReferenceTarget();
  if (!referenceTarget) return '';
  return getFoodDisplayName(referenceTarget.foodKey);
}

function updateFeedPreviewStatus() {
  const previewEl = document.getElementById('feed-preview-status');
  const previewPercentEl = document.getElementById('feed-preview-percent');
  const previewReferenceEl = document.getElementById('feed-preview-reference');
  const previewRemainingTotalEl = document.getElementById('feed-preview-remaining-total');
  const previewRawEl = document.getElementById('feed-preview-raw');
  const previewRemainingYoungEl = document.getElementById('feed-preview-remaining-young');
  const previewRemainingPlatinumEl = document.getElementById('feed-preview-remaining-platinum');
  if (!previewEl) return;

  const pendingRaw = getPendingFeedMixRawTotal();
  const pendingEquivalent = getPendingFeedMixEquivalentGrams();
  const effectiveTarget = getEffectiveDailyTargetGrams();
  const projectedFed = todayFedGrams + pendingEquivalent;
  const projectedShare = getPendingFeedMixProgressShare() + (effectiveTarget ? todayFedGrams / effectiveTarget : 0);
  const remainingYoung = getRemainingGramsForFood(projectedShare, 'youngPackMini');
  const remainingPlatinum = getRemainingGramsForFood(projectedShare, 'platinumMenuPuppyChicken');
  const referenceFood = getFeedReferenceLabel();

  if (previewRawEl) previewRawEl.textContent = `${pendingRaw} g`;
  if (previewRemainingYoungEl) previewRemainingYoungEl.textContent = remainingYoung === null ? '-' : `${remainingYoung} g`;
  if (previewRemainingPlatinumEl) previewRemainingPlatinumEl.textContent = remainingPlatinum === null ? '-' : `${remainingPlatinum} g`;

  if (effectiveTarget) {
    const projectedPercent = Math.min(999, Math.round((projectedFed / effectiveTarget) * 100));
    const remaining = Math.max(0, effectiveTarget - projectedFed);
    previewEl.textContent = t('feedPreviewWithTarget', {
      pendingRaw,
      pendingEquivalent,
      projectedPercent,
      projectedFed,
      target: effectiveTarget,
      remaining,
      remainingYoung: remainingYoung ?? '-',
      remainingPlatinum: remainingPlatinum ?? '-',
      referenceFood,
    });
    if (previewPercentEl) previewPercentEl.textContent = `${projectedPercent}%`;
    if (previewReferenceEl) previewReferenceEl.textContent = referenceFood || '-';
    if (previewRemainingTotalEl) previewRemainingTotalEl.textContent = `${remaining} g`;
  } else {
    previewEl.textContent = t('feedPreviewNoTarget', {
      pendingRaw,
      pendingEquivalent,
      projectedFed,
    });
    if (previewPercentEl) previewPercentEl.textContent = '-';
    if (previewReferenceEl) previewReferenceEl.textContent = '-';
    if (previewRemainingTotalEl) previewRemainingTotalEl.textContent = '-';
  }
}

function renderFeedFoodOptions() {
  const optionsWrap = document.getElementById('feed-food-options');
  const emptyHint = document.getElementById('feed-food-options-empty');
  const feedNoteInput = document.getElementById('feed-note');
  const feedButton = document.getElementById('feed');

  if (!optionsWrap || !emptyHint || !feedNoteInput || !feedButton) return;

  const activeKeys = getActiveFoodProfileKeys();
  initializeFeedMixAmounts();

  if (!activeKeys.length) {
    feedMixAmounts = {};
    optionsWrap.innerHTML = '';
    emptyHint.hidden = false;
    feedNoteInput.disabled = true;
    feedButton.disabled = true;
    updateFeedPreviewStatus();
    return;
  }

  emptyHint.hidden = true;
  feedNoteInput.disabled = false;
  feedButton.disabled = false;

  optionsWrap.innerHTML = activeKeys
    .map((foodKey) => {
      const profile = appSettings.foodProfiles?.[foodKey];
      const quickAddValues = appSettings.quickAddEnabled ? (profile?.quickAddValues || []) : [];
      const currentAmount = Math.max(0, Math.floor(Number(feedMixAmounts?.[foodKey] || 0)));
      const recommendationGrams = getFoodRecommendedDailyGrams(foodKey);
      const chipsMarkup = quickAddValues
        .map((grams) => `<button type="button" class="chip-btn" data-food-key="${foodKey}" data-gram="${grams}">+${grams}g</button>`)
        .join('');

      return `
        <div class="food-mix-row">
          <div class="food-mix-header">
            <span class="food-mix-name">${getFoodDisplayName(foodKey)}</span>
            <span class="food-mix-factor">${recommendationGrams ? t('feedRecommendedBadge', { grams: recommendationGrams }) : t('feedRecommendedUnknown')}</span>
          </div>
          <div class="feed-input-row">
            <label class="feed-amount-label" for="feed-amount-${foodKey}">${t('feedAmountLabel')}</label>
            <div class="feed-amount-field">
              <input type="number" id="feed-amount-${foodKey}" class="feed-mix-input" data-food-key="${foodKey}" min="0" step="1" inputmode="numeric" value="${currentAmount}" />
              <span class="feed-unit">g</span>
            </div>
          </div>
          <div class="quick-add-row food-mix-chips">${chipsMarkup}</div>
        </div>
      `;
    })
    .join('');

  updateFeedPreviewStatus();
}

function buildFeedNoteForMix(rawNote) {
  const breakdown = Object.entries(feedMixAmounts)
    .map(([foodKey, amount]) => {
      const grams = Math.max(0, Math.floor(Number(amount) || 0));
      if (grams <= 0) return null;
      const recommendationGrams = getFoodRecommendedDailyGrams(foodKey);
      if (!recommendationGrams) {
        return `${grams}g ${getFoodDisplayName(foodKey)}`;
      }
      const sharePercent = Math.round((grams / recommendationGrams) * 100);
      return `${grams}g ${getFoodDisplayName(foodKey)} (${sharePercent}% von ${recommendationGrams}g)`;
    })
    .filter(Boolean)
    .join(' + ');

  if (!breakdown) {
    return rawNote;
  }

  if (!rawNote) {
    return `[${breakdown}]`;
  }
  return `[${breakdown}] ${rawNote}`;
}

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
const ACTIVE_TAB_STORAGE_KEY = 'luigi-active-tab';
const SETTINGS_STORAGE_KEY = 'luigi-settings';
const SUPPORTED_LANGUAGES = ['de', 'en'];
const DEFAULT_SETTINGS = {
  dailyTargetG: 300,
  defaultPortionG: 50,
  quickAddEnabled: true,
  birthDate: '',
  currentWeightKg: null,
  targetWeightKg: null,
  foodProfiles: createDefaultFoodProfiles(),
};
let currentLanguage = 'en';
let currentTab = 'today';
let appSettings = { ...DEFAULT_SETTINGS, foodProfiles: createDefaultFoodProfiles() };
let currentWalkPipiAt = null;
let currentWalkPupuAt = null;
let currentAloneStartedAt = null;
let lastPipiDoneAt = null;
let lastPupuDoneAt = null;
let eliminationStatusIntervalId = null;
let todayFedGrams = 0;
let quickAddUndoTimerId = null;
let quickAddUndoCountdownTimerId = null;
let quickAddUndoEventId = null;
let recentEventsCache = [];
let editFeedbackTimeoutId = null;
let feedMixAmounts = {};

const TRANSLATIONS = {
  de: {
    appTitle: '🐶 Luigi Diary',
    appSubtitle: 'Spaziergänge & Fütterung schnell vom Handy erfassen',
    tabToday: 'Heute',
    tabFood: 'Essen',
    tabSettings: 'Einstellungen',
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
    headingFood: 'Essen',
    headingFoodConfig: 'Futter Tracking',
    headingSettings: 'Einstellungen',
    buttonEditEntry: 'Bearbeiten',
    buttonDeleteEntry: 'Löschen',
    iconEditEntryAria: 'Eintrag bearbeiten',
    iconDeleteEntryAria: 'Eintrag löschen',
    confirmDeleteEntry: 'Diesen Eintrag wirklich löschen?\n\n{entry}',
    editDialogTitle: 'Eintrag bearbeiten',
    editDialogSubtitle: 'Leere Felder bleiben unverändert.',
    editDialogCloseAria: 'Dialog schließen',
    editLabelCreated: 'Zeitpunkt',
    editLabelAmount: 'Menge (g)',
    editLabelWalkStart: 'Walk Start',
    editLabelWalkEnd: 'Walk Ende',
    editLabelPipi: 'Pipi gemacht',
    editLabelPupu: 'Pupu gemacht',
    editLabelSleepStart: 'Schlaf Start',
    editLabelSleepEnd: 'Schlaf Ende',
    editLabelAloneStart: 'Alleine Start',
    editLabelAloneEnd: 'Alleine Ende',
    editLabelNote: 'Notiz',
    editPlaceholderNote: 'z. B. ergänzt',
    editSave: 'Speichern',
    editCancel: 'Abbrechen',
    editSaved: 'Eintrag gespeichert.',
    editSaveFailed: 'Speichern fehlgeschlagen: {error}',
    labelPipi: 'Pipi gemacht',
    labelPupu: 'Pupu gemacht',
    walkNotePlaceholder: 'Notiz (optional)',
    feedNotePlaceholder: 'Füttern-Notiz (optional)',
    feedAmountLabel: 'Menge',
    feedFoodOptionsLabel: 'Futtersorten mischen',
    feedFoodOptionsEmpty: 'Aktiviere in den Einstellungen mindestens eine Futtersorte.',
    feedPreviewWithTarget: 'Nach dieser Fütterung: {projectedPercent}% ({projectedFed}/{target} g, Referenz: {referenceFood}).',
    feedPreviewNoTarget: 'Nach dieser Fütterung: {projectedFed} g gesamt heute.',
    feedMixNoAmount: 'Bitte zuerst eine Futtermenge > 0 auswählen.',
    feedRecommendedBadge: 'Empfehlung: {grams} g/Tag',
    feedRecommendedUnknown: 'Empfehlung fehlt',
    feedPreviewProgressLabel: 'Fortschritt (nach Eingabe)',
    feedPreviewReferenceLabel: 'Referenzfutter',
    feedPreviewRemainingTotalLabel: 'Noch offen gesamt',
    feedPreviewRawLabel: 'Rohmenge (diese Eingabe)',
    feedPreviewRemainingYoungLabel: 'Rest Vet-Concept',
    feedPreviewRemainingPlatinumLabel: 'Rest Platinum',
    feedWeightFactorBadge: 'Anrechnung: {factor}%',
    sleepNotePlaceholder: 'Schlaf-Notiz (optional)',
    buttonStartWalk: '🚶 Spaziergang starten',
    buttonEndWalk: '✅ Spaziergang beenden',
    buttonFeed: '🍽️ Gefüttert',
    buttonStartSleep: '🌙 Schlafen gestartet',
    buttonEndSleep: '⏰ Aufgestanden',
    buttonStartAlone: '🏠 Alleine gelassen',
    buttonEndAlone: '🤝 Wieder da',
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
    statusOpenAlone: 'Aktuell alleine seit {since}',
    statusNoAlone: 'Aktuell nicht alleine.',
    statusLastPipi: 'Letztes Pipi: {since}',
    statusLastPupu: 'Letztes Pupu: {since}',
    statusFeedOpen: 'Futter offen heute: {remaining} g ({fed}/{target} g) · Referenz: {referenceFood}',
    statusFeedNoTarget: 'Futter heute: {fed} g',
    statusNever: 'noch kein Eintrag',
    timeJustNow: 'gerade eben',
    timeMinutesAgo: 'vor {minutes} min',
    timeHoursAgo: 'vor {hours} h',
    timeHoursMinutesAgo: 'vor {hours} h {minutes} min',
    timeDaysAgo: 'vor {days} d',
    timeDaysHoursAgo: 'vor {days} d {hours} h',
    eventFeed: '🍽️ Füttern · {grams} g · {time}{note}',
    eventSleep: '😴 Schlaf · {start} bis {end} · {hours} h{note}',
    eventAlone: '🏠 Alleine · {start} bis {end} · {hours} h{note}',
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
    settingsSubtitle: 'Tagesziel und Fütterungs-Defaults konfigurieren.',
    settingsDailyTargetLabel: 'Futterziel pro Tag (g)',
    settingsDefaultPortionLabel: 'Standard-Portion beim Füttern (g)',
    settingsBirthDateLabel: 'Geburtsdatum',
    settingsWeightLabel: 'Aktuelles Gewicht (kg)',
    settingsTargetWeightLabel: 'Zielgewicht / Endgewicht (kg)',
    settingsQuickAddLabel: 'Quick-Add Chips aktivieren (25g / 30g / 50g)',
    foodConfigSubtitle: 'Aktiviere Futtersorten und definiere je Sorte drei Quick-Add-Werte.',
    foodNameYoungPackMini: 'YOUNG PACK MINI (vet-concept)',
    foodNamePlatinumMenuPuppyChicken: 'PLATINUM Menu Puppy Chicken',
    settingsFoodYoungEnabledLabel: 'YOUNG PACK MINI wird aktuell gefüttert',
    settingsFoodPlatinumEnabledLabel: 'PLATINUM Menu Puppy Chicken wird aktuell gefüttert',
    settingsFoodWeightFactorLabel: 'Anrechnungsfaktor (%)',
    settingsFoodChip1Label: 'Quick Add 1 (g)',
    settingsFoodChip2Label: 'Quick Add 2 (g)',
    settingsFoodChip3Label: 'Quick Add 3 (g)',
    buttonSaveSettings: '💾 Einstellungen speichern',
    settingsSaved: 'Einstellungen gespeichert.',
    settingsSaveFailed: 'Bitte gültige Werte eingeben.',
    settingsBirthDateInvalid: 'Bitte ein gültiges Geburtsdatum eingeben (nicht in der Zukunft).',
    settingsWeightInvalid: 'Bitte ein gültiges Gewicht eingeben (> 0).',
    settingsTargetWeightInvalid: 'Bitte ein gültiges Zielgewicht eingeben (> 0).',
    settingsFoodChipInvalid: 'Bitte für jede aktive Futtersorte drei gültige Quick-Add-Werte (> 0) eingeben.',
    settingsFoodWeightFactorInvalid: 'Bitte pro aktiver Futtersorte einen gültigen Anrechnungsfaktor (> 0) eingeben.',
    foodSummaryPending: 'Menge offen',
    foodSummaryGrams: '{grams} g/Tag',
    foodMissingBirthDate: 'Bitte zuerst ein gültiges Geburtsdatum in den Einstellungen angeben.',
    foodMissingTargetWeight: 'Bitte zuerst ein Zielgewicht/Endgewicht in den Einstellungen angeben.',
    foodUnsupportedTargetWeightYoungPackMini: 'YOUNG PACK MINI ist bis 15 kg Zielgewicht ausgelegt. Bitte für höhere Zielgewichte auf MIDI/MAXI wechseln.',
    foodUnsupportedTargetWeightPlatinumPuppyChicken: 'PLATINUM Menu Puppy Chicken ist bis 80 kg Zielgewicht ausgelegt.',
    foodRecommendationExact: 'Empfohlene Tagesmenge: {grams} g (Alter: {age} Monate, Zielgewicht: {targetWeight} kg).',
    foodRecommendationInterpolated: 'Empfohlene Tagesmenge: {grams} g (Alter: {age} Monate, Zielgewicht: {targetWeight} kg; interpoliert zwischen {lowerWeight} kg und {upperWeight} kg).',
    quickAddSaved: '✓ {grams} g gespeichert',
    quickAddUndo: 'Rückgängig',
    quickAddUndone: 'Fütterung rückgängig gemacht.',
    quickAddUndoFailed: 'Rückgängig fehlgeschlagen: {error}',
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
    tabToday: 'Today',
    tabFood: 'Food',
    tabSettings: 'Settings',
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
    headingFood: 'Food',
    headingFoodConfig: 'Food Tracking',
    headingSettings: 'Settings',
    buttonEditEntry: 'Edit',
    buttonDeleteEntry: 'Delete',
    iconEditEntryAria: 'Edit entry',
    iconDeleteEntryAria: 'Delete entry',
    confirmDeleteEntry: 'Delete this entry?\n\n{entry}',
    editDialogTitle: 'Edit entry',
    editDialogSubtitle: 'Empty fields stay unchanged.',
    editDialogCloseAria: 'Close dialog',
    editLabelCreated: 'Timestamp',
    editLabelAmount: 'Amount (g)',
    editLabelWalkStart: 'Walk start',
    editLabelWalkEnd: 'Walk end',
    editLabelPipi: 'Pee done',
    editLabelPupu: 'Poop done',
    editLabelSleepStart: 'Sleep start',
    editLabelSleepEnd: 'Sleep end',
    editLabelAloneStart: 'Alone start',
    editLabelAloneEnd: 'Alone end',
    editLabelNote: 'Note',
    editPlaceholderNote: 'e.g. added later',
    editSave: 'Save',
    editCancel: 'Cancel',
    editSaved: 'Entry saved.',
    editSaveFailed: 'Save failed: {error}',
    labelPipi: 'Pee done',
    labelPupu: 'Poop done',
    walkNotePlaceholder: 'Note (optional)',
    feedNotePlaceholder: 'Feeding note (optional)',
    feedAmountLabel: 'Amount',
    feedFoodOptionsLabel: 'Mix food types',
    feedFoodOptionsEmpty: 'Enable at least one food in settings.',
    feedPreviewWithTarget: 'After this feeding: {projectedPercent}% ({projectedFed}/{target} g, reference: {referenceFood}).',
    feedPreviewNoTarget: 'After this feeding: {projectedFed} g total today.',
    feedMixNoAmount: 'Please select a feed amount > 0 first.',
    feedRecommendedBadge: 'Recommended: {grams} g/day',
    feedRecommendedUnknown: 'Recommendation missing',
    feedPreviewProgressLabel: 'Progress (after entry)',
    feedPreviewReferenceLabel: 'Reference food',
    feedPreviewRemainingTotalLabel: 'Total remaining',
    feedPreviewRawLabel: 'Raw amount (this entry)',
    feedPreviewRemainingYoungLabel: 'Remaining Vet-Concept',
    feedPreviewRemainingPlatinumLabel: 'Remaining Platinum',
    feedWeightFactorBadge: 'Factor: {factor}%',
    sleepNotePlaceholder: 'Sleep note (optional)',
    buttonStartWalk: '🚶 Start walk',
    buttonEndWalk: '✅ End walk',
    buttonFeed: '🍽️ Fed',
    buttonStartSleep: '🌙 Started sleep',
    buttonEndSleep: '⏰ Woke up',
    buttonStartAlone: '🏠 Left alone',
    buttonEndAlone: '🤝 Back home',
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
    statusOpenAlone: 'Currently alone for {since}',
    statusNoAlone: 'Currently not alone.',
    statusLastPipi: 'Last pee: {since}',
    statusLastPupu: 'Last poop: {since}',
    statusFeedOpen: 'Feed remaining today: {remaining} g ({fed}/{target} g) · reference: {referenceFood}',
    statusFeedNoTarget: 'Feed today: {fed} g',
    statusNever: 'no entry yet',
    timeJustNow: 'just now',
    timeMinutesAgo: '{minutes} min ago',
    timeHoursAgo: '{hours} h ago',
    timeHoursMinutesAgo: '{hours} h {minutes} min ago',
    timeDaysAgo: '{days} d ago',
    timeDaysHoursAgo: '{days} d {hours} h ago',
    eventFeed: '🍽️ Feed · {grams} g · {time}{note}',
    eventSleep: '😴 Sleep · {start} to {end} · {hours} h{note}',
    eventAlone: '🏠 Alone · {start} to {end} · {hours} h{note}',
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
    settingsSubtitle: 'Configure daily target and feeding defaults.',
    settingsDailyTargetLabel: 'Feed target per day (g)',
    settingsDefaultPortionLabel: 'Default portion for feeding (g)',
    settingsBirthDateLabel: 'Birth date',
    settingsWeightLabel: 'Current weight (kg)',
    settingsTargetWeightLabel: 'Target/adult weight (kg)',
    settingsQuickAddLabel: 'Enable quick-add chips (25g / 30g / 50g)',
    foodConfigSubtitle: 'Enable food types and define three quick-add values per type.',
    foodNameYoungPackMini: 'YOUNG PACK MINI (vet-concept)',
    foodNamePlatinumMenuPuppyChicken: 'PLATINUM Menu Puppy Chicken',
    settingsFoodYoungEnabledLabel: 'YOUNG PACK MINI is currently fed',
    settingsFoodPlatinumEnabledLabel: 'PLATINUM Menu Puppy Chicken is currently fed',
    settingsFoodWeightFactorLabel: 'Weighting factor (%)',
    settingsFoodChip1Label: 'Quick add 1 (g)',
    settingsFoodChip2Label: 'Quick add 2 (g)',
    settingsFoodChip3Label: 'Quick add 3 (g)',
    buttonSaveSettings: '💾 Save settings',
    settingsSaved: 'Settings saved.',
    settingsSaveFailed: 'Please enter valid values.',
    settingsBirthDateInvalid: 'Please enter a valid birth date (not in the future).',
    settingsWeightInvalid: 'Please enter a valid weight (> 0).',
    settingsTargetWeightInvalid: 'Please enter a valid target weight (> 0).',
    settingsFoodChipInvalid: 'Please enter three valid quick-add values (> 0) for each active food type.',
    settingsFoodWeightFactorInvalid: 'Please enter a valid weighting factor (> 0) for each active food type.',
    foodSummaryPending: 'Amount pending',
    foodSummaryGrams: '{grams} g/day',
    foodMissingBirthDate: 'Please provide a valid birth date in settings first.',
    foodMissingTargetWeight: 'Please provide target/adult weight in settings first.',
    foodUnsupportedTargetWeightYoungPackMini: 'YOUNG PACK MINI is intended for up to 15 kg target weight. Use MIDI/MAXI for higher target weights.',
    foodUnsupportedTargetWeightPlatinumPuppyChicken: 'PLATINUM Menu Puppy Chicken is intended for up to 80 kg target weight.',
    foodRecommendationExact: 'Recommended daily amount: {grams} g (Age: {age} months, Target weight: {targetWeight} kg).',
    foodRecommendationInterpolated: 'Recommended daily amount: {grams} g (Age: {age} months, Target weight: {targetWeight} kg; interpolated between {lowerWeight} kg and {upperWeight} kg).',
    quickAddSaved: '✓ {grams} g saved',
    quickAddUndo: 'Undo',
    quickAddUndone: 'Feed removed.',
    quickAddUndoFailed: 'Undo failed: {error}',
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
  'Es gibt bereits eine offene Alleine-Session.': 'There is already an open alone session.',
  'Keine aktive Alleine-Session.': 'No active alone session.',
  'Ungültiger Typ. Erlaubt: walk, feed, sleep, alone.': 'Invalid type. Allowed: walk, feed, sleep, alone.',
  'Für manuelle Spaziergänge sind `walk_start` und `walk_end` nötig.': 'Manual walk entries require `walk_start` and `walk_end`.',
  'Für manuelle Schlafdaten sind `sleep_start` und `sleep_end` nötig.': 'Manual sleep entries require `sleep_start` and `sleep_end`.',
  'Für manuelle Alleine-Daten sind `alone_start` und `alone_end` nötig.': 'Manual alone entries require `alone_start` and `alone_end`.',
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
  setText('tab-today', t('tabToday'));
  setText('tab-food', t('tabFood'));
  setText('tab-settings', t('tabSettings'));
  setText('language-label', t('languageLabel'));
  setText('heading-status', t('headingStatus'));
  setText('heading-actions', t('headingActions'));
  setText('heading-today', t('headingToday'));
  setText('heading-timeline', t('headingTimeline'));
  setText('heading-range', t('headingRange'));
  setText('heading-manual', t('headingManual'));
  setText('heading-events', t('headingEvents'));
  setText('heading-data', t('headingData'));
  setText('heading-food', t('headingFood'));
  setText('heading-food-config', t('headingFoodConfig'));
  setText('heading-settings', t('headingSettings'));
  setText('edit-dialog-title', t('editDialogTitle'));
  setText('edit-dialog-subtitle', t('editDialogSubtitle'));
  setText('edit-label-created', t('editLabelCreated'));
  setText('edit-label-amount', t('editLabelAmount'));
  setText('edit-label-walk-start', t('editLabelWalkStart'));
  setText('edit-label-walk-end', t('editLabelWalkEnd'));
  setText('edit-label-pipi', t('editLabelPipi'));
  setText('edit-label-pupu', t('editLabelPupu'));
  setText('edit-label-sleep-start', t('editLabelSleepStart'));
  setText('edit-label-sleep-end', t('editLabelSleepEnd'));
  setText('edit-label-alone-start', t('editLabelAloneStart'));
  setText('edit-label-alone-end', t('editLabelAloneEnd'));
  setText('edit-label-note', t('editLabelNote'));
  setText('label-pipi', t('labelPipi'));
  setText('label-pupu', t('labelPupu'));
  setText('feed-amount-label', t('feedAmountLabel'));
  setText('feed-food-options-label', t('feedFoodOptionsLabel'));
  setText('feed-food-options-empty', t('feedFoodOptionsEmpty'));
  setText('feed-preview-progress-label', t('feedPreviewProgressLabel'));
  setText('feed-preview-reference-label', t('feedPreviewReferenceLabel'));
  setText('feed-preview-remaining-total-label', t('feedPreviewRemainingTotalLabel'));
  setText('feed-preview-raw-label', t('feedPreviewRawLabel'));
  setText('feed-preview-remaining-young-label', t('feedPreviewRemainingYoungLabel'));
  setText('feed-preview-remaining-platinum-label', t('feedPreviewRemainingPlatinumLabel'));
  setText('start-walk', t('buttonStartWalk'));
  setText('end-walk', t('buttonEndWalk'));
  setText('feed', t('buttonFeed'));
  setText('start-sleep', t('buttonStartSleep'));
  setText('end-sleep', t('buttonEndSleep'));
  setText('start-alone', t('buttonStartAlone'));
  setText('end-alone', t('buttonEndAlone'));
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
  setText('settings-subtitle', t('settingsSubtitle'));
  setText('settings-daily-target-label', t('settingsDailyTargetLabel'));
  setText('settings-default-portion-label', t('settingsDefaultPortionLabel'));
  setText('settings-birth-date-label', t('settingsBirthDateLabel'));
  setText('settings-weight-label', t('settingsWeightLabel'));
  setText('settings-target-weight-label', t('settingsTargetWeightLabel'));
  setText('settings-enable-quick-add-label', t('settingsQuickAddLabel'));
  setText('food-config-subtitle', t('foodConfigSubtitle'));
  setText('settings-food-young-enabled-label', t('settingsFoodYoungEnabledLabel'));
  setText('settings-food-platinum-enabled-label', t('settingsFoodPlatinumEnabledLabel'));
  setText('settings-food-young-weight-factor-label', t('settingsFoodWeightFactorLabel'));
  setText('settings-food-platinum-weight-factor-label', t('settingsFoodWeightFactorLabel'));
  setText('settings-food-young-chip-1-label', t('settingsFoodChip1Label'));
  setText('settings-food-young-chip-2-label', t('settingsFoodChip2Label'));
  setText('settings-food-young-chip-3-label', t('settingsFoodChip3Label'));
  setText('settings-food-platinum-chip-1-label', t('settingsFoodChip1Label'));
  setText('settings-food-platinum-chip-2-label', t('settingsFoodChip2Label'));
  setText('settings-food-platinum-chip-3-label', t('settingsFoodChip3Label'));
  setText('settings-save', t('buttonSaveSettings'));
  setText('edit-dialog-save', t('editSave'));
  setText('edit-dialog-cancel', t('editCancel'));

  setPlaceholder('walk-note', t('walkNotePlaceholder'));
  setPlaceholder('feed-note', t('feedNotePlaceholder'));
  setPlaceholder('sleep-note', t('sleepNotePlaceholder'));
  setPlaceholder('manual-note', t('manualNotePlaceholder'));
  setPlaceholder('edit-note', t('editPlaceholderNote'));

  const editDialogClose = document.getElementById('edit-dialog-close');
  if (editDialogClose) editDialogClose.setAttribute('aria-label', t('editDialogCloseAria'));

  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.setAttribute('aria-label', t('languageAria'));
  }

  const foodTitle = document.getElementById('food-accordion-title-1');
  if (foodTitle) {
    foodTitle.textContent = t('foodNameYoungPackMini');
  }

  const foodTitle2 = document.getElementById('food-accordion-title-2');
  if (foodTitle2) {
    foodTitle2.textContent = t('foodNamePlatinumMenuPuppyChicken');
  }

  renderEliminationStatus();
  renderFeedOpenStatus();
  updateFoodRecommendationUi();
  renderFeedFoodOptions();
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

function loadAppSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      appSettings = { ...DEFAULT_SETTINGS, foodProfiles: createDefaultFoodProfiles() };
      return;
    }

    const parsed = JSON.parse(raw);
    const birthDateRaw = typeof parsed?.birthDate === 'string' ? parsed.birthDate.trim() : '';
    const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw) ? birthDateRaw : '';
    const parsedWeightNumber = Number(parsed?.currentWeightKg);
    const currentWeightKg = Number.isFinite(parsedWeightNumber) && parsedWeightNumber > 0 ? Number(parsedWeightNumber.toFixed(1)) : null;
    const parsedTargetWeightNumber = Number(parsed?.targetWeightKg);
    const targetWeightKg = Number.isFinite(parsedTargetWeightNumber) && parsedTargetWeightNumber > 0
      ? Number(parsedTargetWeightNumber.toFixed(1))
      : null;
    const foodProfiles = normalizeFoodProfiles(parsed?.foodProfiles);

    appSettings = {
      dailyTargetG: Number.isFinite(Number(parsed?.dailyTargetG)) ? Math.max(0, Math.floor(Number(parsed.dailyTargetG))) : DEFAULT_SETTINGS.dailyTargetG,
      defaultPortionG: Number.isFinite(Number(parsed?.defaultPortionG)) ? Math.max(0, Math.floor(Number(parsed.defaultPortionG))) : DEFAULT_SETTINGS.defaultPortionG,
      quickAddEnabled: parsed?.quickAddEnabled !== false,
      birthDate,
      currentWeightKg,
      targetWeightKg,
      foodProfiles,
    };
  } catch {
    appSettings = { ...DEFAULT_SETTINGS, foodProfiles: createDefaultFoodProfiles() };
  }
}

function saveAppSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
}

function applySettingsToForm() {
  const dailyTargetInput = document.getElementById('settings-daily-target-g');
  const defaultPortionInput = document.getElementById('settings-default-portion-g');
  const birthDateInput = document.getElementById('settings-birth-date');
  const weightInput = document.getElementById('settings-weight-kg');
  const targetWeightInput = document.getElementById('settings-target-weight-kg');
  const quickAddToggle = document.getElementById('settings-enable-quick-add');
  const settingsFoodYoungEnabled = document.getElementById('settings-food-young-enabled');
  const settingsFoodYoungWeightFactor = document.getElementById('settings-food-young-weight-factor');
  const settingsFoodYoungChip1 = document.getElementById('settings-food-young-chip-1');
  const settingsFoodYoungChip2 = document.getElementById('settings-food-young-chip-2');
  const settingsFoodYoungChip3 = document.getElementById('settings-food-young-chip-3');
  const settingsFoodPlatinumEnabled = document.getElementById('settings-food-platinum-enabled');
  const settingsFoodPlatinumWeightFactor = document.getElementById('settings-food-platinum-weight-factor');
  const settingsFoodPlatinumChip1 = document.getElementById('settings-food-platinum-chip-1');
  const settingsFoodPlatinumChip2 = document.getElementById('settings-food-platinum-chip-2');
  const settingsFoodPlatinumChip3 = document.getElementById('settings-food-platinum-chip-3');

  const youngProfile = appSettings.foodProfiles?.youngPackMini;
  const platinumProfile = appSettings.foodProfiles?.platinumMenuPuppyChicken;

  if (dailyTargetInput) dailyTargetInput.value = String(appSettings.dailyTargetG);
  if (defaultPortionInput) defaultPortionInput.value = String(appSettings.defaultPortionG);
  if (birthDateInput) birthDateInput.value = appSettings.birthDate || '';
  if (weightInput) weightInput.value = appSettings.currentWeightKg === null ? '' : String(appSettings.currentWeightKg);
  if (targetWeightInput) targetWeightInput.value = appSettings.targetWeightKg === null ? '' : String(appSettings.targetWeightKg);
  if (quickAddToggle) quickAddToggle.checked = appSettings.quickAddEnabled;
  if (settingsFoodYoungEnabled) settingsFoodYoungEnabled.checked = youngProfile?.enabled === true;
  if (settingsFoodYoungWeightFactor) settingsFoodYoungWeightFactor.value = String(youngProfile?.weightFactorPercent ?? 100);
  if (settingsFoodYoungChip1) settingsFoodYoungChip1.value = String(youngProfile?.quickAddValues?.[0] ?? 25);
  if (settingsFoodYoungChip2) settingsFoodYoungChip2.value = String(youngProfile?.quickAddValues?.[1] ?? 30);
  if (settingsFoodYoungChip3) settingsFoodYoungChip3.value = String(youngProfile?.quickAddValues?.[2] ?? 50);
  if (settingsFoodPlatinumEnabled) settingsFoodPlatinumEnabled.checked = platinumProfile?.enabled === true;
  if (settingsFoodPlatinumWeightFactor) settingsFoodPlatinumWeightFactor.value = String(platinumProfile?.weightFactorPercent ?? 100);
  if (settingsFoodPlatinumChip1) settingsFoodPlatinumChip1.value = String(platinumProfile?.quickAddValues?.[0] ?? 150);
  if (settingsFoodPlatinumChip2) settingsFoodPlatinumChip2.value = String(platinumProfile?.quickAddValues?.[1] ?? 200);
  if (settingsFoodPlatinumChip3) settingsFoodPlatinumChip3.value = String(platinumProfile?.quickAddValues?.[2] ?? 250);
  initializeFeedMixAmounts();

  applyQuickAddVisibility();
  renderFeedOpenStatus();
  updateFoodRecommendationUi();
  renderFeedFoodOptions();
}

function applyQuickAddVisibility() {
  renderFeedFoodOptions();
}

function toLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initActiveTab() {
  const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
  if (saved === 'settings' || saved === 'today' || saved === 'food') {
    currentTab = saved;
  }
}

function setActiveTab(tabName) {
  const supportedTabs = ['today', 'food', 'settings'];
  currentTab = supportedTabs.includes(tabName) ? tabName : 'today';
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, currentTab);

  const container = document.querySelector('.container');
  if (container) {
    container.classList.toggle('tab-food-active', currentTab === 'food');
    container.classList.toggle('tab-settings-active', currentTab === 'settings');
  }

  const tabToday = document.getElementById('tab-today');
  const tabFood = document.getElementById('tab-food');
  const tabSettings = document.getElementById('tab-settings');
  if (tabToday) tabToday.classList.toggle('active', currentTab === 'today');
  if (tabFood) tabFood.classList.toggle('active', currentTab === 'food');
  if (tabSettings) tabSettings.classList.toggle('active', currentTab === 'settings');
}

function parseTimestamp(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const withUtcSuffix = new Date(`${value}Z`);
  if (!Number.isNaN(withUtcSuffix.getTime())) return withUtcSuffix;

  return null;
}

function formatDateTimeForInput(value) {
  const date = parseTimestamp(value);
  if (!date) return '';
  const offsetMinutes = date.getTimezoneOffset();
  return new Date(date.getTime() - offsetMinutes * 60000).toISOString().slice(0, 16);
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

function renderFeedOpenStatus() {
  const feedOpenStatusEl = document.getElementById('feed-open-status');
  const feedProgressWrapEl = document.getElementById('feed-progress-wrap');
  const feedProgressBarEl = document.getElementById('feed-progress-bar');
  const feedProgressTextEl = document.getElementById('feed-progress-text');
  const todayFeedOpenStatusEl = document.getElementById('today-feed-open-status');
  const todayFeedProgressWrapEl = document.getElementById('today-feed-progress-wrap');
  const todayFeedProgressBarEl = document.getElementById('today-feed-progress-bar');
  const todayFeedProgressTextEl = document.getElementById('today-feed-progress-text');
  if (!feedOpenStatusEl && !todayFeedOpenStatusEl) return;

  const target = Math.max(0, Number(getEffectiveDailyTargetGrams() || 0));
  const fed = Math.max(0, todayFedGrams || 0);
  const statusTextNoTarget = t('statusFeedNoTarget', { fed });
  if (target <= 0) {
    if (feedOpenStatusEl) feedOpenStatusEl.textContent = statusTextNoTarget;
    if (todayFeedOpenStatusEl) todayFeedOpenStatusEl.textContent = statusTextNoTarget;
    if (feedProgressWrapEl) {
      feedProgressWrapEl.style.display = 'none';
    }
    if (todayFeedProgressWrapEl) {
      todayFeedProgressWrapEl.style.display = 'none';
    }
    updateFeedPreviewStatus();
    return;
  }

  const remaining = Math.max(0, target - fed);
  const statusTextOpen = t('statusFeedOpen', {
    remaining,
    fed,
    target,
    referenceFood: getFeedReferenceLabel(),
  });
  if (feedOpenStatusEl) feedOpenStatusEl.textContent = statusTextOpen;
  if (todayFeedOpenStatusEl) todayFeedOpenStatusEl.textContent = statusTextOpen;

  const progressPercent = Math.max(0, Math.min(100, Math.round((fed / target) * 100)));
  if (feedProgressWrapEl) {
    feedProgressWrapEl.style.display = 'grid';
  }
  if (feedProgressBarEl) {
    feedProgressBarEl.style.width = `${progressPercent}%`;
  }
  if (feedProgressTextEl) {
    feedProgressTextEl.textContent = `${progressPercent}%`;
  }
  if (todayFeedProgressWrapEl) {
    todayFeedProgressWrapEl.style.display = 'grid';
  }
  if (todayFeedProgressBarEl) {
    todayFeedProgressBarEl.style.width = `${progressPercent}%`;
  }
  if (todayFeedProgressTextEl) {
    todayFeedProgressTextEl.textContent = `${progressPercent}%`;
  }
  updateFeedPreviewStatus();
}

function hideQuickAddBanner() {
  if (quickAddUndoTimerId) {
    clearTimeout(quickAddUndoTimerId);
    quickAddUndoTimerId = null;
  }

  if (quickAddUndoCountdownTimerId) {
    clearInterval(quickAddUndoCountdownTimerId);
    quickAddUndoCountdownTimerId = null;
  }

  quickAddUndoEventId = null;
  const banner = document.getElementById('quick-add-banner');
  if (banner) {
    delete banner.dataset.eventId;
    delete banner.dataset.grams;
    banner.hidden = true;
  }
}

function showQuickAddBanner(eventId, grams) {
  hideQuickAddBanner();
  quickAddUndoEventId = eventId;

  const banner = document.getElementById('quick-add-banner');
  const text = document.getElementById('quick-add-banner-text');
  if (!banner || !text) return;

  banner.dataset.eventId = String(eventId);
  banner.dataset.grams = String(grams);
  const seconds = 5;
  const updateText = (remainingSeconds) => {
    text.textContent = `${t('quickAddSaved', { grams })} · ${t('quickAddUndo')} (${remainingSeconds}s)`;
  };

  updateText(seconds);
  banner.hidden = false;

  let remainingSeconds = seconds;
  quickAddUndoCountdownTimerId = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      hideQuickAddBanner();
      return;
    }

    updateText(remainingSeconds);
  }, 1000);

  quickAddUndoTimerId = setTimeout(() => {
    hideQuickAddBanner();
  }, 5000);
}

async function saveFeedEntry(amountG, note = '') {
  const normalizedAmountG = Math.max(0, Math.floor(Number(amountG) || 0));
  const result = await api('/api/feed', {
    method: 'POST',
    body: JSON.stringify({ note, amount_g: normalizedAmountG }),
  });
  return { id: result.id, amountG: normalizedAmountG };
}

function renderCurrentAloneStatus() {
  const aloneStatusEl = document.getElementById('alone-status');
  if (!aloneStatusEl) return;

  if (!currentAloneStartedAt) {
    aloneStatusEl.textContent = t('statusNoAlone');
    return;
  }

  aloneStatusEl.textContent = t('statusOpenAlone', { since: formatElapsedSince(currentAloneStartedAt) });
}

function startEliminationStatusTicker() {
  if (eliminationStatusIntervalId) {
    clearInterval(eliminationStatusIntervalId);
  }
  eliminationStatusIntervalId = setInterval(() => {
    renderEliminationStatus();
    renderCurrentAloneStatus();
  }, 60000);
}

function toHoursText(minutes) {
  return (minutes / 60).toFixed(2);
}

function eventLabel(event) {
  const note = event.note ? t('notePrefix', { note: event.note }) : '';

  if (event.type === 'feed') {
    return t('eventFeed', { grams: event.feed_amount_g ?? 0, time: formatDateTime(event.created_at), note });
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

  if (event.type === 'alone') {
    const duration = event.duration_min ?? 0;
    return t('eventAlone', {
      start: formatDateTime(event.alone_start),
      end: formatDateTime(event.alone_end),
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

function setEditDialogFieldVisibility(type) {
  const groups = document.querySelectorAll('.edit-type-group');
  groups.forEach((group) => {
    group.hidden = true;
  });

  const visibleSelectors = {
    feed: ['.edit-type-feed'],
    walk: ['.edit-type-walk'],
    sleep: ['.edit-type-sleep'],
    alone: ['.edit-type-alone'],
  };

  for (const selector of visibleSelectors[type] || []) {
    document.querySelectorAll(selector).forEach((group) => {
      group.hidden = false;
    });
  }
}

function closeEditDialog() {
  const dialog = document.getElementById('edit-event-dialog');
  if (dialog?.open) {
    dialog.close();
  }

  if (editFeedbackTimeoutId) {
    clearTimeout(editFeedbackTimeoutId);
    editFeedbackTimeoutId = null;
  }

  const inlineErrorEl = document.getElementById('edit-inline-error');
  if (inlineErrorEl) {
    inlineErrorEl.textContent = '';
    inlineErrorEl.classList.remove('is-success');
  }
}

function openEditDialog(event) {
  const dialog = document.getElementById('edit-event-dialog');
  if (!dialog) return;

  document.getElementById('edit-event-id').value = String(event.id);
  document.getElementById('edit-event-type').value = event.type;
  document.getElementById('edit-inline-error').textContent = '';
  document.getElementById('edit-created-at').value = formatDateTimeForInput(event.created_at);
  document.getElementById('edit-amount-g').value = event.feed_amount_g ?? '';
  document.getElementById('edit-walk-start').value = formatDateTimeForInput(event.walk_start);
  document.getElementById('edit-walk-end').value = formatDateTimeForInput(event.walk_end);
  document.getElementById('edit-pipi').checked = Boolean(event.pipi);
  document.getElementById('edit-pupu').checked = Boolean(event.pupu);
  document.getElementById('edit-sleep-start').value = formatDateTimeForInput(event.sleep_start);
  document.getElementById('edit-sleep-end').value = formatDateTimeForInput(event.sleep_end);
  document.getElementById('edit-alone-start').value = formatDateTimeForInput(event.alone_start);
  document.getElementById('edit-alone-end').value = formatDateTimeForInput(event.alone_end);
  document.getElementById('edit-note').value = event.note || '';

  setEditDialogFieldVisibility(event.type);

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function buildEditPayload() {
  const eventType = document.getElementById('edit-event-type').value;
  const payload = {
    note: document.getElementById('edit-note').value.trim(),
  };

  const createdAtValue = document.getElementById('edit-created-at').value.trim();
  if (createdAtValue) payload.created_at = createdAtValue;

  if (eventType === 'feed') {
    const amountValue = document.getElementById('edit-amount-g').value.trim();
    if (amountValue !== '') payload.amount_g = Number(amountValue);
    return payload;
  }

  if (eventType === 'walk') {
    const walkStartValue = document.getElementById('edit-walk-start').value.trim();
    const walkEndValue = document.getElementById('edit-walk-end').value.trim();
    if (walkStartValue) payload.walk_start = walkStartValue;
    if (walkEndValue) payload.walk_end = walkEndValue;
    payload.pipi = document.getElementById('edit-pipi').checked;
    payload.pupu = document.getElementById('edit-pupu').checked;
    return payload;
  }

  if (eventType === 'sleep') {
    const sleepStartValue = document.getElementById('edit-sleep-start').value.trim();
    const sleepEndValue = document.getElementById('edit-sleep-end').value.trim();
    if (sleepStartValue) payload.sleep_start = sleepStartValue;
    if (sleepEndValue) payload.sleep_end = sleepEndValue;
    return payload;
  }

  if (eventType === 'alone') {
    const aloneStartValue = document.getElementById('edit-alone-start').value.trim();
    const aloneEndValue = document.getElementById('edit-alone-end').value.trim();
    if (aloneStartValue) payload.alone_start = aloneStartValue;
    if (aloneEndValue) payload.alone_end = aloneEndValue;
    return payload;
  }

  return payload;
}

function showEditFeedback(message, variant = 'error') {
  const inlineErrorEl = document.getElementById('edit-inline-error');
  if (!inlineErrorEl) return;

  if (editFeedbackTimeoutId) {
    clearTimeout(editFeedbackTimeoutId);
    editFeedbackTimeoutId = null;
  }

  inlineErrorEl.textContent = message;
  inlineErrorEl.classList.toggle('is-success', variant === 'success');

  if (variant === 'success') {
    editFeedbackTimeoutId = setTimeout(() => {
      inlineErrorEl.textContent = '';
      inlineErrorEl.classList.remove('is-success');
      editFeedbackTimeoutId = null;
    }, 2400);
  }
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
  const aloneStatusEl = document.getElementById('alone-status');

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

  currentAloneStartedAt = status.hasOpenAlone ? parseTimestamp(status.openAlone.alone_start) : null;
  if (aloneStatusEl) {
    renderCurrentAloneStatus();
  }

  lastPipiDoneAt = extractLastEliminationTimestamp(events, 'pipi', 'walk_end');
  lastPupuDoneAt = extractLastEliminationTimestamp(events, 'pupu', 'walk_end');
  renderEliminationStatus();

  document.getElementById('walks').textContent = String(stats.walks);
  document.getElementById('feeds').textContent = String(stats.feeds);
  document.getElementById('minutes').textContent = String(stats.totalWalkMinutes);
  todayFedGrams = Number(stats.totalFeedGrams ?? 0);
  renderFeedOpenStatus();
  document.getElementById('sleep-hours').textContent = String(stats.totalSleepHours ?? 0);
  document.getElementById('sleep-sessions').textContent = String(stats.sleepSessions ?? 0);
  document.getElementById('pipi-count').textContent = String(stats.pipiCount);
  document.getElementById('pupu-count').textContent = String(stats.pupuCount);

  const eventsList = document.getElementById('events');
  eventsList.innerHTML = '';
  recentEventsCache = events.slice(0, 30);
  for (const event of recentEventsCache) {
    const li = document.createElement('li');
    const content = document.createElement('div');
    content.className = 'event-entry-content';

    const text = document.createElement('div');
    text.className = 'event-entry-text';
    text.textContent = eventLabel(event);
    content.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'event-entry-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'event-icon-btn event-icon-btn-edit';
    editButton.dataset.action = 'edit-event';
    editButton.dataset.eventId = String(event.id);
    editButton.textContent = '✏️';
    editButton.title = t('iconEditEntryAria');
    editButton.setAttribute('aria-label', t('iconEditEntryAria'));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'event-icon-btn event-icon-btn-delete';
    deleteButton.dataset.action = 'delete-event';
    deleteButton.dataset.eventId = String(event.id);
    deleteButton.textContent = '🗑️';
    deleteButton.title = t('iconDeleteEntryAria');
    deleteButton.setAttribute('aria-label', t('iconDeleteEntryAria'));

    actions.append(editButton, deleteButton);
    content.appendChild(actions);
    li.appendChild(content);
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
  const tabTodayButton = document.getElementById('tab-today');
  const tabFoodButton = document.getElementById('tab-food');
  const tabSettingsButton = document.getElementById('tab-settings');
  const startWalkButton = document.getElementById('start-walk');
  const endWalkButton = document.getElementById('end-walk');
  const pipiCheckbox = document.getElementById('pipi');
  const pupuCheckbox = document.getElementById('pupu');
  const feedButton = document.getElementById('feed');
  const feedMixList = document.getElementById('feed-food-options');
  const startSleepButton = document.getElementById('start-sleep');
  const endSleepButton = document.getElementById('end-sleep');
  const startAloneButton = document.getElementById('start-alone');
  const endAloneButton = document.getElementById('end-alone');
  const backupButton = document.getElementById('backup-json');
  const exportJsonButton = document.getElementById('export-json');
  const exportCsvButton = document.getElementById('export-csv');
  const deleteLastButton = document.getElementById('delete-last');
  const deleteAllButton = document.getElementById('delete-all');
  const quickAddBanner = document.getElementById('quick-add-banner');
  const quickAddUndoButton = document.getElementById('quick-add-undo');
  const importAppendButton = document.getElementById('import-append');
  const importReplaceButton = document.getElementById('import-replace');
  const manualSaveButton = document.getElementById('manual-save');
  const manualTypeSelect = document.getElementById('manual-type');
  const range7Button = document.getElementById('range-7');
  const range30Button = document.getElementById('range-30');
  const deleteResultEl = document.getElementById('delete-result');
  const languageSelect = document.getElementById('language-select');
  const settingsSaveButton = document.getElementById('settings-save');
  const settingsResultEl = document.getElementById('settings-result');
  const settingsDailyTargetInput = document.getElementById('settings-daily-target-g');
  const settingsDefaultPortionInput = document.getElementById('settings-default-portion-g');
  const settingsBirthDateInput = document.getElementById('settings-birth-date');
  const settingsWeightInput = document.getElementById('settings-weight-kg');
  const settingsTargetWeightInput = document.getElementById('settings-target-weight-kg');
  const settingsQuickAddToggle = document.getElementById('settings-enable-quick-add');
  const settingsFoodYoungEnabled = document.getElementById('settings-food-young-enabled');
  const settingsFoodYoungWeightFactor = document.getElementById('settings-food-young-weight-factor');
  const settingsFoodYoungChip1 = document.getElementById('settings-food-young-chip-1');
  const settingsFoodYoungChip2 = document.getElementById('settings-food-young-chip-2');
  const settingsFoodYoungChip3 = document.getElementById('settings-food-young-chip-3');
  const settingsFoodPlatinumEnabled = document.getElementById('settings-food-platinum-enabled');
  const settingsFoodPlatinumWeightFactor = document.getElementById('settings-food-platinum-weight-factor');
  const settingsFoodPlatinumChip1 = document.getElementById('settings-food-platinum-chip-1');
  const settingsFoodPlatinumChip2 = document.getElementById('settings-food-platinum-chip-2');
  const settingsFoodPlatinumChip3 = document.getElementById('settings-food-platinum-chip-3');
  const eventsList = document.getElementById('events');
  const editEventDialog = document.getElementById('edit-event-dialog');
  const editEventForm = document.getElementById('edit-event-form');
  const editDialogCloseButton = document.getElementById('edit-dialog-close');
  const editDialogCancelButton = document.getElementById('edit-dialog-cancel');

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

  tabTodayButton?.addEventListener('click', () => {
    setActiveTab('today');
  });

  tabFoodButton?.addEventListener('click', () => {
    setActiveTab('food');
  });

  tabSettingsButton?.addEventListener('click', () => {
    setActiveTab('settings');
  });

  feedMixList?.addEventListener('input', (event) => {
    const input = event.target.closest('.feed-mix-input');
    if (!input) return;
    const foodKey = String(input.dataset.foodKey || '');
    if (!FOOD_PROFILE_DEFINITIONS[foodKey]) return;
    const amount = Number(input.value);
    feedMixAmounts[foodKey] = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
    updateFeedPreviewStatus();
  });

  feedMixList?.addEventListener('click', (event) => {
    const chip = event.target.closest('button[data-food-key][data-gram]');
    if (!chip) return;
    const foodKey = String(chip.dataset.foodKey || '');
    if (!FOOD_PROFILE_DEFINITIONS[foodKey]) return;
    const gramValue = Number(chip.dataset.gram);
    if (!Number.isFinite(gramValue) || gramValue <= 0) return;

    const nextAmount = Math.max(0, Math.floor(Number(feedMixAmounts?.[foodKey] || 0))) + Math.floor(gramValue);
    feedMixAmounts[foodKey] = nextAmount;

    const input = document.getElementById(`feed-amount-${foodKey}`);
    if (input) input.value = String(nextAmount);
    updateFeedPreviewStatus();
  });

  quickAddUndoButton?.addEventListener('click', async () => {
    const banner = document.getElementById('quick-add-banner');
    const eventId = Number(banner?.dataset.eventId || quickAddUndoEventId);
    if (!Number.isInteger(eventId) || eventId <= 0) return;

    try {
      await api(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      hideQuickAddBanner();
      await refreshAll();
    } catch (error) {
      alert(translateServerError(error.message));
    }
  });

  eventsList?.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const eventId = Number(button.dataset.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) return;

    const selectedEvent = recentEventsCache.find((entry) => entry.id === eventId);
    if (!selectedEvent) return;

    if (button.dataset.action === 'edit-event') {
      openEditDialog(selectedEvent);
      return;
    }

    if (button.dataset.action === 'delete-event') {
      const confirmed = window.confirm(t('confirmDeleteEntry', { entry: eventLabel(selectedEvent) }));
      if (!confirmed) return;

      try {
        await api(`/api/events/${eventId}`, { method: 'DELETE' });
        await refreshAll();
      } catch (error) {
        alert(translateServerError(error.message));
      }
    }
  });

  editEventDialog?.addEventListener('click', (event) => {
    if (event.target === editEventDialog) {
      closeEditDialog();
    }
  });

  editDialogCloseButton?.addEventListener('click', closeEditDialog);
  editDialogCancelButton?.addEventListener('click', closeEditDialog);

  editEventForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const eventId = Number(document.getElementById('edit-event-id').value);
    if (!Number.isInteger(eventId) || eventId <= 0) return;

    showEditFeedback('');

    try {
      const payload = buildEditPayload();
      await api(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await refreshAll();
      showEditFeedback(t('editSaved'), 'success');
      setTimeout(() => {
        closeEditDialog();
      }, 500);
    } catch (error) {
      showEditFeedback(t('editSaveFailed', { error: translateServerError(error.message) }));
    }
  });

  settingsSaveButton?.addEventListener('click', () => {
    const nextDailyTarget = Number(settingsDailyTargetInput?.value ?? NaN);
    const nextDefaultPortion = Number(settingsDefaultPortionInput?.value ?? NaN);
    const nextBirthDate = String(settingsBirthDateInput?.value ?? '').trim();
    const nextWeightRaw = String(settingsWeightInput?.value ?? '').trim();
    const nextWeight = nextWeightRaw === '' ? null : Number(nextWeightRaw);
    const nextTargetWeightRaw = String(settingsTargetWeightInput?.value ?? '').trim();
    const nextTargetWeight = nextTargetWeightRaw === '' ? null : Number(nextTargetWeightRaw);
    const nextYoungValues = [
      Number(settingsFoodYoungChip1?.value ?? NaN),
      Number(settingsFoodYoungChip2?.value ?? NaN),
      Number(settingsFoodYoungChip3?.value ?? NaN),
    ];
    const nextPlatinumValues = [
      Number(settingsFoodPlatinumChip1?.value ?? NaN),
      Number(settingsFoodPlatinumChip2?.value ?? NaN),
      Number(settingsFoodPlatinumChip3?.value ?? NaN),
    ];
    const nextYoungWeightFactor = Number(settingsFoodYoungWeightFactor?.value ?? NaN);
    const nextPlatinumWeightFactor = Number(settingsFoodPlatinumWeightFactor?.value ?? NaN);

    if (!Number.isFinite(nextDailyTarget) || nextDailyTarget < 0 || !Number.isFinite(nextDefaultPortion) || nextDefaultPortion < 0) {
      if (settingsResultEl) settingsResultEl.textContent = t('settingsSaveFailed');
      return;
    }

    if (nextBirthDate) {
      const hasValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(nextBirthDate);
      const isFutureDate = nextBirthDate > toLocalDateInputValue(new Date());
      if (!hasValidFormat || isFutureDate) {
        if (settingsResultEl) settingsResultEl.textContent = t('settingsBirthDateInvalid');
        return;
      }
    }

    if (nextWeight !== null && (!Number.isFinite(nextWeight) || nextWeight <= 0)) {
      if (settingsResultEl) settingsResultEl.textContent = t('settingsWeightInvalid');
      return;
    }

    if (nextTargetWeight !== null && (!Number.isFinite(nextTargetWeight) || nextTargetWeight <= 0)) {
      if (settingsResultEl) settingsResultEl.textContent = t('settingsTargetWeightInvalid');
      return;
    }

    const isValidChipSet = (values) => values.every((value) => Number.isFinite(value) && value > 0);
    if ((settingsFoodYoungEnabled?.checked && !isValidChipSet(nextYoungValues)) || (settingsFoodPlatinumEnabled?.checked && !isValidChipSet(nextPlatinumValues))) {
      if (settingsResultEl) settingsResultEl.textContent = t('settingsFoodChipInvalid');
      return;
    }

    const isValidFactor = (value) => Number.isFinite(value) && value > 0;
    if ((settingsFoodYoungEnabled?.checked && !isValidFactor(nextYoungWeightFactor)) || (settingsFoodPlatinumEnabled?.checked && !isValidFactor(nextPlatinumWeightFactor))) {
      if (settingsResultEl) settingsResultEl.textContent = t('settingsFoodWeightFactorInvalid');
      return;
    }

    const fallbackProfiles = appSettings.foodProfiles || createDefaultFoodProfiles();
    const foodProfiles = {
      youngPackMini: {
        enabled: settingsFoodYoungEnabled?.checked === true,
        weightFactorPercent: isValidFactor(nextYoungWeightFactor)
          ? Math.round(nextYoungWeightFactor)
          : (fallbackProfiles.youngPackMini.weightFactorPercent ?? 100),
        quickAddValues: isValidChipSet(nextYoungValues)
          ? nextYoungValues.map((value) => Math.floor(value))
          : [...fallbackProfiles.youngPackMini.quickAddValues],
      },
      platinumMenuPuppyChicken: {
        enabled: settingsFoodPlatinumEnabled?.checked === true,
        weightFactorPercent: isValidFactor(nextPlatinumWeightFactor)
          ? Math.round(nextPlatinumWeightFactor)
          : (fallbackProfiles.platinumMenuPuppyChicken.weightFactorPercent ?? 100),
        quickAddValues: isValidChipSet(nextPlatinumValues)
          ? nextPlatinumValues.map((value) => Math.floor(value))
          : [...fallbackProfiles.platinumMenuPuppyChicken.quickAddValues],
      },
    };

    appSettings = {
      dailyTargetG: Math.floor(nextDailyTarget),
      defaultPortionG: Math.floor(nextDefaultPortion),
      quickAddEnabled: settingsQuickAddToggle?.checked !== false,
      birthDate: nextBirthDate,
      currentWeightKg: nextWeight === null ? null : Number(nextWeight.toFixed(1)),
      targetWeightKg: nextTargetWeight === null ? null : Number(nextTargetWeight.toFixed(1)),
      foodProfiles,
    };

    saveAppSettings();
    applySettingsToForm();
    if (settingsResultEl) settingsResultEl.textContent = t('settingsSaved');
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
    const userNote = document.getElementById('feed-note').value.trim();
    const normalizedAmountG = getPendingFeedMixEquivalentGrams();
    if (!Number.isFinite(normalizedAmountG) || normalizedAmountG <= 0) {
      alert(t('feedMixNoAmount'));
      return;
    }
    const note = buildFeedNoteForMix(userNote);

    try {
      await saveFeedEntry(normalizedAmountG, note);
      document.getElementById('feed-note').value = '';
      initializeFeedMixAmounts();
      renderFeedFoodOptions();
      hideQuickAddBanner();
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

  startAloneButton.addEventListener('click', async () => {
    try {
      await api('/api/alone/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await refreshAll();
    } catch (error) {
      alert(translateServerError(error.message));
    }
  });

  endAloneButton.addEventListener('click', async () => {
    try {
      await api('/api/alone/end', {
        method: 'POST',
        body: JSON.stringify({}),
      });
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
loadAppSettings();
initActiveTab();
applyStaticTranslations();
bindActions();
applySettingsToForm();
setActiveTab(currentTab);
startEliminationStatusTicker();
setupFoodAccordion();
refreshAll().catch((error) => {
  alert(t('loadError', { error: error.message }));
});
