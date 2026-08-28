function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatShortDate(value) {
  if (!value) return DEFAULTS.placeholders.shortDate;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function ordinalHtml(day) {
  const n = Number(day);
  if ([11, 12, 13].includes(n % 100)) return `${n}<sup>th</sup>`;
  const last = n % 10;
  if (last === 1) return `${n}<sup>st</sup>`;
  if (last === 2) return `${n}<sup>nd</sup>`;
  if (last === 3) return `${n}<sup>rd</sup>`;
  return `${n}<sup>th</sup>`;
}

function formatLongDate(value) {
  if (!value) return DEFAULTS.placeholders.longDate;
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const monthName = date.toLocaleString("en-IE", { month: "long" });
  return `${monthName} ${ordinalHtml(day)}, ${year}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateToIso(value) {
  const input = String(value || "").trim();
  if (!input) return "";

  let year;
  let month;
  let day;

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    [year, month, day] = input.split("-").map(Number);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) {
    [day, month, year] = input.split("/").map(Number);
  } else {
    return "";
  }

  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;

  if (!valid) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value) {
  const cleaned = String(value || "Document")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  return cleaned || "Document";
}

function pluralise(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}
