CREATE TABLE IF NOT EXISTS videos (
  video_id text PRIMARY KEY NOT NULL,
  artist text NOT NULL,
  track text NOT NULL,
  thumbnail_url text,
  artist_normalized text NOT NULL,
  track_normalized text NOT NULL,
  search_text_normalized text NOT NULL,
  created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS videos_artist_normalized_idx ON videos (artist_normalized);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS videos_track_normalized_idx ON videos (track_normalized);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS videos_search_text_normalized_idx ON videos (search_text_normalized);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS videos_updated_at_idx ON videos (updated_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS user_video_state (
  id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id text NOT NULL,
  video_id text NOT NULL,
  is_favorite integer DEFAULT false NOT NULL,
  favorite_added_at integer,
  last_watched_at integer,
  delay_ms integer DEFAULT 0 NOT NULL,
  manual_lyric_id integer,
  created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos(video_id) ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS user_video_state_user_video_unique ON user_video_state (user_id, video_id);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS user_video_state_recent_idx ON user_video_state (user_id, last_watched_at);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS user_video_state_favorite_idx ON user_video_state (user_id, is_favorite, favorite_added_at);
--> statement-breakpoint

DROP TABLE IF EXISTS videos_fts;
--> statement-breakpoint

CREATE VIRTUAL TABLE IF NOT EXISTS videos_fts USING fts5(
  artist,
  track,
  artist_normalized,
  track_normalized,
  search_text_normalized,
  content='videos',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 1'
);
--> statement-breakpoint

DROP TRIGGER IF EXISTS videos_ai;
--> statement-breakpoint

DROP TRIGGER IF EXISTS videos_ad;
--> statement-breakpoint

DROP TRIGGER IF EXISTS videos_au;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS videos_ai AFTER INSERT ON videos BEGIN
  INSERT INTO videos_fts(rowid, artist, track, artist_normalized, track_normalized, search_text_normalized)
  VALUES (
    new.rowid,
    new.artist,
    new.track,
    new.artist_normalized,
    new.track_normalized,
    new.search_text_normalized
  );
END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS videos_ad AFTER DELETE ON videos BEGIN
  INSERT INTO videos_fts(
    videos_fts,
    rowid,
    artist,
    track,
    artist_normalized,
    track_normalized,
    search_text_normalized
  )
  VALUES (
    'delete',
    old.rowid,
    old.artist,
    old.track,
    old.artist_normalized,
    old.track_normalized,
    old.search_text_normalized
  );
END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS videos_au AFTER UPDATE ON videos BEGIN
  INSERT INTO videos_fts(
    videos_fts,
    rowid,
    artist,
    track,
    artist_normalized,
    track_normalized,
    search_text_normalized
  )
  VALUES (
    'delete',
    old.rowid,
    old.artist,
    old.track,
    old.artist_normalized,
    old.track_normalized,
    old.search_text_normalized
  );
  INSERT INTO videos_fts(rowid, artist, track, artist_normalized, track_normalized, search_text_normalized)
  VALUES (
    new.rowid,
    new.artist,
    new.track,
    new.artist_normalized,
    new.track_normalized,
    new.search_text_normalized
  );
END;
--> statement-breakpoint

INSERT INTO videos_fts(videos_fts) VALUES ('rebuild');
