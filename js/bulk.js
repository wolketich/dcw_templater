let bulkRows = [];
let bulkHeaders = [];
let bulkIsGenerating = false;
let bulkCancelRequested = false;

function getBulkTemplateHeaders() {
  const headers = [...DEFAULTS.bulk.baseHeaders];
  for (let index = 1; index <= DEFAULTS.bulk.templateItemCount; index += 1) {
    headers.push(`item${index}_name`, `item${index}_qty`);
  }
  return headers;
}

function normaliseBulkHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getItemIndexes(headers = bulkHeaders) {
  return [...new Set(headers
    .map(header => header.match(/^item(\d+)_(?:name|qty)$/))
    .filter(Boolean)
    .map(match => Number(match[1])))]
    .sort((a, b) => a - b);
}

function orderBulkHeaders(importedHeaders) {
  const normalised = [...new Set(importedHeaders.map(normaliseBulkHeader).filter(Boolean))];
  const itemIndexes = getItemIndexes(normalised);
  const indexes = itemIndexes.length ? itemIndexes : [1];
  const ordered = [...DEFAULTS.bulk.baseHeaders];
  indexes.forEach(index => ordered.push(`item${index}_name`, `item${index}_qty`));
  return ordered;
}

function emptyBulkRow(headers = bulkHeaders) {
  return Object.fromEntries(headers.map(header => [header, ""]));
}

function bulkHeaderLabel(header) {
  const labels = {
    letter_date: "Letter date",
    completion_date: "Completion date",
    homeowner: "Homeowner",
    address: "Property address"
  };
  if (labels[header]) return labels[header];
  const item = header.match(/^item(\d+)_(name|qty)$/);
  if (!item) return header;
  return `Item ${item[1]} ${item[2] === "qty" ? "quantity" : "name"}`;
}

function setBulkMessage(message, type = "neutral") {
  const element = document.getElementById("bulkMessage");
  element.textContent = message;
  element.dataset.type = type;
}

function parseBulkText(text) {
  if (!String(text || "").trim()) throw new Error("Paste or upload some rows first.");
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normaliseBulkHeader
  });

  const seriousErrors = parsed.errors.filter(error => error.code !== "UndetectableDelimiter");
  if (seriousErrors.length) {
    throw new Error(`Could not read the data: ${seriousErrors[0].message}`);
  }
  if (!parsed.meta.fields?.length) throw new Error("The first row must contain column headings.");
  if (!parsed.data.length) throw new Error("No document rows were found beneath the header row.");
  if (parsed.data.length > DEFAULTS.bulk.maxRows) {
    throw new Error(`A bulk run can contain up to ${DEFAULTS.bulk.maxRows} documents.`);
  }

  const headers = orderBulkHeaders(parsed.meta.fields);
  const rows = parsed.data.map(source => {
    const row = emptyBulkRow(headers);
    headers.forEach(header => { row[header] = String(source[header] ?? "").trim(); });
    return row;
  });
  return { headers, rows };
}

function loadBulkText(text, sourceLabel) {
  try {
    const parsed = parseBulkText(text);
    bulkHeaders = parsed.headers;
    bulkRows = parsed.rows;
    renderBulkTable();
    document.getElementById("pastePanel").hidden = true;
    setBulkMessage(`${bulkRows.length} ${pluralise(bulkRows.length, "row")} imported from ${sourceLabel}.`, "success");
    validateAndDisplayBulkRows();
  } catch (error) {
    document.getElementById("bulkReview").hidden = false;
    document.getElementById("bulkEmpty").hidden = true;
    setBulkMessage(error.message, "error");
  }
}

