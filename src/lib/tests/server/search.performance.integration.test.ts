import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { db, libsqlClient } from '$lib/server/db/client';
import { videos } from '$lib/server/db/schema';
import { clearTestDatabase } from './dbTestUtils';
import {
  generateFakeVideos,
  seedFakeVideoGenerator,
  type FakeDataProfile,
  type FakeVideoInput
} from './helpers/fakerUtils';
import { calculateStats, formatStats, type SearchStats } from './helpers/stats';

const RUNS_PER_SCENARIO = Number(process.env.SEARCH_PERF_RUNS ?? '20');
const WARMUP_RUNS = Number(process.env.SEARCH_PERF_WARMUP_RUNS ?? '3');
const SEARCH_LIMIT = Number(process.env.SEARCH_PERF_LIMIT ?? '30');
const INSERT_BATCH_SIZE = Number(process.env.SEARCH_PERF_INSERT_BATCH ?? '100');
const GENERATION_BATCH_SIZE = Number(process.env.SEARCH_PERF_GENERATION_BATCH ?? '10000');
const TEST_TIMEOUT_MS = Number(process.env.SEARCH_PERF_TIMEOUT_MS ?? '1800000');
const ENFORCE_TOP1_GATE = process.env.SEARCH_PERF_ENFORCE_TOP1 === '1';
const RELEVANCE_DEBUG_TOPN = Number(process.env.SEARCH_PERF_RELEVANCE_TOPN ?? '5');
const RELEVANCE_CASES_TARGET = Math.max(
  1,
  Number(process.env.SEARCH_PERF_RELEVANCE_CASES ?? '5000')
);
const RELEVANCE_FAILURE_LOG_LIMIT = Number(process.env.SEARCH_PERF_FAILURE_LOG_LIMIT ?? '12');
const RELEVANCE_PROGRESS_EVERY = Number(process.env.SEARCH_PERF_RELEVANCE_PROGRESS_EVERY ?? '50');
const GLOBAL_TOP1_TARGET = Number(process.env.SEARCH_PERF_TOP1_TARGET ?? '0.99');
const DATASET_SEED = Number(process.env.SEARCH_PERF_SEED ?? '12345');
const RAW_DATA_PROFILE = (process.env.SEARCH_PERF_DATA_PROFILE ?? 'balanced').trim();
const ISOLATED_QUERY_COOLDOWN_MS = Number(process.env.SEARCH_PERF_QUERY_COOLDOWN_MS ?? '75');
const ISOLATED_QUERY_COOLDOWN_JITTER_MS = Number(
  process.env.SEARCH_PERF_QUERY_COOLDOWN_JITTER_MS ?? '20'
);
const ISOLATED_SCENARIO_COOLDOWN_MS = Number(process.env.SEARCH_PERF_SCENARIO_COOLDOWN_MS ?? '250');

const DEFAULT_VOLUMES = [10, 100, 1000, 10000] as const;
const LARGE_VOLUMES = [100000, 300000, 600000, 1000000] as const;

interface SearchScenario {
  id: 'exact' | 'prefix' | 'multi';
  label: string;
  queries: string[];
}

interface RelevanceContractCase {
  query: string;
  expectedVideoId: string;
}

interface BenchmarkProfile {
  id: 'under-load' | 'isolated';
  label: string;
  queryCooldownMs: number;
  queryCooldownJitterMs: number;
  scenarioCooldownMs: number;
}

interface ScenarioResult {
  volume: number;
  profileId: BenchmarkProfile['id'];
  profileLabel: string;
  searchModeId: 'fts-only';
  searchModeLabel: 'FTSOnly';
  scenario: SearchScenario['id'];
  scenarioLabel: string;
  stats: SearchStats;
}

interface RelevanceContractExecution {
  total: number;
  passed: number;
  top1HitRate: number;
  top2HitRate: number;
  top3HitRate: number;
  top4HitRate: number;
  top5HitRate: number;
  top10HitRate: number;
  outcomes: Array<{
    query: string;
    expected: string;
    actualTop1: string;
    topResults: string[];
    queryLength: number;
    lengthBin: string;
    rank: number | null;
    top1Hit: boolean;
    top2Hit: boolean;
    top3Hit: boolean;
    top4Hit: boolean;
    top5Hit: boolean;
    top10Hit: boolean;
  }>;
  failures: Array<{
    query: string;
    expected: string;
    actualTop1: string;
    topResults: string[];
  }>;
}

