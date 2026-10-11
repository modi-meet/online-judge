// forward-only, idempotent. run on deploy before the new code starts serving.
// every model declares its indexes in its schema; this makes them exist.
import { connect, disconnect, mongoose } from '../connect.js';
import '../index.js';

const uri = process.env['MONGO_URI'];
if (!uri) {
  console.error('MONGO_URI is required');
  process.exit(1);
}

await connect(uri);
for (const name of mongoose.modelNames()) {
  const m = mongoose.model(name);
  await m.syncIndexes();
  console.log(`indexes synced: ${m.collection.collectionName}`);
}
await disconnect();
