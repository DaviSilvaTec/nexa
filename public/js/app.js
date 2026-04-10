function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.value || element.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`[data-copy-target="${elementId}"]`);
    const originalText = btn.textContent;
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = originalText; }, 2000);
  });
}

const output = document.getElementById('output');
const nexaResponse = document.getElementById('nexa-response');
const aiAgentResponseForm = document.getElementById('ai-agent-response-form');
const speechButton = document.getElementById('speech-button');
const speechStatus = document.getElementById('speech-status');
const sessionList = document.getElementById('ai-session-list');
const modelList = document.getElementById('ai-model-list');
const blingTokenStatus = document.getElementById('bling-token-status');
const blingTokenExpiry = document.getElementById('bling-token-expiry');
const blingSyncStatus = document.getElementById('bling-sync-status');
const blingSyncSummary = document.getElementById('bling-sync-summary');
const refreshBlingTokenButton = document.getElementById('refresh-bling-token-button');
const refreshBlingSyncButton = document.getElementById('refresh-bling-sync-button');
const refreshSessionsButton = document.getElementById('refresh-sessions-button');
const bulkSelectionActions = document.getElementById('bulk-selection-actions');
const bulkSelectionSummary = document.getElementById('bulk-selection-summary');
const bulkSaveModelButton = document.getElementById('bulk-save-model-button');
const bulkDeleteButton = document.getElementById('bulk-delete-button');
const sessionTabButton = document.getElementById('session-tab-button');
const modelTabButton = document.getElementById('model-tab-button');
const sessionListPanel = document.getElementById('session-list-panel');
const modelListPanel = document.getElementById('model-list-panel');
const originalTextField = aiAgentResponseForm.querySelector('textarea[name="originalText"]');
const submitAiAgentButton = document.getElementById('submit-ai-agent-button');
const cancelAiAgentButton = document.getElementById('cancel-ai-agent-button');
const budgetFinishedCheckbox = document.getElementById('budget-finished-checkbox');
const showLogsToggle = document.getElementById('show-logs-toggle');
const showLogsOptions = document.getElementById('show-logs-options');
const logLevelSelector = document.getElementById('log-level-selector');
const enableDefaultModelToggle = document.getElementById('enable-default-model-toggle');
const enableDefaultModelOptions = document.getElementById('enable-default-model-options');
const defaultAiModelSelector = document.getElementById('default-ai-model-selector');
const enableThemeToggle = document.getElementById('enable-theme-toggle');
const enableThemeOptions = document.getElementById('enable-theme-options');
const themeSelector = document.getElementById('theme-selector');
const enableReviewBehaviorToggle = document.getElementById('enable-review-behavior-toggle');
const enableReviewBehaviorOptions = document.getElementById('enable-review-behavior-options');
const reviewBehaviorSelector = document.getElementById('review-behavior-selector');
const focusTextToggle = document.getElementById('focus-text-toggle');
const showBlingPreviewToggle = document.getElementById('show-bling-preview-toggle');
const responseViewSummaryTab = document.getElementById('response-view-summary-tab');
const responseViewBlingTab = document.getElementById('response-view-bling-tab');
const settingInfoWraps = Array.from(document.querySelectorAll('.setting-info-wrap'));
let activeSessionId = null;
let activeSessionOriginalText = '';
let activeSessionCreatedAt = '';
let activeModelId = null;
let activeModelMode = null;
let activeSidebarTab = 'sessions';
let activeResponseView = 'summary';
let currentRenderableResponsePayload = null;
let recentSessionsCache = [];
let recentModelsCache = [];
const selectedSessionIds = new Set();
const selectedModelIds = new Set();
let operationCountdownTimer = null;
let isWaitingWindowActive = false;
const OPERATION_TIMEOUT_SECONDS = 120;
const OPERATION_POLL_INTERVAL_SECONDS = 5;
const DEFAULT_AI_MODEL = 'gpt-5-nano';
const AI_MODEL_STORAGE_KEY = 'nexa.defaultAiModel';
const SETTINGS_STORAGE_KEYS = {
  showLogs: 'nexa.showLogs',
  logLevel: 'nexa.logLevel',
  useDefaultModelSelection: 'nexa.useDefaultModelSelection',
  themeEnabled: 'nexa.themeEnabled',
  theme: 'nexa.theme',
  reviewBehaviorEnabled: 'nexa.reviewBehaviorEnabled',
  reviewBehavior: 'nexa.reviewBehavior',
  focusText: 'nexa.focusText',
  showBlingPreview: 'nexa.showBlingPreview',
};
const SUPPORTED_AI_MODELS = ['gpt-5-nano', 'gpt-5.4-mini', 'gpt-5.4'];
const SUPPORTED_THEMES = ['classic', 'compact', 'high-contrast'];
const SUPPORTED_LOG_LEVELS = ['debug', 'warn', 'error'];
const SUPPORTED_REVIEW_BEHAVIORS = [
  'manual',
  'double-check',
  'suggestion-only',
];

function renderList(items) {
  if (!items || items.length === 0) {
    return '<p class="muted">Nenhum item.</p>';
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function truncateText(value, maxLength = 96) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function buildSessionCardTitle(session) {
  const summaryTitle = String(session?.summaryTitle || '').trim();

  if (summaryTitle) {
    return truncateText(summaryTitle, 72);
  }

  const sourceText = String(session?.originalText || '').trim();
  if (sourceText) {
    const firstBlock = sourceText.split(/\n+/)[0] || sourceText;
    const firstSentence = firstBlock.split(/[.!?]/)[0] || firstBlock;
    return truncateText(firstSentence, 72);
  }

  return session?.customerQuery || 'Sessão sem título';
}

function buildCustomerLabel(customerName) {
  return customerName ? `Cliente: ${customerName}` : 'Cliente não identificado';
}

function toggleSelection(set, id, checked) {
  if (!id) {
    return;
  }

  if (checked) {
    set.add(id);
  } else {
    set.delete(id);
  }
}

function clearSidebarSelections() {
  selectedSessionIds.clear();
  selectedModelIds.clear();
}

function getSelectedSessions() {
  return recentSessionsCache.filter((session) => selectedSessionIds.has(session.id));
}

function getSelectedModels() {
  return recentModelsCache.filter((model) => selectedModelIds.has(model.id));
}

function renderBulkSelectionActions() {
  if (!(bulkSelectionActions instanceof HTMLElement)) {
    return;
  }

  const isSessionsTab = activeSidebarTab === 'sessions';
  const selectedCount = isSessionsTab ? selectedSessionIds.size : selectedModelIds.size;

  bulkSelectionActions.classList.toggle('is-hidden', selectedCount === 0);

  if (selectedCount === 0) {
    if (bulkSelectionSummary instanceof HTMLElement) {
      bulkSelectionSummary.textContent = '';
    }
    if (bulkSaveModelButton instanceof HTMLButtonElement) {
      bulkSaveModelButton.hidden = true;
      bulkSaveModelButton.disabled = true;
    }
    if (bulkDeleteButton instanceof HTMLButtonElement) {
      bulkDeleteButton.hidden = true;
      bulkDeleteButton.disabled = true;
    }
    return;
  }

  if (bulkSelectionSummary instanceof HTMLElement) {
    bulkSelectionSummary.textContent =
      selectedCount === 1
        ? '1 item selecionado'
        : `${selectedCount} itens selecionados`;
  }

  if (bulkDeleteButton instanceof HTMLButtonElement) {
    bulkDeleteButton.hidden = false;
    bulkDeleteButton.disabled = false;
  }

  if (bulkSaveModelButton instanceof HTMLButtonElement) {
    if (isSessionsTab) {
      const selectedFinalizedSessions = getSelectedSessions().filter(
        (session) => (session.status || 'Aguardando aprovacao') === 'Finalizada',
      );
      bulkSaveModelButton.hidden = false;
      bulkSaveModelButton.disabled = selectedFinalizedSessions.length === 0;
      bulkSaveModelButton.title =
        selectedFinalizedSessions.length === 0
          ? 'Selecione pelo menos uma sessão finalizada para salvar como modelo.'
          : '';
    } else {
      bulkSaveModelButton.hidden = true;
      bulkSaveModelButton.disabled = true;
      bulkSaveModelButton.title = '';
    }
  }
}

function countMeaningfulWords(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0).length;
}

function normalizeAiModelSelection(value) {
  return SUPPORTED_AI_MODELS.includes(value) ? value : DEFAULT_AI_MODEL;
}

function readStoredSetting(key, fallback = null) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStoredSetting(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch { }
}

function readStoredBoolean(key, fallback = false) {
  return readStoredSetting(key, fallback ? 'true' : 'false') === 'true';
}

function normalizeThemeSelection(value) {
  return SUPPORTED_THEMES.includes(value) ? value : 'classic';
}

function normalizeLogLevelSelection(value) {
  return SUPPORTED_LOG_LEVELS.includes(value) ? value : 'debug';
}

function normalizeReviewBehaviorSelection(value) {
  return SUPPORTED_REVIEW_BEHAVIORS.includes(value) ? value : 'manual';
}

function toggleSettingsOptions(container, enabled) {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.classList.toggle('is-hidden', !enabled);
}

function applyThemeSelection(theme, enabled) {
  document.body.dataset.theme = enabled ? normalizeThemeSelection(theme) : 'classic';
}

function applyLogVisibility(enabled) {
  if (!(output instanceof HTMLElement)) {
    return;
  }

  output.hidden = !enabled;
}

function getSelectedLogLevel() {
  if (logLevelSelector instanceof HTMLSelectElement) {
    return normalizeLogLevelSelection(logLevelSelector.value);
  }

  return 'debug';
}

function shouldRenderLog(level = 'debug') {
  const priorities = {
    debug: 0,
    warn: 1,
    error: 2,
  };

  return priorities[level] >= priorities[getSelectedLogLevel()];
}

const outputTextContentDescriptor = Object.getOwnPropertyDescriptor(
  Node.prototype,
  'textContent',
);

function writeOutputContent(value, level = 'debug') {
  if (!(outputTextContentDescriptor?.set && output instanceof HTMLElement)) {
    return;
  }

  if (!shouldRenderLog(level)) {
    return;
  }

  outputTextContentDescriptor.set.call(output, String(value ?? ''));
}

function setOutputMessage(message, level = 'debug') {
  writeOutputContent(message, level);
}

function setOutputPayload(payload, meta = {}, level = 'debug') {
  writeOutputContent(
    JSON.stringify(
      {
        ...meta,
        payload,
      },
      null,
      2,
    ),
    level,
  );
}

if (outputTextContentDescriptor?.get && outputTextContentDescriptor?.set && output instanceof HTMLElement) {
  Object.defineProperty(output, 'textContent', {
    configurable: true,
    enumerable: true,
    get() {
      return outputTextContentDescriptor.get.call(output);
    },
    set(value) {
      writeOutputContent(value, 'debug');
    },
  });
}

function getDefaultAiModel() {
  if (
    enableDefaultModelToggle instanceof HTMLInputElement &&
    !enableDefaultModelToggle.checked
  ) {
    return DEFAULT_AI_MODEL;
  }

  if (defaultAiModelSelector instanceof HTMLSelectElement) {
    return normalizeAiModelSelection(defaultAiModelSelector.value);
  }

  return DEFAULT_AI_MODEL;
}

function getSelectedReviewBehavior() {
  if (
    enableReviewBehaviorToggle instanceof HTMLInputElement &&
    !enableReviewBehaviorToggle.checked
  ) {
    return 'manual';
  }

  if (reviewBehaviorSelector instanceof HTMLSelectElement) {
    return normalizeReviewBehaviorSelection(reviewBehaviorSelector.value);
  }

  return 'manual';
}

function shouldAutoFocusTextField() {
  return focusTextToggle instanceof HTMLInputElement
    ? focusTextToggle.checked
    : false;
}

function shouldShowBlingPreview() {
  return showBlingPreviewToggle instanceof HTMLInputElement
    ? showBlingPreviewToggle.checked
    : false;
}

function focusResponseCard() {
  if (!(nexaResponse instanceof HTMLElement)) {
    return;
  }

  nexaResponse.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
  window.setTimeout(() => {
    nexaResponse.focus();
  }, 120);
}

function focusFirstSessionAction() {
  if (!(nexaResponse instanceof HTMLElement)) {
    return;
  }

  const firstEnabledAction = nexaResponse.querySelector(
    '.response-actions [data-session-status-action]:not([disabled])',
  );

  if (firstEnabledAction instanceof HTMLElement) {
    firstEnabledAction.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    window.setTimeout(() => {
      firstEnabledAction.focus();
    }, 120);
    return;
  }

  focusResponseCard();
}

function focusProposalDraftEditor() {
  if (!(nexaResponse instanceof HTMLElement)) {
    return;
  }

  const proposalEditor = nexaResponse.querySelector(
    '[data-proposal-draft-editor]',
  );

  if (proposalEditor instanceof HTMLTextAreaElement) {
    proposalEditor.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    window.setTimeout(() => {
      proposalEditor.focus();
    }, 120);
    return;
  }

  focusResponseCard();
}

function focusProposalReviewEditor() {
  if (!(nexaResponse instanceof HTMLElement)) {
    return;
  }

  const reviewEditor = nexaResponse.querySelector(
    '[data-proposal-draft-review-editor]',
  );

  if (reviewEditor instanceof HTMLTextAreaElement) {
    reviewEditor.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    window.setTimeout(() => {
      reviewEditor.focus();
    }, 120);
    return;
  }

  focusResponseCard();
}

function focusBlingPreview() {
  if (!(nexaResponse instanceof HTMLElement)) {
    return;
  }

  const previewDocument = nexaResponse.querySelector(
    '[data-bling-preview-document]',
  );

  if (previewDocument instanceof HTMLElement) {
    previewDocument.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    window.setTimeout(() => {
      if (typeof previewDocument.focus === 'function') {
        previewDocument.focus({
          preventScroll: true,
        });
      }
    }, 120);
    return;
  }

  focusResponseCard();
}

function focusConfirmProposalButton() {
  if (!(nexaResponse instanceof HTMLElement)) {
    return;
  }

  const confirmButton = nexaResponse.querySelector(
    '[data-session-status-action="confirm-proposal"]:not([disabled])',
  );

  if (confirmButton instanceof HTMLElement) {
    confirmButton.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    window.setTimeout(() => {
      confirmButton.focus();
    }, 120);
    return;
  }

  focusFirstSessionAction();
}

function saveDefaultAiModel(model) {
  try {
    window.localStorage.setItem(
      AI_MODEL_STORAGE_KEY,
      normalizeAiModelSelection(model),
    );
  } catch { }
}

function loadDefaultAiModel() {
  let storedModel = DEFAULT_AI_MODEL;

  try {
    storedModel = normalizeAiModelSelection(
      window.localStorage.getItem(AI_MODEL_STORAGE_KEY) || DEFAULT_AI_MODEL,
    );
  } catch { }

  if (defaultAiModelSelector instanceof HTMLSelectElement) {
    defaultAiModelSelector.value = storedModel;
  }
}

function initializeSettingsPanel() {
  const showLogs = readStoredBoolean(SETTINGS_STORAGE_KEYS.showLogs, true);
  const logLevel = normalizeLogLevelSelection(
    readStoredSetting(SETTINGS_STORAGE_KEYS.logLevel, 'debug'),
  );
  const useDefaultModelSelection = readStoredBoolean(
    SETTINGS_STORAGE_KEYS.useDefaultModelSelection,
    true,
  );
  const themeEnabled = readStoredBoolean(SETTINGS_STORAGE_KEYS.themeEnabled, false);
  const theme = normalizeThemeSelection(
    readStoredSetting(SETTINGS_STORAGE_KEYS.theme, 'classic'),
  );
  const reviewBehaviorEnabled = readStoredBoolean(
    SETTINGS_STORAGE_KEYS.reviewBehaviorEnabled,
    false,
  );
  const reviewBehavior = normalizeReviewBehaviorSelection(
    readStoredSetting(SETTINGS_STORAGE_KEYS.reviewBehavior, 'manual'),
  );
  const focusText = readStoredBoolean(SETTINGS_STORAGE_KEYS.focusText, true);
  const showBlingPreview = readStoredBoolean(
    SETTINGS_STORAGE_KEYS.showBlingPreview,
    true,
  );

  if (showLogsToggle instanceof HTMLInputElement) {
    showLogsToggle.checked = showLogs;
    showLogsToggle.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.showLogs,
        showLogsToggle.checked ? 'true' : 'false',
      );
      toggleSettingsOptions(showLogsOptions, showLogsToggle.checked);
      applyLogVisibility(showLogsToggle.checked);
    });
  }
  toggleSettingsOptions(showLogsOptions, showLogs);
  applyLogVisibility(showLogs);

  if (logLevelSelector instanceof HTMLSelectElement) {
    logLevelSelector.value = logLevel;
    logLevelSelector.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.logLevel,
        normalizeLogLevelSelection(logLevelSelector.value),
      );
    });
  }

  if (enableDefaultModelToggle instanceof HTMLInputElement) {
    enableDefaultModelToggle.checked = useDefaultModelSelection;
    enableDefaultModelToggle.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.useDefaultModelSelection,
        enableDefaultModelToggle.checked ? 'true' : 'false',
      );
      toggleSettingsOptions(
        enableDefaultModelOptions,
        enableDefaultModelToggle.checked,
      );
    });
  }
  toggleSettingsOptions(enableDefaultModelOptions, useDefaultModelSelection);

  if (defaultAiModelSelector instanceof HTMLSelectElement) {
    defaultAiModelSelector.value = normalizeAiModelSelection(
      readStoredSetting(AI_MODEL_STORAGE_KEY, DEFAULT_AI_MODEL),
    );
  }

  if (enableThemeToggle instanceof HTMLInputElement) {
    enableThemeToggle.checked = themeEnabled;
    enableThemeToggle.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.themeEnabled,
        enableThemeToggle.checked ? 'true' : 'false',
      );
      toggleSettingsOptions(enableThemeOptions, enableThemeToggle.checked);
      applyThemeSelection(
        themeSelector instanceof HTMLSelectElement ? themeSelector.value : theme,
        enableThemeToggle.checked,
      );
    });
  }
  toggleSettingsOptions(enableThemeOptions, themeEnabled);

  if (themeSelector instanceof HTMLSelectElement) {
    themeSelector.value = theme;
    themeSelector.addEventListener('change', () => {
      const normalizedTheme = normalizeThemeSelection(themeSelector.value);
      writeStoredSetting(SETTINGS_STORAGE_KEYS.theme, normalizedTheme);
      applyThemeSelection(
        normalizedTheme,
        enableThemeToggle instanceof HTMLInputElement
          ? enableThemeToggle.checked
          : false,
      );
    });
  }
  applyThemeSelection(theme, themeEnabled);

  if (enableReviewBehaviorToggle instanceof HTMLInputElement) {
    enableReviewBehaviorToggle.checked = reviewBehaviorEnabled;
    enableReviewBehaviorToggle.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.reviewBehaviorEnabled,
        enableReviewBehaviorToggle.checked ? 'true' : 'false',
      );
      toggleSettingsOptions(
        enableReviewBehaviorOptions,
        enableReviewBehaviorToggle.checked,
      );
    });
  }
  toggleSettingsOptions(enableReviewBehaviorOptions, reviewBehaviorEnabled);

  if (reviewBehaviorSelector instanceof HTMLSelectElement) {
    reviewBehaviorSelector.value = reviewBehavior;
    reviewBehaviorSelector.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.reviewBehavior,
        normalizeReviewBehaviorSelection(reviewBehaviorSelector.value),
      );
    });
  }

  if (focusTextToggle instanceof HTMLInputElement) {
    focusTextToggle.checked = focusText;
    focusTextToggle.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.focusText,
        focusTextToggle.checked ? 'true' : 'false',
      );
    });
  }

  if (showBlingPreviewToggle instanceof HTMLInputElement) {
    showBlingPreviewToggle.checked = showBlingPreview;
    showBlingPreviewToggle.addEventListener('change', () => {
      writeStoredSetting(
        SETTINGS_STORAGE_KEYS.showBlingPreview,
        showBlingPreviewToggle.checked ? 'true' : 'false',
      );
      renderCurrentResponseView();
    });
  }
}

