import { FAVORITE_VIDEOS_LIMIT } from './videoLimits';

export const FAVORITES_LIMIT_ERROR_CODE = 'FAVORITES_LIMIT_REACHED';

export class FavoritesLimitError extends Error {
  readonly code = FAVORITES_LIMIT_ERROR_CODE;
  readonly limit: number;

  constructor(limit = FAVORITE_VIDEOS_LIMIT) {
    super(`Favorite videos limit reached (${limit})`);
    this.name = 'FavoritesLimitError';
    this.limit = limit;
  }
}

export function isFavoritesLimitError(error: unknown): error is FavoritesLimitError {
  return error instanceof FavoritesLimitError;
}
