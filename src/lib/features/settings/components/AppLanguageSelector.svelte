<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { locale, setLocale } from '$i18n/i18n-svelte';
	import { locales } from '$i18n/i18n-util';
	import { CaretDown } from 'phosphor-svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import type { Locales } from '$i18n/i18n-types';
	import { loadLocaleAsync } from '$i18n/i18n-util.async';

	const languageFlags: { [key: string]: string } = {
		en: 'gb',
		es: 'es'
	};

	const languageNames: { [key: string]: string } = {
		en: 'English',
		es: 'Español'
	};

	const languages = locales.map((code) => ({
		code,
		name: languageNames[code],
		flagClass: languageFlags[code]
	}));

	let dropdownOpen = $state(false);

	const currentLang = $derived(
		languages.find((l) => l.code === $locale) || languages.find((l) => l.code === 'en')
	);

	function toggleDropdown(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		dropdownOpen = !dropdownOpen;
	}

	async function selectLanguage(event: Event, code: Locales) {
		event.preventDefault();
		event.stopPropagation();
		await loadLocaleAsync(code);
		setLocale(code);
		if (browser) {
			document.cookie = `lang=${code};path=/;max-age=31536000;samesite=lax`;
		}
		dropdownOpen = false;
	}

	function handleClickOutside(event: MouseEvent | TouchEvent) {
		const target = event.target as HTMLElement;
		if (dropdownOpen && !target.closest('.select-wrapper')) {
			dropdownOpen = false;
		}
	}

	onMount(() => {
		if (browser) {
			document.addEventListener('click', handleClickOutside);
		}
	});

	onDestroy(() => {
		if (browser) {
			document.removeEventListener('click', handleClickOutside);
		}
	});

	const isPlayPage = $derived($page.route.id?.includes('/play'));
</script>

<div class="select-wrapper">
	<button class="select-button" onclick={toggleDropdown} ontouchend={toggleDropdown}>
		<div class="selected-option">
			{#if currentLang}
				<div class="desktop-view">
					<span class="flag-icon {currentLang.flagClass}"></span>
					<span>{currentLang.name}</span>
				</div>
				<div class="mobile-view">
					<span>{currentLang.code.toUpperCase()}</span>
				</div>
			{/if}
		</div>
		<CaretDown weight="bold" class={dropdownOpen ? 'rotatecaret' : ''} style="margin-left: auto;" />
	</button>

	<div class="dropdown" class:open={dropdownOpen}>
		{#each languages as lang (lang.code)}
			<button
				class="dropdown-option"
				class:selected={lang.code === $locale}
				onclick={(e) => selectLanguage(e, lang.code)}
				ontouchend={(e) => selectLanguage(e, lang.code)}
			>
				<span class="flag-icon {lang.flagClass}"></span>
				<span>{lang.name}</span>
				{#if lang.code === $locale}
					<svg class="checkmark" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						></path>
					</svg>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	.select-button :global(svg) {
		transition: transform 0.3s ease;
	}

	.select-button :global(svg.rotatecaret) {
		transform: rotate(180deg);
	}

	.select-wrapper {
		position: relative;
		width: 140px;
		z-index: 1001;
	}

	.select-button {
		width: 100%;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		color: var(--on-primary-color);
		border: none;
		border-radius: 5px;
		padding: 10px 15px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.3s ease;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
		height: 42px;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.select-button:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--primary-color-hover), var(--secondary-color));
	}

	.selected-option {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.flag-icon {
		width: 22px;
		height: 16px;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		border: 1px solid #ccc;
		display: inline-block;
		vertical-align: middle;
	}

	.flag-icon.gb {
		background-image: url('https://flagcdn.com/gb.svg');
	}
	.flag-icon.es {
		background-image: url('https://flagcdn.com/es.svg');
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		background: var(--card-background);
		border-radius: 16px;
		box-shadow: 0 20px 60px var(--darker-shadow-color);
		border: 1px solid var(--border-color);
		overflow: hidden;
		z-index: 10;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-10px);
		transition: all 0.2s ease;
	}

	.dropdown.open {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}

	.dropdown-option {
		width: 100%;
		padding: 10px 15px;
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
		background: var(--card-background);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-color);
		border-left: 3px solid transparent;
	}

	.dropdown-option:hover {
		background: rgba(var(--primary-color-rgb), 0.1);
	}

	.dropdown-option.selected {
		background: linear-gradient(
			90deg,
			rgba(var(--primary-color-rgb), 0.1) 0%,
			rgba(var(--primary-color-rgb), 0.2) 100%
		);
		border-left-color: var(--primary-color);
		color: var(--primary-color);
	}

	.checkmark {
		width: 16px;
		height: 16px;
		margin-left: auto;
		color: var(--primary-color);
	}

	.desktop-view {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.mobile-view {
		display: none;
	}

	@media (max-width: 768px) {
		.select-wrapper {
			width: 60px;
		}

		.select-button {
			padding: 8px 5px;
			font-size: 0.8rem;
			height: 38px;
		}

		.desktop-view {
			display: none;
		}

		.mobile-view {
			display: block;
		}

		.selected-option {
			gap: 0;
			justify-content: center;
			flex-grow: 1;
		}

		.select-button :global(svg) {
			width: 16px;
			height: 16px;
		}

		.dropdown {
			width: max-content;
			min-width: 100%;
		}

		.dropdown-option {
			font-size: 0.7rem;
			padding: 8px 10px;
			white-space: nowrap;
		}
	}
</style>
