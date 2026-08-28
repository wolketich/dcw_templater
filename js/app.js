const fieldIds = ["letterDate", "completionDate", "homeowner", "address", "signoffName", "signoffRole"];
let isDocumentEditing = false;
let selectedWorkTemplateId = "";

function findIn(root, selector) {
  return root.querySelector(selector);
}

function restoreDocumentDefaults(root = document) {
  findIn(root, "#documentTitle").textContent = DEFAULTS.documentTitle;
  findIn(root, "#logoPreview").src = DEFAULTS.logoPath;
  findIn(root, "#worksIntro").textContent = DEFAULTS.text.worksIntro;
  findIn(root, "#qualityParagraph").textContent = DEFAULTS.text.qualityParagraph;
  findIn(root, "#aftercareParagraph").textContent = DEFAULTS.text.aftercareParagraph;
  findIn(root, "#thankYouParagraph").textContent = DEFAULTS.text.thankYouParagraph;
  findIn(root, "#warmRegards").textContent = DEFAULTS.text.warmRegards;

  findIn(root, "#companyDetails").innerHTML = `
    <strong>${escapeHtml(DEFAULTS.company.name)}</strong><br />
    ${escapeHtml(DEFAULTS.company.address)}<br />
    ${escapeHtml(DEFAULTS.company.phone)}<br />
    <a href="mailto:${escapeHtml(DEFAULTS.company.email)}">${escapeHtml(DEFAULTS.company.email)}</a>
  `;
}

function initTemplateDefaults() {
  document.getElementById("appTitle").textContent = DEFAULTS.app.title;
  document.getElementById("appDescription").textContent = DEFAULTS.app.description;
  restoreDocumentDefaults();
  document.getElementById("homeowner").placeholder = DEFAULTS.placeholders.homeowner;
  document.getElementById("address").placeholder = "Apartment 1, Example Road, Dublin 12, D12 XXXX";

  const signatureSelect = document.getElementById("signatureSelect");
  signatureSelect.innerHTML = "";
  DEFAULTS.signatures.forEach((signature, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = signature.label;
    signatureSelect.appendChild(option);
  });
  renderWorkChoices();
}

function renderWorkChoices() {
  const grid = document.getElementById("workChoiceGrid");
  grid.innerHTML = "";
  const icons = { casement: "▥", "residential-door": "▯", "patio-door": "▤", composite: "◇", "tilt-turn": "◩", custom: "+" };

  DEFAULTS.workTemplates.forEach(template => {
    const button = document.createElement("button");
    button.className = "work-choice";
    button.type = "button";
    button.dataset.templateId = template.id;
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `
      <span class="work-choice-icon" aria-hidden="true">${icons[template.id] || "+"}</span>
      <span class="work-choice-copy"><small>${escapeHtml(template.group)}</small><strong>${escapeHtml(template.label)}</strong></span>
    `;
    button.addEventListener("click", () => selectWorkTemplate(template.id));
    grid.appendChild(button);
  });
}

function getSelectedSignature() {
  const index = Number(document.getElementById("signatureSelect").value || 0);
  return DEFAULTS.signatures[index] || DEFAULTS.signatures[0];
}

function getSignatureModel() {
  return {
    ...getSelectedSignature(),
    name: document.getElementById("signoffName").value.trim(),
    role: document.getElementById("signoffRole").value.trim(),
    hidden: document.getElementById("hideSignature").checked
  };
}

function collectWorkItems() {
  return [...document.querySelectorAll(".work-row")]
    .map(row => ({
      description: row.querySelector(".work-input").value.trim(),
      quantity: normaliseQuantity(row.querySelector(".quantity-input").value)
    }))
    .filter(work => work.description);
}

function buildManualDocumentModel() {
  return {
    letterDate: document.getElementById("letterDate").value,
    completionDate: document.getElementById("completionDate").value,
    homeowner: document.getElementById("homeowner").value.trim() || DEFAULTS.placeholders.homeowner,
    address: document.getElementById("address").value.trim() || DEFAULTS.placeholders.address,
    works: collectWorkItems(),
    signature: getSignatureModel()
  };
}

function renderDocument(root, model) {
  const firstAddressLine = model.address.split("\n")[0] || DEFAULTS.placeholders.subjectAddress;
  const signature = model.signature || {};
  findIn(root, "#outLetterDate").textContent = formatShortDate(model.letterDate);
  findIn(root, "#outSignatureDate").textContent = formatShortDate(model.letterDate);
  findIn(root, "#outHomeowner").textContent = model.homeowner;
  findIn(root, "#outAddress").innerHTML = escapeHtml(model.address).replaceAll("\n", "<br>");
  findIn(root, "#outSubjectAddress").textContent = firstAddressLine;
  findIn(root, "#outBodyAddress").textContent = firstAddressLine;
  findIn(root, "#outCompletionDate").innerHTML = formatLongDate(model.completionDate);
  findIn(root, "#outSignoffName").textContent = signature.path ? signature.name : "";
  findIn(root, "#outSignoffRole").textContent = signature.path ? signature.role : "";

  const signatureImg = findIn(root, "#signaturePreview");
  if (!signature.path) {
    signatureImg.removeAttribute("src");
    signatureImg.style.display = "none";
  } else {
    signatureImg.src = signature.path;
    signatureImg.style.display = signature.hidden ? "none" : "block";
  }

  const list = findIn(root, "#outWorksList");
  list.innerHTML = "";
  model.works.forEach(work => {
    const li = document.createElement("li");
    li.textContent = `${work.quantity} × ${work.description}`;
    list.appendChild(li);
  });
}

