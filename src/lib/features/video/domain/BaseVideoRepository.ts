import type {
  FavoriteVideo,
  IVideoRepository,
  RecentVideo,
  RecentVideoInput,
  VideoCustomMetadata,
  VideoPreferences
} from './IVideoRepository';

export abstract class BaseVideoRepository implements IVideoRepository {
  abstract setVideoDelay(videoUrl: string, delay: number): Promise<void>;
  abstract getVideoDelay(videoUrl: string): Promise<number | undefined>;
  abstract setVideoLyricId(
    videoUrl: string,
    lyricId: number | null,
    metadata?: { artist?: string; track?: string }
  ): Promise<void>;
  abstract getVideoLyricId(videoUrl: string): Promise<number | null>;
  abstract getVideoCustomMetadata(videoUrl: string): Promise<VideoCustomMetadata | null>;

  async getVideoPreferences(videoUrl: string): Promise<VideoPreferences> {
    const [delay, lyricId, metadata] = await Promise.all([
      this.getVideoDelay(videoUrl),
      this.getVideoLyricId(videoUrl),
      this.getVideoCustomMetadata(videoUrl)
    ]);

    return {
      delay,
      lyricId,
      metadata
    };
  }

  abstract addRecentVideo(video: RecentVideoInput): Promise<void>;
  abstract getRecentVideos(): Promise<RecentVideo[]>;
  abstract deleteRecentVideo(videoId: string): Promise<void>;
  abstract addFavoriteVideo(
    videoId: string,
    metadata?: { artist?: string; track?: string; thumbnailUrl?: string }
  ): Promise<void>;
  abstract removeFavoriteVideo(videoId: string): Promise<void>;
  abstract getFavoriteVideos(): Promise<FavoriteVideo[]>;
  abstract isFavorite(videoId: string): Promise<boolean>;

  close(): void {
    // No-op by default for stateless repositories
  }
}
