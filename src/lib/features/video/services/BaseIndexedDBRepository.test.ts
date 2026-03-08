import { describe, expect, it, vi } from 'vitest';

import { BaseIndexedDBRepository } from './BaseIndexedDBRepository';

class TestIndexedDBRepository extends BaseIndexedDBRepository {
  constructor(private readonly fakeDb: IDBDatabase) {
    super('test-db', 1, false);
  }

  protected override async openDB(): Promise<IDBDatabase> {
    return this.fakeDb;
  }
}

function createRequest(result: unknown): IDBRequest {
  const request = {} as IDBRequest;

  queueMicrotask(() => {
    request.onsuccess?.({ target: { result } } as unknown as Event);
  });

  return request;
}

describe('BaseIndexedDBRepository preferences', () => {
  it('reads all preferences through a single IndexedDB transaction', async () => {
    const delayStore = {
      get: vi.fn((key: string) => {
        switch (key) {
          case 'https://www.youtube.com/watch?v=abc123XYZ89':
            return createRequest(420);
          case 'lyricId:https://www.youtube.com/watch?v=abc123XYZ89':
            return createRequest(123);
          case 'lyricMetadata:https://www.youtube.com/watch?v=abc123XYZ89':
            return createRequest({ artist: ' Custom Artist ', track: ' Custom Track ' });
          default:
            return createRequest(undefined);
        }
      })
    };

    const recentStore = {
      get: vi.fn(() => createRequest(undefined))
    };

    const transaction = {
      objectStore: vi.fn((storeName: string) => {
        if (storeName === 'videoDelays') {
          return delayStore;
        }

        return recentStore;
      })
    };

    const fakeDb = {
      transaction: vi.fn(() => transaction)
    } as unknown as IDBDatabase;

    const repository = new TestIndexedDBRepository(fakeDb);

    const preferences = await repository.getVideoPreferences(
      'https://www.youtube.com/watch?v=abc123XYZ89'
    );

    expect(fakeDb.transaction).toHaveBeenCalledTimes(1);
    expect(fakeDb.transaction).toHaveBeenCalledWith(['videoDelays', 'recentVideos'], 'readonly');
    expect(delayStore.get).toHaveBeenCalledTimes(3);
    expect(recentStore.get).not.toHaveBeenCalled();
    expect(preferences).toEqual({
      delay: 420,
      lyricId: 123,
      metadata: {
        artist: 'Custom Artist',
        track: 'Custom Track'
      }
    });
  });

  it('falls back to recent video metadata in the same transaction', async () => {
    const delayStore = {
      get: vi.fn((key: string) => {
        switch (key) {
          case 'plain-video-id':
            return createRequest(undefined);
          case 'lyricId:plain-video-id':
            return createRequest(undefined);
          case 'lyricMetadata:plain-video-id':
            return createRequest(undefined);
          default:
            return createRequest(undefined);
        }
      })
    };

    const recentStore = {
      get: vi.fn((key: string) =>
        createRequest(
          key === 'plain-video-id'
            ? { artist: ' Recent Artist ', track: ' Recent Track ' }
            : undefined
        )
      )
    };

    const transaction = {
      objectStore: vi.fn((storeName: string) => {
        if (storeName === 'videoDelays') {
          return delayStore;
        }

        return recentStore;
      })
    };

    const fakeDb = {
      transaction: vi.fn(() => transaction)
    } as unknown as IDBDatabase;

    const repository = new TestIndexedDBRepository(fakeDb);

    const preferences = await repository.getVideoPreferences('plain-video-id');

    expect(fakeDb.transaction).toHaveBeenCalledTimes(1);
    expect(recentStore.get).toHaveBeenCalledTimes(1);
    expect(preferences).toEqual({
      delay: undefined,
      lyricId: null,
      metadata: {
        artist: 'Recent Artist',
        track: 'Recent Track'
      }
    });
  });
});
