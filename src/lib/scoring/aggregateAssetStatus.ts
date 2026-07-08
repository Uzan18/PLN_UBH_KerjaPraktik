import type { JudgementLabel } from '@/types';
import { JUDGEMENT_SEVERITY } from '@/types';

/**
 * Aggregate status for a set of judgements using WORST-CASE logic.
 * 
 * CRITICAL RULE (CLAUDE.md Rule #7):
 * Aggregation uses worst-case from all judgement parameters within a test type.
 * Severity order: BAD > POOR > FAIR > GOOD
 * 
 * DO NOT use average/mean for this aggregation — it obscures the worst
 * condition which is most important for maintenance decisions.
 * 
 * @param judgements - Array of JudgementLabel values from TestResults
 * @returns The worst (most severe) JudgementLabel, or 'NA' if no valid judgements
 */
export function aggregateAssetStatus(judgements: (JudgementLabel | null)[]): JudgementLabel {
  const validJudgements = judgements.filter(
    (j): j is JudgementLabel => j !== null && j !== 'NA'
  );

  if (validJudgements.length === 0) {
    return 'NA';
  }

  // Find the worst (highest severity) judgement
  let worst: JudgementLabel = validJudgements[0];
  let worstSeverity = JUDGEMENT_SEVERITY[worst];

  for (const judgement of validJudgements) {
    const severity = JUDGEMENT_SEVERITY[judgement];
    if (severity > worstSeverity) {
      worst = judgement;
      worstSeverity = severity;
    }
  }

  return worst;
}

/**
 * Calculate an overall health score (0-100) from a set of individual scores.
 * 
 * Each parameter score is on a 1-5 scale:
 * - 5 = Good → 100 points
 * - 4 = Fair → 75 points
 * - 2 = Poor → 40 points
 * - 1 = Bad → 20 points
 * 
 * The overall score is the average of all normalized scores.
 */
export function calculateOverallHealthScore(scores: (number | null)[]): number | null {
  const SCORE_NORMALIZED: Record<number, number> = {
    5: 100,
    4: 75,
    2: 40,
    1: 20,
  };

  const validScores = scores.filter((s): s is number => s !== null);

  if (validScores.length === 0) return null;

  const total = validScores.reduce((sum, score) => {
    return sum + (SCORE_NORMALIZED[score] ?? 0);
  }, 0);

  return Math.round(total / validScores.length);
}
