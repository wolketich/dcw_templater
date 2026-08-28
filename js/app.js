const fieldIds = ["letterDate", "completionDate", "homeowner", "address", "signoffName", "signoffRole"];

function initTemplateDefaults() {
  document.getElementById("appTitle").textContent = DEFAULTS.app.title;
  document.getElementById("appDescription").textContent = DEFAULTS.app.description;
  document.getElementById("documentTitle").textContent = DEFAULTS.documentTitle;
  document.getElementById("logoPreview").src = DEFAULTS.logoPath;

  document.getElementById("homeowner").placeholder = DEFAULTS.placeholders.homeowner;
  document.getElementById("address").placeholder = "Apartment 1, Example Road, Dublin 12, D12 XXXX";

  document.getElementById("worksIntro").textContent = DEFAULTS.text.worksIntro;
  document.getElementById("qualityParagraph").textContent = DEFAULTS.text.qualityParagraph;
  document.getElementById("aftercareParagraph").textContent = DEFAULTS.text.aftercareParagraph;
  document.getElementById("thankYouParagraph").textContent = DEFAULTS.text.thankYouParagraph;
  document.getElementById("warmRegards").textContent = DEFAULTS.text.warmRegards;

  document.getElementById("companyDetails").innerHTML = `
    <strong>${escapeHtml(DEFAULTS.company.name)}</strong><br />
    ${escapeHtml(DEFAULTS.company.address)}<br />
    ${escapeHtml(DEFAULTS.company.phone)}<br />
    <a href="mailto:${escapeHtml(DEFAULTS.company.email)}">${escapeHtml(DEFAULTS.company.email)}</a>
  `;

  const signatureSelect = document.getElementById("signatureSelect");
  signatureSelect.innerHTML = "";

  DEFAULTS.signatures.forEach((signature, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = signature.label;
    signatureSelect.appendChild(option);
  });
}

function getSelectedSignature() {
  const index = Number(document.getElementById("signatureSelect").value || 0);
  return DEFAULTS.signatures[index] || DEFAULTS.signatures[0];
}

function updateLetter() {
  const letterDate = document.getElementById("letterDate").value;
  const completionDate = document.getElementById("completionDate").value;
  const homeowner = document.getElementById("homeowner").value.trim() || DEFAULTS.placeholders.homeowner;
  const address = document.getElementById("address").value.trim() || DEFAULTS.placeholders.address;
  const selectedSignature = getSelectedSignature();
  const signoffName = document.getElementById("signoffName").value.trim();
  const signoffRole = document.getElementById("signoffRole").value.trim();
  const hideSignature = document.getElementById("hideSignature").checked;
  const firstAddressLine = address.split("\n")[0] || DEFAULTS.placeholders.subjectAddress;

  document.getElementById("outLetterDate").textContent = formatShortDate(letterDate);
  document.getElementById("outSignatureDate").textContent = formatShortDate(letterDate);
  document.getElementById("outHomeowner").textContent = homeowner;
  document.getElementById("outAddress").innerHTML = escapeHtml(address).replaceAll("\n", "<br>");
  document.getElementById("outSubjectAddress").textContent = firstAddressLine;
  document.getElementById("outBodyAddress").textContent = firstAddressLine;
  document.getElementById("outCompletionDate").innerHTML = formatLongDate(completionDate);

  document.getElementById("outSignoffName").textContent = selectedSignature.path ? signoffName : "";
  document.getElementById("outSignoffRole").textContent = selectedSignature.path ? signoffRole : "";
  document.getElementById("signaturePreview").style.display = hideSignature ? "none" : "";

  const list = document.getElementById("outWorksList");
  list.innerHTML = "";

  const works = [...document.querySelectorAll(".work-input")]
    .map(input => input.value.trim())
    .filter(Boolean);

  const finalWorks = works.length ? works : DEFAULTS.defaultWorks;

  finalWorks.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function addWorkItem(value = "") {
  const container = document.getElementById("worksContainer");
  const row = document.createElement("div");
  row.className = "work-row";
  row.innerHTML = `
    <input class="work-input" type="text" placeholder="${escapeHtml(DEFAULTS.placeholders.workItem)}" value="${escapeHtml(value)}" />
    <button class="small-btn danger" type="button" title="Remove">×</button>
  `;

  container.appendChild(row);
  row.querySelector("input").addEventListener("input", updateLetter);
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    updateLetter();
  });

  updateLetter();
}

function updateSignatureSelect() {
  const signature = getSelectedSignature();
  const signatureImg = document.getElementById("signaturePreview");
  const signoffName = document.getElementById("signoffName");
  const signoffRole = document.getElementById("signoffRole");

  if (!signature.path) {
    signatureImg.removeAttribute("src");
    signatureImg.style.display = "none";
    signoffName.value = "";
    signoffRole.value = "";
  } else {
    signatureImg.src = signature.path;
    signatureImg.style.display = "block";
    signatureImg.onerror = () => {
      signatureImg.style.display = "none";
    };
    signoffName.value = signature.name;
    signoffRole.value = signature.role;
  }

  updateLetter();
}

function createPdf() {
  updateLetter();
  setTimeout(() => window.print(), 100);
}

function resetForm() {
  document.getElementById("letterDate").value = todayIso();
  document.getElementById("completionDate").value = todayIso();
  document.getElementById("homeowner").value = "";
  document.getElementById("address").value = "";
  document.getElementById("worksContainer").innerHTML = "";
  document.getElementById("hideSignature").checked = false;

  DEFAULTS.defaultWorks.forEach(item => addWorkItem(item));

  document.getElementById("signatureSelect").value = "1";
  updateSignatureSelect();
  updateLetter();
}

function bindEvents() {
  fieldIds.forEach(id => document.getElementById(id).addEventListener("input", updateLetter));
  document.getElementById("signatureSelect").addEventListener("change", updateSignatureSelect);
  document.getElementById("hideSignature").addEventListener("change", updateLetter);
  document.getElementById("addWorkBtn").addEventListener("click", () => addWorkItem());
  document.getElementById("createPdfBtn").addEventListener("click", createPdf);
  document.getElementById("resetBtn").addEventListener("click", resetForm);
}

function startApp() {
  initTemplateDefaults();
  bindEvents();
  resetForm();
}

startApp();
