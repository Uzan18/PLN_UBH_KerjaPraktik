/**
 * Threshold definition parsed from Criteria string values.
 * Criteria values are stored as strings to support operators (>=, <) and "NA".
 */
export interface SingleThresholdBound {
  min: number | null;
  minInclusive: boolean;
  max: number | null;
  maxInclusive: boolean;
}

export interface CompoundThreshold {
  operator: 'AND' | 'OR';
  bounds: (SingleThresholdBound | CompoundThreshold)[];
}

export type ParsedThreshold = SingleThresholdBound | CompoundThreshold;

function isCompoundThreshold(t: ParsedThreshold): t is CompoundThreshold {
  return 'operator' in t && 'bounds' in t;
}

function parseSingleBound(valStr: string): SingleThresholdBound | null {
  const trimmed = valStr.trim().replace(/≥/g, '>=').replace(/≤/g, '<=').replace(',', '.');

  // Handle ">= X" or "> X" (supporting negative numbers)
  const geMatch = trimmed.match(/^(>=?)\s*([\d.-]+)$/);
  if (geMatch) {
    const op = geMatch[1];
    const val = parseFloat(geMatch[2]);
    return {
      min: val,
      minInclusive: op === '>=',
      max: null,
      maxInclusive: true,
    };
  }

  // Handle "<= X" or "< X" (supporting negative numbers)
  const leMatch = trimmed.match(/^(<=?)\s*([\d.-]+)$/);
  if (leMatch) {
    const op = leMatch[1];
    const val = parseFloat(leMatch[2]);
    return {
      min: null,
      minInclusive: true,
      max: val,
      maxInclusive: op === '<=',
    };
  }

  // Handle range "X - Y" or "X-Y" (supporting negative numbers)
  const rangeMatch = trimmed.match(/^([\d.-]+)\s*-\s*([\d.-]+)$/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      minInclusive: true,
      max: parseFloat(rangeMatch[2]),
      maxInclusive: true,
    };
  }

  // Handle plain number (supporting negative numbers)
  const numMatch = trimmed.match(/^([\d.-]+)$/);
  if (numMatch) {
    return {
      min: parseFloat(numMatch[1]),
      minInclusive: true,
      max: parseFloat(numMatch[1]),
      maxInclusive: true,
    };
  }

  return null;
}

/**
 * Parse a threshold string supporting single bounds, ranges, and compound operators (AND / OR).
 * Supported syntax examples:
 * - Multi-condition OR:  "> 100 OR < 0", "> 100 || < 0", "> 100 ; < 0", "> 100 atau < 0"
 * - Multi-condition AND: "> 0 AND < 50", "> 0 && < 50", "> 0 dan < 50"
 */
function parseThresholdBound(value: string | null): ParsedThreshold | null {
  if (!value || value.trim().toUpperCase() === 'NA') return null;
  const raw = value.trim();

  // 1. Check for OR operators: "OR", "||", ";", "atau"
  const orParts = raw.split(/\s+(?:OR|\|\||atau)\s+|\s*;\s*/i);
  if (orParts.length > 1) {
    const parsedSub = orParts.map((p) => parseThresholdBound(p)).filter((p): p is ParsedThreshold => p !== null);
    if (parsedSub.length > 0) {
      return { operator: 'OR', bounds: parsedSub };
    }
  }

  // 2. Check for AND operators: "AND", "&&", "dan"
  const andParts = raw.split(/\s+(?:AND|&&|dan)\s+/i);
  if (andParts.length > 1) {
    const parsedSub = andParts.map((p) => parseThresholdBound(p)).filter((p): p is ParsedThreshold => p !== null);
    if (parsedSub.length > 0) {
      return { operator: 'AND', bounds: parsedSub };
    }
  }

  // 3. Fallback to single bound parser
  return parseSingleBound(raw);
}

function matchesThreshold(numValue: number, t: ParsedThreshold | null): boolean {
  if (!t) return false;

  if (isCompoundThreshold(t)) {
    if (t.operator === 'OR') {
      return t.bounds.some((b) => matchesThreshold(numValue, b));
    } else {
      return t.bounds.every((b) => matchesThreshold(numValue, b));
    }
  }

  const minOk = t.min === null || (t.minInclusive ? numValue >= t.min : numValue > t.min);
  const maxOk = t.max === null || (t.maxInclusive ? numValue <= t.max : numValue < t.max);
  return minOk && maxOk;
}

