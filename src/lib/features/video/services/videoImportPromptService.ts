import type { VideoImportResult } from './videoImportTypes';

export interface VideoImportNotificationTexts {
  importFromDevice: string;
  importFromDeviceMessage: string;
  importNow: string;
  importLater: string;
  importCompleted: string;
  importCompletedMessage: string;
  importPartial: string;
  importPartialMessage: string;
}

export interface VideoImportPromptDeps {
  getImportCandidateCounts: () => Promise<{ missingRecents: number; missingFavorites: number }>;
  importMissingVideosFromIndexedDB: () => Promise<VideoImportResult>;
  readFlag: (key: string) => boolean;
  writeFlag: (key: string) => void;
  getNotifications: () => VideoImportNotificationTexts;
  loadRecentVideos: () => Promise<void>;
  notifyPersistent: (params: {
    title: string;
    message: string;
    onImport: () => Promise<void>;
    onLater: () => void;
    importLabel: string;
    laterLabel: string;
  }) => void;
  notifySuccess: (title: string, message: string) => void;
  notifyWarning: (title: string, message: string) => void;
  onError?: (error: unknown) => void;
}

export class VideoImportPromptService {
  private importPromptInFlight = false;
  private activeImportPromptUserId: string | null = null;

  constructor(
    private readonly deps: VideoImportPromptDeps,
    private readonly donePrefix: string,
    private readonly skippedPrefix: string
  ) {}

  private getFlagKey(prefix: string, userId: string): string {
    return `${prefix}${userId}`;
  }

  async maybeOfferVideoImport(userId: string): Promise<void> {
    if (this.importPromptInFlight || this.activeImportPromptUserId === userId) {
      return;
    }

    this.importPromptInFlight = true;

    const doneKey = this.getFlagKey(this.donePrefix, userId);
    const skippedKey = this.getFlagKey(this.skippedPrefix, userId);

    if (this.deps.readFlag(doneKey) || this.deps.readFlag(skippedKey)) {
      this.importPromptInFlight = false;
      return;
    }

    try {
      const { missingRecents, missingFavorites } = await this.deps.getImportCandidateCounts();
      if (missingRecents + missingFavorites === 0) {
        this.deps.writeFlag(doneKey);
        return;
      }

      const notifications = this.deps.getNotifications();
      this.activeImportPromptUserId = userId;

      this.deps.notifyPersistent({
        title: notifications.importFromDevice,
        message: notifications.importFromDeviceMessage,
        importLabel: notifications.importNow,
        laterLabel: notifications.importLater,
        onImport: async () => {
          const result = await this.deps.importMissingVideosFromIndexedDB();
          this.deps.writeFlag(doneKey);
          this.activeImportPromptUserId = null;

          if (result.failed === 0) {
            this.deps.notifySuccess(
              notifications.importCompleted,
              notifications.importCompletedMessage
            );
          } else {
            this.deps.notifyWarning(
              notifications.importPartial,
              notifications.importPartialMessage
            );
          }

          await this.deps.loadRecentVideos();
        },
        onLater: () => {
          this.deps.writeFlag(skippedKey);
          this.activeImportPromptUserId = null;
        }
      });
    } catch (error) {
      if (this.deps.onError) {
        this.deps.onError(error);
      }
    } finally {
      this.importPromptInFlight = false;
    }
  }
}
