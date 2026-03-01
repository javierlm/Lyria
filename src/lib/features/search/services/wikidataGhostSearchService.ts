import { isValidYouTubeId } from '$lib/shared/utils';
import type { VideoItem } from '../stores/searchStore.svelte';

interface WikidataSearchEntity {
  id?: string;
  label?: string;
  aliases?: string[];
  match?: {
    text?: string;
  };
}

interface WikidataEntitySearchResponse {
  search?: WikidataSearchEntity[];
}

interface WikidataBindingValue {
  value?: string;
}

interface WikidataBinding {
  singleLabel?: WikidataBindingValue;
  artistLabel?: WikidataBindingValue;
  videoId?: WikidataBindingValue;
}

interface WikidataSparqlResponse {
  results?: {
    bindings?: WikidataBinding[];
  };
}

export interface WikidataGhostSearchPage {
  results: VideoItem[];
  hasMoreArtist: boolean;
  hasMoreTitle: boolean;
  nextArtistOffset: number;
  nextTitleOffset: number;
}

function normalizeExactMatchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeSparqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isQid(value: string): boolean {
  return /^Q\d+$/i.test(value.trim());
}

function resolveExactEntity(
  entities: WikidataSearchEntity[],
  normalizedQuery: string
): WikidataSearchEntity | null {
  for (const entity of entities) {
    const candidates = [entity.label, entity.match?.text, ...(entity.aliases ?? [])]
      .filter((candidate): candidate is string => Boolean(candidate))
      .map((candidate) => normalizeExactMatchValue(candidate));

    if (candidates.includes(normalizedQuery)) {
      return entity;
    }
  }

  return entities[0] ?? null;
}

export class WikidataGhostSearchService {
  private readonly wikidataApiUrl = 'https://www.wikidata.org/w/api.php';
  private readonly sparqlEndpoint = 'https://query.wikidata.org/sparql';

  private parseBindingsToVideos(bindings: WikidataBinding[], fallbackArtist: string): VideoItem[] {
    const unique = new Set<string>();
    const results: VideoItem[] = [];

    for (const binding of bindings) {
      const videoId = binding.videoId?.value ?? '';
      if (!isValidYouTubeId(videoId) || unique.has(videoId)) {
        continue;
      }

      unique.add(videoId);

      results.push({
        videoId,
        artist: binding.artistLabel?.value ?? fallbackArtist,
        track: binding.singleLabel?.value ?? 'Unknown Track',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        timestamp: null,
        isFavorite: false,
        isGhost: true,
        source: 'ghost'
      });
    }

    return results;
  }

  private getSafeLimit(value: number): number {
    return Math.max(1, Math.min(value, 50));
  }

