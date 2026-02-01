import type { WikidataBinding, WikidataResponse, WikidataSong } from '../domain/SongOfTheDay';

export class WikidataMusicService {
  private readonly endpoint = 'https://query.wikidata.org/sparql';

  /**
   * Get songs released on a specific month and day (any year from 1950 to current year - 1)
   * Only returns songs with YouTube video ID
   */
  async getSongsByAnniversary(
    month: number,
    day: number,
    currentYear: number
  ): Promise<WikidataSong[]> {
    const query = `
			SELECT DISTINCT ?single ?singleLabel ?artist ?artistLabel ?date ?year ?videoId
			WHERE {
				?single wdt:P31 wd:Q134556 ;
					wdt:P577 ?date ;
					wdt:P175 ?artist ;
					wdt:P1651 ?videoId .

				FILTER(MONTH(?date) = ${month} && DAY(?date) = ${day})
				BIND(YEAR(?date) as ?year)
				FILTER(?year >= 1950 && ?year < ${currentYear})

				SERVICE wikibase:label {
					bd:serviceParam wikibase:language "en,es,de,fr,it,pt,ja" .
					?single rdfs:label ?singleLabel .
					?artist rdfs:label ?artistLabel .
				}
			}
			ORDER BY MD5(CONCAT(STR(?single), STR(NOW())))
			LIMIT 10
		`;

    try {
      const response = await fetch(`${this.endpoint}?query=${encodeURIComponent(query)}`, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'Lyria SongOfTheDay (https://github.com/user/Lyria)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikidata query failed: ${response.status}`);
      }

      const data = await response.json();
      return this.parseResults(data);
    } catch (error) {
      console.error('Wikidata query error:', error);
      return [];
    }
  }

  /**
   * Get a random song from any date between 1950 and current year - 1
   * Used as fallback when anniversary query returns no results
   */
  async getRandomSong(currentYear: number): Promise<WikidataSong | null> {
    const query = `
			SELECT ?single ?singleLabel ?artist ?artistLabel ?date ?year ?videoId
			WHERE {
				?single wdt:P31 wd:Q134556 ;
					wdt:P577 ?date ;
					wdt:P175 ?artist ;
					wdt:P1651 ?videoId .

				BIND(YEAR(?date) as ?year)
				FILTER(?year >= 1950 && ?year < ${currentYear})

				SERVICE wikibase:label {
					bd:serviceParam wikibase:language "en,es,de,fr,it,pt,ja" .
					?single rdfs:label ?singleLabel .
					?artist rdfs:label ?artistLabel .
				}
			}
			ORDER BY MD5(CONCAT(STR(?single), STR(NOW())))
			LIMIT 1
		`;

    try {
      const response = await fetch(`${this.endpoint}?query=${encodeURIComponent(query)}`, {
        headers: {
          Accept: 'application/sparql-results+json',
          'User-Agent': 'Lyria SongOfTheDay (https://github.com/user/Lyria)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikidata query failed: ${response.status}`);
      }

      const data = await response.json();
      const results = this.parseResults(data);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Wikidata random query error:', error);
      return null;
    }
  }

  private parseResults(data: WikidataResponse): WikidataSong[] {
    if (!data.results?.bindings) {
      return [];
    }

    return data.results.bindings.map((binding: WikidataBinding) => ({
      singleId: binding.single?.value?.replace('http://www.wikidata.org/entity/', '') || '',
      title: binding.singleLabel?.value || '',
      artistId: binding.artist?.value?.replace('http://www.wikidata.org/entity/', '') || '',
      artistName: binding.artistLabel?.value || '',
      date: binding.date?.value || '',
      year: Number.parseInt(binding.year?.value || '0', 10),
      videoId: binding.videoId?.value || ''
    }));
  }
}
