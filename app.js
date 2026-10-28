/* Rent Receipt Generator – India
 * Browser-only controller: shared details, monthly review, preview and print.
 * Payment records live in memory only; nothing is uploaded or persisted.
 */
"use strict";

// Retained source-linked guidance; this feature does not expand legal coverage.
const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

const STATE_GUIDANCE = {
  "Telangana": {
    "text": "Section 8 of the Telangana Buildings (Lease, Rent and Eviction) Control Act provides a right to a signed receipt for rent or an advance, where the Act applies. Confirm scope, exclusions and any prescribed form for your premises.",
    "url": "https://www.indiacode.nic.in/bitstream/123456789/8607/1/act_15_of_1960.pdf",
    "label": "Telangana rent control Act · Section 8"
  },
  "Maharashtra": {
    "text": "Section 31 of the Maharashtra Rent Control Act requires a written receipt for amounts received where the Act applies. Prescribed form and manner must also be checked. This general template is not certified as Maharashtra Form I.",
    "url": "https://www.indiacode.nic.in/bitstream/123456789/15817/1/the_maharashtra_rent_control_act_1999.pdf",
    "label": "Maharashtra Rent Control Act · Section 31"
  },
  "Karnataka": {
    "text": "Section 16(2) of the Karnataka Rent Act entitles a tenant to a written receipt signed by the landlord or authorised agent for rent, charges or advances where the Act applies. Check the Act’s scope and exclusions for your premises.",
    "url": "https://www.indiacode.nic.in/bitstream/123456789/7810/1/34_of_2001_e.pdf",
    "label": "Karnataka Rent Act · Section 16"
  },
  "Tamil Nadu": {
    "text": "Section 13(2) of the 2017 tenancy Act provides for a signed written receipt from the landlord or property manager. Review amendments and applicability on the official tenancy portal, including provisions relating to electronic payments.",
    "url": "https://www.tenancy.tn.gov.in/Content/Documents/TNRRRLTact2017.pdf",
    "label": "Tamil Nadu tenancy Act · Section 13"
  },
  "Delhi": {
    "text": "Section 26 of the Delhi Rent Control Act provides for a receipt signed by the landlord or authorised agent for rent paid, where that Act applies. Check coverage, exclusions and the prescribed form before relying on this general receipt.",
    "url": "https://www.indiacode.nic.in/show-data?actid=AC_CEN_5_5_00115_195859_1666697046553&orderno=34&sectionId=70401&sectionno=26",
    "label": "Delhi Rent Control Act · Section 26"
  }
};

const {
  MAX_AMOUNT, toIsoDate, parseDate, formatDate, monthLabel, monthPeriod,
  financialYearMonths, advanceMonth, receiptNumberAt, toCents, formatMoney,
  amountInWords, panFormatError, pdfFilename,
} = ReceiptUtils;

const byId = (id) => document.getElementById(id);
const form = byId("form");
const originalPageTitle = document.title;
const today = new Date();
const state = {
  mode: "single",
  panPreference: "auto", // A manual inclusion/opt-out survives later amount edits.
  validationAttempted: false,
  financialYear: today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear(),
  selectedMonths: new Set(),
  payments: new Map(),
  previewMonth: "",
  printTitleActive: false,
};
const fieldNames = {
  tenant: "Tenant name", landlord: "Landlord / recipient name",
  address: "Rental property address", amount: "Rent received", from: "Rent period start",
  to: "Rent period end", paid: "Payment date", number: "Receipt number",
  pan: "Landlord PAN", annual: "Annual rent", batchYear: "Financial year",
};

function setText(id, value) {
  byId(id).textContent = value;
}

function isBatch() {
  return state.mode === "batch";
}

function selectedPayments() {
  return [...state.selectedMonths].sort().map((key) => state.payments.get(key));
}

function sharedDetails() {
  return {
    tenant: byId("tenant").value.trim(),
    landlord: byId("landlord").value.trim(),
    address: byId("address").value.trim(),
    state: byId("state").value,
    pan: byId("includePan").checked ? byId("pan").value : "",
    notes: byId("notes").value.trim(),
    stamp: byId("stamp").checked,
  };
}

