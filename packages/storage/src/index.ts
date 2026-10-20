import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * object store behind one interface. refs are opaque strings stored in mongo:
 *   inline:<text>      v1 rows and tiny values, kept readable forever
 *   s3:<key>           object store (any s3-compatible endpoint)
 *   file:<key>         local directory, for dev machines without an object store
 * every reader accepts every scheme, so a migration is a backfill, not a cutover.
 */
export interface ObjectStore {
  readonly scheme: 's3' | 'file';
  put(key: string, body: string | Buffer): Promise<string>;
  get(ref: string): Promise<string>;
  del(ref: string): Promise<void>;
}

export const INLINE_MAX_BYTES = 4 * 1024;

export class S3Store implements ObjectStore {
  readonly scheme = 's3' as const;
  private readonly client: S3Client;
  constructor(private readonly bucket: string, opts: { endpoint?: string | undefined; region?: string | undefined; accessKeyId: string; secretAccessKey: string }) {
    this.client = new S3Client({
      region: opts.region ?? 'us-east-1',
      ...(opts.endpoint ? { endpoint: opts.endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
  }
  async put(key: string, body: string | Buffer) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body }));
    return `s3:${key}`;
  }
  async get(ref: string) {
    if (ref.startsWith('inline:')) return ref.slice(7);
    const r = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: stripScheme(ref) }));
    return (await r.Body!.transformToString()) ?? '';
  }
  async del(ref: string) {
    if (ref.startsWith('inline:')) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: stripScheme(ref) }));
  }
}

export class FileStore implements ObjectStore {
  readonly scheme = 'file' as const;
  constructor(private readonly root: string) {}
  private path(key: string) {
    const p = normalize(join(this.root, key));
    if (!p.startsWith(normalize(this.root))) throw new Error('key escapes the store root');
    return p;
  }
  async put(key: string, body: string | Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
    return `file:${key}`;
  }
  async get(ref: string) {
    if (ref.startsWith('inline:')) return ref.slice(7);
    return readFile(this.path(stripScheme(ref)), 'utf8');
  }
  async del(ref: string) {
    if (ref.startsWith('inline:')) return;
    await rm(this.path(stripScheme(ref)), { force: true });
  }
}

/** small values stay inline — a round trip to the store for 40 bytes of "1 2\n" is silly. */
export async function putOrInline(store: ObjectStore, key: string, body: string) {
  return Buffer.byteLength(body) <= INLINE_MAX_BYTES ? `inline:${body}` : store.put(key, body);
}

const stripScheme = (ref: string) => ref.replace(/^(s3|file):/, '');

export function storeFromEnv(env: Record<string, string | undefined>): ObjectStore {
  if (env['S3_BUCKET'] && env['S3_ACCESS_KEY'] && env['S3_SECRET_KEY']) {
    return new S3Store(env['S3_BUCKET'], { endpoint: env['S3_ENDPOINT'], region: env['S3_REGION'], accessKeyId: env['S3_ACCESS_KEY'], secretAccessKey: env['S3_SECRET_KEY'] });
  }
  return new FileStore(env['FILE_STORE_ROOT'] ?? join(process.env['HOME'] ?? '/tmp', '.oj', 'store'));
}