export function mapQualitativeValueToNumber(valStr: string): number | null {
  const clean = valStr.trim().toUpperCase();
  if (clean === 'TIDAK ADA' || clean === 'TIDAK' || clean === 'NORMAL' || clean === 'NORMAL WINDING') {
    return 0;
  }
  if (clean === 'ADA' || clean === 'YA' || clean === 'ABNORMAL' || clean === 'SLIGHT DEFORMATION') {
    return 1;
  }
  if (clean === 'OBVIOUS DEFORMATION') {
    return 2;
  }
  if (clean === 'SEVERE DEFORMATION') {
    return 3;
  }
  if (clean === 'GOOD') {
    return 5;
  }
  if (clean === 'FAIR') {
    return 4;
  }
  if (clean === 'POOR') {
    return 2;
  }
  if (clean === 'BAD') {
    return 1;
  }
  return null;
}

export function evaluateQualitative(numValue: number, criteriaStr: string | null): boolean {
  if (!criteriaStr) return false;
  const mapped = mapQualitativeValueToNumber(criteriaStr);
  if (mapped === null) {
    const parsed = parseFloat(criteriaStr);
    return !isNaN(parsed) && numValue === parsed;
  }
  return numValue === mapped;
}

function getThresholdSpecificity(t: ParsedThreshold): number {
  if (isCompoundThreshold(t)) {
    const specificities = t.bounds.map((b) => getThresholdSpecificity(b));
    return Math.min(...specificities);
  }
  // 1. Both min and max set (e.g. "0.51 - 0.7"): width of range
  if (t.min !== null && t.max !== null) {
    return Math.abs(t.max - t.min);
  }
  // 2. Only max set (e.g. "< 0.5" or "< 1"): absolute max bound
  if (t.max !== null) {
    return Math.abs(t.max);
  }
  // 3. Only min set (e.g. ">= 100" vs ">= 10"): reciprocal so higher min bound has smaller value (tighter)
  if (t.min !== null) {
    return 1 / (Math.abs(t.min) + 0.0001);
  }
  return 999999;
}

export function calculateScore(
  value: number | null,
  isNotApplicable: boolean,
  goodValue: string | null,
  fairValue: string | null,
  poorValue: string | null,
  badValue: string | null,
): number | null {
  // If NA, return null
  if (isNotApplicable || value === null || value === undefined) {
    return null;
  }

  const numValue = typeof value === 'number' ? value : Number(value);
  if (isNaN(numValue)) {
    return null;
  }

  // Check if any criteria/threshold is actually configured
  const hasAnyThresholdConfigured = Boolean(
    (goodValue && goodValue.trim() !== '' && goodValue.trim().toUpperCase() !== 'NA') ||
    (fairValue && fairValue.trim() !== '' && fairValue.trim().toUpperCase() !== 'NA') ||
    (poorValue && poorValue.trim() !== '' && poorValue.trim().toUpperCase() !== 'NA') ||
    (badValue && badValue.trim() !== '' && badValue.trim().toUpperCase() !== 'NA')
  );

  if (!hasAnyThresholdConfigured) {
    return null;
  }

  // Parse thresholds
  const good = parseThresholdBound(goodValue);
  const fair = parseThresholdBound(fairValue);
  const poor = parseThresholdBound(poorValue);
  const bad = parseThresholdBound(badValue);

  const candidates: { score: number; specificity: number }[] = [];

  const levels = [
    { bound: good, valStr: goodValue, score: 5, defaultQual: 0 },
    { bound: fair, valStr: fairValue, score: 4, defaultQual: 1 },
    { bound: poor, valStr: poorValue, score: 2, defaultQual: 2 },
    { bound: bad, valStr: badValue, score: 1, defaultQual: 3 },
  ];

  for (const lvl of levels) {
    if (lvl.bound) {
      if (matchesThreshold(numValue, lvl.bound)) {
        candidates.push({ score: lvl.score, specificity: getThresholdSpecificity(lvl.bound) });
      }
    } else if (lvl.valStr) {
      const mapped = mapQualitativeValueToNumber(lvl.valStr);
      if (mapped !== null) {
        if (numValue === mapped) candidates.push({ score: lvl.score, specificity: 0 });
      } else {
        if (numValue === lvl.defaultQual) candidates.push({ score: lvl.score, specificity: 0 });
      }
    }
  }

  if (candidates.length > 0) {
    // Sort candidates: smallest specificity (tightest range) first.
    // If specificities are equal, higher score first.
    candidates.sort((a, b) => {
      if (Math.abs(a.specificity - b.specificity) > 0.00001) {
        return a.specificity - b.specificity;
      }
      return b.score - a.score;
    });
    return candidates[0].score;
  }

  // Return null (N/A) if criteria were configured but value did not match any threshold
  return null;
}
