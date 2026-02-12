// Declarations for kuroshiro packages (used in backend)

declare module 'kuroshiro' {
  export interface ConvertOptions {
    to?: 'hiragana' | 'katakana' | 'romaji';
    mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana';
    romajiSystem?: 'hepburn' | 'nippon' | 'passport';
    delimiter_start?: string;
    delimiter_end?: string;
  }

  export default class Kuroshiro {
    init(analyzer: unknown): Promise<void>;
    convert(str: string, options?: ConvertOptions): Promise<string>;
  }
}

declare module 'kuroshiro-analyzer-kuromoji' {
  export default class KuromojiAnalyzer {
    constructor();
    init(): Promise<void>;
  }
}