interface RelevanceContractResult {
  volume: number;
  profileId: BenchmarkProfile['id'];
  profileLabel: string;
  searchModeId: 'fts-only';
  searchModeLabel: 'FTSOnly';
  total: number;
  passed: number;
  top1HitRate: number;
  top2HitRate: number;
  top3HitRate: number;
  top4HitRate: number;
  top5HitRate: number;
  top10HitRate: number;
  outcomes: RelevanceContractExecution['outcomes'];
  failures: RelevanceContractExecution['failures'];
}

const CONNECTOR_TERMS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for']);

function buildNormalizedVideoFields(artist: string, track: string) {
  const artistNormalized = normalizeSearchText(artist);
  const trackNormalized = normalizeSearchText(track);

  return {
    artistNormalized,
    trackNormalized,
    searchTextNormalized: `${artistNormalized} ${trackNormalized}`.trim()
  };
}

const LENGTH_BINS: Array<{ label: string; min: number; max: number }> = [
  { label: '1-3', min: 1, max: 3 },
  { label: '4-6', min: 4, max: 6 },
  { label: '7-10', min: 7, max: 10 },
  { label: '11+', min: 11, max: Number.POSITIVE_INFINITY }
];

const CORE_RELEVANCE_FIXTURES: FakeVideoInput[] = [
  {
    videoId: 'REL_MET_001',
    artist: 'Metallica',
    track: 'Enter Sandman',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_MET_001/mqdefault.jpg',
    ...buildNormalizedVideoFields('Metallica', 'Enter Sandman')
  },
  {
    videoId: 'REL_LPN_002',
    artist: 'Linkin Park',
    track: 'Numb',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_LPN_002/mqdefault.jpg',
    ...buildNormalizedVideoFields('Linkin Park', 'Numb')
  },
  {
    videoId: 'REL_LPE_003',
    artist: 'Linkin Park',
    track: 'The Emptiness Machine',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_LPE_003/mqdefault.jpg',
    ...buildNormalizedVideoFields('Linkin Park', 'The Emptiness Machine')
  },
  {
    videoId: 'REL_SHA_004',
    artist: 'Shakira',
    track: 'Waka Waka',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_SHA_004/mqdefault.jpg',
    ...buildNormalizedVideoFields('Shakira', 'Waka Waka')
  },
  {
    videoId: 'REL_BTB_005',
    artist: 'Beyond The Black',
    track: 'Rising High',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_BTB_005/mqdefault.jpg',
    ...buildNormalizedVideoFields('Beyond The Black', 'Rising High')
  },
  {
    videoId: 'REL_VOA_006',
    artist: 'Visions of Atlantis',
    track: 'Master the Hurricane',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_VOA_006/mqdefault.jpg',
    ...buildNormalizedVideoFields('Visions of Atlantis', 'Master the Hurricane')
  },
  {
    videoId: 'REL_MJB_007',
    artist: 'Mary J. Blige',
    track: 'Family Affair',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_MJB_007/mqdefault.jpg',
    ...buildNormalizedVideoFields('Mary J. Blige', 'Family Affair')
  },
  {
    videoId: 'REL_AEN_008',
    artist: 'Arch Enemy',
    track: 'The Watcher',
    thumbnailUrl: 'https://img.youtube.com/vi/REL_AEN_008/mqdefault.jpg',
    ...buildNormalizedVideoFields('Arch Enemy', 'The Watcher')
  },
  {
    videoId: 'REL_BFM_009',
    artist: 'Bullet for My Valentine',
    track: "Tears Don't Fall",
    thumbnailUrl: 'https://img.youtube.com/vi/REL_BFM_009/mqdefault.jpg',
    ...buildNormalizedVideoFields('Bullet for My Valentine', "Tears Don't Fall")
  }
];

const STRICT_CANONICAL_CASES: RelevanceContractCase[] = [
  { query: 'metallica enter', expectedVideoId: 'REL_MET_001' },
  { query: 'linkin numb', expectedVideoId: 'REL_LPN_002' },
  { query: 'linkin empti', expectedVideoId: 'REL_LPE_003' },
  { query: 'shaki waka', expectedVideoId: 'REL_SHA_004' },
  { query: 'beyond black', expectedVideoId: 'REL_BTB_005' },
  { query: 'visions atlan', expectedVideoId: 'REL_VOA_006' },
  { query: 'mary blige', expectedVideoId: 'REL_MJB_007' },
  { query: 'arch enemy', expectedVideoId: 'REL_AEN_008' },
  { query: 'bullet valen', expectedVideoId: 'REL_BFM_009' }
];

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeNormalized(value: string): string[] {
  return normalizeSearchText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function semanticTokens(value: string): string[] {
  return tokenizeNormalized(value).filter(
    (token) => token.length >= 3 && !CONNECTOR_TERMS.has(token)
  );
}

function createDeterministicRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom<T>(rng: () => number, values: T[]): T {
  return values[randomInt(rng, 0, values.length - 1)] as T;
}

function getLengthBin(length: number): string {
  for (const bin of LENGTH_BINS) {
    if (length >= bin.min && length <= bin.max) {
      return bin.label;
    }
  }

  return '11+';
}

function parseVolumes(): number[] {
  const raw = process.env.SEARCH_PERF_VOLUMES;
  const includeLarge = process.env.SEARCH_PERF_INCLUDE_LARGE === '1';

  if (raw) {
    const parsed = raw
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.floor(value));
    return [...new Set(parsed)].sort((left, right) => left - right);
  }

  const volumes = includeLarge ? [...DEFAULT_VOLUMES, ...LARGE_VOLUMES] : [...DEFAULT_VOLUMES];
  return volumes.sort((left, right) => left - right);
}