function createDocumentPage(model) {
  const page = document.getElementById("letterPage").cloneNode(true);
  page.querySelectorAll("[contenteditable]").forEach(element => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
  });
  restoreDocumentDefaults(page);
  renderDocument(page, model);
  return page;
}

function updateLetter() {
  renderDocument(document, buildManualDocumentModel());
  updateWorksState();
}

function normaliseQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function updateWorksState() {
  const count = collectWorkItems().length;
  document.getElementById("worksCount").textContent = `${count} ${pluralise(count, "item")}`;
  document.getElementById("worksEmpty").hidden = count > 0;
  if (count > 0) document.getElementById("worksError").hidden = true;
}

function addWorkItem(value = "", quantity = 1) {
  const container = document.getElementById("worksContainer");
  const row = document.createElement("div");
  row.className = "work-row";
  row.innerHTML = `
    <input class="work-input" type="text" placeholder="${escapeHtml(DEFAULTS.placeholders.workItem)}" value="${escapeHtml(value)}" aria-label="Completed work description" />
    <span class="quantity-caption">Quantity</span>
    <div class="quantity-stepper" role="group" aria-label="Item quantity">
      <button class="quantity-btn quantity-minus" type="button" aria-label="Decrease quantity">−</button>
      <input class="quantity-input" type="number" min="1" step="1" value="${normaliseQuantity(quantity)}" aria-label="Quantity" inputmode="numeric" />
      <button class="quantity-btn quantity-plus" type="button" aria-label="Increase quantity">+</button>
    </div>
    <button class="small-btn danger remove-work-btn" type="button" title="Remove" aria-label="Remove completed work">×</button>
  `;

  container.appendChild(row);
  const workInput = row.querySelector(".work-input");
  const quantityInput = row.querySelector(".quantity-input");
  workInput.addEventListener("input", updateLetter);
  quantityInput.addEventListener("input", updateLetter);
  quantityInput.addEventListener("blur", () => {
    quantityInput.value = normaliseQuantity(quantityInput.value);
    updateLetter();
  });
  row.querySelector(".quantity-minus").addEventListener("click", () => {
    quantityInput.value = Math.max(1, normaliseQuantity(quantityInput.value) - 1);
    updateLetter();
  });
  row.querySelector(".quantity-plus").addEventListener("click", () => {
    quantityInput.value = normaliseQuantity(quantityInput.value) + 1;
    updateLetter();
  });
  row.querySelector(".remove-work-btn").addEventListener("click", () => {
    row.remove();
    updateLetter();
  });
  updateLetter();
}

function openWorkDialog() {
  selectedWorkTemplateId = "";
  document.querySelectorAll(".work-choice").forEach(button => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  });
  document.getElementById("workConfig").hidden = true;
  document.getElementById("compositeConfig").hidden = true;
  document.getElementById("customConfig").hidden = true;
  document.getElementById("customWorkText").value = "";
  document.getElementById("customPrefix").checked = true;
  document.getElementById("customWorkError").hidden = true;
  document.getElementById("modalQuantity").value = "1";
  document.getElementById("hasToplight").checked = false;
  document.querySelector('input[name="sidelights"][value="0"]').checked = true;
  document.getElementById("confirmWorkBtn").disabled = true;
  const dialog = document.getElementById("workDialog");
  dialog.showModal();
  requestAnimationFrame(() => document.querySelector(".work-choice")?.focus());
}