function singlePayment() {
  return {
    number: byId("number").value.trim(), amount: byId("amount").value,
    method: byId("method").value, paid: byId("paid").value,
    from: byId("from").value, to: byId("to").value,
    reference: byId("reference").value.trim(), note: "",
  };
}

function activeReceipts() {
  return isBatch() ? selectedPayments() : [singlePayment()];
}

function initialiseStatePicker() {
  for (const [label, values] of [["States", STATES.slice(0, 28)], ["Union territories", STATES.slice(28)]]) {
    const group = document.createElement("optgroup");
    group.label = label;
    for (const name of values.sort()) group.append(new Option(name, name));
    byId("state").append(group);
  }
}

function initialiseDates() {
  byId("paid").value = toIsoDate(today);
  byId("from").value = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1, 12));
  byId("to").value = toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0, 12));
  byId("number").value = `RN-${today.getFullYear()}-001`;
  byId("batchYear").value = state.financialYear;
}

// Keep selected payment records even when temporarily deselected, within this page only.
function createPayment(key) {
  const period = monthPeriod(key);
  return {
    key, ...period, amount: byId("amount").value, method: byId("method").value,
    paid: "", reference: "", note: "", number: "", customNumber: false, confirmed: false,
  };
}

function renderMonthChoices() {
  const container = byId("monthChoices");
  container.replaceChildren();
  for (const key of financialYearMonths(state.financialYear)) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.month = key;
    checkbox.checked = state.selectedMonths.has(key);
    label.append(checkbox, document.createTextNode(monthLabel(key)));
    container.append(label);
  }
}

// Sequential numbers follow calendar order; explicit per-month overrides are retained.
function refreshAutomaticNumbers() {
  selectedPayments().forEach((payment, index) => {
    if (payment.customNumber) return;
    const number = receiptNumberAt(byId("number").value, index);
    if (number !== payment.number) payment.confirmed = false;
    payment.number = number;
    const input = byId(`payment-${payment.key}-number`);
    if (input) input.value = number;
  });
}

function createPaymentField(payment, name, labelText, options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  wrapper.dataset.fieldWrapper = name;
  const id = `payment-${payment.key}-${name}`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText + (options.required ? " *" : "");
  const input = document.createElement(options.type === "select" ? "select" : "input");
  input.id = id;
  input.dataset.paymentField = name;
  input.dataset.fieldLabel = `${monthLabel(payment.key)} ${labelText.toLowerCase()}`;
  input.required = Boolean(options.required);
  if (options.type === "select") {
    for (const method of ["UPI", "Bank transfer", "Cash", "Cheque", "Other"]) input.append(new Option(method, method));
  } else {
    input.type = options.type || "text";
    if (input.type === "number") {
      input.min = "0.01";
      input.max = MAX_AMOUNT;
      input.step = "0.01";
    } else if (input.type === "text") {
      input.autocomplete = "off";
      input.maxLength = name === "number" ? 50 : name === "note" ? 500 : 100;
    }
  }
  input.value = payment[name];
  wrapper.append(label, input);
  return wrapper;
}

function updatePaymentCard(card, payment) {
  const cents = toCents(payment.amount);
  const date = formatDate(payment.paid, "Payment date needed");
  card.querySelector(".payment-card-status").textContent = payment.confirmed ? "Reviewed" : "Needs review";
  card.querySelector(".payment-card-summary").textContent = `${formatMoney(cents === null ? 0 : cents / 100)} · ${date}`;
  card.querySelector('[data-payment-field="confirmed"]').checked = payment.confirmed;
  card.querySelector('[data-field-wrapper="reference"]').hidden = payment.method === "Cash";
  card.classList.toggle("is-reviewed", payment.confirmed);
  card.classList.toggle("active-preview", payment.key === state.previewMonth);
}