function parseProfiles(): BenchmarkProfile[] {
  const availableProfiles: Record<BenchmarkProfile['id'], BenchmarkProfile> = {
    'under-load': {
      id: 'under-load',
      label: 'UnderLoad',
      queryCooldownMs: 0,
      queryCooldownJitterMs: 0,
      scenarioCooldownMs: 0
    },
    isolated: {
      id: 'isolated',
      label: 'Isolated',
      queryCooldownMs: ISOLATED_QUERY_COOLDOWN_MS,
      queryCooldownJitterMs: ISOLATED_QUERY_COOLDOWN_JITTER_MS,
      scenarioCooldownMs: ISOLATED_SCENARIO_COOLDOWN_MS
    }
  };

  const raw = process.env.SEARCH_PERF_MODES;
  if (!raw) {
    return [availableProfiles['under-load']];
  }

  const ids = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is BenchmarkProfile['id'] => value in availableProfiles);

  const unique = [...new Set(ids)];
  return unique.length > 0
    ? unique.map((id) => availableProfiles[id])
    : [availableProfiles['under-load']];
}

function parseDataProfile(): FakeDataProfile {
  const validProfiles: FakeDataProfile[] = ['balanced', 'noisy', 'clone-heavy'];
  return validProfiles.includes(RAW_DATA_PROFILE as FakeDataProfile)
    ? (RAW_DATA_PROFILE as FakeDataProfile)
    : 'balanced';
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function logProgress(message: string): void {
  process.stderr.write(`[search-perf] ${message}\n`);
}

function computeCooldownMs(index: number, profile: BenchmarkProfile): number {
  if (profile.queryCooldownMs <= 0) {
    return 0;
  }

  if (profile.queryCooldownJitterMs <= 0) {
    return profile.queryCooldownMs;
  }

  const jitter =
    ((index % 2 === 0 ? -1 : 1) * profile.queryCooldownJitterMs * ((index % 5) / 4)) | 0;
  return Math.max(0, profile.queryCooldownMs + jitter);
}

async function insertVideosInBatches(fakeVideos: FakeVideoInput[]): Promise<void> {
  if (fakeVideos.length === 0) {
    return;
  }

  for (let offset = 0; offset < fakeVideos.length; offset += INSERT_BATCH_SIZE) {
    const chunk = fakeVideos.slice(offset, offset + INSERT_BATCH_SIZE);
    await db.insert(videos).values(
      chunk.map((video) => {
        return {
          videoId: video.videoId,
          artist: video.artist,
          track: video.track,
          thumbnailUrl: video.thumbnailUrl,
          artistNormalized: video.artistNormalized,
          trackNormalized: video.trackNormalized,
          searchTextNormalized: video.searchTextNormalized,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      })
    );
  }
}

async function seedFixtures(fixtures: FakeVideoInput[]): Promise<void> {
  await insertVideosInBatches(fixtures);
}

async function seedVolume(volume: number, profile: FakeDataProfile): Promise<FakeVideoInput[]> {
  const allInserted: FakeVideoInput[] = [];
  let inserted = 0;

  while (inserted < volume) {
    const pending = volume - inserted;
    const chunkSize = Math.min(pending, GENERATION_BATCH_SIZE);
    const chunk = generateFakeVideos(chunkSize, profile);
    await insertVideosInBatches(chunk);
    for (const video of chunk) {
      allInserted.push(video);
    }
    inserted += chunkSize;
    logProgress(`Seed progress: ${inserted}/${volume}`);
  }

  return allInserted;
}

async function readSearchIndexCounts(): Promise<{ videos: number; fts: number }> {
  const result = await libsqlClient.execute(`
    SELECT
      (SELECT COUNT(*) FROM videos) AS videos,
      (SELECT COUNT(*) FROM videos_fts) AS fts
  `);

  const row = result.rows[0] as { videos?: unknown; fts?: unknown } | undefined;
  return {
    videos: Number(row?.videos ?? 0),
    fts: Number(row?.fts ?? 0)
  };
}

async function readDatasetDiversityStats(): Promise<{
  uniqueSearchText: number;
  uniqueArtist: number;
  uniqueTrack: number;
  uniquePrefix4: number;
}> {
  const result = await libsqlClient.execute(`
    SELECT
      (SELECT COUNT(DISTINCT search_text_normalized) FROM videos) AS unique_search_text,
      (SELECT COUNT(DISTINCT artist_normalized) FROM videos) AS unique_artist,
      (SELECT COUNT(DISTINCT track_normalized) FROM videos) AS unique_track,
      (SELECT COUNT(DISTINCT substr(search_text_normalized, 1, 4)) FROM videos) AS unique_prefix4
  `);

  const row = result.rows[0] as
    | {
        unique_search_text?: unknown;
        unique_artist?: unknown;
        unique_track?: unknown;
        unique_prefix4?: unknown;
      }
    | undefined;

  return {
    uniqueSearchText: Number(row?.unique_search_text ?? 0),
    uniqueArtist: Number(row?.unique_artist ?? 0),
    uniqueTrack: Number(row?.unique_track ?? 0),
    uniquePrefix4: Number(row?.unique_prefix4 ?? 0)
  };
}

async function runScenario(
  scenario: SearchScenario,
  profile: BenchmarkProfile
): Promise<SearchStats> {
  logProgress(`Scenario start: ${scenario.label} (${profile.label})`);
  const repository = createLibsqlVideoRepository();

  for (let warmupIndex = 0; warmupIndex < WARMUP_RUNS; warmupIndex += 1) {
    const query = scenario.queries[warmupIndex % scenario.queries.length] as string;
    await repository.searchVideos(query, SEARCH_LIMIT);
  }

  const durations: number[] = [];
  for (let runIndex = 0; runIndex < RUNS_PER_SCENARIO; runIndex += 1) {
    const query = scenario.queries[runIndex % scenario.queries.length] as string;
    await sleep(computeCooldownMs(runIndex, profile));

    const startedAt = performance.now();
    await repository.searchVideos(query, SEARCH_LIMIT);
    durations.push(performance.now() - startedAt);
  }

  return calculateStats(durations);
}

function buildStrictRelevanceCases(
  catalog: FakeVideoInput[],
  targetCount: number,
  seed: number
): RelevanceContractCase[] {
  const rng = createDeterministicRng(seed);
  const cases: RelevanceContractCase[] = [...STRICT_CANONICAL_CASES];
  const seen = new Set(
    cases.map((testCase) => `${normalizeSearchText(testCase.query)}::${testCase.expectedVideoId}`)
  );

  const maxAttempts = targetCount * 60;
  let attempts = 0;
  while (cases.length < targetCount && attempts < maxAttempts) {
    attempts += 1;

    const fixture = pickRandom(rng, catalog);
    const artistTokens = semanticTokens(fixture.artist);
    const trackTokens = semanticTokens(fixture.track);
    if (artistTokens.length === 0 || trackTokens.length === 0) {
      continue;
    }

    const artist0 = artistTokens[0] as string;
    const artist1 = artistTokens[1] ?? artistTokens[0];
    const track0 = trackTokens[0] as string;
    const track1 = trackTokens[1] ?? trackTokens[0];

    const templates = [
      `${artist0} ${track0}`,
      `${artist0.slice(0, 4)} ${track0}`,
      `${artist0} ${track0.slice(0, 4)}`,
      `${artist0} ${artist1} ${track0}`,
      `${artist0} ${track0} ${track1}`
    ];

    const query = normalizeSearchText(pickRandom(rng, templates));
    if (query.length < 3) {
      continue;
    }

    const key = `${query}::${fixture.videoId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cases.push({ query, expectedVideoId: fixture.videoId });
  }

  return cases.slice(0, targetCount);
}

function matchesExpectedResult(
  candidate: { videoId: string; artist: string; track: string },
  testCase: RelevanceContractCase
): boolean {
  return candidate.videoId === testCase.expectedVideoId;
}

async function runRelevanceContract(
  profile: BenchmarkProfile,
  cases: RelevanceContractCase[]
): Promise<RelevanceContractExecution> {
  const repository = createLibsqlVideoRepository();
  const startedAt = Date.now();

  let passed = 0;
  let top2Passed = 0;
  let top3Passed = 0;
  let top4Passed = 0;
  let top5Passed = 0;
  let top10Passed = 0;
  const outcomes: RelevanceContractExecution['outcomes'] = [];
  const failures: RelevanceContractExecution['failures'] = [];

  logProgress(`Relevance start (${profile.label}): ${cases.length} cases`);

  for (const [index, testCase] of cases.entries()) {
    if (RELEVANCE_PROGRESS_EVERY > 0 && (index + 1) % RELEVANCE_PROGRESS_EVERY === 0) {
      const elapsedMs = Date.now() - startedAt;
      const rate = elapsedMs > 0 ? ((index + 1) / elapsedMs) * 1000 : 0;
      logProgress(
        `Relevance progress (${profile.label}): ${index + 1}/${cases.length} in ${(elapsedMs / 1000).toFixed(1)}s (${rate.toFixed(1)} q/s)`
      );
    }

    await sleep(computeCooldownMs(index, profile));
    const results = await repository.searchVideos(testCase.query, SEARCH_LIMIT);
    const topResult = results[0];

    const matchedIndex = results.findIndex((result) => matchesExpectedResult(result, testCase));
    const rank = matchedIndex >= 0 ? matchedIndex + 1 : null;
    const top1Hit = rank === 1;
    const top2Hit = rank !== null && rank <= 2;
    const top3Hit = rank !== null && rank <= 3;
    const top4Hit = rank !== null && rank <= 4;
    const top5Hit = rank !== null && rank <= 5;
    const top10Hit = rank !== null && rank <= 10;

    if (top1Hit) passed += 1;
    if (top2Hit) top2Passed += 1;
    if (top3Hit) top3Passed += 1;
    if (top4Hit) top4Passed += 1;
    if (top5Hit) top5Passed += 1;
    if (top10Hit) top10Passed += 1;

    outcomes.push({
      query: testCase.query,
      expected: testCase.expectedVideoId,
      actualTop1: topResult ? `${topResult.artist} - ${topResult.track}` : '(no result)',
      topResults: results.slice(0, Math.max(1, RELEVANCE_DEBUG_TOPN)).map((result) => {
        return `${result.artist} - ${result.track}`;
      }),
      queryLength: testCase.query.length,
      lengthBin: getLengthBin(testCase.query.length),
      rank,
      top1Hit,
      top2Hit,
      top3Hit,
      top4Hit,
      top5Hit,
      top10Hit
    });

    if (!top1Hit) {
      failures.push({
        query: testCase.query,
        expected: testCase.expectedVideoId,
        actualTop1: topResult ? `${topResult.artist} - ${topResult.track}` : '(no result)',
        topResults: results.slice(0, Math.max(1, RELEVANCE_DEBUG_TOPN)).map((result) => {
          return `${result.artist} - ${result.track}`;
        })
      });
    }
  }

  const total = cases.length;
  return {
    total,
    passed,
    top1HitRate: total > 0 ? passed / total : 1,
    top2HitRate: total > 0 ? top2Passed / total : 1,
    top3HitRate: total > 0 ? top3Passed / total : 1,
    top4HitRate: total > 0 ? top4Passed / total : 1,
    top5HitRate: total > 0 ? top5Passed / total : 1,
    top10HitRate: total > 0 ? top10Passed / total : 1,
    outcomes,
    failures
  };
}

function printScenarioTable(results: ScenarioResult[]): void {
  console.log('');
  console.log('Scenario summary:');
  for (const result of results) {
    console.log(
      `- volume=${result.volume} profile=${result.profileLabel} scenario=${result.scenarioLabel}: ${formatStats(result.stats)}`
    );
  }
}

function printRelevanceContractTable(results: RelevanceContractResult[]): void {
  console.log('');
  console.log('Relevance summary:');
  for (const result of results) {
    console.log(
      `- volume=${result.volume} profile=${result.profileLabel}: top1 ${(result.top1HitRate * 100).toFixed(2)}% | top2 ${(result.top2HitRate * 100).toFixed(2)}% | top3 ${(result.top3HitRate * 100).toFixed(2)}% | top4 ${(result.top4HitRate * 100).toFixed(2)}% | top5 ${(result.top5HitRate * 100).toFixed(2)}% | top10 ${(result.top10HitRate * 100).toFixed(2)}% (${result.passed}/${result.total})`
    );

    const failuresToLog = result.failures.slice(0, RELEVANCE_FAILURE_LOG_LIMIT);
    for (const failure of failuresToLog) {
      console.log(
        `  - ${failure.query} => expected: ${failure.expected}; actual: ${failure.actualTop1}`
      );
      console.log(`    top results: ${failure.topResults.join(' | ') || '(no results)'}`);
    }
    const omitted = result.failures.length - failuresToLog.length;
    if (omitted > 0) {
      console.log(`  ... ${omitted} more failures omitted`);
    }
  }
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function persistResults(
  results: ScenarioResult[],
  relevanceResults: RelevanceContractResult[],
  relevanceCases: RelevanceContractCase[]
): Promise<void> {
  const outputDir = resolve('cache/perf-results');
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `search-benchmark-${timestamp}`;

  const jsonPath = resolve(outputDir, `${baseName}.json`);
  const csvPath = resolve(outputDir, `${baseName}.csv`);
  const relevanceCsvPath = resolve(outputDir, `${baseName}.relevance.csv`);
  const relevanceDetailCsvPath = resolve(outputDir, `${baseName}.relevance-details.csv`);

  const payload = {
    createdAt: new Date().toISOString(),
    configuration: {
      runsPerScenario: RUNS_PER_SCENARIO,
      warmupRuns: WARMUP_RUNS,
      searchLimit: SEARCH_LIMIT,
      datasetSeed: DATASET_SEED,
      datasetProfile: parseDataProfile(),
      relevanceCases: relevanceCases.length,
      enforceTop1Gate: ENFORCE_TOP1_GATE,
      globalTop1Target: GLOBAL_TOP1_TARGET
    },
    results,
    relevanceContract: {
      cases: relevanceCases,
      results: relevanceResults
    }
  };

  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const csvLines = [
    'volume,profile,search_mode,scenario,n,min,mean,median,p90,p95,p99,q1,q3,max,std,iqr,cv'
  ];
  for (const result of results) {
    csvLines.push(
      [
        result.volume,
        result.profileId,
        result.searchModeId,
        result.scenario,
        result.stats.n,
        round(result.stats.min),
        round(result.stats.mean),
        round(result.stats.median),
        round(result.stats.p90),
        round(result.stats.p95),
        round(result.stats.p99),
        round(result.stats.q1),
        round(result.stats.q3),
        round(result.stats.max),
        round(result.stats.std),
        round(result.stats.iqr),
        round(result.stats.cv)
      ].join(',')
    );
  }
  await writeFile(csvPath, `${csvLines.join('\n')}\n`, 'utf8');

  const relevanceCsvLines = [
    'volume,profile,search_mode,total,passed,top1_hit_rate,top2_hit_rate,top3_hit_rate,top4_hit_rate,top5_hit_rate,top10_hit_rate,failures'
  ];

  for (const result of relevanceResults) {
    const failuresToPersist = result.failures.slice(0, RELEVANCE_FAILURE_LOG_LIMIT);
    const failures = failuresToPersist
      .map((failure) => {
        const topResults = failure.topResults.join(' || ');
        return `${failure.query}=>${failure.expected}|${failure.actualTop1}|${topResults}`;
      })
      .join(';')
      .replace(/,/g, ' ');

    const omittedFailures = result.failures.length - failuresToPersist.length;
    const failureSummary =
      omittedFailures > 0 ? `${failures};...${omittedFailures} more` : failures;

    relevanceCsvLines.push(
      [
        result.volume,
        result.profileId,
        result.searchModeId,
        result.total,
        result.passed,
        round(result.top1HitRate, 6),
        round(result.top2HitRate, 6),
        round(result.top3HitRate, 6),
        round(result.top4HitRate, 6),
        round(result.top5HitRate, 6),
        round(result.top10HitRate, 6),
        failureSummary
      ].join(',')
    );
  }

  await writeFile(relevanceCsvPath, `${relevanceCsvLines.join('\n')}\n`, 'utf8');

  const relevanceDetailLines = [
    'volume,profile,search_mode,query,query_length,length_bin,expected,actual_top1,rank,top1_hit,top2_hit,top3_hit,top4_hit,top5_hit,top10_hit,top_results'
  ];

  for (const result of relevanceResults) {
    for (const outcome of result.outcomes) {
      relevanceDetailLines.push(
        [
          result.volume,
          result.profileId,
          result.searchModeId,
          JSON.stringify(outcome.query),
          outcome.queryLength,
          outcome.lengthBin,
          JSON.stringify(outcome.expected),
          JSON.stringify(outcome.actualTop1),
          outcome.rank ?? '',
          outcome.top1Hit ? 1 : 0,
          outcome.top2Hit ? 1 : 0,
          outcome.top3Hit ? 1 : 0,
          outcome.top4Hit ? 1 : 0,
          outcome.top5Hit ? 1 : 0,
          outcome.top10Hit ? 1 : 0,
          JSON.stringify(outcome.topResults.join(' || '))
        ].join(',')
      );
    }
  }

  await writeFile(relevanceDetailCsvPath, `${relevanceDetailLines.join('\n')}\n`, 'utf8');

  console.log('Saved benchmark artifacts:');
  console.log(`- ${jsonPath}`);
  console.log(`- ${csvPath}`);
  console.log(`- ${relevanceCsvPath}`);
  console.log(`- ${relevanceDetailCsvPath}`);
  console.log('');
}

describe('Search performance benchmarks', () => {
  const volumes = parseVolumes();
  const profiles = parseProfiles();
  const dataProfile = parseDataProfile();

  const scenarios: SearchScenario[] = [
    {
      id: 'exact',
      label: 'Exact',
      queries: [
        'metallica enter sandman',
        'shakira waka waka',
        'beyond the black rising high',
        'visions of atlantis master hurricane',
        'mary j blige family affair',
        'linkin park numb',
        'linkin park emptiness machine',
        'arch enemy watcher',
        'bullet for my valentine tears dont fall',
        'nirvana smells like teen spirit'
      ]
    },
    {
      id: 'prefix',
      label: 'Prefix',
      queries: [
        'metal ent',
        'shaki waka',
        'beyon blac',
        'visio atlan',
        'mary blig',
        'link num',
        'link empti',
        'arch en',
        'bull valen',
        'nirv smel'
      ]
    },
    {
      id: 'multi',
      label: 'MultiToken',
      queries: [
        'linkin park',
        'the emptiness machine',
        'visions atlantis',
        'beyond black',
        'family affair',
        'enter sandman',
        'tears dont fall',
        'smells teen spirit',
        'arch enemy',
        'waka waka'
      ]
    }
  ];

  it(
    'benchmarks FTS-only scalability by dataset size',
    async () => {
      expect(volumes.length).toBeGreaterThan(0);
      expect(profiles.length).toBeGreaterThan(0);
      console.log(`Dataset profile: ${dataProfile} (seed=${DATASET_SEED})`);
      console.log(`Relevance contract cases target: ${RELEVANCE_CASES_TARGET}`);
      console.log(`Top-1 gate enforcement: ${ENFORCE_TOP1_GATE ? 'ON' : 'OFF'}`);

      const results: ScenarioResult[] = [];
      const relevanceResults: RelevanceContractResult[] = [];
      let lastRelevanceCases: RelevanceContractCase[] = [];

      for (const profile of profiles) {
        console.log(`Benchmark profile: ${profile.label}`);
        seedFakeVideoGenerator(DATASET_SEED);
        await clearTestDatabase();
        await seedFixtures(CORE_RELEVANCE_FIXTURES);

        let seededVolume = CORE_RELEVANCE_FIXTURES.length;
        const seededCatalog: FakeVideoInput[] = [...CORE_RELEVANCE_FIXTURES];

        for (const [volumeIndex, volume] of volumes.entries()) {
          const targetVolume = Math.max(volume, CORE_RELEVANCE_FIXTURES.length);
          const delta = targetVolume - seededVolume;
          if (delta > 0) {
            console.log(`Seeding +${delta} videos (total ${targetVolume})`);
            const generated = await seedVolume(delta, dataProfile);
            for (const video of generated) {
              seededCatalog.push(video);
            }
            seededVolume = targetVolume;

            const indexCounts = await readSearchIndexCounts();
            const diversityStats = await readDatasetDiversityStats();
            const duplicateRatio =
              indexCounts.videos > 0 ? 1 - diversityStats.uniqueSearchText / indexCounts.videos : 0;
            const prefixLoad =
              diversityStats.uniquePrefix4 > 0
                ? indexCounts.videos / diversityStats.uniquePrefix4
                : indexCounts.videos;

            console.log(`Index counts: videos=${indexCounts.videos} fts=${indexCounts.fts}`);
            console.log(
              `Dataset diversity: uniqueSearchText=${diversityStats.uniqueSearchText} uniqueArtist=${diversityStats.uniqueArtist} uniqueTrack=${diversityStats.uniqueTrack} uniquePrefix4=${diversityStats.uniquePrefix4} duplicateRatio=${(duplicateRatio * 100).toFixed(2)}% prefixLoad=${prefixLoad.toFixed(2)}`
            );
          }

          for (const scenario of scenarios) {
            const stats = await runScenario(scenario, profile);
            results.push({
              volume: targetVolume,
              profileId: profile.id,
              profileLabel: profile.label,
              searchModeId: 'fts-only',
              searchModeLabel: 'FTSOnly',
              scenario: scenario.id,
              scenarioLabel: scenario.label,
              stats
            });

            console.log(`  ${scenario.label} (${profile.label}): ${formatStats(stats)}`);
          }

          const relevanceCases = buildStrictRelevanceCases(
            seededCatalog,
            RELEVANCE_CASES_TARGET,
            DATASET_SEED + targetVolume + volumeIndex * 7919
          );
          lastRelevanceCases = relevanceCases;

          const relevanceExecution = await runRelevanceContract(profile, relevanceCases);
          relevanceResults.push({
            volume: targetVolume,
            profileId: profile.id,
            profileLabel: profile.label,
            searchModeId: 'fts-only',
            searchModeLabel: 'FTSOnly',
            total: relevanceExecution.total,
            passed: relevanceExecution.passed,
            top1HitRate: relevanceExecution.top1HitRate,
            top2HitRate: relevanceExecution.top2HitRate,
            top3HitRate: relevanceExecution.top3HitRate,
            top4HitRate: relevanceExecution.top4HitRate,
            top5HitRate: relevanceExecution.top5HitRate,
            top10HitRate: relevanceExecution.top10HitRate,
            outcomes: relevanceExecution.outcomes,
            failures: relevanceExecution.failures
          });

          console.log(
            `Relevance contract (${profile.label}, ${targetVolume}): top1 ${(relevanceExecution.top1HitRate * 100).toFixed(1)}% | top2 ${(relevanceExecution.top2HitRate * 100).toFixed(1)}% | top3 ${(relevanceExecution.top3HitRate * 100).toFixed(1)}% | top4 ${(relevanceExecution.top4HitRate * 100).toFixed(1)}% | top5 ${(relevanceExecution.top5HitRate * 100).toFixed(1)}% | top10 ${(relevanceExecution.top10HitRate * 100).toFixed(1)}% (${relevanceExecution.passed}/${relevanceExecution.total})`
          );

          if (volumeIndex < volumes.length - 1 && profile.scenarioCooldownMs > 0) {
            await sleep(profile.scenarioCooldownMs);
          }
        }
      }

      printScenarioTable(results);
      printRelevanceContractTable(relevanceResults);

      const globalTotals = relevanceResults.reduce(
        (accumulator, result) => {
          accumulator.total += result.total;
          accumulator.passed += result.passed;
          accumulator.top2 += result.top2HitRate * result.total;
          accumulator.top3 += result.top3HitRate * result.total;
          accumulator.top4 += result.top4HitRate * result.total;
          accumulator.top5 += result.top5HitRate * result.total;
          accumulator.top10 += result.top10HitRate * result.total;
          return accumulator;
        },
        {
          total: 0,
          passed: 0,
          top2: 0,
          top3: 0,
          top4: 0,
          top5: 0,
          top10: 0
        }
      );

      const globalTop1HitRate =
        globalTotals.total > 0 ? globalTotals.passed / globalTotals.total : 1;
      const globalTop2HitRate = globalTotals.total > 0 ? globalTotals.top2 / globalTotals.total : 1;
      const globalTop3HitRate = globalTotals.total > 0 ? globalTotals.top3 / globalTotals.total : 1;
      const globalTop4HitRate = globalTotals.total > 0 ? globalTotals.top4 / globalTotals.total : 1;
      const globalTop5HitRate = globalTotals.total > 0 ? globalTotals.top5 / globalTotals.total : 1;
      const globalTop10HitRate =
        globalTotals.total > 0 ? globalTotals.top10 / globalTotals.total : 1;

      console.log('');
      console.log(
        `Global hit rates: top1 ${(globalTop1HitRate * 100).toFixed(2)}% | top2 ${(globalTop2HitRate * 100).toFixed(2)}% | top3 ${(globalTop3HitRate * 100).toFixed(2)}% | top4 ${(globalTop4HitRate * 100).toFixed(2)}% | top5 ${(globalTop5HitRate * 100).toFixed(2)}% | top10 ${(globalTop10HitRate * 100).toFixed(2)}%`
      );

      if (ENFORCE_TOP1_GATE) {
        expect(
          globalTop1HitRate,
          `Global top-1 relevance ${Math.round(globalTop1HitRate * 10000) / 100}% is below ${(GLOBAL_TOP1_TARGET * 100).toFixed(2)}% target`
        ).toBeGreaterThanOrEqual(GLOBAL_TOP1_TARGET);
      }

      await persistResults(results, relevanceResults, lastRelevanceCases);
    },
    TEST_TIMEOUT_MS
  );
});
