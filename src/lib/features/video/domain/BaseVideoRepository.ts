import type { FavoriteVideo, IVideoRepository, RecentVideo } from './IVideoRepository';

export abstract class BaseVideoRepository implements IVideoRepository {
  abstract setVideoDelay(videoUrl: string, delay: number): Promise<void>;
  abstract getVideoDelay(videoUrl: string): Promise<number | undefined>;
  abstract setVideoLyricId(videoUrl: string, lyricId: number | null): Promise<void>;
  abstract getVideoLyricId(videoUrl: string): Promise<number | null>;
  abstract addRecentVideo(video: RecentVideo): Promise<void>;
  abstract getRecentVideos(): Promise<RecentVideo[]>;
  abstract deleteRecentVideo(videoId: string): Promise<void>;
  abstract addFavoriteVideo(videoId: string): Promise<void>;
  abstract removeFavoriteVideo(videoId: string): Promise<void>;
  abstract getFavoriteVideos(): Promise<FavoriteVideo[]>;
  abstract isFavorite(videoId: string): Promise<boolean>;

  close(): void {
    // No-op by default for stateless repositories
  }
}