  private async resolveArtistQid(
    artistOrQid: string,
    signal?: AbortSignal
  ): Promise<string | null> {
    const trimmedInput = artistOrQid.trim();
    if (!trimmedInput) {
      return null;
    }

    if (isQid(trimmedInput)) {
      return trimmedInput.toUpperCase();
    }

    const params = new URLSearchParams({
      action: 'wbsearchentities',
      format: 'json',
      type: 'item',
      language: 'en',
      uselang: 'en',
      limit: '10',
      search: trimmedInput,
      origin: '*'
    });

    const response = await fetch(`${this.wikidataApiUrl}?${params.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(`Wikidata entity search failed: ${response.status}`);
    }

    const data = (await response.json()) as WikidataEntitySearchResponse;
    const entities = data.search ?? [];
    if (entities.length === 0) {
      return null;
    }

    const normalizedQuery = normalizeExactMatchValue(trimmedInput);
    return resolveExactEntity(entities, normalizedQuery)?.id ?? null;
  }

  private async searchArtistVideosPage(
    artistOrQid: string,
    limit: number,
    offset: number,
    signal?: AbortSignal
  ): Promise<{ results: VideoItem[]; hasMore: boolean; nextOffset: number }> {
    const qid = await this.resolveArtistQid(artistOrQid, signal);
    if (!qid) {
      return {
        results: [],
        hasMore: false,
        nextOffset: offset
      };
    }

    const safeLimit = this.getSafeLimit(limit);
    const safeOffset = Math.max(0, offset);
    const query = `
      SELECT DISTINCT ?single ?singleLabel ?artistLabel ?videoId
      WHERE {
        ?single wdt:P175 wd:${qid} ;
                wdt:P1651 ?videoId .

        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "en,es,de,fr,it,pt,ja" .
          ?single rdfs:label ?singleLabel .
          wd:${qid} rdfs:label ?artistLabel .
        }
      }
      ORDER BY ?single
      LIMIT ${safeLimit + 1}
      OFFSET ${safeOffset}
    `;

    const response = await fetch(`${this.sparqlEndpoint}?query=${encodeURIComponent(query)}`, {
      signal,
      headers: {
        Accept: 'application/sparql-results+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Wikidata SPARQL artist query failed: ${response.status}`);
    }

    const data = (await response.json()) as WikidataSparqlResponse;
    const bindings = data.results?.bindings ?? [];
    const hasMore = bindings.length > safeLimit;

    return {
      results: this.parseBindingsToVideos(bindings.slice(0, safeLimit), artistOrQid.trim()),
      hasMore,
      nextOffset: safeOffset + safeLimit
    };
  }

  private async searchTitleVideosPage(
    queryText: string,
    limit: number,
    offset: number,
    signal?: AbortSignal
  ): Promise<{ results: VideoItem[]; hasMore: boolean; nextOffset: number }> {
    const trimmedQuery = queryText.trim();
    if (!trimmedQuery) {
      return {
        results: [],
        hasMore: false,
        nextOffset: offset
      };
    }

    const safeLimit = this.getSafeLimit(limit);
    const safeOffset = Math.max(0, offset);
    const query = `
      SELECT DISTINCT ?single ?singleLabel ?artistLabel ?videoId
      WHERE {
        SERVICE wikibase:mwapi {
          bd:serviceParam wikibase:endpoint "www.wikidata.org" ;
                          wikibase:api "EntitySearch" ;
                          mwapi:search "${escapeSparqlString(trimmedQuery)}" ;
                          mwapi:language "en" .
          ?single wikibase:apiOutputItem mwapi:item .
        }

        ?single wdt:P1651 ?videoId .
        OPTIONAL { ?single wdt:P175 ?artist . }

        SERVICE wikibase:label {
          bd:serviceParam wikibase:language "en,es,de,fr,it,pt,ja" .
          ?single rdfs:label ?singleLabel .
          ?artist rdfs:label ?artistLabel .
        }
      }
      ORDER BY ?single
      LIMIT ${safeLimit + 1}
      OFFSET ${safeOffset}
    `;

    const response = await fetch(`${this.sparqlEndpoint}?query=${encodeURIComponent(query)}`, {
      signal,
      headers: {
        Accept: 'application/sparql-results+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Wikidata SPARQL title query failed: ${response.status}`);
    }

    const data = (await response.json()) as WikidataSparqlResponse;
    const bindings = data.results?.bindings ?? [];
    const hasMore = bindings.length > safeLimit;
    const normalizedQuery = normalizeExactMatchValue(trimmedQuery);

    const results = this.parseBindingsToVideos(bindings.slice(0, safeLimit), 'Unknown Artist').sort(
      (a, b) => {
        const aExact = normalizeExactMatchValue(a.track) === normalizedQuery;
        const bExact = normalizeExactMatchValue(b.track) === normalizedQuery;

        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }

        return 0;
      }
    );

    return {
      results,
      hasMore,
      nextOffset: safeOffset + safeLimit
    };
  }

  async searchVideosPage(
    queryText: string,
    options: {
      limit?: number;
      artistOffset?: number;
      titleOffset?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<WikidataGhostSearchPage> {
    const safeLimit = this.getSafeLimit(options.limit ?? 20);
    const artistOffset = Math.max(0, options.artistOffset ?? 0);
    const titleOffset = Math.max(0, options.titleOffset ?? 0);
    const signal = options.signal;

    const [titlePage, artistPage] = await Promise.allSettled([
      this.searchTitleVideosPage(queryText, safeLimit, titleOffset, signal),
      this.searchArtistVideosPage(queryText, safeLimit, artistOffset, signal)
    ]);

    const titleResults =
      titlePage.status === 'fulfilled'
        ? titlePage.value
        : { results: [] as VideoItem[], hasMore: false, nextOffset: titleOffset };
    const artistResults =
      artistPage.status === 'fulfilled'
        ? artistPage.value
        : { results: [] as VideoItem[], hasMore: false, nextOffset: artistOffset };

    const merged: VideoItem[] = [];
    const seen = new Set<string>();

    const append = (results: VideoItem[]) => {
      for (const result of results) {
        if (seen.has(result.videoId)) {
          continue;
        }

        seen.add(result.videoId);
        merged.push(result);
      }
    };

    append(titleResults.results);
    append(artistResults.results);

    return {
      results: merged,
      hasMoreArtist: artistResults.hasMore,
      hasMoreTitle: titleResults.hasMore,
      nextArtistOffset: artistResults.nextOffset,
      nextTitleOffset: titleResults.nextOffset
    };
  }

  async searchVideos(queryText: string, limit = 20, signal?: AbortSignal): Promise<VideoItem[]> {
    const page = await this.searchVideosPage(queryText, { limit, signal });
    return page.results;
  }
}

export const wikidataGhostSearchService = new WikidataGhostSearchService();
