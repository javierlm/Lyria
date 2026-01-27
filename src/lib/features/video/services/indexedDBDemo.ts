import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

export class IndexedDBDemoVideoRepository extends BaseIndexedDBRepository {
  constructor() {
    super('LyriaDemoDB', 1, false);
  }
}

export const indexedDBDemoVideoRepository = new IndexedDBDemoVideoRepository();
