import type { IVideoRepository, RecentVideo, FavoriteVideo } from '../domain/IVideoRepository';
import { playerState } from '$lib/features/player/stores/playerStore.svelte';

const DB_NAME = 'LyricsTubeDB';
const VIDEO_DELAYS_STORE = 'videoDelays';
const RECENT_VIDEOS_STORE = 'recentVideos';
const FAVORITE_VIDEOS_STORE = 'favoriteVideos';
const DB_VERSION = 4;
const RECENT_VIDEOS_LIMIT = 100;

let db: IDBDatabase | null = null;

class IndexedDBVideoRepository implements IVideoRepository {
	private async openDB(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			if (db) {
				resolve(db);
				return;
			}

			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(VIDEO_DELAYS_STORE)) {
					db.createObjectStore(VIDEO_DELAYS_STORE);
				}
				if (!db.objectStoreNames.contains(RECENT_VIDEOS_STORE)) {
					const recentVideosStore = db.createObjectStore(RECENT_VIDEOS_STORE, {
						keyPath: 'videoId'
					});
					recentVideosStore.createIndex('timestamp', 'timestamp', { unique: false });
				} else if (event.oldVersion < 3) {
					const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction;
					if (!upgradeTransaction) {
						console.error('Upgrade transaction is null');
						return;
					}
					const recentVideosStore = upgradeTransaction.objectStore(RECENT_VIDEOS_STORE);

					recentVideosStore.openCursor().onsuccess = (cursorEvent) => {
						const cursor = (cursorEvent.target as IDBRequest).result;
						if (cursor) {
							const video = cursor.value;
							if (!video.thumbnailUrl) {
								video.thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
								cursor.update(video);
							}
							cursor.continue();
						}
					};
				}

