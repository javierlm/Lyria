import { BaseVideoRepository } from '../domain/BaseVideoRepository';
import type {
  RecentVideo,
  RecentVideoInput,
  FavoriteVideo,
  VideoCustomMetadata,
  VideoPreferences
} from '../domain/IVideoRepository';
import { FavoritesLimitError } from '../domain/videoRepositoryErrors';
import { FAVORITE_VIDEOS_LIMIT, RECENT_VIDEOS_LIMIT } from '../domain/videoLimits';
import { playerState } from '$lib/features/player/stores/playerStore.svelte';
import { extractVideoId } from '$lib/shared/utils';

const VIDEO_DELAYS_STORE = 'videoDelays';
const RECENT_VIDEOS_STORE = 'recentVideos';
const FAVORITE_VIDEOS_STORE = 'favoriteVideos';

export abstract class BaseIndexedDBRepository extends BaseVideoRepository {
  protected db: IDBDatabase | null = null;

  constructor(
    protected readonly dbName: string,
    protected readonly dbVersion: number,
    protected readonly needsMigration: boolean
  ) {
    super();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  protected async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

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
        } else if (this.needsMigration && event.oldVersion < 3) {
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
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error opening database:', this.dbName, '| error:', event.target);
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

  async setVideoLyricId(
    videoUrl: string,
    lyricId: number | null,
    metadata?: { artist?: string; track?: string }
  ): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([VIDEO_DELAYS_STORE], 'readwrite');
    const store = transaction.objectStore(VIDEO_DELAYS_STORE);
    const key = `lyricId:${videoUrl}`;
    const metadataKey = `lyricMetadata:${videoUrl}`;

    if (lyricId === null) {
      store.delete(key);
      store.delete(metadataKey);
    } else {
      store.put(lyricId, key);
      if (metadata?.artist && metadata?.track) {
        store.put(metadata, metadataKey);
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) =>
        reject('Error setting video lyric ID: ' + (event.target as IDBTransaction).error);
    });
  }

  async getVideoLyricId(videoUrl: string): Promise<number | null> {
    const db = await this.openDB();
    const transaction = db.transaction([VIDEO_DELAYS_STORE], 'readonly');
    const store = transaction.objectStore(VIDEO_DELAYS_STORE);
    const key = `lyricId:${videoUrl}`;

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        resolve(result !== undefined ? result : null);
      };
      request.onerror = (event) =>
        reject('Error getting video lyric ID: ' + (event.target as IDBRequest).error);
    });
  }

  async getVideoCustomMetadata(videoUrl: string): Promise<VideoCustomMetadata | null> {
    const db = await this.openDB();
    const transaction = db.transaction([VIDEO_DELAYS_STORE, RECENT_VIDEOS_STORE], 'readonly');
    const metadataStore = transaction.objectStore(VIDEO_DELAYS_STORE);
    const recentVideosStore = transaction.objectStore(RECENT_VIDEOS_STORE);
    const metadataKey = `lyricMetadata:${videoUrl}`;
    const videoId = extractVideoId(videoUrl) ?? videoUrl.trim();

    return new Promise((resolve, reject) => {
      const metadataRequest = metadataStore.get(metadataKey);

      metadataRequest.onsuccess = (event) => {
        const metadata = (event.target as IDBRequest).result as
          | Partial<VideoCustomMetadata>
          | undefined;
        const artist = metadata?.artist?.trim();
        const track = metadata?.track?.trim();

        if (artist && track) {
          resolve({ artist, track });
          return;
        }

        if (!videoId) {
          resolve(null);
          return;
        }

        const recentRequest = recentVideosStore.get(videoId);
        recentRequest.onsuccess = (recentEvent) => {
          const recentVideo = (recentEvent.target as IDBRequest).result as
            | Partial<RecentVideo>
            | undefined;
          const recentArtist = recentVideo?.artist?.trim();
          const recentTrack = recentVideo?.track?.trim();

          if (!recentArtist || !recentTrack) {
            resolve(null);
            return;
          }

          resolve({ artist: recentArtist, track: recentTrack });
        };
        recentRequest.onerror = (recentEvent) =>
          reject(
            'Error getting recent video metadata: ' + (recentEvent.target as IDBRequest).error
          );
      };

      metadataRequest.onerror = (event) =>
        reject('Error getting video custom metadata: ' + (event.target as IDBRequest).error);
    });
  }

  async getVideoPreferences(videoUrl: string): Promise<VideoPreferences> {
    const db = await this.openDB();
    const transaction = db.transaction([VIDEO_DELAYS_STORE, RECENT_VIDEOS_STORE], 'readonly');
    const metadataStore = transaction.objectStore(VIDEO_DELAYS_STORE);
    const recentVideosStore = transaction.objectStore(RECENT_VIDEOS_STORE);
    const lyricIdKey = `lyricId:${videoUrl}`;
    const metadataKey = `lyricMetadata:${videoUrl}`;
    const videoId = extractVideoId(videoUrl) ?? videoUrl.trim();

    return new Promise((resolve, reject) => {
      const delayRequest = metadataStore.get(videoUrl);
      const lyricIdRequest = metadataStore.get(lyricIdKey);
      const metadataRequest = metadataStore.get(metadataKey);

      let settled = false;
      let delay: number | undefined;
      let lyricId: number | null = null;
      let metadata: VideoCustomMetadata | null = null;
      let pending = 3;

      const rejectOnce = (error: string) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      };

      const resolveOnce = () => {
        if (settled || pending > 0) {
          return;
        }

        settled = true;
        resolve({ delay, lyricId, metadata });
      };

      const finish = () => {
        pending -= 1;
        resolveOnce();
      };

      delayRequest.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        delay = typeof result === 'number' ? result : undefined;
        finish();
      };
      delayRequest.onerror = (event) =>
        rejectOnce('Error getting video delay: ' + (event.target as IDBRequest).error);

      lyricIdRequest.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        lyricId = typeof result === 'number' ? result : null;
        finish();
      };
      lyricIdRequest.onerror = (event) =>
        rejectOnce('Error getting video lyric ID: ' + (event.target as IDBRequest).error);

      metadataRequest.onsuccess = (event) => {
        const storedMetadata = (event.target as IDBRequest).result as
          | Partial<VideoCustomMetadata>
          | undefined;
        const artist = storedMetadata?.artist?.trim();
        const track = storedMetadata?.track?.trim();

        if (artist && track) {
          metadata = { artist, track };
          finish();
          return;
        }

        if (!videoId) {
          finish();
          return;
        }

        const recentRequest = recentVideosStore.get(videoId);
        recentRequest.onsuccess = (recentEvent) => {
          const recentVideo = (recentEvent.target as IDBRequest).result as
            | Partial<RecentVideo>
            | undefined;
          const recentArtist = recentVideo?.artist?.trim();
          const recentTrack = recentVideo?.track?.trim();

          metadata =
            recentArtist && recentTrack ? { artist: recentArtist, track: recentTrack } : null;
          finish();
        };
        recentRequest.onerror = (recentEvent) =>
          rejectOnce(
            'Error getting recent video metadata: ' + (recentEvent.target as IDBRequest).error
          );
      };
      metadataRequest.onerror = (event) =>
        rejectOnce('Error getting video custom metadata: ' + (event.target as IDBRequest).error);
    });
  }

  protected async persistRecentVideo(video: RecentVideoInput, timestamp: number): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([RECENT_VIDEOS_STORE], 'readwrite');
    const store = transaction.objectStore(RECENT_VIDEOS_STORE);
    const recentVideo: RecentVideo = {
      videoId: video.videoId,
      artist: video.artist,
      track: video.track,
      thumbnailUrl: video.thumbnailUrl,
      timestamp
    };

    return new Promise((resolve, reject) => {
      let settled = false;

      const rejectOnce = (error: string) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      };

      const getRequest = store.get(video.videoId);
      getRequest.onsuccess = () => {
        const existingVideo = getRequest.result;

        const writeRequest = existingVideo
          ? store.put({
              ...existingVideo,
              timestamp: recentVideo.timestamp,
              thumbnailUrl: recentVideo.thumbnailUrl
            })
          : store.put(recentVideo);

        writeRequest.onsuccess = () => {
          const cursorRequest = store.index('timestamp').openCursor(null, 'prev');
          let count = 0;

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (!cursor) {
              return;
            }

            count += 1;
            if (count > RECENT_VIDEOS_LIMIT) {
              store.delete(cursor.value.videoId);
            }

            cursor.continue();
          };

          cursorRequest.onerror = (event) =>
            rejectOnce('Error cleaning up recent videos: ' + (event.target as IDBRequest).error);
        };

        writeRequest.onerror = (event) =>
          rejectOnce('Error adding/updating recent video: ' + (event.target as IDBRequest).error);
      };
      getRequest.onerror = (event) => {
        rejectOnce('Error checking for existing video: ' + (event.target as IDBRequest).error);
      };

      transaction.oncomplete = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      transaction.onerror = (event) =>
        rejectOnce('Error adding/updating recent video: ' + (event.target as IDBTransaction).error);
    });
  }

  async addRecentVideo(video: RecentVideoInput): Promise<void> {
    return this.persistRecentVideo(video, Date.now());
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
      request.onerror = (event) => {
        console.error('[IndexedDB] getRecentVideos error:', event.target);
        reject('Error getting recent videos: ' + (event.target as IDBRequest).error);
      };
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
      let settled = false;
      let limitError: FavoritesLimitError | null = null;

      const rejectOnce = (error: string | FavoritesLimitError) => {
        if (settled) {
          return;
        }

        settled = true;
        reject(error);
      };

      const newFavoriteVideo: FavoriteVideo = {
        videoId: videoId,
        artist: playerState.artist,
        track: playerState.track,
        timestamp: Date.now(),
        addedAt: Date.now(),
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      };

      const getRequest = store.get(videoId);
      getRequest.onsuccess = () => {
        const existingFavorite = getRequest.result as FavoriteVideo | undefined;
        if (existingFavorite) {
          store.put({
            ...existingFavorite,
            artist: newFavoriteVideo.artist,
            track: newFavoriteVideo.track,
            timestamp: newFavoriteVideo.timestamp,
            addedAt: newFavoriteVideo.addedAt,
            thumbnailUrl: newFavoriteVideo.thumbnailUrl
          });
          return;
        }

        const countRequest = store.count();
        countRequest.onsuccess = () => {
          const count = countRequest.result;
          if (count >= FAVORITE_VIDEOS_LIMIT) {
            limitError = new FavoritesLimitError();
            transaction.abort();
            return;
          }

          store.put(newFavoriteVideo);
        };

        countRequest.onerror = (event) =>
          rejectOnce('Error counting favorite videos: ' + (event.target as IDBRequest).error);
      };

      getRequest.onerror = (event) =>
        rejectOnce('Error checking favorite video: ' + (event.target as IDBRequest).error);

      transaction.oncomplete = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      transaction.onabort = () => {
        if (limitError) {
          rejectOnce(limitError);
          return;
        }

        rejectOnce('Error adding favorite video: transaction aborted');
      };

      transaction.onerror = (event) =>
        rejectOnce('Error adding favorite video: ' + (event.target as IDBTransaction).error);
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
