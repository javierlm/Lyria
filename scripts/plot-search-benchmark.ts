import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface SearchStats {
  median: number;
  p95: number;
}

interface ScenarioResult {
  volume: number;
  profileId?: string;
  profileLabel?: string;
  searchModeId?: string;
  searchModeLabel?: string;
  scenario: string;
  scenarioLabel: string;
  stats: SearchStats;
}

interface BenchmarkPayload {
  createdAt: string;
  results: ScenarioResult[];
  relevanceContract?: {
    results: Array<{
      volume: number;
      profileId?: string;
      profileLabel?: string;
      searchModeId?: string;
      searchModeLabel?: string;
      outcomes?: Array<{
        query: string;
        queryLength: number;
        lengthBin: string;
        top1Hit: boolean;
        top2Hit: boolean;
        top3Hit: boolean;
        top4Hit: boolean;
        top5Hit: boolean;
        top10Hit: boolean;
      }>;
    }>;
  };
}

const OUTPUT_DIR = resolve('cache/perf-results');
const COLORS: Record<string, string> = {
  Exact: '#2563eb',
  Prefix: '#059669',
  MultiToken: '#7c3aed'
};

const LENGTH_BINS: Array<{ label: string; min: number; max: number; center: number }> = [
  { label: '1-3', min: 1, max: 3, center: 2 },
  { label: '4-6', min: 4, max: 6, center: 5 },
  { label: '7-10', min: 7, max: 10, center: 8.5 },
  { label: '11+', min: 11, max: Number.POSITIVE_INFINITY, center: 12 }
];

function uniqSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function readSearchModeLabel(row: { searchModeLabel?: string; searchModeId?: string }): string {
  return row.searchModeLabel ?? row.searchModeId ?? 'FTSOnly';
}

function scaleLinear(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  if (fromMax === fromMin) {
    return (toMin + toMax) / 2;
  }

  const ratio = (value - fromMin) / (fromMax - fromMin);
  return toMin + ratio * (toMax - toMin);
}

