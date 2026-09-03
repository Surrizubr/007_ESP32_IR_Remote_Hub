import { AppLanguage, TranslationDictionary, LanguageMeta, AVAILABLE_LANGUAGES } from './types';
import { pt } from './pt';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { de } from './de';
import { ar } from './ar';
import { ja } from './ja';
import { zh } from './zh';
import { hi } from './hi';
import { bn } from './bn';
import { ru } from './ru';
import { id } from './id';

export type { AppLanguage, TranslationDictionary, LanguageMeta };
export { AVAILABLE_LANGUAGES };
export { pt, en, es, fr, it, de, ar, ja, zh, hi, bn, ru, id };

export const translations: Record<AppLanguage, TranslationDictionary> = {
  pt,
  en,
  es,
  fr,
  it,
  de,
  ar,
  ja,
  zh,
  hi,
  bn,
  ru,
  id,
};
