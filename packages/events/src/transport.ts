import type { Envelope } from '@oj/contracts';

/**
 * the event log behind one interface. v2 ships redis streams: durable,
 * replayable, consumer groups with acks — everything the projector needs.
 * kafka drops in behind the same interface when a second consumer earns it
 * (hld §12); nothing above this line changes.
 */
export interface EventTransport {
  publish(topic: string, key: string, envelope: Envelope): Promise<void>;
  /** at-least-once. the handler must be idempotent on envelope.eventId. */
  subscribe(topic: string, group: string, consumer: string, handler: (envelope: Envelope, key: string) => Promise<void>): Subscription;
  close(): Promise<void>;
}

export interface Subscription {
  stop(): Promise<void>;
}
