import { indexedDBVideoRepository } from '$lib/indexedDB';
import type { IVideoRepository } from './IVideoRepository';

// For now, we directly expose the IndexedDB implementation.
// In the future, this could be a factory that returns different implementations
// based on environment (e.g., IndexedDB for client, API service for server).
export const videoService: IVideoRepository = indexedDBVideoRepository;
