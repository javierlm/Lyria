import { indexedDBVideoRepository } from './indexedDB';
import { indexedDBDemoVideoRepository } from './indexedDBDemo';
import type { IVideoRepository } from '../domain/IVideoRepository';

let currentRepository: IVideoRepository = indexedDBVideoRepository;

export function setUseDemoRepository(useDemo: boolean) {
  currentRepository = useDemo ? indexedDBDemoVideoRepository : indexedDBVideoRepository;
  console.log('[videoService] Switched repository. Use demo:', useDemo);
}

const videoServiceHandler: ProxyHandler<IVideoRepository> = {
  get(_target, prop, _receiver) {
    if (prop === 'close') {
      return () => {
        indexedDBVideoRepository.close();
        indexedDBDemoVideoRepository.close();
        console.log('[videoService] All repository connections closed');
      };
    }

    const value = Reflect.get(currentRepository, prop);

    if (typeof value === 'function') {
      // Bind to the underlying repository so 'this' is correct inside the method
      return value.bind(currentRepository);
    }

    return value;
  }
};

export const videoService = new Proxy({} as IVideoRepository, videoServiceHandler);
