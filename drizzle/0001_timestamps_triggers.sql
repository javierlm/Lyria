CREATE TRIGGER `videos_set_updated_at`
AFTER UPDATE ON `videos`
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE `videos`
  SET `updated_at` = cast(unixepoch('subsecond') * 1000 as integer)
  WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `user_video_state_set_updated_at`
AFTER UPDATE ON `user_video_state`
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE `user_video_state`
  SET `updated_at` = cast(unixepoch('subsecond') * 1000 as integer)
  WHERE id = NEW.id;
END;
