import { notify } from './stores/notificationStore.svelte';
import { get } from 'svelte/store';
import LL from '$i18n/i18n-svelte';
import type { NotificationAction } from './types';

export interface PwaUpdateContext {
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  needRefresh: { set: (value: boolean) => void };
}

export function notifyPwaUpdate(context: PwaUpdateContext): string {
  const $LL = get(LL);

  const actions: NotificationAction[] = [
    {
      label: $LL.pwa.reload(),
      onClick: () => {
        context.updateServiceWorker(true);
      },
      variant: 'primary'
    },
    {
      label: $LL.pwa.close(),
      onClick: () => {
        context.needRefresh.set(false);
      },
      variant: 'secondary'
    }
  ];

  return notify.create('pwa-update', $LL.pwa.newVersionAvailable(), '', {
    duration: null,
    position: 'bottom-right',
    actions
  });
}
