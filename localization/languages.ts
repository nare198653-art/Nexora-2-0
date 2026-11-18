import { SupportedLanguage, LanguageOption } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    label: 'English',
    script: 'Latin'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    label: 'Hindi (हिन्दी)',
    script: 'Devanagari'
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    label: 'Gujarati (ગુજરાતી)',
    script: 'Gujarati'
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    label: 'Bengali (বাংলা)',
    script: 'Bengali'
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    label: 'Marathi (मराठी)',
    script: 'Devanagari'
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    label: 'Tamil (தமிழ்)',
    script: 'Tamil'
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    label: 'Telugu (తెలుగు)',
    script: 'Telugu'
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    label: 'Kannada (ಕನ್ನಡ)',
    script: 'Kannada'
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    label: 'Malayalam (മലയാളം)',
    script: 'Malayalam'
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    label: 'Punjabi (ਪੰਜਾਬੀ)',
    script: 'Gurmukhi'
  }
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const getLanguageOption = (code?: string): LanguageOption => {
  const match = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return match || SUPPORTED_LANGUAGES[0];
};
