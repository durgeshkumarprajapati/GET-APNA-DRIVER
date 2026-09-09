import { OutboxEvent } from '@prisma/client';
import { type Db } from '@/shared/database/prisma';

export type EventHandler = (
  event: OutboxEvent,
  payload: Record<string, unknown>,
  db?: Db,
) => Promise<void>;

export class EventHandlerRegistry {
  private handlers = new Map<string, EventHandler>();

  register(eventType: string, handler: EventHandler): void {
    this.handlers.set(eventType, handler);
  }

  getHandler(eventType: string): EventHandler | undefined {
    return this.handlers.get(eventType);
  }

  hasHandler(eventType: string): boolean {
    return this.handlers.has(eventType);
  }

  unregister(eventType: string): void {
    this.handlers.delete(eventType);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventHandlerRegistry = new EventHandlerRegistry();
