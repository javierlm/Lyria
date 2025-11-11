export function parseTitle(title: string): { artist: string; track: string } {
	let processedTitle = title.replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '');
	processedTitle = processedTitle.split('|')[0].trim();

	const separators = [' - ', ' – ', '-'];
	let separator = '';
	let separatorIndex = -1;

	for (const s of separators) {
		const index = processedTitle.indexOf(s);
		if (index !== -1 && (separatorIndex === -1 || index < separatorIndex)) {
			separatorIndex = index;
			separator = s;
		}
	}

	if (separatorIndex !== -1) {
		let artist = processedTitle.substring(0, separatorIndex).trim();
		const track = processedTitle.substring(separatorIndex + separator.length).trim();
		artist = artist.replace(/\s*(?:ft|feat)\.?.*$/i, '').trim();
		return { artist, track };
	}

	return { artist: '', track: processedTitle.trim() };
}

export function extractVideoId(url: string): string | null {
	const match = url.match(
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
	);
	return match ? match[1] : null;
}

export function debounce<T extends (...args: unknown[]) => void>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;

	return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), delay);
	};
}
