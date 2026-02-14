import { libsqlClient } from '$lib/server/db/client';

export async function clearTestDatabase(): Promise<void> {
  await libsqlClient.execute('DELETE FROM user_video_state');
  await libsqlClient.execute('DELETE FROM videos');
}
