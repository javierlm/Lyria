import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';
import type { RecentVideo } from '../domain/IVideoRepository';

export class IndexedDBDemoVideoRepository extends BaseIndexedDBRepository {
  constructor() {
    super('LyriaDemoDB', 1, false);
  }

  async seedRecentVideo(video: RecentVideo): Promise<void> {
    await this.persistRecentVideo(video, video.timestamp);
  }
}

export const indexedDBDemoVideoRepository = new IndexedDBDemoVideoRepository();
