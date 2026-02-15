import { indexedDBVideoRepository } from './indexedDB';
import { indexedDBDemoVideoRepository } from './indexedDBDemo';
import type { IVideoRepository } from '../domain/IVideoRepository';
import { apiVideoRepository } from './ApiVideoRepository';
import { authStore } from '$lib/features/auth/stores/authStore.svelte';

let useDemoRepository = false;

function resolveRepository(): IVideoRepository {
  if (useDemoRepository) {
    return indexedDBDemoVideoRepository;
  }

  if (authStore.isAuthenticated) {
    return apiVideoRepository;
  }

  return indexedDBVideoRepository;
}

export function setUseDemoRepository(useDemo: boolean) {
  useDemoRepository = useDemo;
  console.log('[videoService] Switched repository. Use demo:', useDemo);
}

const videoServiceHandler: ProxyHandler<IVideoRepository> = {
  get(_target, prop, _receiver) {
    if (prop === 'close') {
      return () => {
        indexedDBVideoRepository.close();
        indexedDBDemoVideoRepository.close();
        apiVideoRepository.close();
        console.log('[videoService] All repository connections closed');
      };
    }

    const currentRepository = resolveRepository();
    const value = Reflect.get(currentRepository, prop);

    if (typeof value === 'function') {
      // Bind to the underlying repository so 'this' is correct inside the method
      return value.bind(currentRepository);
    }

    return value;
  }
};

export const videoService = new Proxy({} as IVideoRepository, videoServiceHandler);
