export interface RecentVideo {
	videoId: string;
	artist: string;
	track: string;
	timestamp: number;
	thumbnailUrl?: string;
}

export interface FavoriteVideo extends RecentVideo {
	addedAt: number;
}

export interface IVideoRepository {
	setVideoDelay(videoUrl: string, delay: number): Promise<void>;
	getVideoDelay(videoUrl: string): Promise<number | undefined>;
	addRecentVideo(video: RecentVideo): Promise<void>;
	getRecentVideos(): Promise<RecentVideo[]>;
	deleteRecentVideo(videoId: string): Promise<void>;

	addFavoriteVideo(video: string): Promise<void>;
	removeFavoriteVideo(videoId: string): Promise<void>;
	getFavoriteVideos(): Promise<FavoriteVideo[]>;
	isFavorite(videoId: string): Promise<boolean>;
}