function selectWorkTemplate(templateId) {
  selectedWorkTemplateId = templateId;
  const template = DEFAULTS.workTemplates.find(item => item.id === templateId);
  document.querySelectorAll(".work-choice").forEach(button => {
    const selected = button.dataset.templateId === templateId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.getElementById("workConfig").hidden = false;
  document.getElementById("selectedWorkLabel").textContent = template.label;
  document.getElementById("compositeConfig").hidden = templateId !== "composite";
  document.getElementById("customConfig").hidden = templateId !== "custom";
  document.getElementById("confirmWorkBtn").disabled = templateId === "custom" && !document.getElementById("customWorkText").value.trim();
  if (templateId === "custom") requestAnimationFrame(() => document.getElementById("customWorkText").focus());
}

function getConfiguredWorkDescription() {
  const template = DEFAULTS.workTemplates.find(item => item.id === selectedWorkTemplateId);
  if (!template) return "";
  if (template.id === "custom") {
    const customText = document.getElementById("customWorkText").value.trim();
    if (!customText) return "";
    const hasPrefix = /^supply\s*&\s*installation\s+of\b/i.test(customText);
    return document.getElementById("customPrefix").checked && !hasPrefix ? `Supply & installation of ${customText}` : customText;
  }
  if (template.id !== "composite") return template.description;

  const sidelights = Number(document.querySelector('input[name="sidelights"]:checked').value);
  const hasToplight = document.getElementById("hasToplight").checked;
  let description = template.description;
  if (sidelights === 1) description += " with 1 Sidelight";
  if (sidelights === 2) description += " with 2 Sidelights";
  if (hasToplight) description += sidelights ? " and Toplight" : " with Toplight";
  return description;
}

function confirmWorkSelection() {
  const description = getConfiguredWorkDescription();
  if (!description) {
    document.getElementById("customWorkError").hidden = false;
    document.getElementById("customWorkText").focus();
    return;
  }
  addWorkItem(description, normaliseQuantity(document.getElementById("modalQuantity").value));
  document.getElementById("workDialog").close();
}

function setDocumentEditing(enabled) {
  isDocumentEditing = enabled;
  document.querySelectorAll("[data-document-editable]").forEach(element => {
    if (enabled) {
      element.setAttribute("contenteditable", "true");
      element.setAttribute("spellcheck", "true");
    } else {
      element.removeAttribute("contenteditable");
      element.removeAttribute("spellcheck");
    }
  });
  const button = document.getElementById("editDocumentBtn");
  button.setAttribute("aria-pressed", String(enabled));
  button.textContent = enabled ? "Finish editing document" : "Edit document text";
}

function updateSignatureSelect() {
  const signature = getSelectedSignature();
  document.getElementById("signoffName").value = signature.name;
  document.getElementById("signoffRole").value = signature.role;
  updateLetter();
}

function createPdf() {
  if (!collectWorkItems().length) {
    document.getElementById("worksError").hidden = false;
    openWorkDialog();
    return;
  }
  setTimeout(() => window.print(), 100);
}

function resetForm() {
  setDocumentEditing(false);
  restoreDocumentDefaults();
  document.getElementById("letterDate").value = todayIso();
  document.getElementById("completionDate").value = todayIso();
  document.getElementById("homeowner").value = "";
  document.getElementById("address").value = "";
  document.getElementById("worksContainer").innerHTML = "";
  document.getElementById("worksError").hidden = true;
  document.getElementById("hideSignature").checked = false;
  document.getElementById("signatureSelect").value = "1";
  updateSignatureSelect();
  updateLetter();
}

function adjustModalQuantity(amount) {
  const input = document.getElementById("modalQuantity");
  input.value = Math.max(1, normaliseQuantity(input.value) + amount);
}

function closeDialogById(dialogId) {
  const dialog = document.getElementById(dialogId);
  if (dialog.open) dialog.close();
}

function bindEvents() {
  fieldIds.forEach(id => document.getElementById(id).addEventListener("input", updateLetter));
  document.getElementById("signatureSelect").addEventListener("change", updateSignatureSelect);
  document.getElementById("hideSignature").addEventListener("change", updateLetter);
  document.getElementById("addWorkBtn").addEventListener("click", openWorkDialog);
  document.getElementById("confirmWorkBtn").addEventListener("click", confirmWorkSelection);
  document.getElementById("customWorkText").addEventListener("input", event => {
    document.getElementById("customWorkError").hidden = true;
    document.getElementById("confirmWorkBtn").disabled = !event.target.value.trim();
  });
  document.getElementById("modalQtyMinus").addEventListener("click", () => adjustModalQuantity(-1));
  document.getElementById("modalQtyPlus").addEventListener("click", () => adjustModalQuantity(1));
  document.getElementById("modalQuantity").addEventListener("blur", event => { event.target.value = normaliseQuantity(event.target.value); });
  document.getElementById("createPdfBtn").addEventListener("click", createPdf);
  document.getElementById("bulkCreateBtn").addEventListener("click", openBulkDialog);
  document.getElementById("resetBtn").addEventListener("click", resetForm);
  document.getElementById("editDocumentBtn").addEventListener("click", () => setDocumentEditing(!isDocumentEditing));

  document.querySelectorAll("[data-close-dialog]").forEach(button => {
    button.addEventListener("click", () => closeDialogById(button.dataset.closeDialog));
  });
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog && !dialog.classList.contains("is-busy")) dialog.close();
    });
  });
  bindBulkEvents();
}

function startApp() {
  initTemplateDefaults();
  bindEvents();
  resetForm();
}

startApp();
