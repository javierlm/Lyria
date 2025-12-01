import { indexedDBVideoRepository } from '$lib/features/video/services/indexedDB';
import type { IVideoRepository } from '../domain/IVideoRepository';

// For now, we directly expose the IndexedDB implementation.
// In the future, this could be a factory that returns different implementations
// based on environment (e.g., IndexedDB for client, API service for server).
export const videoService: IVideoRepository = indexedDBVideoRepository;
