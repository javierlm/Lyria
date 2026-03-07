import { getArtistFromYouTubeAuthor, parseTitle } from '$lib/shared/utils';

export interface YouTubeMetadata {
  title: string;
  author: string;
  artist: string;
  track: string;
  thumbnailUrl: string;
}

interface FetchMetadataOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface CachedMetadataEntry {
  expiresAt: number;
  value: YouTubeMetadata;
}

const METADATA_CACHE_TTL_MS = 15 * 60 * 1000;
const metadataCache = new Map<string, CachedMetadataEntry>();

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function getCachedMetadata(videoId: string): YouTubeMetadata | null {
  const cached = metadataCache.get(videoId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    metadataCache.delete(videoId);
    return null;
  }

  return cached.value;
}

function setCachedMetadata(videoId: string, value: YouTubeMetadata): void {
  metadataCache.set(videoId, {
    expiresAt: Date.now() + METADATA_CACHE_TTL_MS,
    value
  });
}

export async function fetchYouTubeMetadata(
  videoId: string,
  options: FetchMetadataOptions = {}
): Promise<YouTubeMetadata | null> {
  const cached = getCachedMetadata(videoId);
  if (cached) {
    return cached;
  }

  const { signal, timeoutMs } = options;
  const timeoutController = new AbortController();
  const timeoutId =
    typeof timeoutMs === 'number'
      ? setTimeout(() => {
          timeoutController.abort();
        }, timeoutMs)
      : undefined;

  const signals = signal ? [signal, timeoutController.signal] : [timeoutController.signal];
  const combinedSignal = AbortSignal.any(signals);

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl, { signal: combinedSignal });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
    };

    const title = data.title?.trim() ?? '';
    const author = data.author_name?.trim() ?? '';
    const parsed = parseTitle(title);

    const metadata = {
      title,
      author,
      artist: parsed.artist || getArtistFromYouTubeAuthor(author),
      track: parsed.track || title,
      thumbnailUrl: getYouTubeThumbnailUrl(videoId)
    };

    setCachedMetadata(videoId, metadata);
    return metadata;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }

    console.error('Error fetching YouTube metadata:', error);
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
