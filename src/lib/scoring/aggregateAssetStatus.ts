import type { JudgementLabel } from '@/types';
import { JUDGEMENT_SEVERITY } from '@/types';

/**
 * Agregasi status kondisi aset menggunakan metode Kondisi Terburuk (Worst-Case Logic).
 * Sesuai standar PLN, agregasi kesehatan peralatan ditentukan oleh parameter dengan tingkat keparahan tertinggi.
 * Urutan Keparahan: BAD > POOR > FAIR > GOOD
 * 
 * @param judgements - Array label judgement dari parameter hasil pengujian
 * @returns Label judgement terburuk, atau 'NA' jika tidak ada data valid
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


