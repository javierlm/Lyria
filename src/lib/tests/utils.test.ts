import { test, expect } from 'vitest';
import { parseTitle, isLyricVideoTitle } from '../shared/utils';

const testCases = [
  { input: 'Artist - Track', expected: { artist: 'Artist', track: 'Track' } },
  { input: 'Artist - Track (feat. Other)', expected: { artist: 'Artist Other', track: 'Track' } },
  { input: 'Artist - Track [Official Video]', expected: { artist: 'Artist', track: 'Track' } },
  {
    input: 'Artist - Track (2005 VERSION OFFICIAL VIDEO)',
    expected: { artist: 'Artist', track: 'Track' }
  },
  {
    input: 'Artist - Track (Official Video) feat. Other & Another Singer',
    expected: { artist: 'Artist Other Another Singer', track: 'Track' }
  },
  { input: 'Artist – Track', expected: { artist: 'Artist', track: 'Track' } },
  { input: 'Artist ft. Other - Track', expected: { artist: 'Artist Other', track: 'Track' } },
  { input: 'Artist feat. Other - Track', expected: { artist: 'Artist Other', track: 'Track' } },
  {
    input: 'Artist - Track - (sometext) (OFFICIAL VIDEO)',
    expected: { artist: 'Artist', track: 'Track' }
  },
  {
    input: 'Artist - メタり！！ (feat. Other) (OFFICIAL)',
    expected: { artist: 'Artist Other', track: 'メタり！！' }
  },
  { input: 'Artist | Track', expected: { artist: 'Artist', track: 'Track' } },
  {
    input: 'VISIONS OF ATLANTIS - Hellfire (Official Video) | Napalm Records',
    expected: { artist: 'VISIONS OF ATLANTIS', track: 'Hellfire' }
  },
  {
    input: 'Afterlife (from the Netflix series "Devil May Cry") - Official Music Video',
    expected: { artist: '', track: 'Afterlife' }
  },
  {
    input: 'BABYMETAL x @ElectricCallboy - RATATATA (OFFICIAL VIDEO)',
    expected: { artist: 'BABYMETAL x Electric Callboy', track: 'RATATATA' }
  },
  {
    input: 'Artist ft. Other Compound-Surname - Song Name (Official Video)',
    expected: { artist: 'Artist Other Compound Surname', track: 'Song Name' }
  },
  {
    input: 'Adele - Rolling in the Deep (Official Video)',
    expected: { artist: 'Adele', track: 'Rolling in the Deep' }
  }
];

for (const { input, expected } of testCases) {
  test(`should parse "${input}" correctly`, () => {
    expect(parseTitle(input)).toEqual(expected);
  });
}

// Lyric video detection tests
const lyricVideoTestCases = [
  { input: 'Artist - Song (Official Lyric Video)', expected: true },
  { input: 'Artist - Song (Lyrics)', expected: true },
  { input: 'Artist - Song [LYRICS]', expected: true },
  { input: 'Artist - Song with lyrics on screen', expected: true },
  { input: 'Artist - Song (Letra Oficial)', expected: true },
  { input: 'Artist - Song (Letras)', expected: true },
  { input: 'Artist - Song (Official Video)', expected: false },
  { input: 'Artist - Song (Music Video)', expected: false },
  { input: 'Artist - Song', expected: false },
  { input: 'Artist - Song (Live)', expected: false },
  { input: 'Artist - Lyrical Masterpiece', expected: false }
];

for (const { input, expected } of lyricVideoTestCases) {
  test(`isLyricVideoTitle: "${input}" should return ${expected}`, () => {
    expect(isLyricVideoTitle(input)).toBe(expected);
  });
}