function closeSettingInfoPopovers(activeWrap = null) {
  settingInfoWraps.forEach((wrap) => {
    const shouldOpen = wrap === activeWrap ? !wrap.classList.contains('is-open') : false;
    wrap.classList.toggle('is-open', shouldOpen);
    const trigger = wrap.querySelector('.setting-info-trigger');

    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }
  });
}

settingInfoWraps.forEach((wrap) => {
  const trigger = wrap.querySelector('.setting-info-trigger');

  if (!(trigger instanceof HTMLButtonElement)) {
    return;
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSettingInfoPopovers(wrap);
  });
});

document.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('.setting-info-wrap')) {
    return;
  }

  closeSettingInfoPopovers();
});

function updateSubmitButtonState() {
  if (!submitAiAgentButton) {
    return;
  }

  submitAiAgentButton.disabled = !budgetFinishedCheckbox?.checked;
}

function resetSendConfirmation() {
  if (budgetFinishedCheckbox) {
    budgetFinishedCheckbox.checked = false;
  }

  updateSubmitButtonState();
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBrazilianCurrency(value) {
  const match = String(value || '').match(/R\$\s*([\d\.\,]+)/i);

  if (!match) {
    return null;
  }

  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function parseMinimumLaborValue(proposalDraft, serviceItems) {
  const commercialBody = String(proposalDraft?.commercialBody || '');
  const explicitLine = commercialBody.match(/Soma mínima da mão de obra:\s*(R\$\s*[\d\.\,]+)/i);
  const explicitValue = parseBrazilianCurrency(explicitLine?.[1]);

  if (explicitValue !== null) {
    return explicitValue;
  }

  return (serviceItems || []).reduce((total, item) => {
    const text = String(item?.estimatedValueText || '');
    const parts = text.match(/R\$\s*[\d\.\,]+/gi) || [];
    const firstValue = parseBrazilianCurrency(parts[0]);
    return total + (firstValue ?? 0);
  }, 0);
}

function buildBlingPreviewData({
  session,
  proposalDraft,
  proposalDraftReview,
  proposalConfirmation,
  blingQuoteReference,
  blingQuote,
  resolvedCustomer,
  extraction,
  aiInterpretation,
  displayMaterialItems,
  displayFinancialSummary,
  expandedMaterialCandidates,
  finalResolvedMaterialItems,
  finalResolvedCustomer,
}) {
  const serviceItems = aiInterpretation?.serviceItems || [];
  const laborTotal = parseMinimumLaborValue(proposalDraft, serviceItems);
  const candidateById = new Map();
  (expandedMaterialCandidates || []).forEach((group) => {
    (group?.candidates || []).forEach((candidate) => {
      if (candidate?.id) {
        candidateById.set(String(candidate.id), candidate);
      }
    });
  });
  const reviewedMaterialItems =
    proposalDraftReview?.resolvedMaterialItems?.length
      ? proposalDraftReview.resolvedMaterialItems
      : [];
  const acceptedResolvedMaterialItems =
    finalResolvedMaterialItems?.length ? finalResolvedMaterialItems : [];
  const previewMaterialItems = reviewedMaterialItems.length
    ? reviewedMaterialItems
    : acceptedResolvedMaterialItems.length
      ? acceptedResolvedMaterialItems
      : displayMaterialItems || [];
  const materialRows = previewMaterialItems.map((item, index) => {
    const linkedCandidate = item?.catalogItemId
      ? candidateById.get(String(item.catalogItemId))
      : null;
    const unitValue =
      Number(item?.unitPrice || item?.price || linkedCandidate?.price || 0);
    const quantityValue = Number(item?.quantity || 0);
    const quantityText =
      quantityValue > 0
        ? formatPreviewQuantity(quantityValue)
        : item.quantityText || 'Quantidade a validar';
    const totalValue =
      Number(item?.lineTotal || item?.price || 0) ||
      (quantityValue > 0 ? unitValue * quantityValue : unitValue);

    return {
      kind: 'material',
      line: index + 1,
      description: item.catalogItemName || item.description || 'Material sem descrição',
      supportText: item.catalogItemName
        ? item.description && item.description !== item.catalogItemName
          ? item.description
          : item.sourceQuery || ''
        : item.sourceQuery || '',
      quantityText,
      unitValue,
      totalValue,
      source: item.catalogItemId
        ? 'Revisão final com vínculo ao catálogo'
        : reviewedMaterialItems.length
          ? 'Revisão final sem vínculo confirmado'
          : acceptedResolvedMaterialItems.length
            ? 'Seleção final aceita'
            : item.catalogItemName
              ? 'Catálogo local vinculado'
              : 'Estimativa do rascunho',
    };
  });
  const rows = [...materialRows];

  if (laborTotal > 0) {
    rows.push({
      kind: 'service',
      line: rows.length + 1,
      description: 'Mão de Obra - SERVIÇOS DIVERSOS',
      supportText: 'Linha técnica usada para representar a soma mínima da mão de obra.',
      quantityText: `${laborTotal.toFixed(2)} unidades`,
      unitValue: 1,
      totalValue: laborTotal,
      source: 'Soma mínima da mão de obra',
    });
  }

  const materialSaleTotal = Number(displayFinancialSummary?.saleTotal || 0);
  const previewItemsTotal = rows.reduce(
    (total, item) => total + Number(item.totalValue || 0),
    0,
  );

  return {
    title: proposalDraft?.title || 'Orçamento em preparação',
    description:
      proposalDraft?.commercialBody ||
      aiInterpretation?.budgetDescription ||
      'Sem corpo comercial disponível.',
    customerName:
      proposalDraftReview?.resolvedCustomer?.name ||
      finalResolvedCustomer?.name ||
      resolvedCustomer?.name ||
      proposalDraft?.customerQuery ||
      session?.customerQuery ||
      extraction?.customerQuery ||
      'Cliente ainda não consolidado',
    customerId: resolvedCustomer?.id || null,
    createdAt:
      proposalConfirmation?.confirmedAt ||
      proposalDraft?.generatedAt ||
      session?.updatedAt ||
      '',
    blingNumber:
      blingQuote?.number ||
      blingQuoteReference?.number ||
      null,
    blingId: blingQuote?.id || blingQuoteReference?.id || null,
    rows,
    serviceItems,
    laborTotal,
    materialSaleTotal,
    previewItemsTotal,
    grossProfit: Number(displayFinancialSummary?.grossProfit || 0),
    materialCostTotal: Number(displayFinancialSummary?.costTotal || 0),
  };
}

function renderBlingPreview(preview) {
  return `
      <div class="bling-preview-shell">
        <div class="bling-preview-banner">
          <div>
            <strong>Conferência final antes do envio</strong>
            <p class="muted">Esta aba mostra a montagem atual do orçamento com os dados que o NEXA já consolidou para o envio ao Bling.</p>
          </div>
          <span class="bling-preview-badge">Formato de orçamento Bling</span>
        </div>
        <div
          class="bling-preview-document"
          data-bling-preview-document
          tabindex="-1"
        >
          <div class="bling-preview-header">
            <div class="bling-preview-title">
              <span class="bling-preview-kicker">Proposta comercial</span>
              <strong>${escapeHtml(preview.title)}</strong>
              <p>Prévia operacional do documento como ele tende a ser recebido e montado no Bling.</p>
            </div>
            <div class="bling-preview-meta">
              <div class="bling-preview-meta-card">
                <span>Cliente</span>
                <strong>${escapeHtml(preview.customerName)}</strong>
              </div>
              <div class="bling-preview-meta-card">
                <span>Referência Bling</span>
                <strong>${preview.blingId
      ? `#${escapeHtml(String(preview.blingNumber || 'sem número'))} · ID ${escapeHtml(String(preview.blingId))}`
      : 'Nova proposta ainda não enviada'
    }</strong>
              </div>
              <div class="bling-preview-meta-card">
                <span>Base temporal</span>
                <strong>${escapeHtml(preview.createdAt || 'Não registrada')}</strong>
              </div>
            </div>
          </div>
          <div class="bling-preview-body">
            <div class="bling-preview-block">
              <h3>Descrição que acompanha o orçamento</h3>
              <p class="bling-preview-description">${escapeHtml(preview.description)}</p>
            </div>
            <div class="bling-preview-block">
              <h3>Itens que entram na proposta</h3>
              <div class="bling-preview-table-wrap">
                <table class="bling-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th>Quantidade</th>
                      <th>Origem</th>
                      <th>Valor unitário</th>
                      <th>Total previsto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${preview.rows.length
      ? preview.rows
        .map(
          (row) => `
                                <tr>
                                  <td>${escapeHtml(String(row.line))}</td>
                                  <td>
                                    <div class="bling-preview-item-name">
                                      <strong>${escapeHtml(row.description)}</strong>
                                      ${row.supportText
              ? `<span>${escapeHtml(row.supportText)}</span>`
              : ''
            }
                                    </div>
                                  </td>
                                  <td>${escapeHtml(row.quantityText)}</td>
                                  <td>${escapeHtml(row.source)}</td>
                                  <td>${formatCurrency(row.unitValue)}</td>
                                  <td>${formatCurrency(row.totalValue)}</td>
                                </tr>
                              `,
        )
        .join('')
      : `
                          <tr>
                            <td colspan="6">
                              <span class="muted">Ainda não há itens suficientes consolidados para pré-visualizar o envio.</span>
                            </td>
                          </tr>
                        `
    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="bling-preview-summary">
              <div class="bling-preview-summary-card">
                <span>Venda de materiais</span>
                <strong>${formatCurrency(preview.materialSaleTotal)}</strong>
              </div>
              <div class="bling-preview-summary-card">
                <span>Custo dos materiais</span>
                <strong>${formatCurrency(preview.materialCostTotal)}</strong>
              </div>
              <div class="bling-preview-summary-card">
                <span>Mão de obra usada</span>
                <strong>${formatCurrency(preview.laborTotal)}</strong>
              </div>
              <div class="bling-preview-summary-card">
                <span>Total previsto da proposta</span>
                <strong>${formatCurrency(preview.previewItemsTotal)}</strong>
              </div>
            </div>
            <p class="bling-preview-note">
              Esta é uma prévia operacional. Ela usa os materiais consolidados do rascunho e a linha
              de <strong>Soma mínima da mão de obra</strong> quando disponível. Quando existir uma
              revisão estruturada, a prévia prioriza os materiais e o cliente sugeridos nessa revisão.
              O objetivo é permitir
              conferência visual antes do envio final ao Bling.
            </p>
            <div class="bling-preview-actions">
              <button
                type="button"
                class="button-pill button-primary"
                data-bling-preview-action="confirm-preview"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
}

function formatPreviewQuantity(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 'Quantidade a validar';
  }

  return Number.isInteger(value) ? String(value) : value.toLocaleString('pt-BR');
}

function renderNexaResponse(payload) {
  isWaitingWindowActive = false;
  currentRenderableResponsePayload = payload;

  if (!payload || payload.type !== 'ai_assisted_agent_response_built') {
    nexaResponse.innerHTML = `
        <div class="response-card-header">
          <h2>Retorno do NEXA</h2>
        </div>
        <div class="response-block">
          <p class="muted">Resposta fora do formato esperado.</p>
        </div>
      `;
    return;
  }

  const extraction = payload.intakeExtraction?.extraction;
  const localResponse = payload.localResponse?.response;
  const aiInterpretation = payload.aiResponse?.interpretation;
  const session = payload.session;
  const proposalDraft = payload.proposalDraft || payload?.proposalDraft || payload?.session?.payload?.proposalDraft;
  const proposalConfirmation =
    payload.proposalConfirmation ||
    payload?.session?.payload?.proposalConfirmation;
  const proposalDraftReview =
    payload.proposalDraftReview ||
    payload?.session?.payload?.proposalDraftReview;
  const blingQuoteReference =
    payload.blingQuoteReference || payload?.session?.payload?.blingQuoteReference;
  const blingQuote = payload.blingQuote || payload?.session?.payload?.blingQuote;
  const sessionStatus = session?.status || localResponse?.status || 'Aguardando aprovacao';
  const resolvedCustomer =
    payload?.resolvedCustomer ||
    proposalDraft?.resolvedCustomer ||
    payload?.aiContext?.payload?.customer?.contact ||
    null;
  const customerResolutionCandidate = [
    resolvedCustomer?.id,
    resolvedCustomer?.name,
    proposalDraft?.customerQuery,
    session?.customerQuery,
    extraction?.customerQuery,
  ].some((value) => String(value ?? '').trim().length > 0);
  const sessionActionState = getSessionActionState(sessionStatus, {
    canAttemptBlingConfirmation:
      customerResolutionCandidate && !isWaitingWindowActive,
  });
  const displayMaterialItems =
    proposalDraft?.materialItems?.length
      ? proposalDraft.materialItems
      : aiInterpretation?.materialItems || [];
  const materialBlockTitle = proposalDraft?.materialItems?.length
    ? 'Materiais Consolidados'
    : 'Lista de Materiais';
  const displayFinancialSummary =
    proposalDraft?.financialSummary || localResponse?.financialSummary || {};
  const expandedMaterialCandidates =
    payload?.materialCandidatesExpanded ||
    payload?.session?.payload?.materialCandidatesExpanded ||
    [];
  const finalResolvedMaterialItems =
    payload?.finalResolvedMaterialItems ||
    payload?.session?.payload?.finalResolvedMaterialItems ||
    [];
  const finalResolvedCustomer =
    payload?.finalResolvedCustomer ||
    payload?.session?.payload?.finalResolvedCustomer ||
    null;
  const shouldShowInitialCatalogLinks = Boolean(
    proposalDraftReview?.resolvedMaterialItems?.length ||
    finalResolvedMaterialItems?.length,
  );
  const blingPreviewEnabled = shouldShowBlingPreview();
  const blingPreview = buildBlingPreviewData({
    session,
    proposalDraft,
    proposalDraftReview,
    proposalConfirmation,
    blingQuoteReference,
    blingQuote,
    resolvedCustomer,
    extraction,
    aiInterpretation,
    displayMaterialItems,
    displayFinancialSummary,
    expandedMaterialCandidates,
    finalResolvedMaterialItems,
    finalResolvedCustomer,
  });
  const hasBlingPreview = Boolean(proposalDraft);

  if (!hasBlingPreview) {
    activeResponseView = 'summary';
  } else if (!blingPreviewEnabled && activeResponseView === 'bling') {
    activeResponseView = 'summary';
  }

  nexaResponse.innerHTML = `
      <div class="response-card-header">
        <h2>${activeResponseView === 'bling' ? 'Prévia de envio ao Bling' : 'Retorno do NEXA'}</h2>
        <div class="response-view-tabs">
          <button
            type="button"
            class="response-view-tab ${activeResponseView === 'summary' ? 'is-active' : ''}"
            id="response-view-summary-tab"
          >
            Retorno
          </button>
          <button
            type="button"
            class="response-view-tab ${activeResponseView === 'bling' ? 'is-active' : ''}"
            id="response-view-bling-tab"
            ${blingPreviewEnabled ? '' : 'hidden'}
            ${hasBlingPreview ? '' : 'disabled'}
          >
            ${hasBlingPreview ? 'Prévia Bling' : 'Prévia indisponível'}
          </button>
        </div>
      </div>
      ${activeResponseView === 'bling' && blingPreviewEnabled && hasBlingPreview
      ? renderBlingPreview(blingPreview)
      : `
      ${session
        ? `
            <div class="response-block response-block--session">
              <div class="session-header">
                <div class="session-header-copy">
                  <h3>Sessão</h3>
                  <p><strong>ID:</strong> ${escapeHtml(session.id || '')}</p>
                  <div class="session-summary-meta">
                    <p><strong>Criada em:</strong> ${escapeHtml(session.createdAt || '')}</p>
                    ${blingQuoteReference?.id
          ? `<p><strong>Proposta em edição:</strong> #${escapeHtml(String(blingQuoteReference.number || 'sem número'))} <span class="muted">(ID ${escapeHtml(String(blingQuoteReference.id || ''))})</span></p>`
          : ''
        }
                  </div>
                </div>
                <div class="session-status-badge session-header-badge ${sessionActionState.badgeClass}">
                  ${escapeHtml(sessionStatus)}
                </div>
              </div>
              <div class="response-actions">
                <button
                  type="button"
                  class="button-secondary button-pill"
                  data-session-status-action="review"
                  data-session-id="${escapeHtml(session.id || '')}"
                  ${sessionActionState.reviewDisabled ? 'disabled' : ''}
                >
                  ${sessionActionState.reviewLabel}
                </button>
                <button
                  type="button"
                  class="button-pill button-primary"
                  data-session-status-action="approve"
                  data-session-id="${escapeHtml(session.id || '')}"
                  ${sessionActionState.approveDisabled ? 'disabled' : ''}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  class="button-secondary button-pill"
                  data-session-status-action="proposal-draft"
                  data-session-id="${escapeHtml(session.id || '')}"
                  ${sessionActionState.proposalDisabled ? 'disabled' : ''}
                >
                  Gerar proposta comercial
                </button>
                <button
                  type="button"
                  class="button-pill button-emphasis"
                  data-session-status-action="confirm-proposal"
                  data-session-id="${escapeHtml(session.id || '')}"
                  ${sessionActionState.confirmDisabled ? 'disabled' : ''}
                >
                  Confirmar e enviar ao Bling
                </button>
                <button
                  type="button"
                  class="button-secondary button-pill"
                  data-session-status-action="cancel"
                  data-session-id="${escapeHtml(session.id || '')}"
                  ${sessionActionState.cancelDisabled ? 'disabled' : ''}
                >
                  Cancelar sessão
                </button>
              </div>
            </div>
          `
        : ''
      }
      <div class="response-block">
        <h3>Texto Recebido</h3>
        <p>${escapeHtml(localResponse?.receivedText || '')}</p>
      </div>
      <div class="response-block">
        <h3>Extração Inicial</h3>
        <p><strong>Cliente provável:</strong> ${escapeHtml(extraction?.customerQuery || 'Não identificado')}</p>
        <p><strong>Materiais extraídos:</strong></p>
        ${renderList(extraction?.materialQueries || [])}
      </div>
      <div class="response-block">
        <h3>Descrição do Orçamento</h3>
        <p>${escapeHtml(aiInterpretation?.budgetDescription || localResponse?.structuredSuggestion || '')}</p>
      </div>
      <div class="response-block">
        <h3>Descrição dos Trabalhos</h3>
        <p>${escapeHtml(aiInterpretation?.workDescription || '')}</p>
      </div>
      <div class="response-block">
        <h3>${materialBlockTitle}</h3>
        ${displayMaterialItems?.length
        ? `<ul>${displayMaterialItems
          .map(
            (item) =>
              `<li>${escapeHtml(item.description)}${item.quantityText ? ` - ${escapeHtml(item.quantityText)}` : ''
              }${shouldShowInitialCatalogLinks && item.catalogItemName
                ? ` <span class="muted">(catálogo: ${escapeHtml(item.catalogItemName)})</span>`
                : ''
              }</li>`,
          )
          .join('')}</ul>`
        : '<p class="muted">Nenhum material sugerido.</p>'
      }
      </div>
      <div class="response-block">
        <h3>Lista de Serviços</h3>
        ${aiInterpretation?.serviceItems?.length
        ? `<ul>${aiInterpretation.serviceItems
          .map(
            (item) =>
              `<li>${escapeHtml(item.description)}${item.quantityText ? ` - ${escapeHtml(item.quantityText)}` : ''
              }${item.estimatedValueText
                ? ` <span class="muted">(valor estimado: ${escapeHtml(item.estimatedValueText)})</span>`
                : ''
              }</li>`,
          )
          .join('')}</ul>`
        : '<p class="muted">Nenhum serviço sugerido.</p>'
      }
      </div>
      <div class="response-block">
        <h3>Pesquisa de Mão de Obra</h3>
        <p><strong>Status:</strong> ${escapeHtml(aiInterpretation?.laborPriceResearch?.status || 'pendente')}</p>
        <p>${escapeHtml(aiInterpretation?.laborPriceResearch?.summary || '')}</p>
        ${aiInterpretation?.laborPriceResearch?.estimatedLaborRange
        ? `<p><strong>Faixa estimada:</strong> ${escapeHtml(aiInterpretation.laborPriceResearch.estimatedLaborRange)}</p>`
        : ''
      }
        ${aiInterpretation?.laborPriceResearch?.estimatedHours
        ? `<p><strong>Horas estimadas:</strong> ${escapeHtml(aiInterpretation.laborPriceResearch.estimatedHours)}</p>`
        : ''
      }
        ${aiInterpretation?.laborPriceResearch?.basis
        ? `<p><strong>Base:</strong> ${escapeHtml(aiInterpretation.laborPriceResearch.basis)}</p>`
        : ''
      }
        <p><strong>Confiança:</strong> ${escapeHtml(aiInterpretation?.laborPriceResearch?.confidence || 'baixo')}</p>
      </div>
      <div class="response-block">
        <h3>Pontos de Atenção</h3>
        ${renderList(aiInterpretation?.pointsOfAttention || localResponse?.pointsOfAttention || [])}
      </div>
      <div class="response-block">
        <h3>Pendências</h3>
        ${renderList(aiInterpretation?.pendingQuestions || [])}
      </div>
      <div class="response-block">
        <h3>Sugestões</h3>
        ${renderList(aiInterpretation?.suggestions || localResponse?.suggestions || [])}
      </div>
      <div class="response-block response-block--financial">
        <h3>Resumo Financeiro dos Materiais</h3>
        <p><strong>Venda:</strong> ${Number(displayFinancialSummary?.saleTotal || 0).toFixed(2)}</p>
        <p><strong>Custo:</strong> ${Number(displayFinancialSummary?.costTotal || 0).toFixed(2)}</p>
        <p><strong>Lucro bruto estimado:</strong> ${Number(displayFinancialSummary?.grossProfit || 0).toFixed(2)}</p>
      </div>
      <div class="response-block">
        <h3>Status</h3>
        <p><strong>Confiança:</strong> ${escapeHtml(aiInterpretation?.confidence || localResponse?.confidence || 'baixo')}</p>
        <p><strong>Status:</strong> ${escapeHtml(sessionStatus)}</p>
      </div>
      ${proposalDraft
        ? `
            <div class="response-block response-block--proposal">
              <h3>Proposta Comercial</h3>
              <div class="proposal-shell">
                <div class="proposal-shell-header">
                  <div class="proposal-shell-title">
                    <span class="proposal-shell-kicker">Modo de conferência</span>
                    <strong>${escapeHtml(proposalDraft.title || 'Proposta comercial')}</strong>
                    <p class="proposal-shell-subtitle">Revise texto, cliente e composição antes do envio operacional ao Bling.</p>
                  </div>
                  <div class="session-status-badge ${sessionActionState.badgeClass}">
                    ${escapeHtml(sessionStatus)}
                  </div>
                </div>
                <div class="proposal-meta-grid">
                  <div class="proposal-meta-card">
                    <span class="proposal-meta-label">Geração</span>
                    <div class="proposal-meta-value">${escapeHtml(proposalDraft.generatedAt || 'Não registrada')}</div>
                  </div>
                  <div class="proposal-meta-card">
                    <span class="proposal-meta-label">Cliente Bling:</span>
                    <div class="proposal-meta-value">${resolvedCustomer?.id
          ? `${escapeHtml(resolvedCustomer.name || 'Resolvido')} <span class="muted">(#${escapeHtml(String(resolvedCustomer.id || ''))})</span>`
          : customerResolutionCandidate
            ? '<span class="muted">Ainda não resolvido automaticamente. O NEXA tentará confirmar o cliente no envio ao Bling.</span>'
            : '<span class="muted">Não resolvido</span>'
        }</div>
                  </div>
                  ${blingQuoteReference?.id && !blingQuote?.id
          ? `
                        <div class="proposal-meta-card">
                          <span class="proposal-meta-label">Proposta em edição</span>
                          <div class="proposal-meta-value">#${escapeHtml(String(blingQuoteReference.number || 'sem número'))} <span class="muted">(ID ${escapeHtml(String(blingQuoteReference.id || ''))})</span></div>
                        </div>
                      `
          : ''
        }
                  ${proposalConfirmation?.confirmedAt
          ? `
                        <div class="proposal-meta-card">
                          <span class="proposal-meta-label">Confirmação</span>
                          <div class="proposal-meta-value">${escapeHtml(proposalConfirmation.confirmedAt || '')}</div>
                        </div>
                      `
          : ''
        }
                  ${blingQuote?.id
          ? `
                        <div class="proposal-meta-card">
                          <span class="proposal-meta-label">Bling ID</span>
                          <div class="proposal-meta-value">${escapeHtml(String(blingQuote.id || ''))}</div>
                        </div>
                        <div class="proposal-meta-card">
                          <span class="proposal-meta-label">Número</span>
                          <div class="proposal-meta-value">${escapeHtml(String(blingQuote.number || ''))}</div>
                        </div>
                      `
          : ''
        }
                </div>
              ${sessionStatus === 'Proposta comercial pronta'
          ? `
                    <div class="proposal-editor-wrap">
                      <div class="proposal-editor-label" style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>Corpo comercial em edição</strong>
                        <button type="button" class="button-secondary button-pill" style="padding: 4px 12px; font-size: 11px;" data-copy-target="draft-editor-textarea" onclick="copyToClipboard('draft-editor-textarea')">Copiar</button>
                      </div>
                      <textarea id="draft-editor-textarea" class="proposal-draft-editor" data-proposal-draft-editor data-session-id="${escapeHtml(session.id || '')}">${escapeHtml(proposalDraft.commercialBody || '')}</textarea>
                      <div class="inline-audio-field">
                        <div class="inline-audio-field-header">
                          <div class="inline-audio-field-copy">
                            <strong>Instruções para revisão</strong>
                            <span>Informe correções, remoções, acréscimos ou ajustes antes de mandar o rascunho para revisão.</span>
                          </div>
                          <div class="inline-audio-controls">
                            <button
                              type="button"
                              class="microphone-button microphone-button--idle"
                              data-speech-target="proposal-review-instructions-${escapeHtml(session.id || '')}"
                              aria-label="Iniciar captura de voz para instruções de revisão"
                              data-tooltip="Clique para ditar instruções de revisão"
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                  fill="currentColor"
                                  d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a1 1 0 1 1 2 0 7 7 0 0 1-6 6.92V22h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-3.08A7 7 0 0 1 5 12a1 1 0 0 1 2 0 5 5 0 1 0 10 0Z"
                                />
                              </svg>
                            </button>
                            <p class="inline-audio-status" id="proposal-review-instructions-${escapeHtml(session.id || '')}-status">
                              Voz inativa. Clique no microfone para começar.
                            </p>
                          </div>
                        </div>
                        <textarea
                          class="proposal-draft-editor inline-audio-textarea"
                          data-proposal-review-instructions-editor
                          data-session-id="${escapeHtml(session.id || '')}"
                          id="proposal-review-instructions-${escapeHtml(session.id || '')}"
                        >${escapeHtml(proposalDraft.reviewInstructions || '')}</textarea>
                      </div>
                    </div>
                    <div class="proposal-draft-actions">
                      <div class="proposal-review-submit-group">
                        <label class="inline-select">
                          Modelo de IA para revisão
                          <select id="proposal-review-model-selector">
                            <option>gpt-5-nano</option>
                            <option>gpt-5.4-mini</option>
                            <option>gpt-5.4</option>
                          </select>
                        </label>
                        <button
                          type="button"
                          class="button-secondary button-pill"
                          data-session-status-action="review-proposal-draft"
                          data-session-id="${escapeHtml(session.id || '')}"
                        >
                          Mandar pra revisão
                        </button>
                      </div>
                      <button
                        type="button"
                        class="button-pill button-primary"
                        data-session-status-action="save-proposal-draft"
                        data-session-id="${escapeHtml(session.id || '')}"
                      >
                        Salvar mudanças
                      </button>
                    </div>
                  `
          : `
                    <div class="proposal-editor-wrap">
                      <div class="proposal-editor-label" style="display: flex; justify-content: space-between; align-items: center;">
                        <strong>Corpo comercial consolidado</strong>
                        <button type="button" class="button-secondary button-pill" style="padding: 4px 12px; font-size: 11px;" data-copy-target="draft-consolidated-pre" onclick="copyToClipboard('draft-consolidated-pre')">Copiar</button>
                      </div>
                      <pre id="draft-consolidated-pre">${escapeHtml(proposalDraft.commercialBody || '')}</pre>
                    </div>
                  `
        }
              </div>
            </div>
          `
        : ''
      }
      ${proposalDraftReview
        ? `
            <div class="response-block response-block--review">
              <h3>Revisão do Rascunho</h3>
              <div class="review-shell">
                <div class="review-shell-header">
                  <div class="review-shell-title">
                    <span class="review-shell-kicker">Leitura de ajuste</span>
                    <strong>Rascunho revisado pelo NEXA</strong>
                    <p class="review-shell-subtitle">${escapeHtml(proposalDraftReview.summary || '')}</p>
                  </div>
                  <div class="session-status-badge session-status-badge--proposal">
                    Revisão pendente
                  </div>
                </div>
                <div class="review-meta-grid">
                  <div class="review-meta-card">
                    <span class="review-meta-label">Revisado em</span>
                    <div class="review-meta-value">${escapeHtml(proposalDraftReview.reviewedAt || '')}</div>
                  </div>
                  <div class="review-meta-card">
                    <span class="review-meta-label">Confiança</span>
                    <div class="review-meta-value">${escapeHtml(proposalDraftReview.confidence || 'baixo')}</div>
                  </div>
                  <div class="review-meta-card">
                    <span class="review-meta-label">Cliente sugerido</span>
                    <div class="review-meta-value">${proposalDraftReview.resolvedCustomer?.id
          ? `${escapeHtml(proposalDraftReview.resolvedCustomer.name || 'Cliente sugerido')} <span class="muted">(#${escapeHtml(String(proposalDraftReview.resolvedCustomer.id || ''))})</span>`
          : '<span class="muted">Nenhum cliente consolidado nesta revisão.</span>'
        }</div>
                  </div>
                  <div class="review-meta-card" style="grid-column: 1 / -1;">
                    <span class="review-meta-label">Notas de ajuste</span>
                    <div class="review-meta-value">${renderList(proposalDraftReview.adjustmentNotes || [])}</div>
                  </div>
                  <div class="review-meta-card" style="grid-column: 1 / -1;">
                    <span class="review-meta-label">Materiais sugeridos para envio</span>
                    <div class="review-meta-value">${proposalDraftReview.resolvedMaterialItems?.length
          ? `<ul>${proposalDraftReview.resolvedMaterialItems
            .map(
              (item) =>
                `<li>${escapeHtml(item.description || 'Material sem descrição')}${item.quantity
                  ? ` - ${escapeHtml(formatPreviewQuantity(Number(item.quantity)))}`
                  : item.quantityText
                    ? ` - ${escapeHtml(item.quantityText)}`
                    : ''
                }${item.catalogItemName
                  ? ` <span class="muted">(catálogo: ${escapeHtml(item.catalogItemName)})</span>`
                  : ' <span class="muted">(sem vínculo fechado no catálogo)</span>'
                }</li>`,
            )
            .join('')}</ul>`
          : '<span class="muted">Nenhum material estruturado retornado nesta revisão.</span>'
        }</div>
                  </div>
                </div>
                <div class="review-editor-wrap">
                  <div class="review-editor-label" style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>Sugestão ajustada</strong>
                    <button type="button" class="button-secondary button-pill" style="padding: 4px 12px; font-size: 11px;" data-copy-target="draft-review-textarea" onclick="copyToClipboard('draft-review-textarea')">Copiar</button>
                  </div>
                  <textarea id="draft-review-textarea" class="proposal-draft-review-editor" data-proposal-draft-review-editor data-session-id="${escapeHtml(session.id || '')}">${escapeHtml(proposalDraftReview.suggestedCommercialBody || '')}</textarea>
                </div>
                <div class="proposal-draft-actions">
                  <button
                    type="button"
                    class="button-secondary button-pill"
                    data-session-status-action="reject-proposal-draft-review"
                    data-session-id="${escapeHtml(session.id || '')}"
                  >
                    Rejeitar revisão
                  </button>
                  <button
                    type="button"
                    class="button-pill button-primary"
                    data-session-status-action="accept-proposal-draft-review"
                    data-session-id="${escapeHtml(session.id || '')}"
                  >
                    Aceitar revisão
                  </button>
                </div>
              </div>
            </div>
          `
        : ''
      }
    `}
    `;

  bindResponseViewTabs({
    blingPreviewEnabled,
    hasBlingPreview,
  });

  const reviewModelSelector = document.getElementById(
    'proposal-review-model-selector',
  );
  if (reviewModelSelector instanceof HTMLSelectElement) {
    reviewModelSelector.value = getDefaultAiModel();
  }

  nexaResponse
    .querySelectorAll('[data-bling-preview-action]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-bling-preview-action');

        if (action !== 'confirm-preview') {
          return;
        }

        activeResponseView = 'summary';
        renderCurrentResponseView();
        focusConfirmProposalButton();
      });
    });

  nexaResponse
    .querySelectorAll('[data-speech-target]')
    .forEach((speechTrigger) => {
      const targetId = speechTrigger.getAttribute('data-speech-target');

      if (!targetId) {
        return;
      }

      const textArea = document.getElementById(targetId);
      const status = document.getElementById(`${targetId}-status`);

      if (
        speechTrigger instanceof HTMLButtonElement &&
        textArea instanceof HTMLTextAreaElement &&
        status instanceof HTMLElement
      ) {
        setupSpeechControl({
          button: speechTrigger,
          statusElement: status,
          textArea,
          idleMessage: 'Voz inativa. Clique no microfone para começar.',
          completedMessage:
            'Captura encerrada. Revise as instruções antes de mandar para revisão.',
        });
      }
    });

  nexaResponse
    .querySelectorAll('[data-session-status-action]')
    .forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const sessionId = button.getAttribute('data-session-id');
          const action = button.getAttribute('data-session-status-action');

          if (!sessionId || !action) {
            return;
          }

          if (action === 'review') {
            if (
              sessionStatus === 'Proposta comercial pronta' ||
              sessionStatus === 'Cancelado'
            ) {
              setOutputMessage(`Reabrindo sessão ${sessionId} para revisão...`);
              const response = await fetch(`/local/ai-sessions/${sessionId}/review`, {
                method: 'POST',
              });
              const payload = await response.json();

              if (!response.ok) {
                throw new Error(payload?.error || 'Falha ao reabrir a sessão para revisão.');
              }
            }

            await loadSessionIntoForm(sessionId);
            if (originalTextField && shouldAutoFocusTextField()) {
              originalTextField.focus();
            }
            setOutputMessage(
              'Sessão preparada para revisão. Ajuste o texto e envie novamente quando necessário.',
            );
            return;
          }

          if (action === 'approve') {
            output.textContent = `Aprovando sessão ${sessionId}...`;
            const response = await fetch(`/local/ai-sessions/${sessionId}/approve`, {
              method: 'POST',
            });
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload?.error || 'Falha ao aprovar a sessão.');
            }

            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            focusFirstSessionAction();
            await loadSessionIntoForm(sessionId, {
              focusTextField: false,
            });
            await loadRecentSessions();
            await loadRecentModels();
            return;
          }

          if (action === 'proposal-draft') {
            output.textContent = `Gerando proposta comercial da sessão ${sessionId}...`;
            const response = await fetch(
              `/local/ai-sessions/${sessionId}/proposal-draft`,
              {
                method: 'POST',
              },
            );
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(
                payload?.error || 'Falha ao gerar a proposta comercial.',
              );
            }

            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            focusProposalDraftEditor();
            await loadSessionIntoForm(sessionId, {
              focusTextField: false,
            });
            await loadRecentSessions();
            await loadRecentModels();
            return;
          }

          if (action === 'review-proposal-draft') {
            const reviewModelSelector = document.getElementById(
              'proposal-review-model-selector',
            );
            const reviewModel =
              reviewModelSelector instanceof HTMLSelectElement
                ? reviewModelSelector.value
                : 'gpt-5-nano';
            const reviewBehavior = getSelectedReviewBehavior();
            setOutputMessage(`Enviando rascunho da sessão ${sessionId} para revisão...`);
            let reviewWaitingState = {
              stepIndex: 0,
              secondsUntilRefresh: OPERATION_POLL_INTERVAL_SECONDS,
              secondsUntilTimeout: OPERATION_TIMEOUT_SECONDS,
            };
            renderProposalReviewWaiting(reviewWaitingState);
            stopOperationCountdown();
            operationCountdownTimer = window.setInterval(() => {
              reviewWaitingState.secondsUntilRefresh = Math.max(
                reviewWaitingState.secondsUntilRefresh - 1,
                0,
              );
              reviewWaitingState.secondsUntilTimeout = Math.max(
                reviewWaitingState.secondsUntilTimeout - 1,
                0,
              );

              if (reviewWaitingState.secondsUntilRefresh === 0) {
                reviewWaitingState = {
                  stepIndex: reviewWaitingState.stepIndex + 1,
                  secondsUntilRefresh: OPERATION_POLL_INTERVAL_SECONDS,
                  secondsUntilTimeout: reviewWaitingState.secondsUntilTimeout,
                };
              }

              renderProposalReviewWaiting(reviewWaitingState);
            }, 1000);
            const response = await fetch(
              `/local/ai-sessions/${sessionId}/proposal-draft/review`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  reviewModel,
                  reviewBehavior,
                }),
              },
            );
            const payload = await response.json();
            stopOperationCountdown();

            if (!response.ok) {
              throw new Error(
                payload?.error || 'Falha ao revisar o rascunho comercial.',
              );
            }

            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            await loadSessionIntoForm(sessionId, {
              focusTextField: false,
            });
            focusProposalReviewEditor();
            await loadRecentSessions();
            await loadRecentModels();
            return;
          }

          if (action === 'confirm-proposal') {
            resetSendConfirmation();
            output.textContent = `Confirmando proposta e enviando ao Bling para a sessão ${sessionId}...`;
            const response = await fetch(
              `/local/ai-sessions/${sessionId}/confirm-proposal`,
              {
                method: 'POST',
              },
            );
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(
                payload?.error || 'Falha ao confirmar a proposta comercial no Bling.',
              );
            }

            await loadRecentSessions();
            await loadRecentModels();
            resetWorkspaceForNewBudget(
              `Proposta enviada ao Bling com sucesso para a sessão ${sessionId}. Tela liberada para um novo orçamento.`,
            );
            return;
          }

          if (action === 'save-proposal-draft') {
            const editor = nexaResponse.querySelector(
              `[data-proposal-draft-editor][data-session-id="${sessionId}"]`,
            );
            const reviewInstructionsEditor = nexaResponse.querySelector(
              `[data-proposal-review-instructions-editor][data-session-id="${sessionId}"]`,
            );
            const commercialBody = editor?.value || '';
            const reviewInstructions = reviewInstructionsEditor?.value || '';

            output.textContent = `Salvando rascunho comercial da sessão ${sessionId}...`;
            const response = await fetch(
              `/local/ai-sessions/${sessionId}/proposal-draft/save`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  commercialBody,
                  reviewInstructions,
                }),
              },
            );
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(
                payload?.error || 'Falha ao salvar o rascunho comercial.',
              );
            }

            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            await loadSessionIntoForm(sessionId);
            output.textContent = 'Rascunho comercial salvo.';
            await loadRecentSessions();
            await loadRecentModels();
            return;
          }

          if (action === 'accept-proposal-draft-review') {
            const editor = nexaResponse.querySelector(
              `[data-proposal-draft-review-editor][data-session-id="${sessionId}"]`,
            );
            const commercialBody = editor?.value || '';

            output.textContent = `Aplicando revisão à sessão ${sessionId}...`;
            const response = await fetch(
              `/local/ai-sessions/${sessionId}/proposal-draft/review/accept`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  commercialBody,
                }),
              },
            );
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(
                payload?.error || 'Falha ao aceitar a revisão do rascunho.',
              );
            }

            activeResponseView = 'bling';
            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            await loadSessionIntoForm(sessionId, {
              focusTextField: false,
            });
            output.textContent =
              'Revisão aceita. O rascunho principal foi atualizado.';
            await loadRecentSessions();
            await loadRecentModels();
            focusBlingPreview();
            return;
          }

          if (action === 'reject-proposal-draft-review') {
            output.textContent = `Descartando revisão da sessão ${sessionId}...`;
            const response = await fetch(
              `/local/ai-sessions/${sessionId}/proposal-draft/review/reject`,
              {
                method: 'POST',
              },
            );
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(
                payload?.error || 'Falha ao rejeitar a revisão do rascunho.',
              );
            }

            activeResponseView = 'summary';
            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            await loadSessionIntoForm(sessionId, {
              focusTextField: false,
            });
            output.textContent =
              'Revisão descartada. O rascunho principal foi mantido.';
            await loadRecentSessions();
            await loadRecentModels();
            focusProposalDraftEditor();
            return;
          }

          if (action === 'cancel') {
            const confirmed = window.confirm(
              'Deseja cancelar esta sessão assistida? Ela continuará salva no histórico, mas ficará marcada como cancelada e não deverá seguir para proposta comercial.',
            );

            if (!confirmed) {
              setOutputMessage('Cancelamento da sessão interrompido.', 'warn');
              return;
            }

            output.textContent = `Cancelando sessão ${sessionId}...`;
            const response = await fetch(`/local/ai-sessions/${sessionId}/cancel`, {
              method: 'POST',
            });
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload?.error || 'Falha ao cancelar a sessão.');
            }

            renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
            await loadSessionIntoForm(sessionId);
            await loadRecentSessions();
            await loadRecentModels();
          }
        } catch (error) {
          setOutputMessage(
            error instanceof Error
              ? error.message
              : 'Falha ao executar a ação da sessão.',
            'error',
          );
        }
      });
    });
}

function bindResponseViewTabs({ blingPreviewEnabled, hasBlingPreview }) {
  const summaryTab = document.getElementById('response-view-summary-tab');
  const blingTab = document.getElementById('response-view-bling-tab');

  summaryTab?.addEventListener('click', () => {
    activeResponseView = 'summary';
    renderCurrentResponseView();
  });

  blingTab?.addEventListener('click', () => {
    if (!blingPreviewEnabled || !hasBlingPreview) {
      return;
    }

    activeResponseView = 'bling';
    renderCurrentResponseView();
  });
}

function renderCurrentResponseView() {
  if (!currentRenderableResponsePayload) {
    return;
  }

  renderNexaResponse(currentRenderableResponsePayload);
}

function renderIdleResponse() {
  isWaitingWindowActive = false;
  currentRenderableResponsePayload = null;
  activeResponseView = 'summary';
  nexaResponse.innerHTML = `
      <div class="response-card-header">
        <h2>Retorno do NEXA</h2>
        <div class="response-view-tabs">
          <button type="button" class="response-view-tab is-active" id="response-view-summary-tab">
            Retorno
          </button>
          <button type="button" class="response-view-tab" id="response-view-bling-tab" hidden>
            Prévia Bling
          </button>
        </div>
      </div>
      <div class="response-block">
        <p class="muted">Aguardando execução...</p>
      </div>
    `;
}

function stopOperationCountdown() {
  if (operationCountdownTimer) {
    window.clearInterval(operationCountdownTimer);
    operationCountdownTimer = null;
  }
}

function renderOperationWaiting(operation, secondsUntilTimeout) {
  isWaitingWindowActive = true;
  const phase = formatOperationPhase(operation?.phase || 'queued');
  activeResponseView = 'summary';
  nexaResponse.innerHTML = `
      <div class="response-card-header">
        <h2>Retorno do NEXA</h2>
        <div class="response-view-tabs">
          <button type="button" class="response-view-tab is-active" id="response-view-summary-tab">
            Retorno
          </button>
          <button type="button" class="response-view-tab" id="response-view-bling-tab" hidden>
            Prévia Bling
          </button>
        </div>
      </div>
      <div class="response-block response-block--waiting">
        <h3>Processando orçamento</h3>
        <div class="waiting-shell">
          <div class="waiting-shell-header">
            <div class="waiting-shell-title">
              <span class="waiting-shell-kicker">Acompanhamento da operação</span>
              <strong>Orçamento em processamento</strong>
              <p>${escapeHtml(operation?.userMessage || 'O NEXA está processando sua solicitação.')}</p>
            </div>
            <span class="waiting-shell-pulse" aria-hidden="true"></span>
          </div>
          <div class="waiting-grid">
            <div class="waiting-card">
              <span class="waiting-card-label">Etapa atual</span>
              <div class="waiting-card-value">${escapeHtml(phase)}</div>
              <p class="muted">A comunicação com o NEXA está ativa.</p>
            </div>
            <div class="waiting-card waiting-timer">
              <span class="waiting-card-label">Tempo restante:</span>
              <strong>${escapeHtml(String(secondsUntilTimeout))}</strong>
              <span class="muted">segundos</span>
            </div>
          </div>
          <div class="waiting-track">
            <div class="waiting-track-step waiting-track-step--active">Preparando leitura</div>
            <div class="waiting-track-step ${operation?.phase === 'budget_request_interpretation' ? 'waiting-track-step--active' : ''}">Estruturando orçamento</div>
            <div class="waiting-track-step ${operation?.phase === 'completed' ? 'waiting-track-step--active' : ''}">Consolidando retorno</div>
          </div>
        </div>
      </div>
    `;
  focusResponseCard();
}

function renderProposalReviewWaiting(state) {
  isWaitingWindowActive = true;
  const step = getProposalReviewWaitingStep(state?.stepIndex || 0);

  nexaResponse.innerHTML = `
      <h2>Retorno do NEXA</h2>
      <div class="response-block response-block--waiting response-block--review">
        <h3>Revisando proposta comercial</h3>
        <div class="waiting-shell">
          <div class="waiting-shell-header">
            <div class="waiting-shell-title">
              <span class="waiting-shell-kicker">Acompanhamento da revisão</span>
              <strong>Revisão do rascunho em andamento</strong>
              <p>${escapeHtml(step.message)}</p>
            </div>
            <span class="waiting-shell-pulse" aria-hidden="true"></span>
          </div>
          <div class="waiting-grid">
            <div class="waiting-card">
              <span class="waiting-card-label">Etapa atual</span>
              <div class="waiting-card-value">${escapeHtml(step.phase)}</div>
              <p class="muted">A comunicação com o NEXA está ativa.</p>
            </div>
            <div class="waiting-card waiting-timer">
              <span class="waiting-card-label">Tempo restante:</span>
              <strong>${escapeHtml(String(state?.secondsUntilTimeout ?? OPERATION_TIMEOUT_SECONDS))}</strong>
              <span class="muted">segundos</span>
            </div>
          </div>
          <div class="waiting-track">
            <div class="waiting-track-step ${state?.stepIndex === 0 ? 'waiting-track-step--active' : ''}">Preparando revisão</div>
            <div class="waiting-track-step ${state?.stepIndex === 1 ? 'waiting-track-step--active' : ''}">Conferindo conteúdo</div>
            <div class="waiting-track-step ${state?.stepIndex >= 2 ? 'waiting-track-step--active' : ''}">Consolidando retorno</div>
          </div>
        </div>
      </div>
    `;
  focusResponseCard();
}

function getProposalReviewWaitingStep(stepIndex) {
  const steps = [
    {
      phase: 'Preparando revisão',
      message: 'O NEXA está preparando o rascunho comercial para revisão.',
    },
    {
      phase: 'Conferindo conteúdo',
      message: 'O NEXA está revisando o texto, os agrupamentos e os valores provisórios do orçamento.',
    },
    {
      phase: 'Consolidando retorno',
      message: 'O NEXA está finalizando a sugestão revisada para exibição no rascunho.',
    },
  ];

  return steps[Math.min(stepIndex, steps.length - 1)];
}

function formatOperationPhase(phase) {
  const labels = {
    queued: 'Preparando análise',
    extracting_intake: 'Lendo a solicitação',
    building_context: 'Cruzando com a base local',
    interpreting_request: 'Estruturando orçamento',
    saving_session: 'Salvando sessão',
    completed: 'Concluído',
    failed: 'Falhou',
  };

  return labels[phase] || 'Em processamento';
}

async function runRequest(label, url, options) {
  output.textContent = `${label} em execução...`;

  const response = await fetch(url, options);
  const text = await response.text();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  renderNexaResponse(payload);
  await loadRecentSessions();
  output.textContent = JSON.stringify(
    {
      label,
      statusCode: response.status,
      payload,
    },
    null,
    2,
  );
}

function getOriginalTextValue() {
  return (originalTextField?.value || '').trim();
}

function setActiveSessionState(session, originalText) {
  activeSessionId = session?.id || null;
  activeSessionOriginalText = originalText || '';
  activeSessionCreatedAt = session?.createdAt || '';
  resetSendConfirmation();
}

function clearActiveSessionState() {
  activeSessionId = null;
  activeSessionOriginalText = '';
  activeSessionCreatedAt = '';
  resetSendConfirmation();
}

function setActiveModelState(modelId, mode) {
  activeModelId = modelId || null;
  activeModelMode = mode || null;
  resetSendConfirmation();
}

function clearActiveModelState() {
  activeModelId = null;
  activeModelMode = null;
  resetSendConfirmation();
}

function resetWorkspaceForNewBudget(message) {
  if (originalTextField) {
    originalTextField.value = '';
  }

  activeResponseView = 'summary';
  clearActiveSessionState();
  clearActiveModelState();
  renderIdleResponse();
  output.textContent = message;
}

function setSidebarTab(tab) {
  activeSidebarTab = tab === 'models' ? 'models' : 'sessions';
  sessionTabButton?.classList.toggle('is-active', activeSidebarTab === 'sessions');
  modelTabButton?.classList.toggle('is-active', activeSidebarTab === 'models');
  sessionListPanel?.classList.toggle('is-hidden', activeSidebarTab !== 'sessions');
  modelListPanel?.classList.toggle('is-hidden', activeSidebarTab !== 'models');
  renderBulkSelectionActions();
}

function buildRenderablePayloadFromLoadedSession(loadedSession) {
  if (!loadedSession?.payload || typeof loadedSession.payload !== 'object') {
    return loadedSession?.payload || loadedSession;
  }

  return {
    ...loadedSession.payload,
    session: {
      id: loadedSession.id,
      createdAt: loadedSession.createdAt,
      updatedAt: loadedSession.updatedAt,
      customerQuery: loadedSession.customerQuery,
      confidence: loadedSession.confidence,
      status: loadedSession.status,
    },
  };
}

function getSessionActionState(status, options = {}) {
  const canAttemptBlingConfirmation =
    options.canAttemptBlingConfirmation !== false;

  if (status === 'Aprovado para proposta') {
    return {
      reviewLabel: 'Revisar',
      reviewDisabled: true,
      approveDisabled: true,
      proposalDisabled: false,
      cancelDisabled: false,
      badgeClass: 'session-status-badge--approved',
    };
  }

  if (status === 'Proposta comercial pronta') {
    return {
      reviewLabel: 'Reabrir revisão',
      reviewDisabled: false,
      approveDisabled: true,
      proposalDisabled: true,
      confirmDisabled: !canAttemptBlingConfirmation,
      cancelDisabled: false,
      badgeClass: 'session-status-badge--proposal',
    };
  }

  if (status === 'Finalizada') {
    return {
      reviewLabel: 'Reabrir revisão',
      reviewDisabled: false,
      approveDisabled: true,
      proposalDisabled: true,
      confirmDisabled: true,
      cancelDisabled: false,
      badgeClass: 'session-status-badge--ready',
    };
  }

  if (status === 'Cancelado') {
    return {
      reviewLabel: 'Reabrir revisão',
      reviewDisabled: false,
      approveDisabled: true,
      proposalDisabled: true,
      confirmDisabled: true,
      cancelDisabled: true,
      badgeClass: 'session-status-badge--cancelled',
    };
  }

  return {
    reviewLabel: 'Revisar',
    reviewDisabled: true,
    approveDisabled: false,
    proposalDisabled: true,
    confirmDisabled: true,
    cancelDisabled: false,
    badgeClass: 'session-status-badge--review',
  };
}

function hasDirtyLoadedSession() {
  return Boolean(
    activeSessionId &&
    getOriginalTextValue() &&
    getOriginalTextValue() !== activeSessionOriginalText.trim(),
  );
}

function hasUnsavedNewBudget() {
  return Boolean(!activeSessionId && getOriginalTextValue());
}

async function submitAiAgentResponse({ originalText, sessionId, renderResponse = true }) {
  const defaultAiModel = getDefaultAiModel();

  output.textContent = sessionId
    ? `Atualizando sessão ${sessionId}...`
    : 'Enviando orçamento para análise do NEXA...';

  const startResponse = await fetch('/local/ai-agent-response/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(sessionId ? { sessionId } : {}),
      originalText,
      defaultAiModel,
    }),
  });

  const startPayload = await startResponse.json();

  if (!startResponse.ok) {
    throw new Error(startPayload?.error || 'Falha ao iniciar a análise assistida.');
  }

  let secondsUntilTimeout = OPERATION_TIMEOUT_SECONDS;
  renderOperationWaiting(
    {
      phase: startPayload.phase,
      userMessage: startPayload.userMessage,
    },
    secondsUntilTimeout,
  );
  stopOperationCountdown();
  operationCountdownTimer = window.setInterval(() => {
    secondsUntilTimeout = Math.max(secondsUntilTimeout - 1, 0);
    renderOperationWaiting(
      {
        phase: startPayload.phase,
        userMessage: startPayload.userMessage,
      },
      secondsUntilTimeout,
    );
  }, 1000);

  let payload = null;

  while (true) {
    const operationResponse = await fetch(
      `/local/ai-operations/${startPayload.operationId}`,
    );
    const operationPayload = await operationResponse.json();

    if (!operationResponse.ok) {
      stopOperationCountdown();
      throw new Error(
        operationPayload?.error || 'Falha ao acompanhar a operação do NEXA.',
      );
    }

    const operation = operationPayload.operation;

    if (operation.status === 'completed') {
      stopOperationCountdown();
      payload = operation.payload;
      break;
    }

    if (operation.status === 'failed') {
      stopOperationCountdown();
      throw new Error(
        operation.error || 'Falha controlada ao processar a solicitação.',
      );
    }

    renderOperationWaiting(operation, secondsUntilTimeout);

    await new Promise((resolve) =>
      window.setTimeout(resolve, OPERATION_POLL_INTERVAL_SECONDS * 1000),
    );
  }

  await loadRecentSessions();
  await loadRecentModels();

  if (renderResponse) {
    renderNexaResponse(payload);
    focusFirstSessionAction();
    output.textContent = JSON.stringify(
      {
        label: 'local-ai-agent-response',
        statusCode: 200,
        payload,
      },
      null,
      2,
    );
  }

  setActiveSessionState(payload.session, originalText);
  clearActiveModelState();
  return payload;
}

async function loadSessionIntoForm(sessionId, options = {}) {
  output.textContent = `Carregando sessão ${sessionId}...`;
  const response = await fetch(`/local/ai-sessions/${sessionId}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Falha ao carregar a sessão selecionada.');
  }

  renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
  if (originalTextField) {
    originalTextField.value = payload.session?.originalText || '';
    if (shouldAutoFocusTextField() && options.focusTextField !== false) {
      originalTextField.focus();
    }
  }
  setActiveSessionState(payload.session, payload.session?.originalText || '');
  clearActiveModelState();
  setOutputPayload(payload);
}

