// local dev seed: a setter account and a few public problems with test cases.
// idempotent — re-running updates in place. never run against production.
import { createHash } from 'node:crypto';
import { connect, disconnect } from '../connect.js';
import { ContestModel, ProblemModel, TestcaseModel, UserModel } from '../index.js';

const uri = process.env['MONGO_URI'];
if (!uri) { console.error('MONGO_URI is required'); process.exit(1); }
if (process.env['NODE_ENV'] === 'production') { console.error('refusing to seed production'); process.exit(1); }

// bcrypt hash of "setter-password" (cost 10). the api verifies with bcryptjs.
const SETTER_HASH = '$2a$10$diLBbs4tFX7Ev2lFGlKLeOAwyIaMRrYU.TBC2u03KXLeMQfIMtAiO';

const problems = [
  {
    slug: 'sum-of-two', title: 'Sum of two numbers', difficulty: 'easy', tags: ['math', 'io'],
    statement: 'Read two integers a and b and print their sum.\n\nConstraints: -10^9 ≤ a, b ≤ 10^9.',
    inputFormat: 'A single line with two space-separated integers a and b.',
    outputFormat: 'A single integer, a + b.',
    cases: [
      ['1 2\n', '3\n', true], ['100 200\n', '300\n', false], ['-5 5\n', '0\n', false],
      ['1000000000 1000000000\n', '2000000000\n', false], ['-1000000000 -1000000000\n', '-2000000000\n', false],
    ],
  },
  {
    slug: 'reverse-string', title: 'Reverse a string', difficulty: 'easy', tags: ['strings'],
    statement: 'Read a single line and print it reversed.\n\nConstraints: 1 ≤ length ≤ 10^5, printable ASCII without spaces.',
    inputFormat: 'One line, the string s.', outputFormat: 'The string s, reversed.',
    cases: [['hello\n', 'olleh\n', true], ['a\n', 'a\n', false], ['racecar\n', 'racecar\n', false], ['ab\n', 'ba\n', false]],
  },
  {
    slug: 'max-subarray', title: 'Maximum subarray sum', difficulty: 'medium', tags: ['dp', 'arrays', 'kadane'],
    statement: 'Given an array of n integers, print the largest sum of any non-empty contiguous subarray.\n\nConstraints: 1 ≤ n ≤ 2·10^5, -10^9 ≤ a_i ≤ 10^9.',
    inputFormat: 'The first line has n. The second line has n integers.', outputFormat: 'The maximum subarray sum.',
    cases: [
      ['5\n-2 1 -3 4 -1\n', '4\n', true], ['9\n-2 1 -3 4 -1 2 1 -5 4\n', '6\n', false],
      ['3\n-3 -1 -2\n', '-1\n', false], ['1\n7\n', '7\n', false], ['4\n1000000000 1000000000 1000000000 1000000000\n', '4000000000\n', false],
    ],
  },
  {
    slug: 'two-sum-sorted', title: 'Two sum in a sorted array', difficulty: 'medium', tags: ['two-pointers', 'binary-search'],
    statement: 'Given a sorted array of n distinct integers and a target t, print the 1-based indices i < j such that a_i + a_j = t, or -1 if no pair exists. If several pairs exist, print the one with the smallest i.\n\nConstraints: 2 ≤ n ≤ 2·10^5.',
    inputFormat: 'The first line has n and t. The second line has n sorted integers.', outputFormat: 'Two indices separated by a space, or -1.',
    cases: [['4 9\n2 7 11 15\n', '1 2\n', true], ['3 100\n1 2 3\n', '-1\n', false], ['5 0\n-3 -1 1 3 5\n', '1 4\n', false]],
  },
  {
    slug: 'lis-length', title: 'Longest increasing subsequence', difficulty: 'hard', tags: ['dp', 'binary-search'],
    statement: 'Given n integers, print the length of the longest strictly increasing subsequence.\n\nConstraints: 1 ≤ n ≤ 2·10^5. An O(n²) solution will not pass.',
    inputFormat: 'The first line has n. The second line has n integers.', outputFormat: 'The length of the subsequence.',
    cases: [['6\n10 9 2 5 3 7\n', '3\n', true], ['4\n1 2 3 4\n', '4\n', false], ['5\n5 4 3 2 1\n', '1\n', false], ['8\n3 1 4 1 5 9 2 6\n', '4\n', false]],
  },
] as const;

await connect(uri);
const setter = await UserModel.findOneAndUpdate(
  { username: 'setter' },
  { $setOnInsert: { username: 'setter', email: 'setter@local.dev', passwordHash: SETTER_HASH, role: 'setter' } },
  { upsert: true, new: true },
);
for (const p of problems) {
  const { cases, ...fields } = p;
  const version = createHash('sha256').update(JSON.stringify(cases)).digest('hex').slice(0, 16);
  const doc = await ProblemModel.findOneAndUpdate(
    { slug: p.slug },
    { $set: { ...fields, tags: [...fields.tags], isPublic: true, testcaseSetVersion: version, createdBy: setter._id } },
    { upsert: true, new: true },
  );
  await TestcaseModel.deleteMany({ problemId: doc._id });
  await TestcaseModel.insertMany(cases.map(([input, output, isSample], idx) => ({
    problemId: doc._id, idx, isSample, inputRef: `inline:${input}`, outputRef: `inline:${output}`, bytes: input.length + output.length,
  })));
  console.log(`seeded ${p.slug} (${cases.length} cases)`);
}
// one running contest over three of the problems, so the standings page has something to show
const picks = await ProblemModel.find({ slug: { $in: ['sum-of-two', 'two-sum-sorted', 'lis-length'] } }).select('_id slug').lean();
const order = ['sum-of-two', 'two-sum-sorted', 'lis-length'];
await ContestModel.findOneAndUpdate(
  { title: { $in: ['practice round 1', 'Practice round 1'] } },
  { $set: { title: 'Practice round 1', startAt: new Date(Date.now() - 10 * 60_000), endAt: new Date(Date.now() + 3 * 3600_000),
    problems: order.map((slug, i) => ({ problemId: picks.find((p) => p.slug === slug)!._id, points: 100 * (i + 1) })), scoring: 'icpc' } },
  { upsert: true, new: true },
);
console.log('seeded contest: Practice round 1 (running for 3h)');
await disconnect();
