import 'server-only';
import { EventEmitter } from 'events';

export interface BookingRealTimeEvent {
  bookingId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type RealTimeListener = (event: BookingRealTimeEvent) => void;

export interface RealTimeProvider {
  publishBookingUpdate(
    bookingId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): void;
  subscribeBookingUpdates(bookingId: string, listener: RealTimeListener): () => void;
}

class EventEmitterRealTimeProvider implements RealTimeProvider {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publishBookingUpdate(
    bookingId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): void {
    const event: BookingRealTimeEvent = {
      bookingId,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit(`booking:${bookingId}`, event);
  }

  subscribeBookingUpdates(bookingId: string, listener: RealTimeListener): () => void {
    const channel = `booking:${bookingId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }
}

declare global {
  var __realTimeProvider: RealTimeProvider | undefined;
}

export const realtime = globalThis.__realTimeProvider ?? new EventEmitterRealTimeProvider();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__realTimeProvider = realtime;
}