function renderPaymentRows() {
  const container = byId("paymentRows");
  const openMonths = new Set([...container.querySelectorAll("details.payment-card[open]")].map((card) => card.dataset.payment));
  container.replaceChildren();
  const payments = selectedPayments();
  payments.forEach((payment, index) => {
    const card = document.createElement("details");
    card.className = "payment-card";
    card.dataset.payment = payment.key;
    card.open = openMonths.has(payment.key) || (openMonths.size === 0 && index === 0);
    const summary = document.createElement("summary");
    const title = document.createElement("strong");
    title.textContent = monthLabel(payment.key);
    const badge = document.createElement("span");
    badge.className = "payment-card-status";
    const description = document.createElement("small");
    description.className = "payment-card-summary";
    summary.append(title, badge, description);
    summary.addEventListener("click", () => {
      state.previewMonth = payment.key;
      render();
    });
    const body = document.createElement("div");
    body.className = "payment-card-body";
    const period = document.createElement("p");
    period.className = "batch-help";
    period.textContent = `Rent period: ${formatDate(payment.from)} – ${formatDate(payment.to)}`;
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.append(
      createPaymentField(payment, "amount", "Amount received (₹)", { type: "number", required: true }),
      createPaymentField(payment, "paid", "Actual payment date", { type: "date", required: true }),
      createPaymentField(payment, "method", "Payment method", { type: "select" }),
      createPaymentField(payment, "number", "Receipt number", { required: true }),
    );
    body.append(period, grid,
      createPaymentField(payment, "reference", "Payment / cheque reference (optional)"),
      createPaymentField(payment, "note", "Payment note (optional)"));
    const confirmation = document.createElement("label");
    confirmation.className = "check payment-confirmation";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `payment-${payment.key}-confirmed`;
    checkbox.dataset.paymentField = "confirmed";
    checkbox.dataset.fieldLabel = `${monthLabel(payment.key)} payment confirmation`;
    checkbox.required = true;
    confirmation.htmlFor = checkbox.id;
    confirmation.append(checkbox, document.createTextNode("I reviewed this payment and confirm the amount was received."));
    body.append(confirmation);
    card.append(summary, body);
    container.append(card);
    updatePaymentCard(card, payment);
  });
}

function synchroniseMode() {
  const batch = isBatch();
  document.body.classList.toggle("batch-mode", batch);
  byId("singlePayment").hidden = batch;
  byId("batchSetup").hidden = !batch;
  byId("batchYear").disabled = !batch;
  byId("batchYear").required = batch;
  for (const id of ["from", "to", "paid", "reference"]) byId(id).disabled = batch;
  for (const input of byId("paymentRows").querySelectorAll("input, select")) input.disabled = !batch;
  byId("amount").required = !batch;
  byId("amountRequired").hidden = batch;
  byId("next").hidden = batch;
  byId("next").disabled = batch;
  setText("amountLabel", batch ? "Default monthly rent (₹)" : "Rent received (₹)");
  setText("methodLabel", batch ? "Default payment method" : "Payment method");
  setText("numberLabel", batch ? "Starting receipt number" : "Receipt number");
  byId("referenceField").hidden = batch || byId("method").value === "Cash";
}

function panAssessment() {
  const actual = byId("annual").value !== "" && byId("annual").validity.valid;
  if (actual) return { annual: Number(byId("annual").value), description: "Annual rent entered", assumption: "" };
  const enteredAmounts = selectedPayments().map((payment) => toCents(payment.amount)).filter((amount) => amount !== null);
  if (isBatch() && enteredAmounts.length) {
    const total = enteredAmounts.reduce((sum, cents) => sum + cents, 0) / 100;
    const annual = total / enteredAmounts.length * 12;
    return {
      annual,
      description: enteredAmounts.length === 12 ? "Total for the selected 12 months" : "Estimated annual rent (entered monthly average × 12)",
      assumption: enteredAmounts.length === 12 ? "" : "Assumes monthly rent across all 12 months; adjust the annual total if different.",
    };
  }
  const amount = Number(byId("amount").value || 0);
  return {
    annual: Math.max(0, Number.isFinite(amount) ? amount : 0) * 12,
    description: "Estimated annual rent (rent × 12)",
    assumption: "Assumes monthly rent for all 12 months.",
  };
}

