/**
 * Threshold definition parsed from Criteria string values.
 * Criteria values are stored as strings to support operators (>=, <) and "NA".
 */
interface ThresholdRange {
  goodMin: number | null;
  fairMin: number | null;
  fairMax: number | null;
  poorMin: number | null;
  poorMax: number | null;
  badMax: number | null;
}

/**
 * Parse a threshold string like ">= 2", "1.25 - 1.99", "< 1.0", etc.
 * Returns { min, max } or null if "NA"
 */
function parseThresholdBound(value: string | null): { min: number | null; max: number | null } | null {
  if (!value || value.trim().toUpperCase() === 'NA') return null;

  const trimmed = value.trim();

  // Handle ">= X" or "> X"
  const geMatch = trimmed.match(/^>=?\s*([\d.]+)$/);
  if (geMatch) {
    return { min: parseFloat(geMatch[1]), max: null };
  }

  // Handle "<= X" or "< X"
  const leMatch = trimmed.match(/^<=?\s*([\d.]+)$/);
  if (leMatch) {
    return { min: null, max: parseFloat(leMatch[1]) };
  }

  // Handle range "X - Y" or "X-Y"
  const rangeMatch = trimmed.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }

  // Handle plain number
  const numMatch = trimmed.match(/^([\d.]+)$/);
  if (numMatch) {
    return { min: parseFloat(numMatch[1]), max: parseFloat(numMatch[1]) };
  }

  return null;
}

/**
 * Calculate score for a test result based on the parameter value and criteria thresholds.
 * 
 * Scores:
 * - 5 = Good
 * - 4 = Fair
 * - 2 = Poor
 * - 1 = Bad
 * 
 * Returns null if value is NA or thresholds are missing.
 * 
 * IMPORTANT (CLAUDE.md Rule #1): This function MUST only be called server-side.
 * Score and judgement are NEVER accepted from client input.
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

  // Parse thresholds
  const good = parseThresholdBound(goodValue);
  const fair = parseThresholdBound(fairValue);
  const poor = parseThresholdBound(poorValue);
  const bad = parseThresholdBound(badValue);

  // Check Good first (highest score)
  if (good) {
    if (good.min !== null && good.max === null && numValue >= good.min) return 5;
    if (good.max !== null && good.min === null && numValue <= good.max) return 5;
    if (good.min !== null && good.max !== null && numValue >= good.min && numValue <= good.max) return 5;
  }

  // Check Fair
  if (fair) {
    if (fair.min !== null && fair.max !== null && numValue >= fair.min && numValue <= fair.max) return 4;
    if (fair.min !== null && fair.max === null && numValue >= fair.min) return 4;
    if (fair.max !== null && fair.min === null && numValue <= fair.max) return 4;
  }

  // Check Poor
  if (poor) {
    if (poor.min !== null && poor.max !== null && numValue >= poor.min && numValue <= poor.max) return 2;
    if (poor.min !== null && poor.max === null && numValue >= poor.min) return 2;
    if (poor.max !== null && poor.min === null && numValue <= poor.max) return 2;
  }

  // Check Bad
  if (bad) {
    if (bad.max !== null && bad.min === null && numValue < bad.max) return 1;
    if (bad.min !== null && bad.max === null && numValue >= bad.min) return 1;
    if (bad.min !== null && bad.max !== null && numValue >= bad.min && numValue <= bad.max) return 1;
  }

  // Default: if value didn't match any range, consider it Bad (worst case, safe default)
  return 1;
}
