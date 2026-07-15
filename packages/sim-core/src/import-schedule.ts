import type { DailyReceipt } from "@railway/shared";

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "");

const parseNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

export const parseReceiptRows = (rows: Array<Record<string, unknown>>): DailyReceipt[] => {
  const out: DailyReceipt[] = [];
  for (const row of rows) {
    const map: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) map[normalizeHeader(k)] = v;
    const day = parseNumber(map.day ?? map.daynumber ?? map.d);
    const units = parseNumber(map.unitsreceived ?? map.units ?? map.received ?? map.quantity ?? map.qty);
    if (day === null || units === null) continue;
    out.push({ day: Math.floor(day), unitsReceived: Math.max(0, Math.floor(units)) });
  }
  out.sort((a, b) => a.day - b.day);
  return out;
};

export const parseCsvReceipts = (text: string): DailyReceipt[] => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => normalizeHeader(h.replace(/^"|"$/g, "")));
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx];
    });
    rows.push(row);
  }
  return parseReceiptRows(rows);
};
