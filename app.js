const SUPABASE_URL = "https://dbsmlcngiezxqbxtanna.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRic21sY25naWV6eHFieHRhbm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzODY0MzcsImV4cCI6MjEwNjk2MjQzN30.t4eTQHsJY2yt-gdCfRADIwbhlllJINwNFb-iTuH3gYo";

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STARTER_TRACKERS = [
  {
    name: "Pensée",
    icon: "💭",
    color: "#2563eb",
    kind: "count",
    unit: "",
    subtypes: [
      "Manque d'argent",
      "Appeler quelqu'un",
      "Pornographie",
      "Autre"
    ]
  },
  {
    name: "Achat",
    icon: "🛒",
    color: "#16a34a",
    kind: "amount",
    unit: "$",
    subtypes: []
  },
  {
    name: "Temps d'écran",
    icon: "📱",
    color: "#7c3aed",
    kind: "amount",
    unit: "min",
    subtypes: []
  }
];

let currentUser = null;
let trackers = [];
let todayEvents = [];
let currentView = "home";
let selectedSubtype = null;
let statsPeriod = 7;
let statsRequestId = 0;
let toastTimer = null;

const authScreen = document.querySelector("#auth-screen");
const appScreen = document.querySelector("#app-screen");

const loginForm = document.querySelector("#login-form");
const loginEmail = document.querySelector("#login-email");
const loginButton = document.querySelector("#login-button");
const loginMessage = document.querySelector("#login-message");

const todayTitle = document.querySelector("#today-title");
const todayDate = document.querySelector("#today-date");
const homeTrackers = document.querySelector("#home-trackers");
const homeEmpty = document.querySelector("#home-empty");
const homeSummary = document.querySelector("#home-summary");

const starterSection = document.querySelector("#starter-section");
const starterGrid = document.querySelector("#starter-grid");
const trackersStarterSection = document.querySelector("#trackers-starter-section");
const trackersStarterGrid = document.querySelector("#trackers-starter-grid");

const statsEmpty = document.querySelector("#stats-empty");
const statsContent = document.querySelector("#stats-content");
const statsTracker = document.querySelector("#stats-tracker");
const statsTotal = document.querySelector("#stats-total");
const statsAverage = document.querySelector("#stats-average");
const statsPeriodLabel = document.querySelector("#stats-period-label");
const statsChart = document.querySelector("#stats-chart");
const subtypeBreakdown = document.querySelector("#subtype-breakdown");

const trackerForm = document.querySelector("#tracker-form");
const trackerId = document.querySelector("#tracker-id");
const trackerName = document.querySelector("#tracker-name");
const trackerIcon = document.querySelector("#tracker-icon");
const trackerColor = document.querySelector("#tracker-color");
const trackerKind = document.querySelector("#tracker-kind");
const trackerUnit = document.querySelector("#tracker-unit");
const trackerSubtypes = document.querySelector("#tracker-subtypes");
const trackerSubmit = document.querySelector("#tracker-submit");
const trackerCancel = document.querySelector("#tracker-cancel");
const trackerFormTitle = document.querySelector("#tracker-form-title");
const trackerFormMessage = document.querySelector("#tracker-form-message");
const trackerManagementList = document.querySelector("#tracker-management-list");
const trackersEmpty = document.querySelector("#trackers-empty");

const accountEmail = document.querySelector("#account-email");
const logoutButton = document.querySelector("#logout-button");

const sheetBackdrop = document.querySelector("#sheet-backdrop");
const eventSheet = document.querySelector("#event-sheet");
const sheetClose = document.querySelector("#sheet-close");
const sheetTitle = document.querySelector("#sheet-title");
const sheetEyebrow = document.querySelector("#sheet-eyebrow");
const eventForm = document.querySelector("#event-form");
const eventTrackerId = document.querySelector("#event-tracker-id");
const subtypeField = document.querySelector("#subtype-field");
const subtypeChips = document.querySelector("#subtype-chips");
const amountField = document.querySelector("#amount-field");
const amountLabel = document.querySelector("#amount-label");
const eventAmount = document.querySelector("#event-amount");
const eventNote = document.querySelector("#event-note");
const eventSubmit = document.querySelector("#event-submit");
const eventMessage = document.querySelector("#event-message");

const toast = document.querySelector("#toast");

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date = new Date()) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0
  );
}

function addLocalDays(date, numberOfDays) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + numberOfDays,
    0,
    0,
    0,
    0
  );
}

function formatToday(date = new Date()) {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "short"
  }).format(date);
}

