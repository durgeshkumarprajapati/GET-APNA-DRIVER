import {
  isPromotionCurrentlyUsable,
  isPromotionEditable,
  isTerminalPromotionStatus,
  validatePromotionStatusTransition,
} from '@/modules/promotion/domain/promotion-state-machine';
import { InvalidPromotionStatusTransitionError } from '@/modules/promotion/domain/errors';

describe('validatePromotionStatusTransition', () => {
  it('allows DRAFT -> ACTIVE', () => {
    expect(() => validatePromotionStatusTransition('DRAFT', 'ACTIVE')).not.toThrow();
  });

  it('allows ACTIVE -> PAUSED and PAUSED -> ACTIVE (resume)', () => {
    expect(() => validatePromotionStatusTransition('ACTIVE', 'PAUSED')).not.toThrow();
    expect(() => validatePromotionStatusTransition('PAUSED', 'ACTIVE')).not.toThrow();
  });

  it('allows ACTIVE -> ARCHIVED and DRAFT -> ARCHIVED', () => {
    expect(() => validatePromotionStatusTransition('ACTIVE', 'ARCHIVED')).not.toThrow();
    expect(() => validatePromotionStatusTransition('DRAFT', 'ARCHIVED')).not.toThrow();
  });

  it('rejects ARCHIVED -> anything (terminal)', () => {
    expect(() => validatePromotionStatusTransition('ARCHIVED', 'ACTIVE')).toThrow(
      InvalidPromotionStatusTransitionError,
    );
  });

  it('rejects DRAFT -> PAUSED (must go live first)', () => {
    expect(() => validatePromotionStatusTransition('DRAFT', 'PAUSED')).toThrow(
      InvalidPromotionStatusTransitionError,
    );
  });
});

describe('isTerminalPromotionStatus', () => {
  it('only ARCHIVED is terminal', () => {
    expect(isTerminalPromotionStatus('ARCHIVED')).toBe(true);
    expect(isTerminalPromotionStatus('DRAFT')).toBe(false);
    expect(isTerminalPromotionStatus('ACTIVE')).toBe(false);
    expect(isTerminalPromotionStatus('PAUSED')).toBe(false);
  });
});

describe('isPromotionEditable', () => {
  it('only DRAFT is editable', () => {
    expect(isPromotionEditable('DRAFT')).toBe(true);
    expect(isPromotionEditable('ACTIVE')).toBe(false);
    expect(isPromotionEditable('PAUSED')).toBe(false);
    expect(isPromotionEditable('ARCHIVED')).toBe(false);
  });
});

describe('isPromotionCurrentlyUsable', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('is usable when ACTIVE and within the date window', () => {
    const startsAt = new Date('2026-06-01T00:00:00.000Z');
    const endsAt = new Date('2026-06-30T00:00:00.000Z');
    expect(isPromotionCurrentlyUsable('ACTIVE', startsAt, endsAt, now)).toBe(true);
  });

  it('is not usable before startsAt', () => {
    const startsAt = new Date('2026-07-01T00:00:00.000Z');
    expect(isPromotionCurrentlyUsable('ACTIVE', startsAt, null, now)).toBe(false);
  });

  it('is not usable after endsAt (derived expiry)', () => {
    const startsAt = new Date('2026-01-01T00:00:00.000Z');
    const endsAt = new Date('2026-06-01T00:00:00.000Z');
    expect(isPromotionCurrentlyUsable('ACTIVE', startsAt, endsAt, now)).toBe(false);
  });

  it('is not usable when PAUSED, even within the date window', () => {
    const startsAt = new Date('2026-06-01T00:00:00.000Z');
    expect(isPromotionCurrentlyUsable('PAUSED', startsAt, null, now)).toBe(false);
  });

  it('is usable with no end date at all', () => {
    const startsAt = new Date('2026-01-01T00:00:00.000Z');
    expect(isPromotionCurrentlyUsable('ACTIVE', startsAt, null, now)).toBe(true);
  });
});
