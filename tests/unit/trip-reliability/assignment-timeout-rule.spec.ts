import { evaluateAssignmentTimeout } from '@/modules/trip-reliability/rules/assignment-timeout-rule';

describe('evaluateAssignmentTimeout', () => {
  it('should detect assignment timeout if booking SEARCHING_DRIVER for more than 5 minutes', () => {
    const input = {
      bookingId: 'b1',
      status: 'SEARCHING_DRIVER',
      createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    };

    const evaluation = evaluateAssignmentTimeout(input);
    expect(evaluation).not.toBeNull();
    expect(evaluation?.detected).toBe(true);
    expect(evaluation?.type).toBe('ASSIGNMENT_TIMEOUT');
  });

  it('should not detect assignment timeout if booking SEARCHING_DRIVER for less than 5 minutes', () => {
    const input = {
      bookingId: 'b2',
      status: 'SEARCHING_DRIVER',
      createdAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    };

    const evaluation = evaluateAssignmentTimeout(input);
    expect(evaluation).toBeNull();
  });
});