function capitalizeFirst(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("fr-CA", {
    maximumFractionDigits
  }).format(normalizeNumber(value));
}

function trackerMetricForEvents(tracker, events) {
  if (tracker.kind === "amount") {
    return events.reduce(
      (sum, event) => sum + normalizeNumber(event.amount),
      0
    );
  }

  return events.length;
}

function formatMetric(tracker, value) {
  if (tracker.kind === "amount") {
    const formatted = formatNumber(value);
    return tracker.unit
      ? `${formatted} ${tracker.unit}`
      : formatted;
  }

  return formatNumber(value, 0);
}

function parseSubtypes(value) {
  const seen = new Set();

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase("fr-CA");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function setFormMessage(element, message = "", type = "") {
  element.textContent = message;
  element.classList.remove("success", "error");

  if (type) {
    element.classList.add(type);
  }
}

function frenchError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed")
  ) {
    return "Impossible de joindre le serveur. Vérifie ta connexion Internet puis réessaie.";
  }

  if (message.includes("invalid email")) {
    return "L’adresse courriel n’est pas valide.";
  }

  if (message.includes("rate limit")) {
    return "Trop de tentatives ont été effectuées. Réessaie un peu plus tard.";
  }

  if (message.includes("jwt") || message.includes("session")) {
    return "Ta session n’est plus valide. Reconnecte-toi.";
  }

  if (message.includes("duplicate")) {
    return "Cette donnée existe déjà.";
  }

  return "Une erreur est survenue. Réessaie dans quelques instants.";
}

