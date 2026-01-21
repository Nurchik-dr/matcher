import type { MappingRow, ClassifiedRow, StatusType } from "../types";

// ================== НОРМАЛИЗАЦИЯ ==================

export const normalizeTitle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value: string): string[] =>
  normalizeTitle(value).split(" ").filter(Boolean);

// Общие слова, которые не считаем ни брендом, ни ключом смысла
const STOP_WORDS = new Set([
  "напиток",
  "кисломолочный",
  "кисломолочная",
  "питьевой",
  "молочный",
  "молочная",
  "молоко",
  "кефир",
  "сливки",
  "сыр",
  "творог",
  "масло",
  "пломбир",
  "йогурт",
  "йогурта",
  "йогуртовый",
  "малиновый",
  "малиновая",
  "клубничный",
  "ванильный",
  "соус",
  "соуса",
  "варенье",
  "джем",
  "томатный",
  "томатная",
  "улучшенный",
  "безлактозный",
  "ультрапастеризованное",
  "ультрапастеризованный",
  "пастеризованное",
  "пастеризованный",
  "neo",
]);

// ================== ОБЪЁМ / ПРОЦЕНТ ==================

export const extractVolume = (str: string | null | undefined): number | null => {
  if (!str) return null;
  const s = str.replace(",", ".");
  const match = s.match(/(\d+(?:\.\d+)?)\s?(мл|ml|l|л|г|kg|кг)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "мл" || unit === "ml") return value;
  if (unit === "l" || unit === "л") return value * 1000;
  if (unit === "г") return value;
  if (unit === "kg" || unit === "кг") return value * 1000;

  return null;
};

// ФОЛБЭК: ищем 200шт / 200 шт / 20штук
const fallbackVolumeFromTitle = (str: string | null | undefined): string | null => {
  if (!str) return null;
  const s = str.toLowerCase();

  // 200 шт / 200шт / 200 штук
  const mPieces = s.match(/(\d+)\s*(шт|штук|pcs|pieces)/);
  if (mPieces) return `${mPieces[1]} шт`;

  // 200 мл без пробела
  const mMl = s.match(/(\d+)\s*(мл|ml)/);
  if (mMl) return `${mMl[1]} мл`;

  // 0.25 л → 250 мл
  const mL = s.match(/(\d+(?:\.\d+)?)\s*(л|l)/);
  if (mL) {
    const liters = parseFloat(mL[1]);
    return `${Math.round(liters * 1000)} мл`;
  }

  return null;
};

export const extractPercent = (str: string | null | undefined): number | null => {
  if (!str) return null;
  const s = str.replace(",", ".");
  const match = s.match(/(\d+(?:\.\d+)?)\s?%/);
  return match ? parseFloat(match[1]) : null;
};

// ================== СЕМАНТИКА ==================

const lexicalSemanticScore = (a: string, b: string): number => {
  const tokensA = tokenize(a).filter(t => !STOP_WORDS.has(t));
  const tokensB = tokenize(b).filter(t => !STOP_WORDS.has(t));

  if (!tokensA.length || !tokensB.length) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;

  const union = new Set([...tokensA, ...tokensB]).size;
  return inter / union;
};

const getSemanticScore = (row: MappingRow): number => {
  const lexical = lexicalSemanticScore(row.title ?? "", row.matched_csv_title ?? "");
  if (typeof row.semantic_score === "number") return Math.max(row.semantic_score, lexical);
  return lexical;
};

// ================== БРЕНД ==================

const findBrandOverlap = (a: string, b: string): string[] => {
  const ta = tokenize(a).filter(t => !STOP_WORDS.has(t));
  const tb = tokenize(b).filter(t => !STOP_WORDS.has(t));
  const setB = new Set(tb);
  return Array.from(new Set(ta.filter(t => setB.has(t))));
};

const isBrandPresentInBoth = (a: string, b: string) => findBrandOverlap(a, b).length > 0;

// ================== КЛАССИФИКАЦИЯ ==================

export const classifyRow = (row: MappingRow): ClassifiedRow => {
  const actual = row.title ?? "";
  const expected = row.matched_csv_title ?? "";

  if (!expected.trim()) {
    return {
      row,
      status: "wrong",
      reason: "Нет замапленного товара",
      volumeActual: null,
      volumeExpected: null,
      percentActual: null,
      percentExpected: null,
    };
  }

  if (!isBrandPresentInBoth(actual, expected)) {
    return {
      row,
      status: "wrong",
      reason: "Бренд не найден в обоих названиях",
      volumeActual: null,
      volumeExpected: null,
      percentActual: null,
      percentExpected: null,
    };
  }

  const sem = getSemanticScore(row);
  if (sem < 0.7) {
    return {
      row,
      status: "wrong",
      reason: `Названия не совпадают по смыслу (semantic_score=${sem.toFixed(2)})`,
      volumeActual: null,
      volumeExpected: null,
      percentActual: null,
      percentExpected: null,
    };
  }

  // ===== ОБЪЁМ + FALLBACK =====

  const vA = extractVolume(actual);
  const vE = extractVolume(expected);

  const fbA = fallbackVolumeFromTitle(actual);
  const fbE = fallbackVolumeFromTitle(expected);

  const volumeActual = vA !== null ? `${vA} мл` : fbA;
  const volumeExpected = vE !== null ? `${vE} мл` : fbE;

  const pA = extractPercent(actual);
  const pE = extractPercent(expected);

  // ===== СТАТУС =====
  let status: StatusType = "correct";
  let reason = "Смысл и бренд совпадают";

  // сравниваем только если есть числа
  if (vA !== null && vE !== null && vA !== vE) {
    status = "wrong";
    reason = "Объём отличается";
  }

  if (pA !== null && pE !== null && Math.abs(pA - pE) > 0.01) {
    status = "wrong";
    reason = pA !== pE ? "Процент отличается" : reason;
  }

  return {
    row,
    status,
    reason,
    volumeActual,
    volumeExpected,
    percentActual: pA,
    percentExpected: pE,
  };
};

export const classifyAll = (rows: MappingRow[]) => rows.map(classifyRow);
