<script lang="ts">
	import { fade } from 'svelte/transition';
	import HomeView from '$lib/components/HomeView.svelte';
</script>

<div in:fade={{ duration: 300 }}>
	<HomeView />
</div>
