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
