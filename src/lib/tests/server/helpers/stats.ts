export interface SearchStats {
  n: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  p90: number;
  p95: number;
  p99: number;
  std: number;
  iqr: number;
  cv: number;
}

export function calculateStats(times: number[]): SearchStats {
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) {
    return {
      n: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      q1: 0,
      q3: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      std: 0,
      iqr: 0,
      cv: 0
    };
  }

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  const getPercentile = (p: number): number => {
    if (n === 1) {
      return sorted[0];
    }

    const rank = p * (n - 1);
    const lowerIndex = Math.floor(rank);
    const upperIndex = Math.ceil(rank);
    const weight = rank - lowerIndex;

    const lowerValue = sorted[Math.max(0, Math.min(lowerIndex, n - 1))];
    const upperValue = sorted[Math.max(0, Math.min(upperIndex, n - 1))];

    return lowerValue + (upperValue - lowerValue) * weight;
  };

  const q1 = getPercentile(0.25);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;

  return {
    n,
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median: getPercentile(0.5),
    q1,
    q3,
    p90: getPercentile(0.9),
    p95: getPercentile(0.95),
    p99: getPercentile(0.99),
    std,
    iqr,
    cv: std / mean
  };
}

export function formatStats(stats: SearchStats): string {
  return `n=${stats.n} min=${stats.min.toFixed(2)}ms max=${stats.max.toFixed(2)}ms mean=${stats.mean.toFixed(2)}ms median=${stats.median.toFixed(2)}ms p90=${stats.p90.toFixed(2)}ms p95=${stats.p95.toFixed(2)}ms p99=${stats.p99.toFixed(2)}ms q1=${stats.q1.toFixed(2)}ms q3=${stats.q3.toFixed(2)}ms std=${stats.std.toFixed(2)}ms iqr=${stats.iqr.toFixed(2)}ms cv=${stats.cv.toFixed(3)}`;
}
