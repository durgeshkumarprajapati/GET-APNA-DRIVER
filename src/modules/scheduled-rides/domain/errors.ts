export class ScheduledRideNotFoundError extends Error {
  constructor(id?: string) {
    super(id ? `Scheduled ride '${id}' was not found.` : 'Scheduled ride was not found.');
    this.name = 'ScheduledRideNotFoundError';
  }
}

export class ScheduledRideForbiddenError extends Error {
  constructor() {
    super('You do not have permission to access or modify this scheduled ride.');
    this.name = 'ScheduledRideForbiddenError';
  }
}

export class ScheduledRideNotActiveError extends Error {
  constructor(status: string) {
    super(`Cannot modify or generate booking for scheduled ride in '${status}' status.`);
    this.name = 'ScheduledRideNotActiveError';
  }
}

export class InvalidRecurrenceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecurrenceConfigurationError';
  }
}

export class ScheduledRidePastDateError extends Error {
  constructor() {
    super('Scheduled time must be at least 15 minutes in the future.');
    this.name = 'ScheduledRidePastDateError';
  }
}
