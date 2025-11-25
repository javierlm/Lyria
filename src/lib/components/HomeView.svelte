<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
</script>

<div class="search-screen">
	<div class="center-block">
		<div class="logo-container">
			<Logo />
		</div>

		<div class="search-wrapper">
			<SearchBar centered={true} />
		</div>
	</div>
</div>

<style>
	.search-screen {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		width: 100%;
		height: 100dvh;
		position: relative;
		box-sizing: border-box;
		padding-top: max(10dvh, calc(50dvh - 350px));
		overflow: hidden;
		overscroll-behavior-y: none;
		-webkit-overflow-scrolling: touch;
	}

	.center-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 800px;
		padding: 0 1rem;
		box-sizing: border-box;
	}

	.logo-container {
		display: flex;
		justify-content: center;
		align-items: center;
		transform: scale(0.9);
		z-index: 1;
		margin-bottom: 5%;
	}

	.search-wrapper {
		position: relative;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		z-index: 2;
	}

	@media (max-width: 768px) {
		.search-screen {
			align-items: flex-start;
			padding-top: max(5dvh, calc(50dvh - 320px));
			padding-bottom: 2rem;
		}

		.center-block {
			max-width: 95%;
			gap: 1rem;
			padding: 0 0.5rem;
		}

		.logo-container {
			transform: scale(0.6);
		}
	}

	@media (max-width: 480px) {
		.search-screen {
			padding-top: max(3dvh, calc(50dvh - 300px));
		}

		.logo-container {
			transform: scale(0.5);
		}

		.center-block {
			gap: 0.75rem;
		}
	}
</style>
