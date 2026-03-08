export interface RecentVideoInput {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
  metadataSource?: 'trusted' | 'fallback';
}

export interface VideoCustomMetadata {
  artist: string;
  track: string;
}

export interface VideoPreferences {
  delay?: number;
  lyricId: number | null;
  metadata: VideoCustomMetadata | null;
}

export interface RecentVideo extends RecentVideoInput {
  timestamp: number;
}

export interface FavoriteVideo extends RecentVideo {
  addedAt: number;
}

export interface IVideoRepository {
  setVideoDelay(videoUrl: string, delay: number): Promise<void>;
  getVideoDelay(videoUrl: string): Promise<number | undefined>;
  setVideoLyricId(
    videoUrl: string,
    lyricId: number | null,
    metadata?: { artist?: string; track?: string }
  ): Promise<void>;
  getVideoLyricId(videoUrl: string): Promise<number | null>;
  getVideoCustomMetadata(videoUrl: string): Promise<VideoCustomMetadata | null>;
  getVideoPreferences(videoUrl: string): Promise<VideoPreferences>;
  addRecentVideo(video: RecentVideoInput): Promise<void>;
  getRecentVideos(): Promise<RecentVideo[]>;
  deleteRecentVideo(videoId: string): Promise<void>;

  addFavoriteVideo(
    video: string,
    metadata?: { artist?: string; track?: string; thumbnailUrl?: string }
  ): Promise<void>;
  removeFavoriteVideo(videoId: string): Promise<void>;
  getFavoriteVideos(): Promise<FavoriteVideo[]>;
  isFavorite(videoId: string): Promise<boolean>;
  close(): void;
}
