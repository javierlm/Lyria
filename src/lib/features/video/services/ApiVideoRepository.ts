import { BaseVideoRepository } from '../domain/BaseVideoRepository';
import type { FavoriteVideo, RecentVideo, RecentVideoInput } from '../domain/IVideoRepository';
import { FAVORITES_LIMIT_ERROR_CODE, FavoritesLimitError } from '../domain/videoRepositoryErrors';
import { extractVideoId } from '$lib/shared/utils';
import type { VideoImportPayload, VideoImportResult } from './videoImportTypes';

async function parseJsonSafely<T>(response: Response, fallback: T): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export class ApiVideoRepository extends BaseVideoRepository {
  private async request(path: string, init?: RequestInit): Promise<Response | null> {
    try {
      const response = await fetch(path, init);
      return response;
    } catch (error) {
      console.warn('[ApiVideoRepository] Request failed:', path, error);
      return null;
    }
  }

  private resolveVideoPathValue(videoUrl: string): string | null {
    const videoId = extractVideoId(videoUrl) ?? videoUrl.trim();
    if (!videoId) {
      return null;
    }

    return encodeURIComponent(videoId);
  }

  async setVideoDelay(videoUrl: string, delay: number): Promise<void> {
    const videoPathValue = this.resolveVideoPathValue(videoUrl);
    if (!videoPathValue) {
      return;
    }

    await this.request(`/api/videos/preferences/${videoPathValue}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay })
    });
  }

  async getVideoDelay(videoUrl: string): Promise<number | undefined> {
    const videoPathValue = this.resolveVideoPathValue(videoUrl);
    if (!videoPathValue) {
      return undefined;
    }

    const response = await this.request(`/api/videos/preferences/${videoPathValue}`);
    if (!response?.ok) {
      return undefined;
    }

    const payload = await parseJsonSafely<{ delay?: number }>(response, {});
    return typeof payload.delay === 'number' ? payload.delay : undefined;
  }

  async setVideoLyricId(
    videoUrl: string,
    lyricId: number | null,
    metadata?: { artist?: string; track?: string }
  ): Promise<void> {
    const videoPathValue = this.resolveVideoPathValue(videoUrl);
    if (!videoPathValue) {
      return;
    }

    await this.request(`/api/videos/preferences/${videoPathValue}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyricId, metadata })
    });
  }

  async getVideoLyricId(videoUrl: string): Promise<number | null> {
    const videoPathValue = this.resolveVideoPathValue(videoUrl);
    if (!videoPathValue) {
      return null;
    }

    const response = await this.request(`/api/videos/preferences/${videoPathValue}`);
    if (!response?.ok) {
      return null;
    }

    const payload = await parseJsonSafely<{ lyricId?: number | null }>(response, {});
    return payload.lyricId ?? null;
  }

  async addRecentVideo(video: RecentVideoInput): Promise<void> {
    await this.request('/api/videos/recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video)
    });
  }

  async getRecentVideos(): Promise<RecentVideo[]> {
    const response = await this.request('/api/videos/recent');
    if (!response?.ok) {
      return [];
    }

    const payload = await parseJsonSafely<RecentVideo[]>(response, []);
    return Array.isArray(payload) ? payload : [];
  }

  async deleteRecentVideo(videoId: string): Promise<void> {
    const response = await this.request(`/api/videos/recent/${encodeURIComponent(videoId)}`, {
      method: 'DELETE'
    });

    if (!response) {
      throw new Error('Request failed while deleting recent video');
    }

    if (!response.ok) {
      throw new Error(`Failed to delete recent video: ${response.status}`);
    }
  }

  async addFavoriteVideo(
    videoId: string,
    metadata?: { artist?: string; track?: string; thumbnailUrl?: string }
  ): Promise<void> {
    const response = await this.request(`/api/videos/favorites/${encodeURIComponent(videoId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata ?? {})
    });

    if (!response) {
      throw new Error('Request failed while adding favorite video');
    }

    if (!response.ok) {
      const payload = await parseJsonSafely<{ code?: string }>(response, {});

      if (response.status === 409 && payload.code === FAVORITES_LIMIT_ERROR_CODE) {
        throw new FavoritesLimitError();
      }

      throw new Error(`Failed to add favorite video: ${response.status}`);
    }
  }

  async removeFavoriteVideo(videoId: string): Promise<void> {
    await this.request(`/api/videos/favorites/${encodeURIComponent(videoId)}`, {
      method: 'DELETE'
    });
  }

  async getFavoriteVideos(): Promise<FavoriteVideo[]> {
    const response = await this.request('/api/videos/favorites');
    if (!response?.ok) {
      return [];
    }

    const payload = await parseJsonSafely<FavoriteVideo[]>(response, []);
    return Array.isArray(payload) ? payload : [];
  }

  async isFavorite(videoId: string): Promise<boolean> {
    const response = await this.request(`/api/videos/favorites/${encodeURIComponent(videoId)}`);
    if (!response?.ok) {
      return false;
    }

    const payload = await parseJsonSafely<{ isFavorite?: boolean }>(response, {});
    return payload.isFavorite === true;
  }

  async importVideos(payload: VideoImportPayload): Promise<VideoImportResult> {
    const response = await this.request('/api/videos/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response?.ok) {
      return {
        importedRecents: 0,
        importedFavorites: 0,
        skippedExisting: 0,
        skippedByLimit: 0,
        failed: payload.recents.length + payload.favorites.length
      };
    }

    return await parseJsonSafely<VideoImportResult>(response, {
      importedRecents: 0,
      importedFavorites: 0,
      skippedExisting: 0,
      skippedByLimit: 0,
      failed: payload.recents.length + payload.favorites.length
    });
  }
}

export const apiVideoRepository = new ApiVideoRepository();