async function prepareSessionSwitch(targetSessionId) {
  if (hasDirtyLoadedSession()) {
    const shouldUpdate = window.confirm(
      `Este orçamento carregado foi alterado.\n\nDeseja atualizá-lo antes de continuar?\nCliente atual: ${activeSessionId}\nCriado em: ${activeSessionCreatedAt || 'data não informada'}`,
    );

    if (shouldUpdate) {
      await submitAiAgentResponse({
        originalText: getOriginalTextValue(),
        sessionId: activeSessionId,
        renderResponse: false,
      });
    } else {
      clearActiveSessionState();
      clearActiveModelState();
      output.textContent =
        'Alterações locais ignoradas. O orçamento salvo anteriormente foi mantido sem atualização.';
    }

    return true;
  }

  if (hasUnsavedNewBudget()) {
    const shouldSave = window.confirm(
      'Já existe um novo orçamento preenchido na caixa de texto.\n\nDeseja guardá-lo antes de continuar?\n\nOK = Guardar\nCancelar = Ver opções sem salvar',
    );

    if (shouldSave) {
      await submitAiAgentResponse({
        originalText: getOriginalTextValue(),
        renderResponse: false,
      });
      return true;
    }

    const shouldIgnore = window.confirm(
      'Deseja ignorar o texto atual e continuar sem salvá-lo?\n\nOK = Ignorar\nCancelar = Cancelar troca de sessão',
    );

    if (shouldIgnore) {
      clearActiveSessionState();
      clearActiveModelState();
      return true;
    }

    output.textContent = 'Troca de sessão cancelada.';
    return false;
  }

  if (
    activeSessionId &&
    activeSessionId !== targetSessionId &&
    getOriginalTextValue() === activeSessionOriginalText.trim()
  ) {
    clearActiveSessionState();
    clearActiveModelState();
  }

  return true;
}

