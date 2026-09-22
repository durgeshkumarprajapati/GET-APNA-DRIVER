import { dictionaries } from '@/i18n/locales';

function getDeepKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  let keys: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys = keys.concat(getDeepKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('Translation Dictionary Key Parity Unit Tests', () => {
  const enKeys = getDeepKeys(dictionaries.en).sort();

  it('contains dictionary keys in English', () => {
    expect(enKeys.length).toBeGreaterThan(50);
  });

  const supportedLocaleCodes = Object.keys(dictionaries) as (keyof typeof dictionaries)[];

  supportedLocaleCodes.forEach((locale) => {
    if (locale === 'en') return;

    it(`guarantees 100% key parity between English and ${locale} dictionaries`, () => {
      const targetKeys = getDeepKeys(dictionaries[locale]).sort();
      const missingKeys = enKeys.filter((k) => !targetKeys.includes(k));
      const extraKeys = targetKeys.filter((k) => !enKeys.includes(k));

      expect(missingKeys).toEqual([]);
      expect(extraKeys).toEqual([]);
    });
  });
});
