import { OutboxModel } from '@oj/db';
import { Envelope } from '@oj/contracts';
import type { EventTransport } from './transport.js';

/**
 * transactional outbox relay. lld §7.6. publishes unsent rows oldest-first and
 * marks them sent. a crash between publish and mark re-publishes: consumers
 * dedup on eventId, which is why at-least-once is fine here.
 */
export async function relayOnce(transport: EventTransport, batch = 100) {
  const rows = await OutboxModel.find({ sentAt: null }).sort({ createdAt: 1 }).limit(batch).lean();
  let sent = 0;
  for (const r of rows) {
    const env = Envelope.safeParse(r.envelope);
    if (!env.success) {
      await OutboxModel.updateOne({ _id: r._id }, { $set: { sentAt: new Date() }, $inc: { attempts: 1 } });
      continue;
    }
    try {
      await transport.publish(r.topic, r.key, env.data);
      await OutboxModel.updateOne({ _id: r._id }, { $set: { sentAt: new Date() }, $inc: { attempts: 1 } });
      sent++;
    } catch {
      await OutboxModel.updateOne({ _id: r._id }, { $inc: { attempts: 1 } });
    }
  }
  return { scanned: rows.length, sent };
}

export function startRelay(transport: EventTransport, intervalMs = 500, onError: (e: Error) => void = () => undefined) {
  let running = true;
  const tick = async () => {
    while (running) {
      try {
        const r = await relayOnce(transport);
        if (r.scanned < 100) await new Promise((res) => setTimeout(res, intervalMs));
      } catch (e) {
        onError(e as Error);
        await new Promise((res) => setTimeout(res, intervalMs * 4));
      }
    }
  };
  const done = tick();
  return { stop: async () => { running = false; await done; } };
}
