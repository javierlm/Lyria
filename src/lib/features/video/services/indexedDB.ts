import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

export class IndexedDBVideoRepository extends BaseIndexedDBRepository {
  constructor() {
    super('LyricsTubeDB', 4, true);
  }
}

export const indexedDBVideoRepository = new IndexedDBVideoRepository();
