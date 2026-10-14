import { describe, expect, it } from 'vitest';
import {
  OutboxModel,
  ProblemModel,
  RefreshTokenModel,
  SubmissionModel,
  TestcaseModel,
  UserModel,
} from '../src/index.js';

// each index exists to serve a named query (lld §3.2). these tests pin the
// declarations so nobody can silently drop one.
const keys = (m: { schema: { indexes(): unknown[] } }) =>
  (m.schema.indexes() as [Record<string, number>, Record<string, unknown>][]).map(([k, o]) => ({ k, o }));

describe('indexes', () => {
  it('users: unique username and email', () => {
    const paths = UserModel.schema.paths;
    expect(paths['username']?.options.unique).toBe(true);
    expect(paths['email']?.options.unique).toBe(true);
  });
  it('problems: catalogue pagination, tags, ingest upsert', () => {
    const ks = keys(ProblemModel).map((x) => JSON.stringify(x.k));
    expect(ks).toContain(JSON.stringify({ isPublic: 1, difficulty: 1, _id: -1 }));
    expect(ks).toContain(JSON.stringify({ tags: 1 }));
    expect(ks).toContain(JSON.stringify({ 'source.site': 1, 'source.externalId': 1 }));
  });
  it('testcases: ordered set per problem is unique', () => {
    const i = keys(TestcaseModel).find((x) => x.k['problemId'] === 1 && x.k['idx'] === 1);
    expect(i?.o['unique']).toBe(true);
  });
  it('submissions: sweeper index is partial over pending statuses only', () => {
    const i = keys(SubmissionModel).find((x) => x.k['status'] === 1 && x.k['submittedAt'] === 1);
    const pfe = i?.o['partialFilterExpression'] as { status: { $in: string[] } };
    expect(pfe.status.$in).toEqual(['QUEUED', 'COMPILING', 'RUNNING']);
  });
  it('refresh tokens: ttl on expiresAt', () => {
    const i = keys(RefreshTokenModel).find((x) => x.k['expiresAt'] === 1);
    expect(i?.o['expireAfterSeconds']).toBe(0);
  });
  it('outbox: relay index covers unsent rows only', () => {
    const i = keys(OutboxModel).find((x) => x.k['createdAt'] === 1);
    expect(i?.o['partialFilterExpression']).toEqual({ sentAt: null });
  });
});