function buildChart(
  title: string,
  subtitle: string,
  xValues: number[],
  series: Array<{ label: string; color: string; points: Array<{ x: number; y: number }> }>
): string {
  const width = 1200;
  const height = 700;
  const margin = { top: 80, right: 260, bottom: 90, left: 90 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const yMax = Math.max(...series.flatMap((item) => item.points.map((point) => point.y)));
  const yMin = 0;
  const xMin = Math.log10(Math.min(...xValues));
  const xMax = Math.log10(Math.max(...xValues));

  const xTicks = xValues.map((value) => ({
    value,
    x: margin.left + scaleLinear(Math.log10(value), xMin, xMax, 0, innerWidth)
  }));

  const yTickCount = 6;
  const yTicks = Array.from({ length: yTickCount }, (_, index) => {
    const raw = yMin + (yMax - yMin) * (index / (yTickCount - 1));
    const y = margin.top + scaleLinear(raw, yMin, yMax, innerHeight, 0);
    return { raw, y };
  });

  const paths = series
    .map((item) => {
      const path = item.points
        .map((point, index) => {
          const x = margin.left + scaleLinear(Math.log10(point.x), xMin, xMax, 0, innerWidth);
          const y = margin.top + scaleLinear(point.y, yMin, yMax, innerHeight, 0);
          return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

      const circles = item.points
        .map((point) => {
          const x = margin.left + scaleLinear(Math.log10(point.x), xMin, xMax, 0, innerWidth);
          const y = margin.top + scaleLinear(point.y, yMin, yMax, innerHeight, 0);
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${item.color}" />`;
        })
        .join('');

      return `<path d="${path}" fill="none" stroke="${item.color}" stroke-width="2.5" />${circles}`;
    })
    .join('');

  const legend = series
    .map((item, index) => {
      const y = margin.top + index * 30;
      return `
        <rect x="${width - margin.right + 20}" y="${y - 10}" width="16" height="16" fill="${item.color}" rx="3" />
        <text x="${width - margin.right + 44}" y="${y + 3}" font-size="14" fill="#0f172a">${item.label}</text>
      `;
    })
    .join('');

  const xAxisTicks = xTicks
    .map(
      (tick) => `
      <line x1="${tick.x.toFixed(2)}" y1="${margin.top + innerHeight}" x2="${tick.x.toFixed(2)}" y2="${
        margin.top + innerHeight + 8
      }" stroke="#334155" />
      <text x="${tick.x.toFixed(2)}" y="${margin.top + innerHeight + 28}" text-anchor="middle" font-size="12" fill="#334155">${tick.value}</text>
    `
    )
    .join('');

  const yAxisTicks = yTicks
    .map(
      (tick) => `
      <line x1="${margin.left - 8}" y1="${tick.y.toFixed(2)}" x2="${margin.left}" y2="${tick.y.toFixed(
        2
      )}" stroke="#334155" />
      <line x1="${margin.left}" y1="${tick.y.toFixed(2)}" x2="${margin.left + innerWidth}" y2="${tick.y.toFixed(
        2
      )}" stroke="#e2e8f0" />
      <text x="${margin.left - 14}" y="${(tick.y + 4).toFixed(2)}" text-anchor="end" font-size="12" fill="#334155">${tick.raw.toFixed(2)}</text>
    `
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${margin.left}" y="40" font-size="28" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${margin.left}" y="64" font-size="14" fill="#475569">${subtitle}</text>
  <line x1="${margin.left}" y1="${margin.top + innerHeight}" x2="${margin.left + innerWidth}" y2="${
    margin.top + innerHeight
  }" stroke="#334155" />
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + innerHeight}" stroke="#334155" />
  ${yAxisTicks}
  ${xAxisTicks}
  ${paths}
  ${legend}
  <text x="${margin.left + innerWidth / 2}" y="${height - 24}" text-anchor="middle" font-size="13" fill="#334155">Dataset size (log10 scale)</text>
  <text x="26" y="${margin.top + innerHeight / 2}" text-anchor="middle" transform="rotate(-90, 26, ${
    margin.top + innerHeight / 2
  })" font-size="13" fill="#334155">Response time (ms)</text>
</svg>`;
}

function buildRelevanceLengthScatterChart(
  title: string,
  subtitle: string,
  outcomes: Array<{
    queryLength: number;
    top1Hit: boolean;
    top2Hit: boolean;
    top3Hit: boolean;
    top4Hit: boolean;
    top5Hit: boolean;
    top10Hit: boolean;
  }>
): string {
  const width = 1200;
  const height = 700;
  const margin = { top: 80, right: 320, bottom: 90, left: 90 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxLength = Math.max(12, ...outcomes.map((outcome) => outcome.queryLength));
  const minLength = 1;

  const xFor = (value: number) =>
    margin.left + scaleLinear(value, minLength, maxLength, 0, innerWidth);
  const yFor = (value: number) => margin.top + scaleLinear(value, 0, 100, innerHeight, 0);

  const pointSeries = [
    { label: 'top1', color: '#2563eb', offset: -0.18, key: 'top1Hit' as const },
    { label: 'top2', color: '#059669', offset: -0.11, key: 'top2Hit' as const },
    { label: 'top3', color: '#d97706', offset: -0.04, key: 'top3Hit' as const },
    { label: 'top4', color: '#7c3aed', offset: 0.04, key: 'top4Hit' as const },
    { label: 'top5', color: '#dc2626', offset: 0.11, key: 'top5Hit' as const },
    { label: 'top10', color: '#0f172a', offset: 0.18, key: 'top10Hit' as const }
  ];

  const points = pointSeries
    .map((series) => {
      return outcomes
        .map((outcome) => {
          const x = xFor(outcome.queryLength + series.offset);
          const y = yFor(outcome[series.key] ? 100 : 0);
          return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="${series.color}" fill-opacity="0.55" />`;
        })
        .join('');
    })
    .join('');

  const binLines = pointSeries
    .map((series) => {
      const linePoints = LENGTH_BINS.map((bin) => {
        const inBin = outcomes.filter(
          (outcome) => outcome.queryLength >= bin.min && outcome.queryLength <= bin.max
        );
        if (inBin.length === 0) {
          return null;
        }

        const hitRate =
          inBin.filter((outcome) => Boolean(outcome[series.key])).length /
          Math.max(1, inBin.length);
        return { x: xFor(bin.center), y: yFor(hitRate * 100) };
      }).filter((point): point is { x: number; y: number } => point !== null);

      const path = linePoints
        .map(
          (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        )
        .join(' ');

      return `<path d="${path}" fill="none" stroke="${series.color}" stroke-width="3" />`;
    })
    .join('');

  const xTicks = [1, 3, 5, 7, 10, 12, maxLength]
    .filter(
      (value, index, values) =>
        value >= minLength && value <= maxLength && values.indexOf(value) === index
    )
    .sort((a, b) => a - b)
    .map((value) => {
      const x = xFor(value);
      return `
      <line x1="${x.toFixed(2)}" y1="${margin.top + innerHeight}" x2="${x.toFixed(2)}" y2="${
        margin.top + innerHeight + 8
      }" stroke="#334155" />
      <text x="${x.toFixed(2)}" y="${margin.top + innerHeight + 28}" text-anchor="middle" font-size="12" fill="#334155">${value}</text>
    `;
    })
    .join('');

  const yTicks = [0, 20, 40, 60, 80, 100]
    .map((value) => {
      const y = yFor(value);
      return `
      <line x1="${margin.left - 8}" y1="${y.toFixed(2)}" x2="${margin.left}" y2="${y.toFixed(2)}" stroke="#334155" />
      <line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${(margin.left + innerWidth).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#e2e8f0" />
      <text x="${margin.left - 14}" y="${(y + 4).toFixed(2)}" text-anchor="end" font-size="12" fill="#334155">${value}%</text>
    `;
    })
    .join('');

  const legend = pointSeries
    .map((series, index) => {
      const y = margin.top + index * 30;
      return `
        <rect x="${width - margin.right + 20}" y="${y - 10}" width="16" height="16" fill="${series.color}" rx="3" />
        <text x="${width - margin.right + 44}" y="${y + 3}" font-size="14" fill="#0f172a">${series.label} (scatter + bin trend)</text>
      `;
    })
    .join('');

  const binGuide = LENGTH_BINS.map((bin) => {
    const x = xFor(bin.center);
    return `<text x="${x.toFixed(2)}" y="${margin.top - 8}" text-anchor="middle" font-size="11" fill="#64748b">${bin.label}</text>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${margin.left}" y="40" font-size="28" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${margin.left}" y="64" font-size="14" fill="#475569">${subtitle}</text>
  <line x1="${margin.left}" y1="${margin.top + innerHeight}" x2="${margin.left + innerWidth}" y2="${
    margin.top + innerHeight
  }" stroke="#334155" />
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + innerHeight}" stroke="#334155" />
  ${yTicks}
  ${xTicks}
  ${points}
  ${binLines}
  ${legend}
  ${binGuide}
  <text x="${margin.left + innerWidth / 2}" y="${height - 24}" text-anchor="middle" font-size="13" fill="#334155">Query length (characters)</text>
  <text x="26" y="${margin.top + innerHeight / 2}" text-anchor="middle" transform="rotate(-90, 26, ${
    margin.top + innerHeight / 2
  })" font-size="13" fill="#334155">Hit rate (0/100 per query)</text>
</svg>`;
}

async function findInputPath(argumentPath?: string): Promise<string> {
  if (argumentPath) {
    return resolve(argumentPath);
  }

  const files = await readdir(OUTPUT_DIR);
  const candidates = files
    .filter((file) => file.startsWith('search-benchmark-') && file.endsWith('.json'))
    .sort();

  if (candidates.length === 0) {
    throw new Error(`No benchmark JSON found in ${OUTPUT_DIR}`);
  }

  return resolve(OUTPUT_DIR, candidates[candidates.length - 1]);
}

async function main(): Promise<void> {
  const inputPath = await findInputPath(process.argv[2]);
  const payload = JSON.parse(await readFile(inputPath, 'utf8')) as BenchmarkPayload;

  const volumes = uniqSorted(payload.results.map((row) => row.volume));
  const scenarios = [...new Set(payload.results.map((row) => row.scenarioLabel))];
  const groups = [
    ...new Set(payload.results.map((row) => row.profileLabel ?? row.profileId ?? 'default'))
  ];

  const groupKeys = [
    ...new Set(
      payload.results.map((row) => {
        const profile = row.profileLabel ?? row.profileId ?? 'default';
        const searchMode = readSearchModeLabel(row);
        return `${profile}__${searchMode}`;
      })
    )
  ];

  const baseName = inputPath.replace(/\.json$/i, '');
  const markdownPath = `${baseName}.report.md`;
  const generatedPaths: string[] = [];

  for (const groupKey of groupKeys) {
    const [profile, searchMode] = groupKey.split('__');
    const filtered = payload.results.filter(
      (row) =>
        (row.profileLabel ?? row.profileId ?? 'default') === profile &&
        readSearchModeLabel(row) === searchMode
    );

    const medianSeries = scenarios.map((scenario) => ({
      label: scenario,
      color: COLORS[scenario] ?? '#0f172a',
      points: filtered
        .filter((row) => row.scenarioLabel === scenario)
        .sort((left, right) => left.volume - right.volume)
        .map((row) => ({ x: row.volume, y: row.stats.median }))
    }));

    const p95Series = scenarios.map((scenario) => ({
      label: scenario,
      color: COLORS[scenario] ?? '#0f172a',
      points: filtered
        .filter((row) => row.scenarioLabel === scenario)
        .sort((left, right) => left.volume - right.volume)
        .map((row) => ({ x: row.volume, y: row.stats.p95 }))
    }));

    const slug = `${profile}-${searchMode}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const medianSvgPath = `${baseName}.median.${slug}.svg`;
    const p95SvgPath = `${baseName}.p95.${slug}.svg`;

    const medianSvg = buildChart(
      `Search Benchmark - Median Latency (${profile} / ${searchMode})`,
      `Generated at ${payload.createdAt} | volumes: ${volumes.join(', ')}`,
      volumes,
      medianSeries
    );

    const p95Svg = buildChart(
      `Search Benchmark - p95 Latency (${profile} / ${searchMode})`,
      `Generated at ${payload.createdAt} | volumes: ${volumes.join(', ')}`,
      volumes,
      p95Series
    );

    await writeFile(medianSvgPath, medianSvg, 'utf8');
    await writeFile(p95SvgPath, p95Svg, 'utf8');
    generatedPaths.push(medianSvgPath, p95SvgPath);

    const relevanceOutcomes =
      payload.relevanceContract?.results
        ?.filter(
          (row) =>
            (row.profileLabel ?? row.profileId ?? 'default') === profile &&
            readSearchModeLabel(row) === searchMode
        )
        .flatMap((row) => row.outcomes ?? []) ?? [];

    if (relevanceOutcomes.length > 0) {
      const relevanceSvgPath = `${baseName}.relevance-length.${slug}.svg`;
      const relevanceSvg = buildRelevanceLengthScatterChart(
        `Search Relevance vs Query Length (${profile} / ${searchMode})`,
        `Fixed bins: 1-3, 4-6, 7-10, 11+ | points: ${relevanceOutcomes.length}`,
        relevanceOutcomes.map((outcome) => ({
          queryLength: outcome.queryLength,
          top1Hit: outcome.top1Hit,
          top2Hit: outcome.top2Hit,
          top3Hit: outcome.top3Hit,
          top4Hit: outcome.top4Hit,
          top5Hit: outcome.top5Hit,
          top10Hit: outcome.top10Hit
        }))
      );

      await writeFile(relevanceSvgPath, relevanceSvg, 'utf8');
      generatedPaths.push(relevanceSvgPath);
    }
  }

  const markdown = [
    '# Search Benchmark Report',
    '',
    `- Source JSON: \`${inputPath}\``,
    `- Generated: ${new Date().toISOString()}`,
    `- Volumes: ${volumes.join(', ')}`,
    `- Profiles: ${groups.join(', ')}`,
    '',
    '## Charts',
    '',
    ...generatedPaths.map((path) => `- \`${path}\``),
    ''
  ].join('\n');

  await writeFile(markdownPath, markdown, 'utf8');

  console.log('Generated benchmark visuals:');
  for (const path of generatedPaths) {
    console.log(`- ${path}`);
  }
  console.log(`- ${markdownPath}`);
}

main().catch((error) => {
  console.error('[plot-search-benchmark] Failed:', error);
  process.exit(1);
});