function renderBulkTable() {
  const table = document.getElementById("bulkTable");
  table.innerHTML = "";
  document.getElementById("bulkEmpty").hidden = bulkRows.length > 0;
  document.getElementById("bulkReview").hidden = !bulkRows.length;

  if (!bulkRows.length) {
    updateBulkActionState(false);
    return;
  }

  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const rowNumberHead = document.createElement("th");
  rowNumberHead.textContent = "#";
  headRow.appendChild(rowNumberHead);
  bulkHeaders.forEach(header => {
    const th = document.createElement("th");
    th.textContent = bulkHeaderLabel(header);
    headRow.appendChild(th);
  });
  const actionHead = document.createElement("th");
  actionHead.textContent = "";
  headRow.appendChild(actionHead);
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  bulkRows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    const rowNumber = document.createElement("th");
    rowNumber.scope = "row";
    rowNumber.textContent = String(rowIndex + 1);
    tr.appendChild(rowNumber);

    bulkHeaders.forEach((header, columnIndex) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.className = "bulk-cell";
      input.type = "text";
      input.value = row[header] || "";
      input.dataset.row = String(rowIndex);
      input.dataset.column = String(columnIndex);
      input.dataset.field = header;
      input.setAttribute("aria-label", `Row ${rowIndex + 1}, ${bulkHeaderLabel(header)}`);
      input.addEventListener("input", event => {
        bulkRows[rowIndex][header] = event.target.value;
        validateAndDisplayBulkRows();
      });
      input.addEventListener("paste", handleBulkGridPaste);
      td.appendChild(input);
      tr.appendChild(td);
    });

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "table-remove-btn";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove row ${rowIndex + 1}`);
    removeButton.addEventListener("click", () => {
      bulkRows.splice(rowIndex, 1);
      renderBulkTable();
      validateAndDisplayBulkRows();
    });
    actionCell.appendChild(removeButton);
    tr.appendChild(actionCell);
    body.appendChild(tr);
  });
  table.appendChild(body);
  document.getElementById("bulkRowCount").textContent = `${bulkRows.length} ${pluralise(bulkRows.length, "document")}`;
}

function handleBulkGridPaste(event) {
  const pasted = event.clipboardData?.getData("text") || "";
  if (!/[\t\n\r]/.test(pasted)) return;
  event.preventDefault();

  const matrix = Papa.parse(pasted, { delimiter: "\t", skipEmptyLines: false }).data;
  const startRow = Number(event.target.dataset.row);
  const startColumn = Number(event.target.dataset.column);

  matrix.forEach((cells, rowOffset) => {
    const targetRow = startRow + rowOffset;
    if (targetRow >= DEFAULTS.bulk.maxRows) return;
    while (bulkRows.length <= targetRow) bulkRows.push(emptyBulkRow());
    cells.forEach((value, columnOffset) => {
      const field = bulkHeaders[startColumn + columnOffset];
      if (field) bulkRows[targetRow][field] = String(value ?? "").trim();
    });
  });
  renderBulkTable();
  validateAndDisplayBulkRows();
}

function validateBulkRows() {
  const errors = [];
  const models = [];
  const itemIndexes = getItemIndexes();

  bulkRows.forEach((row, rowIndex) => {
    const homeowner = String(row.homeowner || "").trim();
    const address = String(row.address || "").trim();
    const rawLetterDate = String(row.letter_date || "").trim();
    const rawCompletionDate = String(row.completion_date || "").trim();
    const letterDate = rawLetterDate ? parseDateToIso(rawLetterDate) : todayIso();
    const completionDate = parseDateToIso(rawCompletionDate);
    const works = [];

    if (!homeowner) errors.push({ row: rowIndex, field: "homeowner", message: "Homeowner is required." });
    if (!address) errors.push({ row: rowIndex, field: "address", message: "Property address is required." });
    if (rawLetterDate && !letterDate) errors.push({ row: rowIndex, field: "letter_date", message: "Use YYYY-MM-DD or DD/MM/YYYY." });
    if (!rawCompletionDate) {
      errors.push({ row: rowIndex, field: "completion_date", message: "Completion date is required." });
    } else if (!completionDate) {
      errors.push({ row: rowIndex, field: "completion_date", message: "Use YYYY-MM-DD or DD/MM/YYYY." });
    }

    itemIndexes.forEach(index => {
      const nameField = `item${index}_name`;
      const qtyField = `item${index}_qty`;
      const description = String(row[nameField] || "").trim();
      const rawQuantity = String(row[qtyField] || "").trim();

      if (!description && rawQuantity) {
        errors.push({ row: rowIndex, field: nameField, message: "Add an item name or remove its quantity." });
        return;
      }
      if (!description) return;

      const quantity = rawQuantity ? Number(rawQuantity) : 1;
      if (!Number.isInteger(quantity) || quantity < 1) {
        errors.push({ row: rowIndex, field: qtyField, message: "Quantity must be a whole number of 1 or more." });
        return;
      }
      works.push({ description, quantity });
    });

    if (!works.length) {
      errors.push({ row: rowIndex, field: itemIndexes.length ? `item${itemIndexes[0]}_name` : "homeowner", message: "Add at least one completed work." });
    }
    models.push({ letterDate, completionDate, homeowner, address, works });
  });
  return { errors, models };
}

function validateAndDisplayBulkRows() {
  document.querySelectorAll(".bulk-cell.is-invalid").forEach(input => {
    input.classList.remove("is-invalid");
    input.removeAttribute("title");
    input.removeAttribute("aria-invalid");
  });

  if (!bulkRows.length) {
    updateBulkActionState(false);
    return { errors: [], models: [] };
  }

  const result = validateBulkRows();
  result.errors.forEach(error => {
    const input = document.querySelector(`.bulk-cell[data-row="${error.row}"][data-field="${error.field}"]`);
    if (!input) return;
    input.classList.add("is-invalid");
    input.title = error.message;
    input.setAttribute("aria-invalid", "true");
  });

  if (result.errors.length) {
    setBulkMessage(`${result.errors.length} ${pluralise(result.errors.length, "issue")} to fix before creation. Hover or focus highlighted cells for details.`, "error");
  } else {
    setBulkMessage(`${bulkRows.length} ${pluralise(bulkRows.length, "document")} ready to create.`, "success");
  }
  updateBulkActionState(!result.errors.length);
  return result;
}

function updateBulkActionState(valid) {
  document.getElementById("openReviewTabsBtn").disabled = !valid || bulkIsGenerating;
  document.getElementById("generateZipBtn").disabled = !valid || bulkIsGenerating;
}

function downloadCsvTemplate() {
  const csv = Papa.unparse({ fields: getBulkTemplateHeaders(), data: [] });
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, "expert-windows-bulk-template.csv");
}

async function importBulkFile(file) {
  if (!file) return;
  const text = await file.text();
  loadBulkText(text, file.name);
}

function clearBulkRows() {
  if (bulkIsGenerating) return;
  bulkRows = [];
  bulkHeaders = [];
  document.getElementById("bulkPasteInput").value = "";
  document.getElementById("bulkFileInput").value = "";
  renderBulkTable();
  setBulkMessage("", "neutral");
}

function openBulkDialog() {
  const dialog = document.getElementById("bulkDialog");
  document.getElementById("generationProgress").hidden = true;
  dialog.showModal();
  requestAnimationFrame(() => document.getElementById("downloadCsvBtn").focus());
}

function getValidBulkModels() {
  const result = validateAndDisplayBulkRows();
  if (result.errors.length || !result.models.length) return [];
  const signature = getSignatureModel();
  return result.models.map(model => ({ ...model, signature: { ...signature } }));
}

function makePdfFilenames(models) {
  const used = new Map();
  return models.map(model => {
    const base = safeFilename(`Declaration of Completed Works - ${model.homeowner} - ${model.completionDate}`);
    const seen = (used.get(base) || 0) + 1;
    used.set(base, seen);
    return `${base}${seen > 1 ? ` (${seen})` : ""}.pdf`;
  });
}

function writeReviewTab(tab, model, filename) {
  const page = createDocumentPage(model);
  const baseUrl = new URL(".", window.location.href).href;
  const stylesheetUrl = new URL("styles.css", window.location.href).href;
  tab.document.open();
  tab.document.write(`<!DOCTYPE html>
    <html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="${escapeHtml(baseUrl)}"><title>${escapeHtml(filename.replace(/\.pdf$/i, ""))}</title>
    <link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head>
    <body class="review-tab-body"><div class="review-toolbar"><div><strong>${escapeHtml(model.homeowner)}</strong><span>Review, then print or save as PDF.</span></div>
    <button type="button" onclick="window.print()">Print / Save PDF</button></div>${page.outerHTML}</body></html>`);
  tab.document.close();
}

function openBulkReviewTabs() {
  const models = getValidBulkModels();
  if (!models.length) return;
  const filenames = makePdfFilenames(models);
  const tabs = models.map(() => window.open("about:blank", "_blank"));
  let opened = 0;

  tabs.forEach((tab, index) => {
    if (!tab) return;
    opened += 1;
    writeReviewTab(tab, models[index], filenames[index]);
  });

  if (opened === models.length) {
    setBulkMessage(`${opened} review ${pluralise(opened, "tab")} opened. Use Print / Save PDF in each tab.`, "success");
  } else {
    setBulkMessage(`${opened} of ${models.length} tabs opened. Allow pop-ups for this site, then try again.`, "error");
  }
}

function setGenerationProgress(label, percent) {
  document.getElementById("generationProgress").hidden = false;
  document.getElementById("progressLabel").textContent = label;
  document.getElementById("progressPercent").textContent = `${Math.round(percent)}%`;
  document.getElementById("progressBar").style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function setBulkGenerating(generating) {
  bulkIsGenerating = generating;
  const dialog = document.getElementById("bulkDialog");
  dialog.classList.toggle("is-busy", generating);
  dialog.querySelectorAll("button, input, textarea, label.file-button").forEach(element => {
    if (element.id === "cancelGenerationBtn") return;
    if ("disabled" in element) element.disabled = generating;
    element.classList.toggle("is-disabled", generating);
  });
  document.getElementById("cancelGenerationBtn").hidden = !generating;
  if (!generating) validateAndDisplayBulkRows();
}

function waitForDocumentImages(page) {
  return Promise.all([...page.querySelectorAll("img")].map(image => {
    if (image.complete && (image.naturalWidth || image.style.display === "none")) return Promise.resolve();
    return new Promise(resolve => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
}

class BulkCancelledError extends Error {}

async function generateBulkZip() {
  const models = getValidBulkModels();
  if (!models.length || bulkIsGenerating) return;
  if (typeof html2pdf !== "function" || typeof JSZip !== "function") {
    setBulkMessage("PDF or ZIP support did not load. Use Open review tabs instead.", "error");
    return;
  }

  bulkCancelRequested = false;
  setBulkGenerating(true);
  setGenerationProgress("Preparing documents…", 0);
  const stage = document.getElementById("batchRenderStage");
  const filenames = makePdfFilenames(models);
  const zip = new JSZip();

  try {
    for (let index = 0; index < models.length; index += 1) {
      if (bulkCancelRequested) throw new BulkCancelledError("Generation cancelled.");
      const page = createDocumentPage(models[index]);
      page.classList.add("batch-page");
      stage.replaceChildren(page);
      await waitForDocumentImages(page);
      if (document.fonts?.ready) await document.fonts.ready;

      const percent = (index / models.length) * 90;
      setGenerationProgress(`Creating ${index + 1} of ${models.length}: ${models[index].homeowner}`, percent);
      const pdfBlob = await html2pdf().set({
        margin: 0,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] }
      }).from(page).outputPdf("blob");
      zip.file(filenames[index], pdfBlob);
    }

    if (bulkCancelRequested) throw new BulkCancelledError("Generation cancelled.");
    setGenerationProgress("Packaging ZIP…", 92);
    const zipBlob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      metadata => setGenerationProgress("Packaging ZIP…", 92 + metadata.percent * 0.08)
    );
    const zipName = `expert-windows-completed-works-${todayIso()}.zip`;
    downloadBlob(zipBlob, zipName);
    setGenerationProgress(`${models.length} ${pluralise(models.length, "document")} ready`, 100);
    setBulkMessage(`${zipName} downloaded successfully.`, "success");
  } catch (error) {
    if (error instanceof BulkCancelledError) {
      setBulkMessage("ZIP creation cancelled. Your imported rows are still available.", "neutral");
    } else {
      console.error(error);
      setBulkMessage("The ZIP could not be created. Your rows are safe; use Open review tabs or try again.", "error");
    }
  } finally {
    stage.innerHTML = "";
    setBulkGenerating(false);
  }
}

function bindBulkEvents() {
  document.getElementById("downloadCsvBtn").addEventListener("click", downloadCsvTemplate);
  document.getElementById("bulkFileInput").addEventListener("change", event => importBulkFile(event.target.files[0]));
  document.getElementById("togglePasteBtn").addEventListener("click", () => {
    const panel = document.getElementById("pastePanel");
    panel.hidden = !panel.hidden;
    if (!panel.hidden) document.getElementById("bulkPasteInput").focus();
  });
  document.getElementById("importPasteBtn").addEventListener("click", () => {
    loadBulkText(document.getElementById("bulkPasteInput").value, "pasted data");
  });
  document.getElementById("clearBulkBtn").addEventListener("click", clearBulkRows);
  document.getElementById("openReviewTabsBtn").addEventListener("click", openBulkReviewTabs);
  document.getElementById("generateZipBtn").addEventListener("click", generateBulkZip);
  document.getElementById("cancelGenerationBtn").addEventListener("click", () => {
    bulkCancelRequested = true;
    setGenerationProgress("Stopping after the current document…", Number.parseFloat(document.getElementById("progressPercent").textContent) || 0);
  });
}
