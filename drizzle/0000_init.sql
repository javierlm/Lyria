CREATE TABLE `user_video_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`video_id` text NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`favorite_added_at` integer,
	`favorite_removed_at` integer,
	`last_watched_at` integer,
	`recent_removed_at` integer,
	`delay_ms` integer DEFAULT 0 NOT NULL,
	`manual_lyric_id` integer,
	`custom_artist` text,
	`custom_track` text,
	`custom_artist_normalized` text,
	`custom_track_normalized` text,
	`custom_search_text_normalized` text,
	`custom_metadata_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`video_id`) REFERENCES `videos`(`video_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_video_state_user_video_unique` ON `user_video_state` (`user_id`,`video_id`);--> statement-breakpoint
CREATE INDEX `user_video_state_recent_idx` ON `user_video_state` (`user_id`,`last_watched_at`);--> statement-breakpoint
CREATE INDEX `user_video_state_favorite_idx` ON `user_video_state` (`user_id`,`is_favorite`,`favorite_added_at`);--> statement-breakpoint
CREATE TABLE `videos` (
	`video_id` text PRIMARY KEY NOT NULL,
	`artist` text NOT NULL,
	`track` text NOT NULL,
	`thumbnail_url` text,
	`artist_normalized` text NOT NULL,
	`track_normalized` text NOT NULL,
	`search_text_normalized` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `videos_artist_normalized_idx` ON `videos` (`artist_normalized`);--> statement-breakpoint
CREATE INDEX `videos_track_normalized_idx` ON `videos` (`track_normalized`);--> statement-breakpoint
CREATE INDEX `videos_search_text_normalized_idx` ON `videos` (`search_text_normalized`);--> statement-breakpoint
CREATE INDEX `videos_updated_at_idx` ON `videos` (`updated_at`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);
--> statement-breakpoint
CREATE VIRTUAL TABLE `videos_fts` USING fts5(
  search_text_normalized,
  content='videos',
  content_rowid='rowid',
  tokenize='unicode61',
  prefix='2 3 4 5 6 7 8'
);
--> statement-breakpoint
CREATE TRIGGER `videos_ai` AFTER INSERT ON videos BEGIN
  INSERT INTO videos_fts(rowid, search_text_normalized)
  VALUES (new.rowid, new.search_text_normalized);
END;
--> statement-breakpoint
CREATE TRIGGER `videos_ad` AFTER DELETE ON videos BEGIN
  INSERT INTO videos_fts(videos_fts, rowid, search_text_normalized)
  VALUES ('delete', old.rowid, old.search_text_normalized);
END;
--> statement-breakpoint
CREATE TRIGGER `videos_au` AFTER UPDATE ON videos BEGIN
  INSERT INTO videos_fts(videos_fts, rowid, search_text_normalized)
  VALUES ('delete', old.rowid, old.search_text_normalized);
  INSERT INTO videos_fts(rowid, search_text_normalized)
  VALUES (new.rowid, new.search_text_normalized);
END;
--> statement-breakpoint
INSERT INTO videos_fts(videos_fts) VALUES ('rebuild');