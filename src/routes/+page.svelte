<script lang="ts">
  import { onMount } from 'svelte';
  import HomeView from '$lib/features/home/components/HomeView.svelte';
  import { demoStore } from '$lib/features/settings/stores/demoStore.svelte';
  import { notify } from '$lib/features/notification';
  import { replaceState } from '$app/navigation';
  import LL from '$i18n/i18n-svelte';

  let { data } = $props();

  onMount(async () => {
    if (data.activateDemo && !demoStore.isDemoMode) {
      await demoStore.activateDemoMode();

      notify.create(
        'info',
        $LL.notifications.demoModeActivated(),
        $LL.notifications.demoModeActivatedMessage(),
        { duration: 10000 }
      );

      const url = new URL(window.location.href);
      url.searchParams.delete('demo');
      replaceState(url, {});
    }
  });
</script>

<div class="home-page-wrapper">
  <HomeView />
</div>

<style>
  .home-page-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 1;
  }
</style>
