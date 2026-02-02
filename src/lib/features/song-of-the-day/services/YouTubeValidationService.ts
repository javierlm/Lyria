/**
 * Validates YouTube video availability using oEmbed API.
 * Checks if videos are embeddable and accessible before selection.
 */

export interface VideoValidationResult {
  isValid: boolean;
  reason?: 'unavailable' | 'restricted' | 'not_embeddable' | 'error';
  error?: string;
}

export class YouTubeValidationService {
  /**
   * Validates if a YouTube video is available and embeddable.
   * Uses the oEmbed API which returns different HTTP status codes
   * based on video availability:
   * - 200: Video is available and embeddable
   * - 401/403: Video is restricted (region block, age restriction, etc.)
   * - 404: Video doesn't exist or is private
   */
  async validateVideo(videoId: string): Promise<VideoValidationResult> {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

    try {
      const response = await fetch(oembedUrl, {
        method: 'HEAD',
        headers: {
          Accept: 'application/json'
        }
      });

      if (response.ok) {
        return { isValid: true };
      }

      // Handle specific HTTP status codes
      if (response.status === 404) {
        return {
          isValid: false,
          reason: 'unavailable',
          error: `Video ${videoId} not found or is private`
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          isValid: false,
          reason: 'restricted',
          error: `Video ${videoId} is restricted (region block, age restriction, etc.)`
        };
      }

      // Any other non-OK status
      return {
        isValid: false,
        reason: 'not_embeddable',
        error: `Video ${videoId} returned status ${response.status}`
      };
    } catch (error) {
      console.error(`Error validating video ${videoId}:`, error);
      return {
        isValid: false,
        reason: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during validation'
      };
    }
  }

  /**
   * Validates multiple videos and returns results for each.
   * Useful for checking all candidates from Wikidata.
   */
  async validateMultipleVideos(videoIds: string[]): Promise<Map<string, VideoValidationResult>> {
    const results = new Map<string, VideoValidationResult>();

    for (const videoId of videoIds) {
      const result = await this.validateVideo(videoId);
      results.set(videoId, result);
    }

    return results;
  }
}
