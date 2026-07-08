import { JudgementLabel } from './calculateScore';

const severity = {
  BAD: 4,
  POOR: 3,
  FAIR: 2,
  GOOD: 1,
  NO_DATA: 0,
};

export function aggregateAssetStatus(judgements: JudgementLabel[]): JudgementLabel | 'NO_DATA' {
  if (!judgements || judgements.length === 0) return 'NO_DATA';
  
  let worst = judgements[0];
  for (const j of judgements) {
    if (severity[j] > severity[worst]) {
      worst = j;
    }
  }
  return worst;
}