				if (!db.objectStoreNames.contains(FAVORITE_VIDEOS_STORE)) {
					const favoriteVideosStore = db.createObjectStore(FAVORITE_VIDEOS_STORE, {
						keyPath: 'videoId'
					});
					favoriteVideosStore.createIndex('addedAt', 'addedAt', { unique: false });
				}
			};

			request.onsuccess = (event) => {
				db = (event.target as IDBOpenDBRequest).result;
				resolve(db);
			};

			request.onerror = (event) => {
				reject('Error opening IndexedDB: ' + (event.target as IDBOpenDBRequest).error);
			};
		});
	}

	async setVideoDelay(videoUrl: string, delay: number): Promise<void> {
		const db = await this.openDB();
		const transaction = db.transaction([VIDEO_DELAYS_STORE], 'readwrite');
		const store = transaction.objectStore(VIDEO_DELAYS_STORE);

		if (delay === 0) {
			store.delete(videoUrl);
		} else {
			store.put(delay, videoUrl);
		}

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = (event) =>
				reject('Error setting video delay: ' + (event.target as IDBTransaction).error);
		});
	}

	async getVideoDelay(videoUrl: string): Promise<number | undefined> {
		const db = await this.openDB();
		const transaction = db.transaction([VIDEO_DELAYS_STORE], 'readonly');
		const store = transaction.objectStore(VIDEO_DELAYS_STORE);

		return new Promise((resolve, reject) => {
			const request = store.get(videoUrl);
			request.onsuccess = (event) => resolve((event.target as IDBRequest).result);
			request.onerror = (event) =>
				reject('Error getting video delay: ' + (event.target as IDBRequest).error);
		});
	}

	async addRecentVideo(video: RecentVideo): Promise<void> {
		const db = await this.openDB();
		const transaction = db.transaction([RECENT_VIDEOS_STORE], 'readwrite');
		const store = transaction.objectStore(RECENT_VIDEOS_STORE);

		return new Promise((resolve, reject) => {
			const getRequest = store.get(video.videoId);
			getRequest.onsuccess = () => {
				const existingVideo = getRequest.result;
				if (existingVideo) {
					// If video exists, update timestamp and thumbnail URL
					existingVideo.timestamp = video.timestamp;
					existingVideo.thumbnailUrl = video.thumbnailUrl;
					store.put(existingVideo);
				} else {
					// If video does not exist, add it
					store.put(video);
				}
			};
			getRequest.onerror = (event) => {
				reject('Error checking for existing video: ' + (event.target as IDBRequest).error);
			};

			transaction.oncomplete = async () => {
				// After adding/updating, ensure we only keep the latest RECENT_VIDEOS_LIMIT in a new transaction
				const db = await this.openDB();
				const cleanupTransaction = db.transaction([RECENT_VIDEOS_STORE], 'readwrite');
				const cleanupStore = cleanupTransaction.objectStore(RECENT_VIDEOS_STORE);

				const request = cleanupStore.index('timestamp').openCursor(null, 'prev');
				let count = 0;
				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest).result;
					if (cursor) {
						count++;
						if (count > RECENT_VIDEOS_LIMIT) {
							cleanupStore.delete(cursor.value.videoId);
						}
						cursor.continue();
					} else {
						resolve();
					}
				};
				request.onerror = (event) =>
					reject('Error cleaning up recent videos: ' + (event.target as IDBRequest).error);
			};
			transaction.onerror = (event) =>
				reject('Error adding/updating recent video: ' + (event.target as IDBTransaction).error);
		});
	}

	async getRecentVideos(): Promise<RecentVideo[]> {
		const db = await this.openDB();
		const transaction = db.transaction([RECENT_VIDEOS_STORE], 'readonly');
		const store = transaction.objectStore(RECENT_VIDEOS_STORE);
		const index = store.index('timestamp');

		return new Promise((resolve, reject) => {
			const request = index.openCursor(null, 'prev');
			const videos: RecentVideo[] = [];
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest).result;
				if (cursor && videos.length < RECENT_VIDEOS_LIMIT) {
					videos.push(cursor.value);
					cursor.continue();
				} else {
					resolve(videos);
				}
			};
			request.onerror = (event) =>
				reject('Error getting recent videos: ' + (event.target as IDBRequest).error);
		});
	}

	async deleteRecentVideo(videoId: string): Promise<void> {
		const db = await this.openDB();
		const transaction = db.transaction([RECENT_VIDEOS_STORE], 'readwrite');
		const store = transaction.objectStore(RECENT_VIDEOS_STORE);

		return new Promise((resolve, reject) => {
			const request = store.delete(videoId);
			request.onsuccess = () => resolve();
			request.onerror = (event) =>
				reject('Error deleting recent video: ' + (event.target as IDBRequest).error);
		});
	}

	async addFavoriteVideo(videoId: string): Promise<void> {
		const db = await this.openDB();
		const transaction = db.transaction([FAVORITE_VIDEOS_STORE], 'readwrite');
		const store = transaction.objectStore(FAVORITE_VIDEOS_STORE);

		return new Promise((resolve, reject) => {
			const newFavoriteVideo: FavoriteVideo = {
				videoId: videoId,
				artist: playerState.artist,
				track: playerState.track,
				timestamp: Date.now(),
				addedAt: Date.now(),
				thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
			};
			const request = store.put(newFavoriteVideo);
			request.onsuccess = () => resolve();
			request.onerror = (event) =>
				reject('Error adding favorite video: ' + (event.target as IDBRequest).error);
		});
	}

	async removeFavoriteVideo(videoId: string): Promise<void> {
		const db = await this.openDB();
		const transaction = db.transaction([FAVORITE_VIDEOS_STORE], 'readwrite');
		const store = transaction.objectStore(FAVORITE_VIDEOS_STORE);

		return new Promise((resolve, reject) => {
			const request = store.delete(videoId);
			request.onsuccess = () => resolve();
			request.onerror = (event) =>
				reject('Error removing favorite video: ' + (event.target as IDBRequest).error);
		});
	}

	async getFavoriteVideos(): Promise<FavoriteVideo[]> {
		const db = await this.openDB();
		const transaction = db.transaction([FAVORITE_VIDEOS_STORE], 'readonly');
		const store = transaction.objectStore(FAVORITE_VIDEOS_STORE);
		const index = store.index('addedAt');

		return new Promise((resolve, reject) => {
			const request = index.openCursor(null, 'prev');
			const videos: FavoriteVideo[] = [];
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest).result;
				if (cursor) {
					videos.push(cursor.value);
					cursor.continue();
				} else {
					resolve(videos);
				}
			};
			request.onerror = (event) =>
				reject('Error getting favorite videos: ' + (event.target as IDBRequest).error);
		});
	}

	async isFavorite(videoId: string): Promise<boolean> {
		const db = await this.openDB();
		const transaction = db.transaction([FAVORITE_VIDEOS_STORE], 'readonly');
		const store = transaction.objectStore(FAVORITE_VIDEOS_STORE);

		return new Promise((resolve, reject) => {
			const request = store.get(videoId);
			request.onsuccess = (event) => {
				const result = (event.target as IDBRequest).result;
				resolve(!!result);
			};
			request.onerror = (event) =>
				reject('Error checking if video is favorite: ' + (event.target as IDBRequest).error);
		});
	}
}

export const indexedDBVideoRepository = new IndexedDBVideoRepository();
