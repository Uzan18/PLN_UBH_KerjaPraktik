import { determineJudgement, ComparisonDirection } from '../../siat/src/lib/scoring/calculateScore';
import { aggregateAssetStatus } from '../../siat/src/lib/scoring/aggregateAssetStatus';
import { aggregateDamageMechanism } from '../../siat/src/lib/scoring/aggregateDamageMechanism';

describe('Scoring Engine Unit Tests', () => {
  describe('determineJudgement (MAX comparison)', () => {
    const thresholds = { good: 100, fair: 80, poor: 60 };
    const direction: ComparisonDirection = 'MAX';

    it('returns GOOD when value is >= good', () => {
      expect(determineJudgement(105, thresholds, direction)).toBe('GOOD');
      expect(determineJudgement(100, thresholds, direction)).toBe('GOOD');
    });

    it('returns FAIR when fair <= value < good', () => {
      expect(determineJudgement(85, thresholds, direction)).toBe('FAIR');
      expect(determineJudgement(80, thresholds, direction)).toBe('FAIR');
    });

    it('returns POOR when poor <= value < fair', () => {
      expect(determineJudgement(70, thresholds, direction)).toBe('POOR');
      expect(determineJudgement(60, thresholds, direction)).toBe('POOR');
    });

    it('returns BAD when value < poor', () => {
      expect(determineJudgement(59, thresholds, direction)).toBe('BAD');
      expect(determineJudgement(0, thresholds, direction)).toBe('BAD');
    });
  });

  describe('determineJudgement (MIN comparison)', () => {
    const thresholds = { good: 1, fair: 3, poor: 5 };
    const direction: ComparisonDirection = 'MIN';

    it('returns GOOD when value is <= good', () => {
      expect(determineJudgement(0.5, thresholds, direction)).toBe('GOOD');
      expect(determineJudgement(1, thresholds, direction)).toBe('GOOD');
    });

    it('returns FAIR when good < value <= fair', () => {
      expect(determineJudgement(2, thresholds, direction)).toBe('FAIR');
      expect(determineJudgement(3, thresholds, direction)).toBe('FAIR');
    });

    it('returns POOR when fair < value <= poor', () => {
      expect(determineJudgement(4, thresholds, direction)).toBe('POOR');
      expect(determineJudgement(5, thresholds, direction)).toBe('POOR');
    });

    it('returns BAD when value > poor', () => {
      expect(determineJudgement(5.1, thresholds, direction)).toBe('BAD');
      expect(determineJudgement(10, thresholds, direction)).toBe('BAD');
    });
  });

  describe('aggregateAssetStatus (Worst Case)', () => {
    it('returns NO_DATA for empty arrays', () => {
      expect(aggregateAssetStatus([])).toBe('NO_DATA');
    });

    it('identifies the worst status correctly', () => {
      expect(aggregateAssetStatus(['GOOD', 'GOOD', 'GOOD'])).toBe('GOOD');
      expect(aggregateAssetStatus(['GOOD', 'FAIR', 'GOOD'])).toBe('FAIR');
      expect(aggregateAssetStatus(['POOR', 'GOOD', 'FAIR'])).toBe('POOR');
      expect(aggregateAssetStatus(['GOOD', 'BAD', 'POOR'])).toBe('BAD');
    });
  });

  describe('aggregateDamageMechanism (Worst Case with NO_DATA)', () => {
    it('returns NO_DATA for empty arrays', () => {
      expect(aggregateDamageMechanism([])).toBe('NO_DATA');
    });

    it('handles arrays with NO_DATA gracefully', () => {
      expect(aggregateDamageMechanism(['NO_DATA', 'NO_DATA'])).toBe('NO_DATA');
      expect(aggregateDamageMechanism(['NO_DATA', 'GOOD'])).toBe('GOOD');
      expect(aggregateDamageMechanism(['FAIR', 'NO_DATA', 'GOOD'])).toBe('FAIR');
      expect(aggregateDamageMechanism(['BAD', 'NO_DATA'])).toBe('BAD');
    });
  });
});