function renderPan() {
  const assessment = panAssessment();
  const suggested = assessment.annual > 100000;
  const included = state.panPreference === "auto" ? suggested : state.panPreference === "include";
  const input = byId("pan");
  byId("includePan").checked = included;
  byId("panField").hidden = !included;
  input.disabled = !included;
  input.required = included;
  input.value = input.value.trim().toUpperCase();
  const error = included ? panFormatError(input.value) : "";
  input.setCustomValidity(error);
  byId("panFormatStatus").hidden = !included || !input.value || Boolean(error);
  const suggestion = suggested ? "Above ₹1 lakh: PAN is switched on by default for HRA documentation." : "Include PAN if needed for your submission.";
  setText("panAssessment", `${assessment.description}: ${formatMoney(assessment.annual)}. ${suggestion} ${assessment.assumption}`.trim());
  byId("panOptOutNote").hidden = !(suggested && !included);
  byId("resetPan").hidden = state.panPreference === "auto";
  byId("panCheck").hidden = !suggested;
  setText("panCheck", !included ? "PAN excluded by your choice. Check your employer’s HRA documentation requirements." :
    !input.value ? "Enter landlord PAN to print, or uncheck “Include landlord PAN” to omit it." :
      error ? "Landlord PAN needs a format correction." : "Landlord PAN included; format checked only.");
}

function renderStateGuidance() {
  const name = byId("state").value;
  const guidance = STATE_GUIDANCE[name];
  setText("stateNote", !name ? "Adds the state to your receipt and shows available guidance." : guidance ?
    "Legal reference available under “Before you print”." : "General receipt available. Local legal requirements still need review.");
  setText("guideText", guidance ? guidance.text : name ?
    `Legal review is pending for ${name}. Check local tenancy, receipt-form and stamp requirements before statutory use.` :
    "This tool creates a general acknowledgement of rent paid. State selection is optional. Add a state to see available guidance; this does not select a prescribed statutory form.");
  byId("guideLink").hidden = !guidance;
  if (guidance) {
    byId("guideLink").href = guidance.url;
    byId("guideLink").rel = "noopener noreferrer";
    setText("guideLink", `Read ${guidance.label} ↗`);
  } else byId("guideLink").removeAttribute("href");
  setText("guideFooter", guidance ? "Reference reviewed 27 Oct 2026. Check applicability and amendments for your premises. This template is not a certified prescribed form." :
    "This template does not certify compliance with state-specific requirements.");
}

function validateText(input, label) {
  input.setCustomValidity(input.value && !input.value.trim() ? `Enter ${label.toLowerCase()}, not only spaces.` : "");
}

function applyValidationRules() {
  for (const id of ["tenant", "landlord", "address", "number"]) validateText(byId(id), fieldNames[id]);
  byId("to").setCustomValidity(!isBatch() && byId("from").value && byId("to").value && byId("to").value < byId("from").value ?
    "The rent end date must be on or after the start date." : "");
  if (!isBatch()) return;
  const numbers = new Map();
  for (const payment of selectedPayments()) {
    const input = byId(`payment-${payment.key}-number`);
    validateText(input, `${monthLabel(payment.key)} receipt number`);
    const key = input.value.trim().toUpperCase();
    if (!key) continue;
    if (numbers.has(key)) {
      const message = "Each selected month must have a unique receipt number.";
      input.setCustomValidity(message);
      numbers.get(key).setCustomValidity(message);
    } else numbers.set(key, input);
  }
}

