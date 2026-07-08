import { JudgementLabel } from './calculateScore';

const severity = {
  BAD: 4,
  POOR: 3,
  FAIR: 2,
  GOOD: 1,
  NO_DATA: 0,
};

export function aggregateDamageMechanism(judgements: (JudgementLabel | 'NO_DATA')[]): JudgementLabel | 'NO_DATA' {
  if (!judgements || judgements.length === 0) return 'NO_DATA';
  
  let worst: JudgementLabel | 'NO_DATA' = 'NO_DATA';
  
  for (const j of judgements) {
    if (severity[j] > severity[worst]) {
      worst = j;
    }
  }
  return worst;
}