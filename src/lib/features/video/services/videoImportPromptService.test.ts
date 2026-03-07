import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoImportPromptService, type VideoImportPromptDeps } from './videoImportPromptService';

function createDeps(overrides?: Partial<VideoImportPromptDeps>): VideoImportPromptDeps {
  return {
    getImportCandidateCounts: vi.fn().mockResolvedValue({ missingRecents: 1, missingFavorites: 1 }),
    importMissingVideosFromIndexedDB: vi.fn().mockResolvedValue({
      importedRecents: 1,
      importedFavorites: 1,
      skippedExisting: 0,
      skippedByLimit: 0,
      failed: 0
    }),
    readFlag: vi.fn().mockReturnValue(false),
    writeFlag: vi.fn(),
    getNotifications: vi.fn().mockReturnValue({
      importFromDevice: 'Import',
      importFromDeviceMessage: 'Message',
      importNow: 'Import now',
      importLater: 'Later',
      importCompleted: 'Done',
      importCompletedMessage: 'Done message',
      importPartial: 'Partial',
      importPartialMessage: 'Partial message'
    }),
    loadRecentVideos: vi.fn().mockResolvedValue(undefined),
    notifyPersistent: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
    onError: vi.fn(),
    ...overrides
  };
}

describe('VideoImportPromptService', () => {
  let deps: VideoImportPromptDeps;
  let service: VideoImportPromptService;

  beforeEach(() => {
    deps = createDeps();
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');
  });

  it('does nothing when done/skipped flag is already set', async () => {
    deps = createDeps({
      readFlag: vi.fn().mockImplementation((key: string) => key === 'done:user-1')
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-1');

    expect(deps.getImportCandidateCounts).not.toHaveBeenCalled();
    expect(deps.notifyPersistent).not.toHaveBeenCalled();
  });

  it('marks done and skips prompt when there is nothing pending', async () => {
    deps = createDeps({
      getImportCandidateCounts: vi
        .fn()
        .mockResolvedValue({ missingRecents: 0, missingFavorites: 0 })
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-2');

    expect(deps.writeFlag).toHaveBeenCalledWith('done:user-2');
    expect(deps.notifyPersistent).not.toHaveBeenCalled();
  });

  it('shows prompt and imports when user accepts', async () => {
    let capturedOnImport: (() => Promise<void>) | null = null;

    deps = createDeps({
      notifyPersistent: vi.fn((params) => {
        capturedOnImport = params.onImport;
      })
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-3');

    expect(deps.notifyPersistent).toHaveBeenCalledTimes(1);
    expect(capturedOnImport).toBeTruthy();

    if (!capturedOnImport) {
      throw new Error('Expected import action');
    }
    await (capturedOnImport as () => Promise<void>)();

    expect(deps.importMissingVideosFromIndexedDB).toHaveBeenCalledTimes(1);
    expect(deps.writeFlag).toHaveBeenCalledWith('done:user-3');
    expect(deps.notifySuccess).toHaveBeenCalledWith('Done', 'Done message');
    expect(deps.notifyWarning).not.toHaveBeenCalled();
    expect(deps.loadRecentVideos).toHaveBeenCalledTimes(1);
  });

  it('marks skipped when user chooses later', async () => {
    let capturedOnLater: (() => void) | null = null;

    deps = createDeps({
      notifyPersistent: vi.fn((params) => {
        capturedOnLater = params.onLater;
      })
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-4');

    if (!capturedOnLater) {
      throw new Error('Expected later action');
    }
    (capturedOnLater as () => void)();

    expect(deps.writeFlag).toHaveBeenCalledWith('skipped:user-4');
    expect(deps.importMissingVideosFromIndexedDB).not.toHaveBeenCalled();
  });

  it('reports warning notification when import is partial', async () => {
    let capturedOnImport: (() => Promise<void>) | null = null;

    deps = createDeps({
      importMissingVideosFromIndexedDB: vi.fn().mockResolvedValue({
        importedRecents: 1,
        importedFavorites: 0,
        skippedExisting: 0,
        skippedByLimit: 0,
        failed: 1
      }),
      notifyPersistent: vi.fn((params) => {
        capturedOnImport = params.onImport;
      })
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-5');
    if (!capturedOnImport) {
      throw new Error('Expected import action');
    }
    await (capturedOnImport as () => Promise<void>)();

    expect(deps.notifyWarning).toHaveBeenCalledWith('Partial', 'Partial message');
    expect(deps.notifySuccess).not.toHaveBeenCalled();
  });

  it('reports warning notification when favorites are skipped by limit', async () => {
    let capturedOnImport: (() => Promise<void>) | null = null;

    deps = createDeps({
      importMissingVideosFromIndexedDB: vi.fn().mockResolvedValue({
        importedRecents: 1,
        importedFavorites: 2,
        skippedExisting: 0,
        skippedByLimit: 3,
        failed: 0
      }),
      notifyPersistent: vi.fn((params) => {
        capturedOnImport = params.onImport;
      })
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-7');
    if (!capturedOnImport) {
      throw new Error('Expected import action');
    }
    await (capturedOnImport as () => Promise<void>)();

    expect(deps.notifyWarning).toHaveBeenCalledWith('Partial', 'Partial message');
    expect(deps.notifySuccess).not.toHaveBeenCalled();
  });

  it('forwards preparation errors to onError callback', async () => {
    const error = new Error('prepare failed');

    deps = createDeps({
      getImportCandidateCounts: vi.fn().mockRejectedValue(error)
    });
    service = new VideoImportPromptService(deps, 'done:', 'skipped:');

    await service.maybeOfferVideoImport('user-6');

    expect(deps.onError).toHaveBeenCalledWith(error);
    expect(deps.notifyPersistent).not.toHaveBeenCalled();
  });
});