function fieldIssue(input) {
  const label = input.dataset.fieldLabel || fieldNames[input.id] || "this field";
  if (input.dataset.paymentField === "confirmed") return `Review and confirm the ${monthLabel(input.closest(".payment-card").dataset.payment)} payment.`;
  if (input.id === "pan" && input.validity.valueMissing) return "Enter landlord PAN, or uncheck “Include landlord PAN” to omit it.";
  if (input.id === "pan") return panFormatError(input.value) || "Check the landlord PAN character pattern.";
  if (input.validity.valueMissing) return `Enter ${label.toLowerCase()}.`;
  if (input.validity.customError) return input.validationMessage;
  if (input.validity.rangeUnderflow && input.type === "number") return `Enter ${label.toLowerCase()} within the allowed range.`;
  if (input.validity.rangeOverflow) return `Check the maximum allowed ${label.toLowerCase()}.`;
  if (input.validity.stepMismatch) return input.id === "batchYear" ? "Enter a whole financial-year start year." : `${label} can have no more than two decimal places.`;
  return `Check ${label.toLowerCase()}.`;
}

function validationIssues() {
  const issues = Array.from(form.elements)
    .filter((input) => input.willValidate && !input.validity.valid)
    .map((input) => ({ input, message: fieldIssue(input) }));
  if (isBatch() && state.selectedMonths.size === 0) issues.push({ input: byId("monthChoices"), message: "Choose at least one rent month." });
  return issues;
}

