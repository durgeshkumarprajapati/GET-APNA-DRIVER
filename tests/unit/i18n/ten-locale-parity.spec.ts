import { dictionaries } from '@/i18n/locales';

function getObjectKeysRecursive(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getObjectKeysRecursive(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('10-Locale i18n Dictionary Structure Parity Tests', () => {
  const baseLocale = 'en';
  const baseKeys = getObjectKeysRecursive(dictionaries[baseLocale]);

  const targetLocales = ['hi', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'pa', 'bn'] as const;

  targetLocales.forEach((loc) => {
    it(`locale '${loc}' should have 100% dictionary key parity with base locale 'en'`, () => {
      const locKeys = getObjectKeysRecursive(dictionaries[loc]);

      const missingKeys = baseKeys.filter((k) => !locKeys.includes(k));
      const extraKeys = locKeys.filter((k) => !baseKeys.includes(k));

      expect(missingKeys).toEqual([]);
      expect(extraKeys).toEqual([]);
      expect(locKeys.length).toBe(baseKeys.length);
    });
  });
});
