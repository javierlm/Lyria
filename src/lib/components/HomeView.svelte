<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
</script>

<div class="search-screen">
	<div class="center-block">
		<div class="logo-container">
			<Logo />
		</div>

		<div class="search-wrapper">
			<SearchInput centered={true} />
		</div>
	</div>
</div>

<style>
	.search-screen {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		width: 100%;
		min-height: 100vh;
		position: relative;
		box-sizing: border-box;
		padding-top: max(10vh, calc(50vh - 350px));
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
			padding-top: max(5vh, calc(50vh - 320px));
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
			padding-top: max(3vh, calc(50vh - 300px));
		}

		.logo-container {
			transform: scale(0.5);
		}

		.center-block {
			gap: 0.75rem;
		}
	}
</style>
