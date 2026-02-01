# AGENTS.md

Guidance for AI agents working in the Lyria codebase.

## Project Overview

Lyria is a SvelteKit 5 web app for watching videos with synchronized lyrics. Stack: TypeScript, Svelte 5 runes, Vite, Vitest, pnpm.

## Commands

```bash
# Development
pnpm dev                 # Start dev server at localhost:5173

# Build & Quality
pnpm build               # Production build
pnpm check               # Type-checking (svelte-check)
pnpm lint                # ESLint + Prettier check
pnpm format              # Format code

# Testing
pnpm test                # Run all Vitest tests in watch mode
pnpm test run            # Run all tests once (CI mode)
pnpm test run src/lib/tests/specific.test.ts  # Run single test file

# Other
pnpm typesafe-i18n       # Regenerate i18n types
```

## Code Style

### Formatting (Prettier)

- Indent: 2 spaces (no tabs)
- Single quotes
- No trailing commas
- Print width: 100

### TypeScript (Strict Mode)

- No explicit `any` (enforced by ESLint)
- Use interfaces for object shapes, types for unions
- Always annotate function parameters and return types
- Type assertions for state: `null as string | null`

### Naming Conventions

- **Components**: PascalCase (`LyricsView.svelte`)
- **Services/Utils**: camelCase (`videoService.ts`)
- **Stores**: camelCase + `.svelte.ts` (`playerStore.svelte.ts`)
- **Types/Interfaces**: PascalCase (`LyricsResult`)
- **Constants**: UPPER_SNAKE_CASE (`SIMILARITY_THRESHOLD`)

### Import Order

1. External libraries (npm packages)
2. Svelte imports
3. SvelteKit imports (`$app/*`)
4. Internal imports (`$lib/*`, `$i18n/*`)

### Error Handling

```typescript
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed');
  return await res.json();
} catch (error) {
  console.error('Error:', error);
  return defaultValue; // Graceful fallback
}
```

## Svelte 5 Runes - Best Practices

### State Management ($state)

```typescript
// Deep reactive state (proxies)
let count = $state(0);
let todos = $state([{ done: false, text: 'item' }]);

// Non-reactive mutations (use for large datasets)
let data = $state.raw({ items: [] });

// Classes with state
class Player {
  isPlaying = $state(false);
  volume = $state(100);
  toggle = () => {
    this.isPlaying = !this.isPlaying;
  };
}
```

### Derived Values ($derived)

```typescript
// Simple derivation - NEVER use $effect for this
let doubled = $derived(count * 2);

// Complex derivation
let total = $derived.by(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
});

// Deriveds can be temporarily overridden (optimistic UI)
let likes = $derived(post.likes);
```

### Effects ($effect)

```typescript
// Use ONLY for side effects (DOM, third-party libs, analytics)
// NEVER use to sync state - use $derived instead
$effect(() => {
  document.title = `${currentTrack} - Lyria`;
  return () => {
    /* cleanup */
  };
});
```

### Props ($props, $bindable)

```typescript
// Destructure with fallbacks
let { title, volume = 50 }: { title: string; volume?: number } = $props();

// Bindable props (parent-child two-way binding)
let { value = $bindable() } = $props();

// Unique IDs per component instance (v5.20+)
const uid = $props.id();
```

### Event Handling

```svelte
<!-- Use event attributes, not on: directives -->
<button onclick={handleClick}>Click</button>
<button onclick={(e) => handleClick(e)}>Click</button>
```

### Snippets (Preferred over Slots)

```svelte
{#snippet header()}
  <p>Header content</p>
{/snippet}
<Component>{@render header()}</Component>
```

## State Management Patterns

### Shared State (in .svelte.ts files)

```typescript
// ✅ CORRECT: Export object container (not reassigned state)
export const playerState = $state({
  videoId: null as string | null,
  isPlaying: false
});

// ❌ WRONG: Cannot export reassigned primitive state
export let count = $state(0);
export function increment() {
  count++;
} // Won't work across modules
```

### SvelteKit Page State

```typescript
// Use $app/state (modern) instead of $app/stores (legacy)
import { page, navigating } from '$app/state';

let pathname = $derived(page.url.pathname);
let isLoading = $derived(navigating !== null);
```

### Server Load Functions

```typescript
// ✅ CORRECT: Return data from load functions
export async function load({ fetch }) {
  const res = await fetch('/api/user');
  return { user: await res.json() };
}

// ❌ WRONG: Never set global state in load functions
import { user } from '$lib/stores';
export async function load({ fetch }) {
  user.set(await res.json()); // Causes data leakage between users!
}
```

## Architecture

### Feature-Based Structure

```
src/lib/features/
├── player/        # Video player feature
│   ├── components/
│   ├── services/
│   └── stores/
├── search/
├── settings/
└── ui/            # Shared UI components
```

### Key Patterns

1. **Stores**: Use `.svelte.ts` files with `$state` for shared state
2. **Services**: Business logic in `services/` folders
3. **Components**: Use Svelte 5 runes, never Svelte 4 reactive statements
4. **Never use `$effect` to sync state** - use `$derived` instead
5. **Props**: Use destructuring with types; mark bindable props explicitly

## Testing

Tests located in `src/lib/tests/*.test.ts` using Vitest.

```typescript
import { describe, it, expect } from 'vitest';
import { flushSync } from 'svelte';

describe('utils', () => {
  it('should parse title', () => {
    expect(parseTitle('Artist - Track')).toEqual({ artist: 'Artist', track: 'Track' });
  });
});

// Testing with runes (use .svelte.test.ts extension)
test('reactive state', () => {
  let count = $state(0);
  let doubled = $derived(count * 2);
  count = 5;
  expect(doubled).toBe(10);
});

// Testing effects (wrap in $effect.root)
test('effect', () => {
  const cleanup = $effect.root(() => {
    $effect(() => {
      /* side effect */
    });
    flushSync();
  });
  cleanup();
});
```

Run single test: `pnpm test run src/lib/tests/utils.test.ts`

## Environment Variables

```env
# Optional - defaults to LibreTranslate
TRANSLATION_PROVIDER=deepl
DEEPL_API_KEY=your_key

# Vercel deployment
VERCEL=1
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

## Key Constraints

- LibreTranslate runs on localhost:5000
- Chrome AI requires Chrome 128+ (client-side only)
- Svelte 5 requires modern browsers (no IE)
- Cache stored in `cache/` (gitignored)
