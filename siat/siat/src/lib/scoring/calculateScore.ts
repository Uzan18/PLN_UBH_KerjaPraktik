export type ComparisonDirection = 'MIN' | 'MAX';
export type JudgementLabel = 'GOOD' | 'FAIR' | 'POOR' | 'BAD';

export function determineJudgement(
  value: number,
  thresholds: { good: number; fair: number; poor: number },
  direction: ComparisonDirection
): JudgementLabel {
  const { good, fair, poor } = thresholds;
  
  if (direction === 'MAX') {
    // Semakin besar semakin baik
    if (value >= good) return 'GOOD';
    if (value >= fair) return 'FAIR';
    if (value >= poor) return 'POOR';
    return 'BAD';
  } else {
    // MIN: Semakin kecil semakin baik
    if (value <= good) return 'GOOD';
    if (value <= fair) return 'FAIR';
    if (value <= poor) return 'POOR';
    return 'BAD';
  }
}