/**
 * Threshold definition parsed from Criteria string values.
 * Criteria values are stored as strings to support operators (>=, <) and "NA".
 */
interface ParsedThreshold {
  min: number | null;
  minInclusive: boolean;
  max: number | null;
  maxInclusive: boolean;
}

/**
 * Parse a threshold string like ">= 2", "1.25 - 1.99", "< 1.0", etc.
 * Returns ParsedThreshold or null if "NA"
 */
function parseThresholdBound(value: string | null): ParsedThreshold | null {
  if (!value || value.trim().toUpperCase() === 'NA') return null;

  const trimmed = value.trim().replace(/≥/g, '>=').replace(/≤/g, '<=').replace(',', '.');

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

function matchesThreshold(numValue: number, t: ParsedThreshold | null): boolean {
  if (!t) return false;
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

/**
 * Calculate score for a test result based on the parameter value and criteria thresholds.
 * 
 * Skala Skor PLN:
 * - 5 = Good (Kondisi Sangat Baik)
 * - 4 = Fair (Kondisi Cukup / Perlu Perhatian)
 * - 2 = Poor (Kondisi Buruk / Perlu Pemeliharaan)
 * - 1 = Bad (Kondisi Critical / Sangat Buruk)
 * 
 * Mengembalikan null jika parameter bernilai N/A.
 */
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

  // Parse thresholds
  const good = parseThresholdBound(goodValue);
  const fair = parseThresholdBound(fairValue);
  const poor = parseThresholdBound(poorValue);
  const bad = parseThresholdBound(badValue);

  // Check Bad first (lowest score)
  if (bad) {
    if (matchesThreshold(numValue, bad)) return 1;
  } else if (badValue) {
    const mapped = mapQualitativeValueToNumber(badValue);
    if (mapped !== null) {
      if (numValue === mapped) return 1;
    } else {
      if (numValue === 3) return 1;
    }
  }

  // Check Poor next
  if (poor) {
    if (matchesThreshold(numValue, poor)) return 2;
  } else if (poorValue) {
    const mapped = mapQualitativeValueToNumber(poorValue);
    if (mapped !== null) {
      if (numValue === mapped) return 2;
    } else {
      if (numValue === 2) return 2;
    }
  }

  // Check Fair next
  if (fair) {
    if (matchesThreshold(numValue, fair)) return 4;
  } else if (fairValue) {
    const mapped = mapQualitativeValueToNumber(fairValue);
    if (mapped !== null) {
      if (numValue === mapped) return 4;
    } else {
      if (numValue === 1) return 4;
    }
  }

  // Check Good last
  if (good) {
    if (matchesThreshold(numValue, good)) return 5;
  } else if (goodValue) {
    const mapped = mapQualitativeValueToNumber(goodValue);
    if (mapped !== null) {
      if (numValue === mapped) return 5;
    } else {
      if (numValue === 0) return 5;
    }
  }

  // Default: if value didn't match any range, consider it Bad (worst case, safe default)
  return 1;
}