function focusField(input) {
  // A required field may live inside nested, collapsed payment cards.
  let parent = input.parentElement;
  while (parent) {
    if (parent.tagName === "DETAILS") parent.open = true;
    parent = parent.parentElement;
  }
  input.focus({ preventScroll: true });
  input.scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateReadiness() {
  const issues = validationIssues();
  const ready = issues.length === 0;
  document.body.classList.toggle("receipt-incomplete", !ready);
  setText("receiptState", ready ? "A4 · READY TO PRINT" : "DRAFT · DETAILS NEEDED");
  byId("draftBadge").hidden = ready;
  const optedOut = panAssessment().annual > 100000 && !byId("includePan").checked;
  setText("completionStatus", ready ? `Ready to print${isBatch() ? ` ${state.selectedMonths.size} receipts` : ""}. ${optedOut ? "PAN excluded by your choice. " : ""}Check the details and have the recipient sign.` :
    `${issues.length} item${issues.length === 1 ? " needs" : "s need"} attention before printing or saving a PDF.`);
  byId("completionStatus").classList.toggle("is-ready", ready);
  byId("validationSummary").hidden = !state.validationAttempted || ready;
  byId("validationList").replaceChildren();
  for (const input of Array.from(form.elements)) if (input.id) input.removeAttribute("aria-invalid");
  byId("monthChoices").removeAttribute("aria-invalid");
  if (state.validationAttempted) for (const issue of issues) {
    issue.input.setAttribute("aria-invalid", "true");
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${issue.input.id}`;
    link.textContent = issue.message;
    link.addEventListener("click", (event) => { event.preventDefault(); focusField(issue.input); });
    item.append(link);
    byId("validationList").append(item);
  }
  return ready;
}

function fillReceipt(article, shared, payment, draft = false) {
  const values = {
    tenant: shared.tenant || "Tenant name", landlord: shared.landlord || "Landlord name",
    address: shared.address || "Your rental property address", state: shared.state,
    number: payment.number || "Receipt number", paid: formatDate(payment.paid, "Payment date pending"),
    period: `${formatDate(payment.from)} — ${formatDate(payment.to)}`,
    amount: formatMoney(payment.amount), words: amountInWords(payment.amount), method: payment.method,
    pan: shared.pan ? `PAN: ${shared.pan}` : "",
    reference: payment.method !== "Cash" && payment.reference ? `Payment reference: ${payment.reference}` : "",
    notes: [shared.notes, payment.note].filter(Boolean).join("\n"),
  };
  for (const [key, value] of Object.entries(values)) article.querySelector(`[data-receipt-field="${key}"]`).textContent = value;
  article.querySelector('[data-receipt-field="stamp"]').hidden = !shared.stamp;
  article.querySelector('[data-receipt-field="draft"]').hidden = !draft;
}

function renderPreview() {
  const payments = selectedPayments();
  const keys = payments.map((payment) => payment.key);
  if (!keys.includes(state.previewMonth)) state.previewMonth = keys[0] || "";
  byId("previewPicker").hidden = !isBatch() || !payments.length;
  byId("previewMonth").replaceChildren(...payments.map((payment) => new Option(monthLabel(payment.key), payment.key)));
  byId("previewMonth").value = state.previewMonth;
  const payment = isBatch() ? state.payments.get(state.previewMonth) || {
    number: byId("number").value, amount: byId("amount").value, method: byId("method").value,
    from: "", to: "", paid: "", reference: "", note: "",
  } : singlePayment();
  fillReceipt(byId("receipt"), sharedDetails(), payment, document.body.classList.contains("receipt-incomplete"));
  for (const card of byId("paymentRows").querySelectorAll(".payment-card")) updatePaymentCard(card, state.payments.get(card.dataset.payment));
}

function render() {
  synchroniseMode();
  renderStateGuidance();
  renderPan();
  applyValidationRules();
  const ready = updateReadiness();
  renderPreview();
  const payments = selectedPayments();
  const reviewed = payments.filter((payment) => payment.confirmed).length;
  const total = payments.reduce((sum, payment) => sum + (toCents(payment.amount) || 0), 0) / 100;
  setText("selectionCount", `${payments.length} selected`);
  byId("batchEmpty").hidden = payments.length !== 0;
  setText("batchSummary", `${reviewed} of ${payments.length} payments reviewed · Total ${formatMoney(total)}`);
  setText("downloadLabel", isBatch() ? `Print / Save ${payments.length || "selected"} receipts as PDF` : "Print / Save PDF");
  setText("suggestedFilename", pdfFilename(activeReceipts()));
  byId("stampReminder").hidden = !byId("stamp").checked;
  // Remove stale print copies after every edit; beforeprint rebuilds from current data.
  byId("printReceipts").replaceChildren();
  return ready;
}

function rebuildPrintReceipts() {
  const shared = sharedDetails();
  const copies = activeReceipts().map((payment) => {
    const copy = byId("receipt").cloneNode(true);
    copy.classList.add("print-receipt");
    copy.removeAttribute("tabindex");
    // Clones use data bindings, not duplicate IDs from the on-screen preview.
    for (const element of [copy, ...copy.querySelectorAll("[id]")]) element.removeAttribute("id");
    fillReceipt(copy, shared, payment, false);
    return copy;
  });
  byId("printReceipts").replaceChildren(...copies);
}

function preparePrint() {
  if (!render()) {
    document.title = originalPageTitle;
    state.printTitleActive = false;
    return false;
  }
  rebuildPrintReceipts();
  // Browsers normally use the document title as the suggested Save-as-PDF name.
  document.title = pdfFilename(activeReceipts()).replace(/\.pdf$/, "");
  state.printTitleActive = true;
  return true;
}

function handlePaymentInput(input) {
  const card = input.closest(".payment-card");
  const payment = state.payments.get(card.dataset.payment);
  const field = input.dataset.paymentField;
  if (field === "confirmed") payment.confirmed = input.checked;
  else {
    payment[field] = input.value;
    payment.confirmed = false;
    if (field === "number") payment.customNumber = true;
  }
  state.previewMonth = payment.key;
  updatePaymentCard(card, payment);
}

form.addEventListener("input", (event) => {
  const input = event.target;
  setText("status", "");
  if (input.name === "receiptMode") {
    state.mode = input.value;
    // A single-receipt number may have changed while batch mode was hidden.
    if (isBatch()) refreshAutomaticNumbers();
  }
  else if (input.dataset.month) {
    const key = input.dataset.month;
    if (input.checked) {
      state.selectedMonths.add(key);
      if (!state.payments.has(key)) state.payments.set(key, createPayment(key));
    } else state.selectedMonths.delete(key);
    refreshAutomaticNumbers();
    renderPaymentRows();
  } else if (input.dataset.paymentField) handlePaymentInput(input);
  else if (input.id === "includePan") state.panPreference = input.checked ? "include" : "exclude";
  else if (input.id === "number") refreshAutomaticNumbers();
  else if (input.id === "previewMonth") state.previewMonth = input.value;
  else if (input.id === "batchYear" && input.validity.valid && Number.isInteger(Number(input.value)) && Number(input.value) !== state.financialYear) {
    state.financialYear = Number(input.value);
    state.selectedMonths.clear();
    state.previewMonth = "";
    renderMonthChoices();
    renderPaymentRows();
    setText("status", "Financial year changed. Choose the months to include.");
  }
  render();
});

byId("selectAllMonths").addEventListener("click", () => {
  if (!byId("batchYear").validity.valid) return focusField(byId("batchYear"));
  for (const key of financialYearMonths(state.financialYear)) {
    state.selectedMonths.add(key);
    if (!state.payments.has(key)) state.payments.set(key, createPayment(key));
  }
  refreshAutomaticNumbers();
  renderMonthChoices();
  renderPaymentRows();
  render();
});

byId("clearMonths").addEventListener("click", () => {
  state.selectedMonths.clear();
  state.previewMonth = "";
  renderMonthChoices();
  renderPaymentRows();
  render();
});

byId("applyDefaults").addEventListener("click", () => {
  if (toCents(byId("amount").value) === null) {
    setText("status", "Enter a valid default monthly amount first.");
    return focusField(byId("amount"));
  }
  for (const payment of selectedPayments()) {
    if (payment.method !== byId("method").value) payment.reference = "";
    payment.amount = byId("amount").value;
    payment.method = byId("method").value;
    payment.confirmed = false;
  }
  renderPaymentRows();
  render();
  setText("status", "Defaults applied. Review and confirm each selected payment again.");
});

byId("previewMonth").addEventListener("change", () => {
  state.previewMonth = byId("previewMonth").value;
  renderPreview();
});

byId("resetPan").addEventListener("click", () => { state.panPreference = "auto"; render(); });
byId("previewButton").addEventListener("click", (event) => { event.preventDefault(); focusField(byId("receipt")); });
byId("next").addEventListener("click", () => {
  if (!parseDate(byId("from").value) || !parseDate(byId("to").value)) {
    setText("status", "Enter the current rent period first.");
    return;
  }
  byId("from").value = advanceMonth(byId("from").value);
  byId("to").value = advanceMonth(byId("to").value);
  byId("paid").value = "";
  byId("reference").value = "";
  byId("number").value = receiptNumberAt(byId("number").value, 1);
  render();
  setText("status", "Period advanced. Enter the actual payment date and reference after receiving rent.");
});

byId("sample").addEventListener("click", () => {
  const values = {
    state: "Karnataka", tenant: "Aarav Sharma", landlord: "Meera Rao",
    address: "Flat 204, Greenview Apartments\nIndiranagar, Bengaluru — 560038",
    amount: "18000", method: "UPI", reference: "EXAMPLE-TRANSACTION",
    notes: "Illustrative example — replace with actual payment details.", pan: "", annual: "",
  };
  for (const [id, value] of Object.entries(values)) byId(id).value = value;
  state.panPreference = "auto";
  state.selectedMonths.clear();
  state.payments.clear();
  state.previewMonth = "";
  renderMonthChoices();
  renderPaymentRows();
  render();
  setText("status", "Example shared details loaded. Use actual payment details and review every selected month before printing.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.validationAttempted = true;
  if (!preparePrint()) {
    setText("status", "Complete the highlighted details and review every selected payment before printing.");
    focusField(validationIssues()[0].input);
    return;
  }
  setText("status", "");
  window.print();
});

// The same guard applies to Ctrl/Cmd+P: incomplete data prints only a notice.
window.addEventListener("beforeprint", preparePrint);
window.addEventListener("afterprint", () => {
  if (state.printTitleActive) document.title = originalPageTitle;
  state.printTitleActive = false;
});

initialiseStatePicker();
initialiseDates();
renderMonthChoices();
render();
