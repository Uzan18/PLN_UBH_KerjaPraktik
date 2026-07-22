import type { JudgementLabel } from '@/types';
import { SCORE_TO_JUDGEMENT } from '@/types';

/**
 * Menentukan label judgement berdasarkan skor nilai pengujian.
 * 
 * Pemetaan Skor PLN:
 * - 5 → GOOD
 * - 4 → FAIR
 * - 2 → POOR
 * - 1 → BAD
 * - null → NA
 */
export function determineJudgement(score: number | null): JudgementLabel {
  if (score === null || score === undefined) {
    return 'NA';
  }

  // Direct lookup
  if (SCORE_TO_JUDGEMENT[score]) {
    return SCORE_TO_JUDGEMENT[score];
  }

  // For intermediate values, round to nearest valid score
  if (score >= 4.5) return 'GOOD';
  if (score >= 3) return 'FAIR';
  if (score >= 1.5) return 'POOR';
  return 'BAD';
}
