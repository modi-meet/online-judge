import mongoose from 'mongoose';

let connecting: Promise<typeof mongoose> | null = null;

/** idempotent. every service calls this once at boot and fails loudly if mongo is down. */
export function connect(uri: string) {
  if (!connecting) {
    mongoose.set('strictQuery', true);
    // a uri without a database (atlas hands these out) would land in "test"
    const named = /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri);
    connecting = mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000, ...(named ? {} : { dbName: 'oj' }) });
  }
  return connecting;
}

export async function disconnect() {
  connecting = null;
  await mongoose.disconnect();
}

export { mongoose };
export { Types } from 'mongoose';
