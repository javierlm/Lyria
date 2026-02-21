import { faker } from '@faker-js/faker';

export type FakeDataProfile = 'balanced' | 'noisy' | 'clone-heavy';

const DEFAULT_FAKE_SEED = 12345;
let generatorInitialized = false;

const NOISY_ARTIST_ROOTS = [
  'Mary',
  'Machine',
  'Metro',
  'Link',
  'Metal',
  'Park',
  'Paul',
  'Manuel',
  'Ford',
  'Wells'
];

const NOISY_TRACK_ROOTS = [
  'Night',
  'Day',
  'Machine',
  'Sandman',
  'Love',
  'Body',
  'Ghost',
  'Hero',
  'Touch',
  'Believe'
];

const CLONE_ARTISTS = [
  'Mary Ford',
  'Mary Wells',
  'Machine Gun Kelly',
  'Linkin Park',
  'Metro Boomin',
  'Paul Whiteman',
  'Florence + The Machine'
];

const CLONE_TRACKS = [
  'Night & Day',
  'Body & Soul',
  'Theme From Greatest Hero',
  'Enter Sandman',
  'The Emptiness Machine',
  'Call Me Maybe',
  'Believe It Or Not'
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

function buildNormalizedVideoFields(artist: string, track: string) {
  const artistNormalized = normalizeSearchText(artist);
  const trackNormalized = normalizeSearchText(track);

  return {
    artistNormalized,
    trackNormalized,
    searchTextNormalized: `${artistNormalized} ${trackNormalized}`.trim()
  };
}

function generateYouTubeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let id = '';
  for (let i = 0; i < 11; i++) {
    id += chars.charAt(faker.number.int({ min: 0, max: chars.length - 1 }));
  }
  return id;
}

function ensureGeneratorInitialized(): void {
  if (generatorInitialized) {
    return;
  }

  faker.seed(DEFAULT_FAKE_SEED);
  generatorInitialized = true;
}

export function seedFakeVideoGenerator(seed: number): void {
  faker.seed(seed);
  generatorInitialized = true;
}

function pickRandomItem(values: string[]): string {
  return faker.helpers.arrayElement(values);
}

function randomSuffix(minWords: number, maxWords: number): string {
  const words = faker.number.int({ min: minWords, max: maxWords });
  const parts: string[] = [];
  for (let index = 0; index < words; index++) {
    parts.push(faker.word.noun());
  }

  return parts.join(' ');
}

function generateBalancedArtist(): string {
  if (faker.number.float({ min: 0, max: 1, multipleOf: 0.01 }) < 0.7) {
    return faker.music.artist();
  }

  return `${faker.person.lastName()} ${faker.word.noun()}`;
}

function generateBalancedTrack(): string {
  if (faker.number.float({ min: 0, max: 1, multipleOf: 0.01 }) < 0.7) {
    return faker.music.songName();
  }

  return `${faker.word.verb()} ${faker.word.noun()}`;
}

function generateNoisyArtist(): string {
  const root = pickRandomItem(NOISY_ARTIST_ROOTS);
  return `${root} ${randomSuffix(1, 2)}`;
}

function generateNoisyTrack(): string {
  const root = pickRandomItem(NOISY_TRACK_ROOTS);
  return `${root} ${randomSuffix(1, 3)}`;
}

function generateCloneHeavyArtist(): string {
  const root = pickRandomItem(CLONE_ARTISTS);
  return `${root} ${faker.number.int({ min: 1, max: 120 })}`;
}

function generateCloneHeavyTrack(): string {
  const root = pickRandomItem(CLONE_TRACKS);
  return `${root} ${faker.number.int({ min: 1, max: 300 })}`;
}

function generateArtist(profile: FakeDataProfile): string {
  if (profile === 'noisy') {
    return generateNoisyArtist();
  }

  if (profile === 'clone-heavy') {
    return generateCloneHeavyArtist();
  }

  return generateBalancedArtist();
}

function generateTrack(profile: FakeDataProfile): string {
  if (profile === 'noisy') {
    return generateNoisyTrack();
  }

  if (profile === 'clone-heavy') {
    return generateCloneHeavyTrack();
  }

  return generateBalancedTrack();
}

export interface FakeVideoInput {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl: string;
  artistNormalized: string;
  trackNormalized: string;
  searchTextNormalized: string;
}

export function generateFakeVideos(
  count: number,
  profile: FakeDataProfile = 'balanced'
): FakeVideoInput[] {
  const videos: FakeVideoInput[] = [];

  ensureGeneratorInitialized();

  for (let i = 0; i < count; i++) {
    const artist = generateArtist(profile);
    const track = generateTrack(profile);
    const videoId = generateYouTubeId();
    const { artistNormalized, trackNormalized, searchTextNormalized } = buildNormalizedVideoFields(
      artist,
      track
    );

    videos.push({
      videoId,
      artist,
      track,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      artistNormalized,
      trackNormalized,
      searchTextNormalized
    });
  }

  return videos;
}
