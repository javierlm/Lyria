export interface RecentVideo {
	videoId: string;
	artist: string;
	track: string;
	timestamp: number;
	thumbnailUrl?: string;
}

export interface IVideoRepository {
	setVideoDelay(videoUrl: string, delay: number): Promise<void>;
	getVideoDelay(videoUrl: string): Promise<number | undefined>;
	addRecentVideo(video: RecentVideo): Promise<void>;
	getRecentVideos(): Promise<RecentVideo[]>;
	deleteRecentVideo(videoId: string): Promise<void>;
}
