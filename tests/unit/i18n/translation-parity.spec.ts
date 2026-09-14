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
  const hiKeys = getDeepKeys(dictionaries.hi).sort();
  const guKeys = getDeepKeys(dictionaries.gu).sort();

  it('contains dictionary keys in English', () => {
    expect(enKeys.length).toBeGreaterThan(50);
  });

  it('guarantees 100% key parity between English and Hindi dictionaries', () => {
    const missingInHi = enKeys.filter((k) => !hiKeys.includes(k));
    const extraInHi = hiKeys.filter((k) => !enKeys.includes(k));

    expect(missingInHi).toEqual([]);
    expect(extraInHi).toEqual([]);
  });

  it('guarantees 100% key parity between English and Gujarati dictionaries', () => {
    const missingInGu = enKeys.filter((k) => !guKeys.includes(k));
    const extraInGu = guKeys.filter((k) => !enKeys.includes(k));

    expect(missingInGu).toEqual([]);
    expect(extraInGu).toEqual([]);
  });
});