function showToast(message) {
  window.clearTimeout(toastTimer);

  toast.textContent = message;
  toast.hidden = false;

  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function setButtonBusy(button, busy, busyLabel, normalLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : normalLabel;
}

function clearNode(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function requireUser() {
  if (!currentUser) {
    throw new Error("Session utilisateur absente");
  }

  return currentUser;
}

function getTrackerById(id) {
  return trackers.find((tracker) => tracker.id === id) || null;
}

async function fetchTrackers() {
  const user = requireUser();

  const { data, error } = await supabase
    .from("trackers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  trackers = data || [];
}

async function fetchTodayEvents() {
  const user = requireUser();

  const start = startOfLocalDay();
  const end = addLocalDays(start, 1);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const today = dayKey(new Date());

  todayEvents = (data || []).filter(
    (event) => dayKey(event.created_at) === today
  );
}

async function loadApplicationData() {
  try {
    await Promise.all([
      fetchTrackers(),
      fetchTodayEvents()
    ]);

    renderApplication();
  } catch (error) {
    console.error(error);
    showToast(frenchError(error));
  }
}

function renderApplication() {
  renderHome();
  renderTrackersManagement();
  renderStarterSections();
  renderStatsTrackerOptions();

  if (currentUser) {
    accountEmail.textContent = currentUser.email || "Adresse inconnue";
  }

  if (currentView === "stats") {
    renderStats();
  }
}

function renderHome() {
  const now = new Date();

  todayTitle.textContent = "Suivi";
  todayDate.textContent = capitalizeFirst(formatToday(now));

  clearNode(homeTrackers);

  homeEmpty.hidden = trackers.length > 0;

  if (trackers.length === 0) {
    homeSummary.textContent = "Crée ton premier tracker.";
    return;
  }

  const totalEvents = todayEvents.length;

  homeSummary.textContent =
    totalEvents === 0
      ? "Aucun événement enregistré aujourd’hui."
      : `${totalEvents} événement${totalEvents > 1 ? "s" : ""} aujourd’hui.`;

  for (const tracker of trackers) {
    const events = todayEvents.filter(
      (event) => event.tracker_id === tracker.id
    );

    const metric = trackerMetricForEvents(tracker, events);

    const card = document.createElement("article");
    card.className = "tracker-card";
    card.style.setProperty(
      "--tracker-color",
      tracker.color || "#2563eb"
    );

    const mainButton = document.createElement("button");
    mainButton.className = "tracker-main-button";
    mainButton.type = "button";
    mainButton.dataset.trackerId = tracker.id;
    mainButton.setAttribute(
      "aria-label",
      `Ajouter un événement détaillé pour ${tracker.name}`
    );

    const icon = document.createElement("span");
    icon.className = "tracker-icon";
    icon.textContent = tracker.icon || "◎";

    const name = document.createElement("span");
    name.className = "tracker-name";
    name.textContent = tracker.name;

    const value = document.createElement("strong");
    value.className = "tracker-value";
    value.textContent = formatMetric(tracker, metric);

    mainButton.append(icon, name, value);

    const quickButton = document.createElement("button");
    quickButton.className = "quick-add";
    quickButton.type = "button";
    quickButton.dataset.quickTrackerId = tracker.id;
    quickButton.textContent = "+";
    quickButton.setAttribute(
      "aria-label",
      `Enregistrer immédiatement ${tracker.name}`
    );

    card.append(mainButton, quickButton);
    homeTrackers.appendChild(card);
  }
}

function renderStarterSections() {
  const shouldShow = trackers.length === 0;

  starterSection.hidden = !shouldShow;
  trackersStarterSection.hidden = !shouldShow;

  clearNode(starterGrid);
  clearNode(trackersStarterGrid);

  if (!shouldShow) {
    return;
  }

  for (const template of STARTER_TRACKERS) {
    starterGrid.appendChild(createStarterCard(template));
    trackersStarterGrid.appendChild(createStarterCard(template));
  }
}

function createStarterCard(template) {
  const button = document.createElement("button");
  button.className = "starter-card";
  button.type = "button";
  button.dataset.templateName = template.name;

  const icon = document.createElement("span");
  icon.className = "starter-card-icon";
  icon.textContent = template.icon;

  const text = document.createElement("span");
  text.className = "starter-card-text";

  const title = document.createElement("strong");
  title.textContent = `${template.icon} ${template.name}`;

  const description = document.createElement("span");

  if (template.kind === "amount") {
    description.textContent = `Montant${template.unit ? ` · ${template.unit}` : ""}`;
  } else {
    description.textContent = template.subtypes.length
      ? `${template.subtypes.length} sous-types`
      : "Compteur";
  }

  text.append(title, description);
  button.append(icon, text);

  return button;
}

async function addStarterTracker(name) {
  const user = requireUser();

  const template = STARTER_TRACKERS.find(
    (item) => item.name === name
  );

  if (!template) {
    return;
  }

  try {
    const { error } = await supabase
      .from("trackers")
      .insert({
        user_id: user.id,
        name: template.name,
        icon: template.icon,
        color: template.color,
        kind: template.kind,
        unit: template.unit,
        subtypes: template.subtypes
      });

    if (error) {
      throw error;
    }

    await fetchTrackers();
    renderApplication();

    showToast(`${template.name} a été ajouté.`);
  } catch (error) {
    console.error(error);
    showToast(frenchError(error));
  }
}

async function quickAddEvent(trackerIdValue) {
  const user = requireUser();
  const tracker = getTrackerById(trackerIdValue);

  if (!tracker) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        tracker_id: tracker.id,
        subtype: null,
        note: null,
        amount: null
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (
      data &&
      dayKey(data.created_at) === dayKey(new Date())
    ) {
      todayEvents.push(data);
    } else {
      await fetchTodayEvents();
    }

    renderHome();

    showToast(`${tracker.name} enregistré.`);
  } catch (error) {
    console.error(error);
    showToast(frenchError(error));
  }
}

function openEventSheet(trackerIdValue) {
  const tracker = getTrackerById(trackerIdValue);

  if (!tracker) {
    return;
  }

  selectedSubtype = null;

  eventTrackerId.value = tracker.id;
  eventAmount.value = "";
  eventNote.value = "";

  sheetTitle.textContent = `${tracker.icon || "◎"} ${tracker.name}`;
  sheetEyebrow.textContent = "Nouvel événement";

  setFormMessage(eventMessage);

  renderSubtypeChips(tracker);

  const isAmount = tracker.kind === "amount";
  amountField.hidden = !isAmount;

  if (isAmount) {
    amountLabel.textContent = tracker.unit
      ? `Montant (${tracker.unit})`
      : "Montant";
  }

  sheetBackdrop.hidden = false;
  eventSheet.hidden = false;

  document.body.style.overflow = "hidden";

  window.setTimeout(() => {
    if (tracker.subtypes?.length) {
      subtypeChips.querySelector("button")?.focus();
    } else if (isAmount) {
      eventAmount.focus();
    } else {
      eventNote.focus();
    }
  }, 30);
}

function closeEventSheet() {
  eventSheet.hidden = true;
  sheetBackdrop.hidden = true;
  document.body.style.overflow = "";
  selectedSubtype = null;
}

function renderSubtypeChips(tracker) {
  clearNode(subtypeChips);

  const subtypes = Array.isArray(tracker.subtypes)
    ? tracker.subtypes.filter(Boolean)
    : [];

  subtypeField.hidden = subtypes.length === 0;

  for (const subtype of subtypes) {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.dataset.subtype = subtype;
    button.textContent = subtype;
    button.setAttribute("aria-pressed", "false");

    subtypeChips.appendChild(button);
  }
}

function selectSubtype(subtype) {
  selectedSubtype = selectedSubtype === subtype
    ? null
    : subtype;

  for (const chip of subtypeChips.querySelectorAll(".chip")) {
    const selected = chip.dataset.subtype === selectedSubtype;

    chip.classList.toggle("selected", selected);
    chip.setAttribute(
      "aria-pressed",
      selected ? "true" : "false"
    );
  }
}

async function saveDetailedEvent(event) {
  event.preventDefault();

  const user = requireUser();
  const tracker = getTrackerById(eventTrackerId.value);

  if (!tracker) {
    return;
  }

  const note = eventNote.value.trim();

  let amount = null;

  if (tracker.kind === "amount") {
    if (eventAmount.value.trim() === "") {
      setFormMessage(
        eventMessage,
        "Entre un montant avant d’enregistrer.",
        "error"
      );
      eventAmount.focus();
      return;
    }

    amount = Number(eventAmount.value);

    if (!Number.isFinite(amount) || amount < 0) {
      setFormMessage(
        eventMessage,
        "Le montant doit être un nombre valide supérieur ou égal à zéro.",
        "error"
      );
      eventAmount.focus();
      return;
    }
  }

  setButtonBusy(
    eventSubmit,
    true,
    "Enregistrement…",
    "Enregistrer"
  );

  setFormMessage(eventMessage);

  try {
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        tracker_id: tracker.id,
        subtype: selectedSubtype || null,
        note: note || null,
        amount
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (
      data &&
      dayKey(data.created_at) === dayKey(new Date())
    ) {
      todayEvents.push(data);
    } else {
      await fetchTodayEvents();
    }

    renderHome();
    closeEventSheet();

    showToast("Événement enregistré.");

    if (currentView === "stats") {
      renderStats();
    }
  } catch (error) {
    console.error(error);

    setFormMessage(
      eventMessage,
      frenchError(error),
      "error"
    );
  } finally {
    setButtonBusy(
      eventSubmit,
      false,
      "Enregistrement…",
      "Enregistrer"
    );
  }
}

function renderTrackersManagement() {
  clearNode(trackerManagementList);

  trackersEmpty.hidden = trackers.length > 0;

  for (const tracker of trackers) {
    const card = document.createElement("article");
    card.className = "management-card";
    card.style.setProperty(
      "--tracker-color",
      tracker.color || "#2563eb"
    );

    const color = document.createElement("span");
    color.className = "management-color";

    const icon = document.createElement("span");
    icon.className = "management-icon";
    icon.textContent = tracker.icon || "◎";

    const info = document.createElement("div");
    info.className = "management-info";

    const name = document.createElement("strong");
    name.textContent = tracker.name;

    const meta = document.createElement("span");

    const kindLabel = tracker.kind === "amount"
      ? "Montant"
      : "Compteur";

    const unitLabel = tracker.unit
      ? ` · ${tracker.unit}`
      : "";

    const subtypeCount = Array.isArray(tracker.subtypes)
      ? tracker.subtypes.length
      : 0;

    const subtypeLabel = subtypeCount
      ? ` · ${subtypeCount} sous-type${subtypeCount > 1 ? "s" : ""}`
      : "";

    meta.textContent = `${kindLabel}${unitLabel}${subtypeLabel}`;

    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "management-actions";

    const edit = document.createElement("button");
    edit.className = "small-icon-button";
    edit.type = "button";
    edit.dataset.editTrackerId = tracker.id;
    edit.textContent = "✎";
    edit.setAttribute(
      "aria-label",
      `Modifier ${tracker.name}`
    );

    const remove = document.createElement("button");
    remove.className = "small-icon-button danger";
    remove.type = "button";
    remove.dataset.deleteTrackerId = tracker.id;
    remove.textContent = "⌫";
    remove.setAttribute(
      "aria-label",
      `Supprimer ${tracker.name}`
    );

    actions.append(edit, remove);

    card.append(color, icon, info, actions);
    trackerManagementList.appendChild(card);
  }
}

function resetTrackerForm() {
  trackerForm.reset();

  trackerId.value = "";
  trackerColor.value = "#2563eb";
  trackerKind.value = "count";

  trackerFormTitle.textContent = "Nouveau tracker";
  trackerSubmit.textContent = "Ajouter";
  trackerCancel.hidden = true;

  setFormMessage(trackerFormMessage);
}

function editTracker(id) {
  const tracker = getTrackerById(id);

  if (!tracker) {
    return;
  }

  trackerId.value = tracker.id;
  trackerName.value = tracker.name || "";
  trackerIcon.value = tracker.icon || "";
  trackerColor.value = tracker.color || "#2563eb";
  trackerKind.value = tracker.kind || "count";
  trackerUnit.value = tracker.unit || "";
  trackerSubtypes.value = Array.isArray(tracker.subtypes)
    ? tracker.subtypes.join(", ")
    : "";

  trackerFormTitle.textContent = "Modifier le tracker";
  trackerSubmit.textContent = "Enregistrer";
  trackerCancel.hidden = false;

  setFormMessage(trackerFormMessage);

  document.querySelector("#tracker-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  trackerName.focus();
}

async function saveTracker(event) {
  event.preventDefault();

  const user = requireUser();

  const id = trackerId.value.trim();
  const name = trackerName.value.trim();
  const icon = trackerIcon.value.trim();
  const color = trackerColor.value || "#2563eb";
  const kind = trackerKind.value === "amount"
    ? "amount"
    : "count";
  const unit = trackerUnit.value.trim();
  const subtypes = parseSubtypes(trackerSubtypes.value);

  if (!name) {
    setFormMessage(
      trackerFormMessage,
      "Entre un nom pour le tracker.",
      "error"
    );
    trackerName.focus();
    return;
  }

  const normalButtonLabel = id
    ? "Enregistrer"
    : "Ajouter";

  setButtonBusy(
    trackerSubmit,
    true,
    "Sauvegarde…",
    normalButtonLabel
  );

  setFormMessage(trackerFormMessage);

  const payload = {
    name,
    icon: icon || "◎",
    color,
    kind,
    unit,
    subtypes
  };

  try {
    if (id) {
      const { error } = await supabase
        .from("trackers")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from("trackers")
        .insert({
          user_id: user.id,
          ...payload
        });

      if (error) {
        throw error;
      }
    }

    await fetchTrackers();

    resetTrackerForm();
    renderApplication();

    showToast(
      id
        ? "Tracker modifié."
        : "Tracker ajouté."
    );
  } catch (error) {
    console.error(error);

    setFormMessage(
      trackerFormMessage,
      frenchError(error),
      "error"
    );
  } finally {
    setButtonBusy(
      trackerSubmit,
      false,
      "Sauvegarde…",
      normalButtonLabel
    );
  }
}

async function deleteTracker(id) {
  const user = requireUser();
  const tracker = getTrackerById(id);

  if (!tracker) {
    return;
  }

  const confirmed = window.confirm(
    `Supprimer « ${tracker.name} » ? Tous ses événements seront également supprimés. Cette action est irréversible.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const { error: eventError } = await supabase
      .from("events")
      .delete()
      .eq("tracker_id", tracker.id)
      .eq("user_id", user.id);

    if (eventError) {
      throw eventError;
    }

    const { error: trackerError } = await supabase
      .from("trackers")
      .delete()
      .eq("id", tracker.id)
      .eq("user_id", user.id);

    if (trackerError) {
      throw trackerError;
    }

    trackers = trackers.filter(
      (item) => item.id !== tracker.id
    );

    todayEvents = todayEvents.filter(
      (event) => event.tracker_id !== tracker.id
    );

    if (trackerId.value === tracker.id) {
      resetTrackerForm();
    }

    renderApplication();

    showToast("Tracker supprimé.");
  } catch (error) {
    console.error(error);
    showToast(frenchError(error));
  }
}

function renderStatsTrackerOptions() {
  const previousValue = statsTracker.value;

  clearNode(statsTracker);

  if (trackers.length === 0) {
    statsEmpty.hidden = false;
    statsContent.hidden = true;
    return;
  }

  statsEmpty.hidden = true;
  statsContent.hidden = false;

  for (const tracker of trackers) {
    const option = document.createElement("option");
    option.value = tracker.id;
    option.textContent = `${tracker.icon || "◎"} ${tracker.name}`;

    statsTracker.appendChild(option);
  }

  const stillExists = trackers.some(
    (tracker) => tracker.id === previousValue
  );

  statsTracker.value = stillExists
    ? previousValue
    : trackers[0].id;
}

async function fetchStatsEvents(period) {
  const user = requireUser();

  const todayStart = startOfLocalDay();
  const start = addLocalDays(todayStart, -(period - 1));
  const end = addLocalDays(todayStart, 1);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const validDayKeys = new Set();

  for (let offset = 0; offset < period; offset += 1) {
    validDayKeys.add(
      dayKey(addLocalDays(start, offset))
    );
  }

  return (data || []).filter(
    (event) => validDayKeys.has(dayKey(event.created_at))
  );
}

async function renderStats() {
  if (trackers.length === 0 || !currentUser) {
    return;
  }

  const tracker = getTrackerById(statsTracker.value);

  if (!tracker) {
    return;
  }

  const requestId = ++statsRequestId;

  statsTotal.textContent = "…";
  statsAverage.textContent = "…";

  clearNode(statsChart);
  clearNode(subtypeBreakdown);

  try {
    const events = await fetchStatsEvents(statsPeriod);

    if (requestId !== statsRequestId) {
      return;
    }

    const trackerEvents = events.filter(
      (event) => event.tracker_id === tracker.id
    );

    renderStatsSummary(tracker, trackerEvents);
    renderStatsChart(tracker, trackerEvents);
    renderSubtypeBreakdown(tracker, trackerEvents);
  } catch (error) {
    console.error(error);

    if (requestId === statsRequestId) {
      statsTotal.textContent = "—";
      statsAverage.textContent = "—";

      const message = document.createElement("div");
      message.className = "breakdown-empty";
      message.textContent = frenchError(error);

      statsChart.appendChild(message);
    }
  }
}

function renderStatsSummary(tracker, events) {
  const total = trackerMetricForEvents(tracker, events);
  const average = total / statsPeriod;

  statsTotal.textContent = formatMetric(tracker, total);
  statsAverage.textContent = formatMetric(tracker, average);

  const today = startOfLocalDay();
  const firstDay = addLocalDays(
    today,
    -(statsPeriod - 1)
  );

  statsPeriodLabel.textContent =
    `${formatShortDate(firstDay)} – ${formatShortDate(today)}`;
}

function renderStatsChart(tracker, events) {
  clearNode(statsChart);

  const today = startOfLocalDay();
  const firstDay = addLocalDays(
    today,
    -(statsPeriod - 1)
  );

  const values = [];

  for (let offset = 0; offset < statsPeriod; offset += 1) {
    const date = addLocalDays(firstDay, offset);
    const key = dayKey(date);

    const dayEvents = events.filter(
      (event) => dayKey(event.created_at) === key
    );

    values.push({
      date,
      value: trackerMetricForEvents(
        tracker,
        dayEvents
      )
    });
  }

  const maximum = Math.max(
    ...values.map((item) => item.value),
    0
  );

  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];

    const column = document.createElement("div");
    column.className = "chart-column";

    const value = document.createElement("div");
    value.className = "chart-value";

    if (
      statsPeriod <= 7 ||
      item.value > 0
    ) {
      value.textContent = tracker.kind === "amount"
        ? formatNumber(item.value)
        : formatNumber(item.value, 0);
    } else {
      value.textContent = "";
    }

    const barArea = document.createElement("div");
    barArea.className = "chart-bar-area";

    const bar = document.createElement("div");
    bar.className = "chart-bar";

    const percentage = maximum > 0
      ? item.value / maximum
      : 0;

    bar.style.height = item.value > 0
      ? `${Math.max(4, percentage * 100)}%`
      : "3px";

    bar.title =
      `${formatShortDate(item.date)} : ${formatMetric(tracker, item.value)}`;

    barArea.appendChild(bar);

    const label = document.createElement("div");
    label.className = "chart-label";

    if (statsPeriod <= 7) {
      label.textContent = new Intl.DateTimeFormat(
        "fr-CA",
        { weekday: "short" }
      )
        .format(item.date)
        .replace(".", "");
    } else {
      const showLabel =
        index === 0 ||
        index === values.length - 1 ||
        item.date.getDate() === 1 ||
        index % 5 === 0;

      label.textContent = showLabel
        ? new Intl.DateTimeFormat("fr-CA", {
            day: "numeric",
            month: "short"
          }).format(item.date)
        : "";
    }

    column.append(value, barArea, label);
    statsChart.appendChild(column);
  }
}

function renderSubtypeBreakdown(tracker, events) {
  clearNode(subtypeBreakdown);

  if (events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "breakdown-empty";
    empty.textContent =
      "Aucun événement pour cette période.";

    subtypeBreakdown.appendChild(empty);
    return;
  }

  const groups = new Map();

  for (const event of events) {
    const label = event.subtype?.trim()
      ? event.subtype.trim()
      : "Sans sous-type";

    const currentValue = groups.get(label) || 0;

    const increment = tracker.kind === "amount"
      ? normalizeNumber(event.amount)
      : 1;

    groups.set(
      label,
      currentValue + increment
    );
  }

  const total = Array.from(groups.values())
    .reduce((sum, value) => sum + value, 0);

  const sorted = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [label, value] of sorted) {
    const percentage = total > 0
      ? (value / total) * 100
      : 0;

    const row = document.createElement("div");
    row.className = "breakdown-row";

    const heading = document.createElement("div");
    heading.className = "breakdown-heading";

    const subtypeName = document.createElement("span");
    subtypeName.textContent = label;

    const result = document.createElement("strong");
    result.textContent =
      `${formatNumber(percentage, 1)} %`;

    heading.append(subtypeName, result);

    const track = document.createElement("div");
    track.className = "horizontal-track";

    const fill = document.createElement("div");
    fill.className = "horizontal-fill";
    fill.style.width = `${Math.max(percentage, 0)}%`;

    track.appendChild(fill);

    row.append(heading, track);
    subtypeBreakdown.appendChild(row);
  }
}

function switchView(viewName) {
  const allowedViews = [
    "home",
    "stats",
    "trackers",
    "account"
  ];

  if (!allowedViews.includes(viewName)) {
    return;
  }

  currentView = viewName;

  for (const view of document.querySelectorAll(".view")) {
    view.hidden = view.dataset.view !== viewName;
  }

  for (const button of document.querySelectorAll(".nav-item")) {
    const active = button.dataset.viewTarget === viewName;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current", "page");
    }
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (viewName === "stats") {
    renderStats();
  }
}

async function signInWithGoogle() {
  const button = document.querySelector("#google-login-button");
  const pageUrl = `${window.location.origin}${window.location.pathname}`;

  if (button) {
    button.disabled = true;
  }

  setFormMessage(loginMessage);

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: pageUrl
      }
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(error);
    setFormMessage(loginMessage, frenchError(error), "error");

    if (button) {
      button.disabled = false;
    }
  }
}

async function sendLoginLink(event) {
  event.preventDefault();

  const email = loginEmail.value.trim();

  if (!email) {
    setFormMessage(
      loginMessage,
      "Entre ton adresse courriel.",
      "error"
    );
    return;
  }

  const pageActuelleSansQueryNiHash =
    `${window.location.origin}${window.location.pathname}`;

  setButtonBusy(
    loginButton,
    true,
    "Envoi…",
    "Envoyer le lien"
  );

  setFormMessage(loginMessage);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: pageActuelleSansQueryNiHash
      }
    });

    if (error) {
      throw error;
    }

    setFormMessage(
      loginMessage,
      "Vérifie ta boîte mail.",
      "success"
    );
  } catch (error) {
    console.error(error);

    setFormMessage(
      loginMessage,
      frenchError(error),
      "error"
    );
  } finally {
    setButtonBusy(
      loginButton,
      false,
      "Envoi…",
      "Envoyer le lien"
    );
  }
}

async function logout() {
  logoutButton.disabled = true;
  logoutButton.textContent = "Déconnexion…";

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error(error);
    showToast(frenchError(error));
  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = "Se déconnecter";
  }
}

async function handleSession(session) {
  const newUser = session?.user || null;
  const previousUserId = currentUser?.id || null;

  currentUser = newUser;

  if (!currentUser) {
    trackers = [];
    todayEvents = [];

    appScreen.hidden = true;
    authScreen.hidden = false;

    closeEventSheet();
    return;
  }

  authScreen.hidden = true;
  appScreen.hidden = false;

  accountEmail.textContent =
    currentUser.email || "Adresse inconnue";

  if (previousUserId !== currentUser.id) {
    resetTrackerForm();
    await loadApplicationData();
  } else if (trackers.length === 0) {
    await loadApplicationData();
  }
}

const THEME_STORAGE_KEY = "suivi-theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  const normalized = theme === "dark" ? "dark" : "light";

  document.documentElement.dataset.theme = normalized;

  const metaTheme = document.querySelector('meta[name="theme-color"]');

  if (metaTheme) {
    metaTheme.setAttribute(
      "content",
      normalized === "dark" ? "#0a0a10" : "#2563eb"
    );
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch (error) {
    console.warn("Thème non sauvegardé :", error);
  }

  const toggle = document.querySelector("#theme-toggle");

  if (toggle) {
    toggle.checked = normalized === "dark";
  }

  const fab = document.querySelector("#theme-fab");

  if (fab) {
    fab.textContent = normalized === "dark" ? "☀️" : "🌙";
    fab.setAttribute(
      "aria-label",
      normalized === "dark"
        ? "Basculer le mode clair"
        : "Basculer le mode sombre"
    );
  }
}

function initTheme() {
  let saved = null;

  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    saved = null;
  }

  if (saved !== "dark" && saved !== "light") {
    saved = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  applyTheme(saved);
}

function bindEvents() {
  loginForm.addEventListener(
    "submit",
    sendLoginLink
  );

  const googleButton = document.querySelector("#google-login-button");

  if (googleButton) {
    googleButton.addEventListener(
      "click",
      signInWithGoogle
    );
  }

  logoutButton.addEventListener(
    "click",
    logout
  );

  trackerForm.addEventListener(
    "submit",
    saveTracker
  );

  trackerCancel.addEventListener(
    "click",
    resetTrackerForm
  );

  eventForm.addEventListener(
    "submit",
    saveDetailedEvent
  );

  sheetClose.addEventListener(
    "click",
    closeEventSheet
  );

  sheetBackdrop.addEventListener(
    "click",
    closeEventSheet
  );

  subtypeChips.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-subtype]");

      if (!button) {
        return;
      }

      selectSubtype(button.dataset.subtype);
    }
  );

  homeTrackers.addEventListener(
    "click",
    (event) => {
      const quickButton = event.target.closest(
        "[data-quick-tracker-id]"
      );

      if (quickButton) {
        quickAddEvent(
          quickButton.dataset.quickTrackerId
        );
        return;
      }

      const mainButton = event.target.closest(
        "[data-tracker-id]"
      );

      if (mainButton) {
        openEventSheet(
          mainButton.dataset.trackerId
        );
      }
    }
  );

  const themeToggle = document.querySelector("#theme-toggle");

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      applyTheme(themeToggle.checked ? "dark" : "light");
    });
  }

  const themeFab = document.querySelector("#theme-fab");

  if (themeFab) {
    themeFab.addEventListener("click", () => {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const navButton = event.target.closest(
        "[data-view-target]"
      );

      if (navButton) {
        switchView(
          navButton.dataset.viewTarget
        );
        return;
      }

      const goButton = event.target.closest(
        "[data-go-view]"
      );

      if (goButton) {
        switchView(
          goButton.dataset.goView
        );
        return;
      }

      const starterButton = event.target.closest(
        "[data-template-name]"
      );

      if (starterButton) {
        addStarterTracker(
          starterButton.dataset.templateName
        );
        return;
      }

      const editButton = event.target.closest(
        "[data-edit-tracker-id]"
      );

      if (editButton) {
        editTracker(
          editButton.dataset.editTrackerId
        );
        return;
      }

      const deleteButton = event.target.closest(
        "[data-delete-tracker-id]"
      );

      if (deleteButton) {
        deleteTracker(
          deleteButton.dataset.deleteTrackerId
        );
      }
    }
  );

  statsTracker.addEventListener(
    "change",
    renderStats
  );

  for (const button of document.querySelectorAll(
    ".period-button"
  )) {
    button.addEventListener(
      "click",
      () => {
        statsPeriod = Number(
          button.dataset.period
        );

        for (const otherButton of document.querySelectorAll(
          ".period-button"
        )) {
          const active = otherButton === button;

          otherButton.classList.toggle(
            "active",
            active
          );

          otherButton.setAttribute(
            "aria-pressed",
            active ? "true" : "false"
          );
        }

        renderStats();
      }
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !eventSheet.hidden
      ) {
        closeEventSheet();
      }
    }
  );
}

async function initializeAuth() {
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    await handleSession(session);
  } catch (error) {
    console.error(error);

    authScreen.hidden = false;
    appScreen.hidden = true;

    setFormMessage(
      loginMessage,
      frenchError(error),
      "error"
    );
  }

  supabase.auth.onAuthStateChange(
    async (_event, session) => {
      await handleSession(session);
    }
  );
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch((error) => {
          console.error(
            "Erreur d’enregistrement du service worker :",
            error
          );
        });
    }
  );
}

bindEvents();
resetTrackerForm();
switchView("home");
registerServiceWorker();
initTheme();
initializeAuth();
