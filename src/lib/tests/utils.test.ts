import { test, expect } from 'vitest';
import { parseTitle } from '../shared/utils';

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
	}
];

for (const { input, expected } of testCases) {
	test(`should parse "${input}" correctly`, () => {
		expect(parseTitle(input)).toEqual(expected);
	});
}
