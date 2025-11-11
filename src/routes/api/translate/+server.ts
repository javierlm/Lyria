import { LibreTranslateTranslator } from '$lib/LibreTranslateTranslator';
import { DeepLTranslator } from '$lib/DeepLTranslator';
import type { RequestHandler } from './$types';
import { TRANSLATION_PROVIDER } from '$env/static/private';
import type { TranslationProvider } from '$lib/TranslationProvider';
import { json } from '@sveltejs/kit';
import { FileSystemAndMemoryCacheProvider } from '$lib/cache/FsAndMemCacheProvider';
import { VercelKvCacheProvider } from '$lib/cache/VercelKvCacheProvider';
import type { CacheProvider } from '$lib/cache/CacheProvider';
import type { LibreTranslateResponse } from '$lib/LibreTranslateTranslator';
import { VERCEL } from '$env/static/private';

const cacheProvider: CacheProvider<LibreTranslateResponse> =
	VERCEL === '1' ? new VercelKvCacheProvider() : new FileSystemAndMemoryCacheProvider();

// Initialize the persistent cache when the server starts
cacheProvider.initialize();

function generateCacheKey(
	sourceLanguage: string,
	targetLanguage: string | undefined,
	id: string
): string {
	return `${sourceLanguage}-${targetLanguage || 'undefined'}-${id}`;
}

export const POST: RequestHandler = async ({ request }) => {
	const { sourceLanguage, targetLanguage, text, id } = await request.json();

	const originalText: string[] = text;
	const emptyLineIndices: number[] = [];
	const textToTranslate: string[] = [];

	originalText.forEach((line, index) => {
		if (line.trim() === '') {
			emptyLineIndices.push(index);
		} else {
			textToTranslate.push(line);
		}
	});

	if (textToTranslate.length === 0) {
		console.log('No valid text to translate after filtering, returning original empty array.');
		return json({ translatedText: originalText.map(() => '') });
	}

	const cacheKey = generateCacheKey(sourceLanguage, targetLanguage, id);

	const cachedResponse = await cacheProvider.get(cacheKey);
	if (cachedResponse) {
		console.log('-----CACHE HIT-----');
		const reconstructedTranslatedText = [...cachedResponse.translatedText];
		emptyLineIndices.forEach((index) => {
			reconstructedTranslatedText.splice(index, 0, '');
		});
		return json({ translatedText: reconstructedTranslatedText });
	}

	let translator: TranslationProvider;
	if (TRANSLATION_PROVIDER === 'deepl') {
		translator = new DeepLTranslator();
	} else {
		// Default to LibreTranslate
		translator = new LibreTranslateTranslator();
	}

	try {
		const translatedResponse = await translator.translate(
			sourceLanguage,
			targetLanguage,
			textToTranslate
		);
		await cacheProvider.set(cacheKey, translatedResponse);

		const reconstructedTranslatedText = [...translatedResponse.translatedText];
		emptyLineIndices.forEach((index) => {
			reconstructedTranslatedText.splice(index, 0, '');
		});

		return json({ translatedText: reconstructedTranslatedText });
	} catch (error) {
		console.error('Translation error:', error);
		return json(
			{ translatedText: originalText.map(() => 'Error during translation.') },
			{ status: 500 }
		);
	}
};
