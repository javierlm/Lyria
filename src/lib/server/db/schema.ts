import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const videos = sqliteTable(
  'videos',
  {
    videoId: text('video_id').primaryKey(),
    artist: text('artist').notNull(),
    track: text('track').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    artistNormalized: text('artist_normalized').notNull(),
    trackNormalized: text('track_normalized').notNull(),
    searchTextNormalized: text('search_text_normalized').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    index('videos_artist_normalized_idx').on(table.artistNormalized),
    index('videos_track_normalized_idx').on(table.trackNormalized),
    index('videos_search_text_normalized_idx').on(table.searchTextNormalized),
    index('videos_updated_at_idx').on(table.updatedAt)
  ]
);

export const userVideoState = sqliteTable(
  'user_video_state',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    videoId: text('video_id')
      .notNull()
      .references(() => videos.videoId, { onDelete: 'cascade' }),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false).notNull(),
    favoriteAddedAt: integer('favorite_added_at', { mode: 'timestamp_ms' }),
    lastWatchedAt: integer('last_watched_at', { mode: 'timestamp_ms' }),
    delayMs: integer('delay_ms').default(0).notNull(),
    manualLyricId: integer('manual_lyric_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    uniqueIndex('user_video_state_user_video_unique').on(table.userId, table.videoId),
    index('user_video_state_recent_idx').on(table.userId, table.lastWatchedAt),
    index('user_video_state_favorite_idx').on(table.userId, table.isFavorite, table.favoriteAddedAt)
  ]
);
