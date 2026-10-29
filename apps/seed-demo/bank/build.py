"""
builds the demo problem bank.

each bank_N.py exports PROBLEMS, a list of dicts:
  id            unique kebab-case id (becomes source.externalId; the slug comes from the title)
  title         sentence case, unique
  difficulty    'easy' | 'medium' | 'hard'
  tags          lowercase slugs, e.g. ['arrays', 'two-pointers']
  statement     plain text, proper sentences, constraints at the end ("Constraints: 1 ≤ n ≤ 10^5.")
  input_format, output_format
  time_limit_ms optional, default 1000
  samples       list of 1–2 input strings, shown to users
  gen           gen(rng: random.Random, tier: int) -> input string. tiers 0..5, growing in size
  py            a complete python 3 program (stdin → stdout). it is the source of truth for outputs
  cpp           a complete c++17 program that must agree with py on every test

the answer to every input must be unique: the judge compares output exactly
(trailing whitespace trimmed), so never ask for "any valid" answer.

usage:
  python3 build.py --check 1        cross-check one bank: py vs cpp on every test, with timings
  python3 build.py --out DIR        write DIR/dsa-bundle.json (ingestor format) and DIR/solutions.json
"""
import argparse, hashlib, importlib, json, os, random, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
BANKS = [1, 2, 3, 4]
CXX = shutil.which('g++-15') or shutil.which('g++') or 'c++'
TIERS = range(6)


def load(n):
    sys.path.insert(0, HERE)
    return importlib.import_module(f'bank_{n}').PROBLEMS


def run(cmd, stdin, timeout=20):
    t = time.time()
    p = subprocess.run(cmd, input=stdin.encode(), capture_output=True, timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError(f'{cmd[0]} exited {p.returncode}: {p.stderr.decode()[-400:]}')
    return p.stdout.decode(), time.time() - t


def norm(s):
    return '\n'.join(l.rstrip() for l in s.replace('\r\n', '\n').split('\n')).rstrip('\n') + '\n'


def inputs(p):
    rng = random.Random(int(hashlib.sha256(p['id'].encode()).hexdigest()[:8], 16))
    xs = [norm(s) for s in p['samples']] + [norm(p['gen'](rng, t)) for t in TIERS]
    seen, out = set(), []
    for x in xs:
        if x not in seen: seen.add(x); out.append(x)
    return out, len(p['samples'])


def build_problem(p, work, check_cpp=True):
    py = os.path.join(work, f"{p['id']}.py"); open(py, 'w').write(p['py'])
    exe = None
    if check_cpp:
        src = os.path.join(work, f"{p['id']}.cpp"); open(src, 'w').write(p['cpp'])
        exe = os.path.join(work, p['id'])
        c = subprocess.run([CXX, '-std=c++17', '-O2', '-o', exe, src], capture_output=True)
        if c.returncode != 0: raise RuntimeError(f"cpp compile failed:\n{c.stderr.decode()[-1500:]}")
    xs, nsamples = inputs(p)
    cases, worst_py, worst_cpp = [], 0.0, 0.0
    for i, x in enumerate(xs):
        out, tp = run([sys.executable, '-I', py], x)
        out = norm(out)
        if out.strip() == '': raise RuntimeError(f'test {i}: python printed nothing')
        worst_py = max(worst_py, tp)
        if exe:
            got, tc = run([exe], x)
            worst_cpp = max(worst_cpp, tc)
            if norm(got) != out:
                raise RuntimeError(f'test {i}: cpp disagrees with py\ninput head: {x[:200]!r}\npy:  {out[:200]!r}\ncpp: {norm(got)[:200]!r}')
        cases.append({'input': x, 'output': out, 'isSample': i < nsamples})
    return cases, worst_py, worst_cpp


REQUIRED = ['id', 'title', 'difficulty', 'tags', 'statement', 'input_format', 'output_format', 'samples', 'gen', 'py', 'cpp']


def validate(ps):
    ids, titles = set(), set()
    for p in ps:
        for k in REQUIRED:
            if k not in p: raise RuntimeError(f"{p.get('id')}: missing {k}")
        if p['difficulty'] not in ('easy', 'medium', 'hard'): raise RuntimeError(f"{p['id']}: bad difficulty")
        if p['id'] in ids or p['title'].lower() in titles: raise RuntimeError(f"{p['id']}: duplicate id or title")
        ids.add(p['id']); titles.add(p['title'].lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', type=int)
    ap.add_argument('--out')
    ap.add_argument('--only')
    a = ap.parse_args()
    banks = [a.check] if a.check else BANKS
    all_ps = [p for n in banks for p in load(n)]
    validate(all_ps)
    work = tempfile.mkdtemp(prefix='ojbank-')
    bundle, sols, failed = [], {}, 0
    for p in all_ps:
        if a.only and p['id'] != a.only: continue
        try:
            cases, tp, tc = build_problem(p, work)
            flag = '  SLOW' if tc > 1.0 or tp > 6 else ''
            print(f"ok   {p['id']:<34} {len(cases)} tests  py {tp:.2f}s  cpp {tc:.2f}s{flag}")
        except Exception as e:
            failed += 1
            print(f"FAIL {p['id']}: {e}")
            continue
        bundle.append({
            'externalId': p['id'], 'title': p['title'], 'statement': p['statement'],
            'inputFormat': p['input_format'], 'outputFormat': p['output_format'],
            'difficulty': p['difficulty'], 'tags': p['tags'], 'timeLimitMs': p.get('time_limit_ms', 1000),
            'license': 'original', 'testcases': cases,
        })
        sols[p['id']] = {'python3': p['py'], 'cpp17': p['cpp']}
    print(f"\n{len(bundle)} built, {failed} failed")
    if a.out and not failed:
        os.makedirs(a.out, exist_ok=True)
        json.dump({'site': 'oj-dsa', 'problems': bundle}, open(os.path.join(a.out, 'dsa-bundle.json'), 'w'))
        json.dump(sols, open(os.path.join(a.out, 'solutions.json'), 'w'))
        print(f'wrote {a.out}')
    shutil.rmtree(work, ignore_errors=True)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