async function startSessionFromModel(modelId, mode) {
  output.textContent =
    mode === 'edit'
      ? `Carregando modelo ${modelId} para editar proposta existente...`
      : `Carregando modelo ${modelId} para nova proposta...`;
  const response = await fetch(`/local/ai-models/${modelId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode,
    }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Falha ao iniciar sessão a partir do modelo.');
  }

  renderNexaResponse(buildRenderablePayloadFromLoadedSession(payload.session));
  if (originalTextField) {
    originalTextField.value = payload.session?.originalText || '';
    if (shouldAutoFocusTextField()) {
      originalTextField.focus();
    }
  }
  setActiveSessionState(payload.session, payload.session?.originalText || '');
  setActiveModelState(modelId, mode);
  setOutputPayload(payload);
}

async function loadRecentSessions() {
  sessionList.innerHTML = '<p class="muted">Carregando sessões...</p>';

  try {
    const response = await fetch('/local/ai-sessions');
    const payload = await response.json();
    const sessions = payload.sessions || [];
    recentSessionsCache = sessions;
    Array.from(selectedSessionIds).forEach((id) => {
      if (!sessions.some((session) => session.id === id)) {
        selectedSessionIds.delete(id);
      }
    });

    if (sessions.length === 0) {
      sessionList.innerHTML = '<p class="muted">Nenhuma sessão salva até o momento.</p>';
      renderBulkSelectionActions();
      return;
    }

    sessionList.innerHTML = sessions
      .map(
        (session) => {
          const actionState = getSessionActionState(
            session.status || 'Aguardando aprovacao',
          );

          return `
            <article
              class="session-item ${(session.status || 'Aguardando aprovacao') === 'Finalizada' ? 'session-item--ready' : ''} ${(session.status || 'Aguardando aprovacao') === 'Cancelado' ? 'session-item--cancelled' : ''} ${activeSessionId === session.id ? 'session-item--active' : ''}"
              data-session-id="${escapeHtml(session.id)}"
              data-session-created-at="${escapeHtml(session.createdAt || '')}"
            >
              <div class="session-item-selection">
                <label class="session-item-checkbox">
                  <input
                    type="checkbox"
                    data-session-select="${escapeHtml(session.id)}"
                    ${selectedSessionIds.has(session.id) ? 'checked' : ''}
                  />
                  Selecionar
                </label>
              </div>
              <div class="session-item-preview">
                <span class="session-item-kicker">Sessão assistida</span>
                <strong>${escapeHtml(buildSessionCardTitle(session))}</strong>
                <div class="session-item-meta">
                  <small>${escapeHtml(session.updatedAt || '')}</small>
                  <span class="session-item-customer">${escapeHtml(buildCustomerLabel(session.customerQuery || ''))}</span>
                  <div class="session-status-badge session-item-status ${actionState.badgeClass}">
                    ${escapeHtml(session.status || 'Aguardando aprovacao')}
                  </div>
                  <small>${escapeHtml(truncateText(session.originalText || '', 96))}</small>
                </div>
              </div>
              <div class="session-item-actions">
                ${(session.status || 'Aguardando aprovacao') === 'Finalizada'
              ? `<button type="button" class="button-secondary" data-session-action="save-model" data-session-id="${escapeHtml(session.id)}">+ Modelo</button>`
              : `<button type="button" class="button-secondary" data-session-action="continue" data-session-id="${escapeHtml(session.id)}">Continuar</button>`
            }
                <button type="button" class="button-danger" data-session-action="delete" data-session-id="${escapeHtml(session.id)}">Apagar</button>
              </div>
            </article>
          `;
        },
      )
      .join('');

    sessionList.querySelectorAll('[data-session-select]').forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        toggleSelection(selectedSessionIds, target.getAttribute('data-session-select'), target.checked);
        renderBulkSelectionActions();
      });
    });

    sessionList.querySelectorAll('[data-session-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const sessionId = button.getAttribute('data-session-id');
        const action = button.getAttribute('data-session-action');
        if (!sessionId || !action) {
          return;
        }

        if (action === 'continue') {
          const shouldContinue = await prepareSessionSwitch(sessionId);
          if (!shouldContinue) {
            return;
          }

          await loadSessionIntoForm(sessionId);
          return;
        }

        if (action === 'save-model') {
          const confirmed = window.confirm(
            'Salvar esta sessão finalizada como modelo?\n\nApós o salvamento correto, ela sairá da lista de sessões e ficará disponível na aba Modelos.',
          );

          if (!confirmed) {
            output.textContent = 'Criação do modelo cancelada.';
            return;
          }

          output.textContent = `Salvando sessão ${sessionId} como modelo...`;
          const response = await fetch(`/local/ai-sessions/${sessionId}/save-as-model`, {
            method: 'POST',
          });
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.error || 'Falha ao salvar a sessão como modelo.');
          }

          if (activeSessionId === sessionId) {
            clearActiveSessionState();
            if (originalTextField) {
              originalTextField.value = '';
            }
          }

          await loadRecentSessions();
          await loadRecentModels();
          setSidebarTab('models');
          output.textContent = JSON.stringify(payload, null, 2);
          return;
        }

        if (action === 'delete') {
          const sessionCard = button.closest('.session-item');
          const customerName =
            sessionCard?.querySelector('strong')?.textContent?.trim() ||
            'Cliente não identificado';
          const sessionCreatedAt = responseDateFromSessionCard(sessionCard);
          const sessionSummary =
            sessionCard?.querySelectorAll('small')?.[1]?.textContent?.trim() ||
            'Sem resumo disponível.';

          const firstConfirmation = window.confirm(
            `Confirma a exclusão desta sessão?\n\nCliente: ${customerName}\nResumo: ${sessionSummary}`,
          );

          if (!firstConfirmation) {
            output.textContent = 'Exclusão cancelada.';
            return;
          }

          const secondConfirmation = window.confirm(
            `Excluir sessão criada em ${sessionCreatedAt}? Esta ação não pode ser desfeita.`,
          );

          if (!secondConfirmation) {
            output.textContent = 'Exclusão cancelada.';
            return;
          }

          output.textContent = `Apagando sessão ${sessionId}...`;
          const response = await fetch(`/local/ai-sessions/${sessionId}`, {
            method: 'DELETE',
          });
          const payload = await response.json();
          await loadRecentSessions();
          output.textContent = JSON.stringify(payload, null, 2);
        }
      });
    });

    renderBulkSelectionActions();
  } catch (error) {
    sessionList.innerHTML =
      `<p class="muted">Falha ao carregar sessões: ${escapeHtml(String(error))}</p>`;
    renderBulkSelectionActions();
  }
}

async function loadRecentModels() {
  modelList.innerHTML = '<p class="muted">Carregando modelos...</p>';

  try {
    const response = await fetch('/local/ai-models');
    const payload = await response.json();
    const models = payload.models || [];
    recentModelsCache = models;
    Array.from(selectedModelIds).forEach((id) => {
      if (!models.some((model) => model.id === id)) {
        selectedModelIds.delete(id);
      }
    });

    if (models.length === 0) {
      modelList.innerHTML = '<p class="muted">Nenhum modelo salvo até o momento.</p>';
      renderBulkSelectionActions();
      return;
    }

    modelList.innerHTML = models
      .map(
        (model) => `
            <article class="session-item session-item--ready session-item--model ${activeModelId === model.id ? 'session-item--active' : ''}" data-model-id="${escapeHtml(model.id)}">
              <div class="session-item-selection">
                <label class="session-item-checkbox">
                  <input
                    type="checkbox"
                    data-model-select="${escapeHtml(model.id)}"
                    ${selectedModelIds.has(model.id) ? 'checked' : ''}
                  />
                  Selecionar
                </label>
              </div>
              <div class="session-item-preview">
                <span class="session-item-kicker">Modelo salvo</span>
                <strong>${escapeHtml(model.title || 'Modelo sem título')}</strong>
                <div class="session-item-meta">
                  <small>${escapeHtml(model.updatedAt || '')}</small>
                  <span class="session-item-customer">${escapeHtml(buildCustomerLabel(model.customerQuery || ''))}</span>
                  ${model.blingQuoteNumber
            ? `<span class="session-item-ref">Proposta Bling #${escapeHtml(String(model.blingQuoteNumber))}</span>`
            : ''
          }
                  <small>${escapeHtml(truncateText(model.previewText || '', 120))}</small>
                </div>
              </div>
              <div class="session-item-actions">
                <button type="button" class="button-secondary" data-model-action="use" data-model-id="${escapeHtml(model.id)}">Usar modelo</button>
                <button type="button" class="button-secondary" data-model-action="edit" data-model-id="${escapeHtml(model.id)}" ${model.blingQuoteId ? '' : 'disabled'}>Editar</button>
                <button type="button" class="button-danger" data-model-action="delete" data-model-id="${escapeHtml(model.id)}">Apagar</button>
              </div>
            </article>
          `,
      )
      .join('');

    modelList.querySelectorAll('[data-model-select]').forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        toggleSelection(selectedModelIds, target.getAttribute('data-model-select'), target.checked);
        renderBulkSelectionActions();
      });
    });

    modelList.querySelectorAll('[data-model-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        const modelId = button.getAttribute('data-model-id');
        const action = button.getAttribute('data-model-action');

        if (!modelId || !action) {
          return;
        }

        if (action === 'use') {
          const shouldContinue = await prepareSessionSwitch('');
          if (!shouldContinue) {
            return;
          }

          await startSessionFromModel(modelId, 'use');
          return;
        }

        if (action === 'edit') {
          const shouldContinue = await prepareSessionSwitch('');
          if (!shouldContinue) {
            return;
          }

          await startSessionFromModel(modelId, 'edit');
          return;
        }

        if (action === 'delete') {
          const confirmed = window.confirm(
            'Deseja apagar este modelo salvo? Esta ação não pode ser desfeita.',
          );

          if (!confirmed) {
            output.textContent = 'Exclusão do modelo cancelada.';
            return;
          }

          output.textContent = `Apagando modelo ${modelId}...`;
          const response = await fetch(`/local/ai-models/${modelId}`, {
            method: 'DELETE',
          });
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.error || 'Falha ao apagar o modelo.');
          }

          await loadRecentModels();
          output.textContent = JSON.stringify(payload, null, 2);
        }
      });
    });

    renderBulkSelectionActions();
  } catch (error) {
    modelList.innerHTML =
      `<p class="muted">Falha ao carregar modelos: ${escapeHtml(String(error))}</p>`;
    renderBulkSelectionActions();
  }
}

async function loadBlingTokenStatus() {
  try {
    const response = await fetch('/local/settings/bling-token');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao carregar status do token Bling.');
    }

    const tokenStatus = payload.tokenStatus || {};
    const statusLabels = {
      valid: 'Válido',
      expiring_soon: 'Próximo do vencimento',
      expired: 'Vencido',
      unknown: 'Validade não registrada',
      unconfigured: 'Não configurado',
    };

    if (blingTokenStatus) {
      blingTokenStatus.textContent =
        statusLabels[tokenStatus.status] || 'Desconhecido';
    }

    if (blingTokenExpiry) {
      if (tokenStatus.expiresAt) {
        const suffix =
          typeof tokenStatus.expiresInMinutes === 'number'
            ? ` (${tokenStatus.expiresInMinutes} min)`
            : '';
        blingTokenExpiry.textContent = `${tokenStatus.expiresAt}${suffix}`;
      } else {
        blingTokenExpiry.textContent = 'Não disponível';
      }
    }
  } catch (error) {
    if (blingTokenStatus) {
      blingTokenStatus.textContent = 'Falha ao carregar';
    }

    if (blingTokenExpiry) {
      blingTokenExpiry.textContent = String(error);
    }
  }
}

async function loadBlingSyncStatus() {
  try {
    const response = await fetch('/local/settings/bling-sync');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao carregar status da base local do Bling.');
    }

    const syncStatus = payload.syncStatus || {};
    const statusLabels = {
      fresh: 'Atualizada hoje',
      stale: 'Vencida para hoje',
      missing: 'Ainda não sincronizada',
    };

    if (blingSyncStatus) {
      blingSyncStatus.textContent =
        statusLabels[syncStatus.status] || 'Desconhecido';
    }

    if (blingSyncSummary) {
      const parts = [
        ['Produtos', syncStatus.products?.syncedAt],
        ['Contatos', syncStatus.contacts?.syncedAt],
        ['Propostas', syncStatus.quotes?.syncedAt],
        ['Notas', syncStatus.serviceNotes?.syncedAt],
      ]
        .filter(([, syncedAt]) => Boolean(syncedAt))
        .map(([label, syncedAt]) => `${label}: ${syncedAt}`);

      blingSyncSummary.textContent =
        parts.length > 0 ? parts.join(' | ') : 'Nenhuma sincronização registrada';
    }
  } catch (error) {
    if (blingSyncStatus) {
      blingSyncStatus.textContent = 'Falha ao carregar';
    }

    if (blingSyncSummary) {
      blingSyncSummary.textContent = String(error);
    }
  }
}

function setupSpeechControl({
  button,
  statusElement,
  textArea,
  idleMessage,
  completedMessage,
}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    statusElement.textContent = 'Reconhecimento de voz não suportado neste navegador.';
    button.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = true;
  recognition.continuous = true;

  let finalTranscript = '';
  let shouldKeepListening = false;
  let manuallyStopping = false;
  let recognitionActive = false;

  function renderSpeechButton() {
    button.classList.toggle('microphone-button--idle', !shouldKeepListening);
    button.classList.toggle('microphone-button--listening', shouldKeepListening);
    button.setAttribute(
      'aria-label',
      shouldKeepListening ? 'Terminar captura de voz' : 'Iniciar captura de voz',
    );
    button.setAttribute('data-tooltip', shouldKeepListening
      ? 'Clique para terminar a captura'
      : 'Clique para começar a falar');
  }

  recognition.onstart = () => {
    recognitionActive = true;
    statusElement.textContent =
      'Ouvindo... clique novamente no microfone para terminar.';
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        finalTranscript += `${transcript} `;
      } else {
        interimTranscript += transcript;
      }
    }

    textArea.value = `${finalTranscript}${interimTranscript}`.trim();
  };

  recognition.onerror = (event) => {
    shouldKeepListening = false;
    recognitionActive = false;
    manuallyStopping = false;
    renderSpeechButton();
    statusElement.textContent = `Falha no reconhecimento de voz: ${event.error}.`;
  };

  recognition.onend = () => {
    recognitionActive = false;

    if (shouldKeepListening && !manuallyStopping) {
      statusElement.textContent =
        'A escuta foi retomada automaticamente. Continue falando.';
      setTimeout(() => {
        if (shouldKeepListening && !recognitionActive) {
          recognition.start();
        }
      }, 120);
      return;
    }

    manuallyStopping = false;
    shouldKeepListening = false;
    renderSpeechButton();
    statusElement.textContent = textArea.value.trim()
      ? completedMessage
      : idleMessage;
  };

  button.addEventListener('click', () => {
    if (shouldKeepListening) {
      manuallyStopping = true;
      shouldKeepListening = false;
      renderSpeechButton();
      statusElement.textContent = 'Encerrando captura de voz...';
      recognition.stop();
      return;
    }

    finalTranscript = textArea.value.trim() ? `${textArea.value.trim()} ` : '';
    manuallyStopping = false;
    shouldKeepListening = true;
    renderSpeechButton();
    recognition.start();
  });

  renderSpeechButton();
}

function setupSpeechInput() {
  const form = document.getElementById('ai-agent-response-form');
  const textArea = form.querySelector('textarea[name="originalText"]');

  if (
    !(speechButton instanceof HTMLButtonElement) ||
    !(speechStatus instanceof HTMLElement) ||
    !(textArea instanceof HTMLTextAreaElement)
  ) {
    return;
  }

  setupSpeechControl({
    button: speechButton,
    statusElement: speechStatus,
    textArea,
    idleMessage: 'Voz inativa. Clique no microfone para começar.',
    completedMessage: 'Captura encerrada. Revise o texto antes de enviar ao NEXA.',
  });
}

function responseDateFromSessionCard(sessionCard) {
  return (
    sessionCard?.getAttribute('data-session-created-at')?.trim() ||
    'data não informada'
  );
}

aiAgentResponseForm
  .addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const originalText = String(form.get('originalText') || '').trim();
    const wordCount = countMeaningfulWords(originalText);

    if (!budgetFinishedCheckbox?.checked) {
      output.textContent =
        'Marque a caixa "Terminado" antes de enviar o orçamento ao NEXA.';
      return;
    }

    if (wordCount < 30) {
      output.textContent =
        `O texto precisa ter pelo menos 30 palavras antes do envio. Atualmente: ${wordCount}.`;
      return;
    }

    await submitAiAgentResponse({
      originalText,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    });
  });

budgetFinishedCheckbox?.addEventListener('change', updateSubmitButtonState);
defaultAiModelSelector?.addEventListener('change', (event) => {
  const selectedModel =
    event.currentTarget instanceof HTMLSelectElement
      ? event.currentTarget.value
      : DEFAULT_AI_MODEL;
  saveDefaultAiModel(selectedModel);
  setOutputMessage(
    `Modelo padrão do NEXA atualizado para ${normalizeAiModelSelection(selectedModel)}.`,
  );
});
originalTextField?.addEventListener('input', () => {
  if (!budgetFinishedCheckbox?.checked) {
    updateSubmitButtonState();
  }
});
updateSubmitButtonState();

refreshSessionsButton.addEventListener('click', async () => {
  await loadRecentSessions();
  await loadRecentModels();
});

bulkSaveModelButton?.addEventListener('click', async () => {
  try {
    const selectedFinalizedSessions = getSelectedSessions().filter(
      (session) => (session.status || 'Aguardando aprovacao') === 'Finalizada',
    );

    if (selectedFinalizedSessions.length === 0) {
      setOutputMessage('Selecione pelo menos uma sessão finalizada para salvar como modelo.', 'warn');
      return;
    }

    const confirmed = window.confirm(
      selectedFinalizedSessions.length === 1
        ? 'Salvar a sessão selecionada como modelo?'
        : `Salvar ${selectedFinalizedSessions.length} sessões finalizadas como modelos?`,
    );

    if (!confirmed) {
      setOutputMessage('Ação em lote cancelada.', 'warn');
      return;
    }

    for (const session of selectedFinalizedSessions) {
      const response = await fetch(`/local/ai-sessions/${session.id}/save-as-model`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || `Falha ao salvar a sessão ${session.id} como modelo.`);
      }

      if (activeSessionId === session.id) {
        clearActiveSessionState();
        if (originalTextField) {
          originalTextField.value = '';
        }
      }
    }

    selectedSessionIds.clear();
    await loadRecentSessions();
    await loadRecentModels();
    setSidebarTab('models');
    setOutputMessage('Sessões selecionadas salvas como modelo.', 'debug');
  } catch (error) {
    setOutputMessage(
      error instanceof Error ? error.message : 'Falha ao salvar as sessões selecionadas como modelo.',
      'error',
    );
  }
});

bulkDeleteButton?.addEventListener('click', async () => {
  try {
    if (activeSidebarTab === 'sessions') {
      const selectedSessions = getSelectedSessions();

      if (selectedSessions.length === 0) {
        setOutputMessage('Selecione ao menos uma sessão para apagar.', 'warn');
        return;
      }

      const confirmed = window.confirm(
        selectedSessions.length === 1
          ? 'Apagar a sessão selecionada? Esta ação não pode ser desfeita.'
          : `Apagar ${selectedSessions.length} sessões selecionadas? Esta ação não pode ser desfeita.`,
      );

      if (!confirmed) {
        setOutputMessage('Ação em lote cancelada.', 'warn');
        return;
      }

      for (const session of selectedSessions) {
        const response = await fetch(`/local/ai-sessions/${session.id}`, {
          method: 'DELETE',
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || `Falha ao apagar a sessão ${session.id}.`);
        }

        if (activeSessionId === session.id) {
          clearActiveSessionState();
          clearActiveModelState();
          if (originalTextField) {
            originalTextField.value = '';
          }
        }
      }

      selectedSessionIds.clear();
      await loadRecentSessions();
      setOutputMessage('Sessões selecionadas apagadas.', 'debug');
      return;
    }

    const selectedModels = getSelectedModels();

    if (selectedModels.length === 0) {
      setOutputMessage('Selecione ao menos um modelo para apagar.', 'warn');
      return;
    }

    const confirmed = window.confirm(
      selectedModels.length === 1
        ? 'Apagar o modelo selecionado? Esta ação não pode ser desfeita.'
        : `Apagar ${selectedModels.length} modelos selecionados? Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      setOutputMessage('Ação em lote cancelada.', 'warn');
      return;
    }

    for (const model of selectedModels) {
      const response = await fetch(`/local/ai-models/${model.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || `Falha ao apagar o modelo ${model.id}.`);
      }

      if (activeModelId === model.id) {
        clearActiveModelState();
      }
    }

    selectedModelIds.clear();
    await loadRecentModels();
    setOutputMessage('Modelos selecionados apagados.', 'debug');
  } catch (error) {
    setOutputMessage(
      error instanceof Error ? error.message : 'Falha ao apagar os itens selecionados.',
      'error',
    );
  }
});

cancelAiAgentButton?.addEventListener('click', () => {
  const hasContext =
    Boolean(getOriginalTextValue()) || Boolean(activeSessionId) || Boolean(activeModelId);

  if (hasContext) {
    const confirmed = window.confirm(
      'Deseja limpar a tela atual e preparar o NEXA para um novo orçamento?',
    );

    if (!confirmed) {
      setOutputMessage('Limpeza da tela cancelada.', 'warn');
      return;
    }
  }

  resetWorkspaceForNewBudget('Tela limpa. O NEXA está pronto para um novo orçamento.');
});

refreshBlingTokenButton?.addEventListener('click', async () => {
  try {
    output.textContent = 'Renovando token do Bling...';
    const response = await fetch('/local/settings/bling-token/refresh', {
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao renovar token do Bling.');
    }

    await loadBlingTokenStatus();
    output.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    setOutputMessage(
      error instanceof Error ? error.message : 'Falha ao renovar token do Bling.',
      'error',
    );
  }
});

refreshBlingSyncButton?.addEventListener('click', async () => {
  try {
    output.textContent = 'Atualizando base local do Bling...';
    const response = await fetch('/local/settings/bling-sync/refresh', {
      method: 'POST',
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao atualizar a base local do Bling.');
    }

    await loadBlingSyncStatus();
    output.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    setOutputMessage(
      error instanceof Error ? error.message : 'Falha ao atualizar a base local do Bling.',
      'error',
    );
  }
});

sessionTabButton?.addEventListener('click', () => {
  setSidebarTab('sessions');
  renderBulkSelectionActions();
});

modelTabButton?.addEventListener('click', () => {
  setSidebarTab('models');
  renderBulkSelectionActions();
});

setupSpeechInput();
const wordCounter = document.getElementById('word-counter');
const inputArea = document.getElementById('main-input-textarea');
inputArea.addEventListener('input', () => {
  const count = countMeaningfulWords(inputArea.value);
  wordCounter.textContent = `${count} / 30 palavras mínimas`;
  wordCounter.style.color = count >= 30 ? 'var(--accent)' : 'var(--muted)';
});

inputArea.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    if (!submitAiAgentButton.disabled) {
      submitAiAgentButton.click();
    }
  }
});

const sidebarFilter = document.getElementById('sidebar-filter');
sidebarFilter.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const items = document.querySelectorAll('.session-item');
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(term) ? '' : 'none';
  });
});

loadDefaultAiModel();
initializeSettingsPanel();
setSidebarTab('sessions');
renderBulkSelectionActions();
loadRecentSessions();
loadRecentModels();
loadBlingTokenStatus();
loadBlingSyncStatus();
