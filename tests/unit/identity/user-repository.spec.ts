import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

function buildDb(identities: unknown[]) {
  return { userIdentity: { findMany: jest.fn().mockResolvedValue(identities) } };
}

describe('getContactInfoForUsers', () => {
  it('returns an empty map without querying when given no user ids', async () => {
    const db = buildDb([]);
    const result = await getContactInfoForUsers(db as never, []);
    expect(result.size).toBe(0);
    expect(db.userIdentity.findMany).not.toHaveBeenCalled();
  });

  it('merges separate email and phone identity rows for the same user', async () => {
    const db = buildDb([
      { userId: 'user-1', providerName: 'email', email: 'a@example.com', phoneNumber: null },
      { userId: 'user-1', providerName: 'phone', email: null, phoneNumber: '+919876543210' },
      { userId: 'user-2', providerName: 'email', email: 'b@example.com', phoneNumber: null },
    ]);

    const result = await getContactInfoForUsers(db as never, ['user-1', 'user-2']);

    expect(result.get('user-1')).toEqual({ email: 'a@example.com', phoneNumber: '+919876543210' });
    expect(result.get('user-2')).toEqual({ email: 'b@example.com', phoneNumber: null });
  });

  it('omits a user entirely from the map when they have no email/phone identity', async () => {
    const db = buildDb([]);
    const result = await getContactInfoForUsers(db as never, ['user-3']);
    expect(result.has('user-3')).toBe(false);
  });
});
