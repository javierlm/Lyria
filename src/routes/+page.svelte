<script lang="ts">
	import HomeView from '$lib/features/home/components/HomeView.svelte';
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
