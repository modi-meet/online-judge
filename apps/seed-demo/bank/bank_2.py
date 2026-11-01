# bank 2: binary search, greedy, stacks and monotonic structures, heaps, intervals,
# bit manipulation, number theory.

SZ = [5, 30, 1000, 10000, 60000, 60000]


def _line(xs):
    return ' '.join(map(str, xs))


# ---------------------------------------------------------------- easy

def gen_first_occurrence(rng, t):
    n = SZ[t]; q = SZ[t]
    R = [5, 10, 100, 1000, 10 ** 5, 10 ** 9][t]
    a = sorted(rng.randint(-R, R) for _ in range(n))
    lim = min(R + 2, 10 ** 9)
    qs = [rng.choice(a) if rng.random() < 0.6 else rng.randint(-lim, lim) for _ in range(q)]
    if t >= 1:
        qs[0] = a[0]; qs[1] = a[-1]
    return f"{n} {q}\n{_line(a)}\n{_line(qs)}\n"


def gen_isqrt(rng, t):
    q = [5, 20, 1000, 10000, 50000, 50000][t]
    xs = []
    M = 10 ** 18
    for _ in range(q):
        r = rng.random()
        if r < 0.3:
            s = rng.randint(0, 10 ** 9)
            xs.append(min(M, max(0, s * s + rng.choice([-1, 0, 1]))))
        elif t <= 1:
            xs.append(rng.randint(0, 1000))
        else:
            xs.append(rng.randint(0, M) if rng.random() < 0.6 else rng.randint(0, 10 ** rng.randint(1, 17)))
    if t >= 2:
        xs[:4] = [0, 1, M, M - 1]
    return f"{q}\n" + '\n'.join(map(str, xs)) + '\n'


def gen_single_number(rng, t):
    m = [0, 6, 400, 5000, 50000, 50000][t]
    R = [10, 100, 10 ** 4, 10 ** 6, 10 ** 9 + 1, 10 ** 9 + 1][t]
    vals = rng.sample(range(R), m + 1)
    a = vals[:m] * 2 + [vals[m]]
    rng.shuffle(a)
    return f"{len(a)}\n{_line(a)}\n"


def gen_gcd_lcm(rng, t):
    q = [4, 20, 1000, 10000, 50000, 50000][t]
    out = []
    for i in range(q):
        r = rng.random()
        if t == 0:
            a, b = rng.randint(1, 30), rng.randint(1, 30)
        elif r < 0.4:
            g = rng.randint(1, 10 ** rng.randint(1, 8))
            a = g * rng.randint(1, 10 ** 9 // g); b = g * rng.randint(1, 10 ** 9 // g)
        elif r < 0.5:
            a = rng.randint(1, 10 ** 9); b = a
        elif r < 0.55:
            a, b = 1, rng.randint(1, 10 ** 9)
        else:
            a, b = rng.randint(1, 10 ** 9), rng.randint(1, 10 ** 9)
        out.append(f"{a} {b}")
    return f"{q}\n" + '\n'.join(out) + '\n'


def gen_mod_pow(rng, t):
    q = [5, 20, 1000, 5000, 25000, 25000][t]
    out = []
    for _ in range(q):
        if t <= 1:
            a, b, m = rng.randint(0, 20), rng.randint(0, 20), rng.randint(1, 100)
        else:
            a = rng.randint(0, 10 ** 18); b = rng.randint(0, 10 ** 18)
            m = rng.choice([1, 2, 10 ** 9, 10 ** 9 - 1, 998244353, rng.randint(1, 10 ** 9), rng.randint(1, 1000)])
            r = rng.random()
            if r < 0.05: a = 0
            elif r < 0.1: b = 0
            elif r < 0.15: a = m * rng.randint(0, 10 ** 8)
        out.append(f"{a} {b} {m}")
    if t >= 2:
        out[0] = "0 0 7"; out[1] = "0 0 1"; out[2] = "5 0 1"
    return f"{q}\n" + '\n'.join(out) + '\n'


def gen_next_greater(rng, t):
    n = [5, 20, 1000, 10000, 100000, 100000][t]
    if t == 3:
        a = sorted((rng.randint(1, 10 ** 9) for _ in range(n)), reverse=True)
    else:
        R = [10, 10, 1000, 10 ** 9, 50, 10 ** 9][t]
        a = [rng.randint(1, R) for _ in range(n)]
    return f"{n}\n{_line(a)}\n"


def gen_merge_intervals(rng, t):
    n = [4, 20, 1000, 10000, 60000, 60000][t]
    R = [20, 100, 10 ** 5, 10 ** 9, 10 ** 9, 10 ** 6][t]
    W = [5, 10, 200, 10 ** 5, 10 ** 4, 30][t]
    out = []
    for _ in range(n):
        l = rng.randint(0, R)
        r = min(R, l + rng.randint(0, W))
        out.append(f"{l} {r}")
    return f"{n}\n" + '\n'.join(out) + '\n'


def gen_last_stone(rng, t):
    n = [1, 6, 1000, 10000, 100000, 100000][t]
    R = [10, 10, 1000, 10 ** 9, 10 ** 9, 3][t]
    a = [rng.randint(1, R) for _ in range(n)]
    return f"{n}\n{_line(a)}\n"


# ---------------------------------------------------------------- medium

def gen_koko(rng, t):
    n = [3, 10, 1000, 10000, 100000, 100000][t]
    R = [20, 100, 10 ** 6, 10 ** 9, 10 ** 9, 10 ** 9][t]
    p = [rng.randint(1, R) for _ in range(n)]
    s = sum(p)
    if t == 5:
        h = n
    elif t == 4:
        h = 10 ** 9
    else:
        h = rng.randint(n, max(n, min(10 ** 9, s)))
    return f"{n} {h}\n{_line(p)}\n"


def gen_split_array(rng, t):
    n = [4, 15, 1000, 10000, 100000, 100000][t]
    R = [10, 50, 10 ** 4, 10 ** 4, 10 ** 4, 10][t]
    a = [rng.randint(0, R) for _ in range(n)]
    k = [2, rng.randint(1, n), rng.randint(1, 50), n, rng.randint(1, n), 1][t]
    if t == 4:
        k = rng.randint(2, 300)
    return f"{n} {k}\n{_line(a)}\n"


def gen_cows(rng, t):
    n = [5, 20, 1000, 10000, 100000, 100000][t]
    R = [20, 200, 10 ** 5, 10 ** 9 + 1, 10 ** 9 + 1, 2 * 10 ** 5][t]
    xs = rng.sample(range(R), n)
    c = [3, rng.randint(2, n), rng.randint(2, 50), rng.randint(2, n), rng.randint(2, 1000), n][t]
    return f"{n} {c}\n{_line(xs)}\n"


def gen_rotated(rng, t):
    n = SZ[t]; q = SZ[t]
    R = [20, 100, 10 ** 4, 10 ** 9, 10 ** 9, 10 ** 9][t]
    a = sorted(rng.sample(range(-R, R + 1), n))
    r = [2, rng.randint(0, n - 1), 0, rng.randint(0, n - 1), n - 1, rng.randint(0, n - 1)][t]
    a = a[r:] + a[:r]
    qs = [rng.choice(a) if rng.random() < 0.6 else rng.randint(-R, R) for _ in range(q)]
    return f"{n} {q}\n{_line(a)}\n{_line(qs)}\n"


def gen_histogram(rng, t):
    n = [5, 20, 1000, 10000, 100000, 100000][t]
    if t == 3:
        a = list(range(1, n + 1))
    else:
        R = [10, 10, 1000, 10 ** 9, 10 ** 9, 5][t]
        a = [rng.randint(0, R) for _ in range(n)]
    return f"{n}\n{_line(a)}\n"


def gen_window_max(rng, t):
    n = [5, 20, 1000, 10000, 100000, 100000][t]
    R = [10, 100, 1000, 10 ** 9, 10 ** 9, 10 ** 9][t]
    a = [rng.randint(-R, R) for _ in range(n)]
    k = [3, rng.randint(1, n), 1, n, rng.randint(2, 1000), rng.randint(1000, 50000)][t]
    return f"{n} {k}\n{_line(a)}\n"


def gen_meeting_rooms(rng, t):
    n = [4, 20, 1000, 10000, 60000, 60000][t]
    R = [20, 100, 10 ** 4, 10 ** 9, 10 ** 6, 10 ** 9][t]
    W = [6, 20, 300, 10 ** 6, 30, 10 ** 7][t]
    out = []
    for _ in range(n):
        s = rng.randint(0, R - 1)
        e = min(R, s + rng.randint(1, W))
        out.append(f"{s} {e}")
    return f"{n}\n" + '\n'.join(out) + '\n'


def gen_running_median(rng, t):
    n = [4, 20, 1000, 10000, 100000, 100000][t]
    R = [10, 100, 1000, 10 ** 9, 10 ** 9, 5][t]
    a = [rng.randint(-R, R) for _ in range(n)]
    if t == 3:
        a.sort()
    return f"{n}\n{_line(a)}\n"


def gen_jobs(rng, t):
    n = [4, 20, 1000, 10000, 60000, 60000][t]
    D = [3, 10, 300, n // 2, n // 10, 10 ** 9][t]
    P = [20, 100, 10 ** 4, 10 ** 9, 10 ** 9, 10 ** 9][t]
    out = [f"{rng.randint(1, D)} {rng.randint(1, P)}" for _ in range(n)]
    return f"{n}\n" + '\n'.join(out) + '\n'


def gen_ncr(rng, t):
    q = [4, 20, 1000, 10000, 60000, 60000][t]
    N = [10, 30, 1000, 10 ** 5, 10 ** 6, 10 ** 6][t]
    out = []
    for _ in range(q):
        n = rng.randint(0, N)
        r = rng.random()
        k = 0 if r < 0.05 else n if r < 0.1 else rng.randint(0, n)
        out.append(f"{n} {k}")
    if t >= 2:
        out[0] = f"{N} {N // 2}"; out[1] = "0 0"
    return f"{q}\n" + '\n'.join(out) + '\n'


def gen_factorise(rng, t):
    q = [4, 20, 1000, 10000, 30000, 30000][t]
    N = [30, 1000, 10 ** 5, 10 ** 6, 10 ** 6, 10 ** 6][t]
    xs = []
    for _ in range(q):
        r = rng.random()
        if r < 0.1 and N >= 2 ** 19:
            xs.append(2 ** rng.randint(1, 19))
        else:
            xs.append(rng.randint(2, N))
    if t >= 3:
        xs[:4] = [999983, 10 ** 6, 2, 720720]
    return f"{q}\n" + '\n'.join(map(str, xs)) + '\n'


# ---------------------------------------------------------------- hard

def gen_max_xor(rng, t):
    n = [3, 20, 1000, 10000, 100000, 100000][t]
    B = [4, 8, 16, 30, 30, 30][t]
    if t == 2:
        a = [7] * n
    else:
        a = [rng.randrange(1 << B) for _ in range(n)]
    if t == 5:
        a = [x & ~(1 << 29) for x in a]
    return f"{n}\n{_line(a)}\n"


def gen_pair_distance(rng, t):
    n = [4, 20, 500, 5000, 20000, 20000][t]
    R = [10, 50, 10 ** 4, 10 ** 9, 10 ** 9, 100][t]
    a = [rng.randint(0, R) for _ in range(n)]
    tot = n * (n - 1) // 2
    k = [3, rng.randint(1, tot), tot, rng.randint(1, tot), rng.randint(1, tot), 1][t]
    return f"{n} {k}\n{_line(a)}\n"


def gen_ipo(rng, t):
    n = [3, 20, 1000, 10000, 60000, 60000][t]
    C = [10, 100, 10 ** 5, 10 ** 9, 10 ** 9, 10 ** 9][t]
    P = [5, 20, 1000, 10 ** 5, 10 ** 5, 10 ** 9][t]
    w = [0, rng.randint(0, 10), rng.randint(0, 100), rng.randint(0, 10 ** 6), 10 ** 3, 10 ** 9][t]
    k = [2, rng.randint(1, n), rng.randint(1, n), n, rng.randint(1, n), rng.randint(1, n)][t]
    out = [f"{min(C, int(C * rng.random() ** 4))} {rng.randint(1, P)}" for _ in range(n)]
    return f"{n} {k} {w}\n" + '\n'.join(out) + '\n'


def gen_divisible(rng, t):
    T = [2, 5, 10, 10, 10, 10][t]
    blocks = []
    for i in range(T):
        if t <= 1:
            N = rng.randint(1, 100); k = rng.randint(1, 4)
            d = [rng.randint(2, 12) for _ in range(k)]
        else:
            N = rng.choice([10 ** 18, rng.randint(1, 10 ** 18), rng.randint(1, 10 ** 6)])
            k = 15 if t >= 3 else rng.randint(1, 15)
            mode = (i + t) % 4
            if mode == 0:
                d = [rng.randint(2, 50) for _ in range(k)]
            elif mode == 1:
                d = [rng.choice([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]) for _ in range(k)]
            elif mode == 2:
                d = [2] * k
            else:
                d = [rng.randint(2, 10 ** 9) for _ in range(k)]
        blocks.append(f"{N} {len(d)}\n{_line(d)}")
    return f"{T}\n" + '\n'.join(blocks) + '\n'


def gen_refuel(rng, t):
    n = [2, 10, 1000, 10000, 60000, 60000][t]
    T = [100, 1000, 10 ** 6, 10 ** 9, 10 ** 9, 10 ** 9][t]
    ps = sorted(rng.sample(range(1, T), n))
    avg = T // (n + 1)
    mult = [3, 4, 20, 50, 3, 200][t]
    fs = [rng.randint(1, max(1, avg * mult)) for _ in range(n)]
    F = rng.randint(max(1, ps[0] if ps else 1), max(1, ps[0] if ps else 1) * 2)
    if t == 4:
        F = max(1, ps[0] - 1)  # cannot reach the first station
    out = [f"{p} {f}" for p, f in zip(ps, fs)]
    return f"{T} {F} {n}\n" + ''.join(x + '\n' for x in out)


PROBLEMS = [
    # ============================================================ easy
    dict(
        id='first-occurrence-sorted',
        title='First occurrence in a sorted array',
        difficulty='easy',
        tags=['binary-search', 'arrays'],
        statement='You are given an array of n integers sorted in non-decreasing order, and q queries. For each query value x, find the position of the first element equal to x. Positions are numbered from 1. If x does not appear in the array, the answer is -1.\n\nConstraints: 1 ≤ n, q ≤ 10^5, |a_i|, |x| ≤ 10^9.',
        input_format='The first line has n and q. The second line has the n array elements in non-decreasing order. The third line has the q query values.',
        output_format='Print q lines. The i-th line is the answer to the i-th query.',
        samples=['6 4\n1 2 2 2 5 9\n2 9 3 1\n'],
        gen=gen_first_occurrence,
        py=r'''import sys
from bisect import bisect_left
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    out = []
    for x in map(int, d[2 + n:2 + n + q]):
        i = bisect_left(a, x)
        out.append(str(i + 1) if i < n and a[i] == x else '-1')
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    string out;
    while (q--) {
        long long x; cin >> x;
        int lo = 0, hi = n;
        while (lo < hi) { int m = (lo + hi) / 2; if (a[m] < x) lo = m + 1; else hi = m; }
        if (lo < n && a[lo] == x) out += to_string(lo + 1); else out += "-1";
        out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='integer-square-root',
        title='Integer square root',
        difficulty='easy',
        tags=['binary-search', 'math'],
        statement='For each of q non-negative integers x, print the largest integer r such that r·r ≤ x. Floating-point square roots lose precision near 10^18, so be careful.\n\nConstraints: 1 ≤ q ≤ 10^5, 0 ≤ x ≤ 10^18.',
        input_format='The first line has q. Each of the next q lines has one integer x.',
        output_format='Print q lines, the integer square root of each x.',
        samples=['4\n0\n15\n16\n1000000000000000000\n'],
        gen=gen_isqrt,
        py=r'''import sys
from math import isqrt
def main():
    d = sys.stdin.buffer.read().split()
    q = int(d[0])
    print('\n'.join(str(isqrt(int(x))) for x in d[1:1 + q]))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> q;
    string out;
    while (q--) {
        unsigned long long x; cin >> x;
        unsigned long long lo = 0, hi = 1000000001ULL;
        while (hi - lo > 1) {
            unsigned long long m = (lo + hi) / 2;
            if ((__int128)m * m <= (__int128)x) lo = m; else hi = m;
        }
        out += to_string(lo); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='single-unpaired-number',
        title='The unpaired number',
        difficulty='easy',
        tags=['bit-manipulation'],
        statement='A bag holds n integers. Every value in the bag appears exactly twice, except for one value that appears exactly once. Find that value. Try to do it in O(n) time with O(1) extra memory.\n\nConstraints: 1 ≤ n ≤ 2·10^5, n is odd, 0 ≤ a_i ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='One integer, the value that appears once.',
        samples=['7\n4 1 2 1 2 9 4\n'],
        gen=gen_single_number,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    x = 0
    for v in map(int, d[1:1 + n]):
        x ^= v
    print(x)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    long long x = 0;
    for (int i = 0; i < n; i++) { long long v; cin >> v; x ^= v; }
    cout << x << "\n";
}
''',
    ),
    dict(
        id='gcd-and-lcm',
        title='Greatest common divisor and least common multiple',
        difficulty='easy',
        tags=['number-theory', 'gcd'],
        statement='For each of q pairs of positive integers a and b, compute their greatest common divisor and their least common multiple. Note that the least common multiple can be as large as 10^18, so compute it without overflowing.\n\nConstraints: 1 ≤ q ≤ 10^5, 1 ≤ a, b ≤ 10^9.',
        input_format='The first line has q. Each of the next q lines has two integers a and b.',
        output_format='Print q lines. Each line has two integers: gcd(a, b) and lcm(a, b).',
        samples=['3\n12 18\n7 13\n1000000000 999999999\n'],
        gen=gen_gcd_lcm,
        py=r'''import sys
from math import gcd
def main():
    d = sys.stdin.buffer.read().split()
    q = int(d[0])
    out = []
    for i in range(q):
        a, b = int(d[1 + 2 * i]), int(d[2 + 2 * i])
        g = gcd(a, b)
        out.append(f"{g} {a // g * b}")
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> q;
    string out;
    while (q--) {
        long long a, b; cin >> a >> b;
        long long x = a, y = b;
        while (y) { long long t = x % y; x = y; y = t; }
        out += to_string(x) + ' ' + to_string(a / x * b) + '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='count-primes-sieve',
        title='Counting primes',
        difficulty='easy',
        tags=['number-theory', 'sieve'],
        statement='Count how many prime numbers are less than or equal to n. A prime is an integer greater than 1 whose only positive divisors are 1 and itself. The sieve of Eratosthenes does this in O(n log log n).\n\nConstraints: 1 ≤ n ≤ 10^7.',
        input_format='A single integer n.',
        output_format='One integer, the number of primes p with p ≤ n.',
        samples=['10\n', '1\n'],
        gen=lambda rng, t: f"{[2, rng.randint(3, 100), rng.randint(1000, 10 ** 5), 123457, 10 ** 6, 10 ** 7][t]}\n",
        py=r'''import sys
from math import isqrt
def main():
    n = int(sys.stdin.buffer.read().split()[0])
    if n < 2:
        print(0); return
    s = bytearray([1]) * (n + 1)
    s[0] = s[1] = 0
    for i in range(2, isqrt(n) + 1):
        if s[i]:
            s[i * i::i] = bytes(len(range(i * i, n + 1, i)))
    print(s.count(1))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    int n; cin >> n;
    if (n < 2) { cout << 0 << "\n"; return 0; }
    vector<char> comp(n + 1, 0);
    int cnt = 0;
    for (long long i = 2; i <= n; i++) {
        if (comp[i]) continue;
        cnt++;
        for (long long j = i * i; j <= n; j += i) comp[j] = 1;
    }
    cout << cnt << "\n";
}
''',
    ),
    dict(
        id='modular-exponentiation',
        title='Fast modular exponentiation',
        difficulty='easy',
        tags=['number-theory', 'modular-arithmetic'],
        statement='For each query, compute a^b mod m. The exponent can be as large as 10^18, so repeated multiplication is too slow; use exponentiation by squaring. Take 0^0 to be 1, and remember that every number is 0 modulo 1.\n\nConstraints: 1 ≤ q ≤ 10^5, 0 ≤ a, b ≤ 10^18, 1 ≤ m ≤ 10^9.',
        input_format='The first line has q. Each of the next q lines has three integers a, b and m.',
        output_format='Print q lines, the value of a^b mod m for each query.',
        samples=['3\n2 10 1000\n3 200 13\n0 0 5\n'],
        gen=gen_mod_pow,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    q = int(d[0])
    out = []
    for i in range(q):
        a, b, m = int(d[1 + 3 * i]), int(d[2 + 3 * i]), int(d[3 + 3 * i])
        out.append(str(pow(a, b, m)))
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef unsigned long long ull;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> q;
    string out;
    while (q--) {
        ull a, b, m; cin >> a >> b >> m;
        ull r = 1 % m, x = a % m;
        while (b) { if (b & 1) r = r * x % m; x = x * x % m; b >>= 1; }
        out += to_string(r); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='next-greater-element',
        title='Next greater element',
        difficulty='easy',
        tags=['stack', 'monotonic-stack'],
        statement='You are given an array of n positive integers. For each element, find the first element to its right that is strictly greater than it. If there is no such element, the answer for that position is -1. An O(n) solution uses a stack.\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ a_i ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='One line with n integers separated by spaces, the answer for each position from left to right.',
        samples=['6\n4 5 2 25 7 7\n'],
        gen=gen_next_greater,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    res = [-1] * n
    st = []
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            res[st.pop()] = x
        st.append(i)
    print(' '.join(map(str, res)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n), r(n, -1);
    for (auto &x : a) cin >> x;
    vector<int> st;
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && a[st.back()] <= a[i]) st.pop_back();
        if (!st.empty()) r[i] = a[st.back()];
        st.push_back(i);
    }
    string out;
    for (int i = 0; i < n; i++) { if (i) out += ' '; out += to_string(r[i]); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='merge-overlapping-intervals',
        title='Merge overlapping intervals',
        difficulty='easy',
        tags=['intervals', 'sorting'],
        statement='You are given n closed intervals [l, r]. Two intervals that share at least one point belong together, so [1, 3] and [3, 5] merge into [1, 5], while [1, 2] and [3, 4] stay apart. Repeatedly merge until no two intervals share a point, then list the result.\n\nConstraints: 1 ≤ n ≤ 10^5, 0 ≤ l ≤ r ≤ 10^9.',
        input_format='The first line has n. Each of the next n lines has two integers l and r.',
        output_format='On the first line print m, the number of merged intervals. Then print m lines, each with the two ends of one merged interval, in increasing order of the left end.',
        samples=['4\n1 3\n8 10\n2 6\n15 18\n', '3\n1 2\n3 4\n4 4\n'],
        gen=gen_merge_intervals,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    iv = sorted((int(d[1 + 2 * i]), int(d[2 + 2 * i])) for i in range(n))
    res = []
    for l, r in iv:
        if res and l <= res[-1][1]:
            if r > res[-1][1]:
                res[-1][1] = r
        else:
            res.append([l, r])
    out = [str(len(res))] + [f"{l} {r}" for l, r in res]
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<pair<long long,long long>> v(n);
    for (auto &p : v) cin >> p.first >> p.second;
    sort(v.begin(), v.end());
    vector<pair<long long,long long>> res;
    for (auto &p : v) {
        if (!res.empty() && p.first <= res.back().second) res.back().second = max(res.back().second, p.second);
        else res.push_back(p);
    }
    string out = to_string(res.size()) + "\n";
    for (auto &p : res) out += to_string(p.first) + ' ' + to_string(p.second) + '\n';
    cout << out;
}
''',
    ),
    dict(
        id='last-stone-weight',
        title='Smashing stones',
        difficulty='easy',
        tags=['heap', 'priority-queue', 'simulation'],
        statement='You have n stones with positive integer weights. In each round you pick the two heaviest stones, with weights x ≤ y, and smash them together. If x = y both stones are destroyed; otherwise the stone of weight x is destroyed and the other one now weighs y - x. The game ends when at most one stone is left. Print the weight of the last stone, or 0 if no stones remain.\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ w_i ≤ 10^9.',
        input_format='The first line has n. The second line has the n weights.',
        output_format='One integer, the weight of the remaining stone, or 0.',
        samples=['6\n2 7 4 1 8 1\n'],
        gen=gen_last_stone,
        py=r'''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    h = [-int(x) for x in d[1:1 + n]]
    heapq.heapify(h)
    while len(h) > 1:
        y = -heapq.heappop(h)
        x = -heapq.heappop(h)
        if y != x:
            heapq.heappush(h, x - y)
    print(-h[0] if h else 0)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    priority_queue<long long> pq;
    for (int i = 0; i < n; i++) { long long w; cin >> w; pq.push(w); }
    while (pq.size() > 1) {
        long long y = pq.top(); pq.pop();
        long long x = pq.top(); pq.pop();
        if (y != x) pq.push(y - x);
    }
    cout << (pq.empty() ? 0 : pq.top()) << "\n";
}
''',
    ),

    # ============================================================ medium
    dict(
        id='minimum-eating-speed',
        title='Minimum eating speed',
        difficulty='medium',
        tags=['binary-search', 'binary-search-on-answer'],
        statement='A panda has n piles of bamboo shoots, the i-th pile holding p_i shoots, and h hours before the keeper returns. The panda picks an integer eating speed k. Each hour it chooses one pile and eats k shoots from it; if the pile has fewer than k shoots it finishes that pile and waits for the rest of the hour. Find the smallest k that lets the panda finish every pile within h hours.\n\nConstraints: 1 ≤ n ≤ 10^5, n ≤ h ≤ 10^9, 1 ≤ p_i ≤ 10^9.',
        input_format='The first line has n and h. The second line has the n pile sizes.',
        output_format='One integer, the minimum eating speed.',
        samples=['4 8\n3 6 7 11\n', '5 5\n30 11 23 4 20\n'],
        gen=gen_koko,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, h = int(d[0]), int(d[1])
    p = list(map(int, d[2:2 + n]))
    lo, hi = 1, max(p)
    while lo < hi:
        k = (lo + hi) // 2
        if sum((x + k - 1) // k for x in p) <= h:
            hi = k
        else:
            lo = k + 1
    print(lo)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long h; cin >> n >> h;
    vector<long long> p(n);
    for (auto &x : p) cin >> x;
    long long lo = 1, hi = *max_element(p.begin(), p.end());
    while (lo < hi) {
        long long k = (lo + hi) / 2, s = 0;
        for (long long x : p) s += (x + k - 1) / k;
        if (s <= h) hi = k; else lo = k + 1;
    }
    cout << lo << "\n";
}
''',
    ),
    dict(
        id='split-array-largest-sum',
        title='Split an array to minimise the largest sum',
        difficulty='medium',
        tags=['binary-search', 'binary-search-on-answer', 'greedy'],
        statement='You are given n non-negative integers and a number k. Cut the array into exactly k non-empty contiguous parts so that the largest part sum is as small as possible, and print that smallest possible largest sum.\n\nConstraints: 1 ≤ k ≤ n ≤ 10^5, 0 ≤ a_i ≤ 10^4.',
        input_format='The first line has n and k. The second line has the n integers.',
        output_format='One integer, the minimum possible value of the largest part sum.',
        samples=['5 2\n7 2 5 10 8\n', '4 4\n1 0 3 2\n'],
        gen=gen_split_array,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    def parts(limit):
        cnt, cur = 1, 0
        for x in a:
            if cur + x > limit:
                cnt += 1
                cur = x
            else:
                cur += x
        return cnt
    lo, hi = max(a), sum(a)
    while lo < hi:
        m = (lo + hi) // 2
        if parts(m) <= k:
            hi = m
        else:
            lo = m + 1
    print(lo)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    long long lo = 0, hi = 0;
    for (auto &x : a) { cin >> x; lo = max(lo, x); hi += x; }
    while (lo < hi) {
        long long m = (lo + hi) / 2, cur = 0; int cnt = 1;
        for (long long x : a) { if (cur + x > m) { cnt++; cur = x; } else cur += x; }
        if (cnt <= k) hi = m; else lo = m + 1;
    }
    cout << lo << "\n";
}
''',
    ),
    dict(
        id='aggressive-cows',
        title='Aggressive cows',
        difficulty='medium',
        tags=['binary-search', 'binary-search-on-answer', 'greedy'],
        statement='A barn has n stalls at distinct positions along a straight line. A farmer wants to put c cows into c different stalls, and the cows fight when they stand close together. Place the cows so that the smallest distance between any two of them is as large as possible, and print that distance.\n\nConstraints: 2 ≤ c ≤ n ≤ 10^5, 0 ≤ x_i ≤ 10^9, all x_i are distinct.',
        input_format='The first line has n and c. The second line has the n stall positions, in no particular order.',
        output_format='One integer, the largest possible minimum distance between two cows.',
        samples=['5 3\n1 2 8 4 9\n'],
        gen=gen_cows,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, c = int(d[0]), int(d[1])
    x = sorted(map(int, d[2:2 + n]))
    def fits(g):
        cnt, last = 1, x[0]
        for v in x:
            if v - last >= g:
                cnt += 1
                last = v
                if cnt >= c:
                    return True
        return False
    lo, hi = 1, (x[-1] - x[0]) // (c - 1)
    while lo < hi:
        m = (lo + hi + 1) // 2
        if fits(m):
            lo = m
        else:
            hi = m - 1
    print(lo)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, c; cin >> n >> c;
    vector<long long> x(n);
    for (auto &v : x) cin >> v;
    sort(x.begin(), x.end());
    auto ok = [&](long long g) {
        int cnt = 1; long long last = x[0];
        for (int i = 1; i < n; i++) if (x[i] - last >= g) { cnt++; last = x[i]; }
        return cnt >= c;
    };
    long long lo = 0, hi = x[n - 1] - x[0] + 1;
    while (hi - lo > 1) { long long m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    cout << lo << "\n";
}
''',
    ),
    dict(
        id='search-rotated-sorted-array',
        title='Search in a rotated sorted array',
        difficulty='medium',
        tags=['binary-search', 'arrays'],
        statement='An array of n distinct integers was sorted in increasing order and then rotated: some prefix was moved, unchanged, to the end. For example [1, 3, 5, 8, 9] might become [8, 9, 1, 3, 5]. The rotation may also be empty. Answer q queries: for each value x, print its position in the rotated array, numbered from 1, or -1 if x is not present. Aim for O(log n) per query.\n\nConstraints: 1 ≤ n, q ≤ 10^5, |a_i|, |x| ≤ 10^9.',
        input_format='The first line has n and q. The second line has the rotated array. The third line has the q query values.',
        output_format='Print q lines, the answer to each query.',
        samples=['5 4\n8 9 1 3 5\n3 8 4 5\n'],
        gen=gen_rotated,
        py=r'''import sys
from bisect import bisect_left
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    lo, hi = 0, n - 1
    while lo < hi:
        m = (lo + hi) // 2
        if a[m] > a[hi]:
            lo = m + 1
        else:
            hi = m
    p = lo
    out = []
    for x in map(int, d[2 + n:2 + n + q]):
        if p > 0 and x >= a[0]:
            i = bisect_left(a, x, 0, p)
            end = p
        else:
            i = bisect_left(a, x, p, n)
            end = n
        out.append(str(i + 1) if i < end and a[i] == x else '-1')
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    string out;
    while (q--) {
        long long x; cin >> x;
        int lo = 0, hi = n - 1, ans = -1;
        while (lo <= hi) {
            int m = (lo + hi) / 2;
            if (a[m] == x) { ans = m + 1; break; }
            if (a[lo] <= a[m]) {
                if (a[lo] <= x && x < a[m]) hi = m - 1; else lo = m + 1;
            } else {
                if (a[m] < x && x <= a[hi]) lo = m + 1; else hi = m - 1;
            }
        }
        out += to_string(ans); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='largest-rectangle-histogram',
        title='Largest rectangle in a histogram',
        difficulty='medium',
        tags=['stack', 'monotonic-stack'],
        statement='A histogram has n bars of width 1 standing side by side, the i-th bar having height h_i. Find the area of the largest axis-aligned rectangle that fits entirely inside the histogram.\n\nConstraints: 1 ≤ n ≤ 10^5, 0 ≤ h_i ≤ 10^9.',
        input_format='The first line has n. The second line has the n heights.',
        output_format='One integer, the largest rectangle area.',
        samples=['6\n2 1 5 6 2 3\n'],
        gen=gen_histogram,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    h = list(map(int, d[1:1 + n])) + [0]
    st = []
    best = 0
    for i, x in enumerate(h):
        start = i
        while st and st[-1][1] >= x:
            j, y = st.pop()
            area = y * (i - j)
            if area > best:
                best = area
            start = j
        st.append((start, x))
    print(best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> h(n);
    for (auto &x : h) cin >> x;
    vector<int> L(n), R(n), st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && h[st.back()] >= h[i]) st.pop_back();
        L[i] = st.empty() ? -1 : st.back(); st.push_back(i);
    }
    st.clear();
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && h[st.back()] >= h[i]) st.pop_back();
        R[i] = st.empty() ? n : st.back(); st.push_back(i);
    }
    long long best = 0;
    for (int i = 0; i < n; i++) best = max(best, h[i] * (R[i] - L[i] - 1));
    cout << best << "\n";
}
''',
    ),
    dict(
        id='sliding-window-maximum',
        title='Maximum of every window',
        difficulty='medium',
        tags=['monotonic-queue', 'deque'],
        statement='You are given an array of n integers and a window length k. Slide a window of k consecutive elements from the left end to the right end, one step at a time, and report the maximum inside the window at each of the n - k + 1 positions. A monotonic deque gives O(n) overall.\n\nConstraints: 1 ≤ k ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n and k. The second line has the n integers.',
        output_format='One line with n - k + 1 integers separated by spaces: the window maxima from left to right.',
        samples=['8 3\n1 3 -1 -3 5 3 6 7\n'],
        gen=gen_window_max,
        py=r'''import sys
from collections import deque
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    dq = deque()
    res = []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(a[dq[0]])
    print(' '.join(map(str, res)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    vector<int> dq(n); int head = 0, tail = 0;
    string out;
    for (int i = 0; i < n; i++) {
        while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;
        dq[tail++] = i;
        if (dq[head] <= i - k) head++;
        if (i >= k - 1) { if (i > k - 1) out += ' '; out += to_string(a[dq[head]]); }
    }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='minimum-meeting-rooms',
        title='Minimum meeting rooms',
        difficulty='medium',
        tags=['intervals', 'sorting', 'heap'],
        statement='An office has n meetings planned. Meeting i starts at time s_i and ends at time e_i, and it occupies a room during the half-open interval [s_i, e_i). A room that is freed at time t can host a meeting that starts at time t. What is the smallest number of rooms needed to hold every meeting?\n\nConstraints: 1 ≤ n ≤ 10^5, 0 ≤ s_i < e_i ≤ 10^9.',
        input_format='The first line has n. Each of the next n lines has two integers s_i and e_i.',
        output_format='One integer, the minimum number of rooms.',
        samples=['3\n0 30\n5 10\n15 20\n', '3\n1 5\n5 9\n2 5\n'],
        gen=gen_meeting_rooms,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    s = sorted(int(d[1 + 2 * i]) for i in range(n))
    e = sorted(int(d[2 + 2 * i]) for i in range(n))
    j = 0
    rooms = 0
    for x in s:
        if x >= e[j]:
            j += 1
        else:
            rooms += 1
    print(rooms)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<pair<long long,long long>> m(n);
    for (auto &p : m) cin >> p.first >> p.second;
    sort(m.begin(), m.end());
    priority_queue<long long, vector<long long>, greater<long long>> ends;
    size_t best = 0;
    for (auto &p : m) {
        while (!ends.empty() && ends.top() <= p.first) ends.pop();
        ends.push(p.second);
        best = max(best, ends.size());
    }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='running-median',
        title='Running median',
        difficulty='medium',
        tags=['heap', 'priority-queue'],
        statement='Integers arrive one at a time. After each arrival, report the median of all integers received so far. When i integers have arrived, the median is defined as the ⌈i/2⌉-th smallest of them, so for an even count it is the lower of the two middle values. Two heaps give O(log n) per arrival.\n\nConstraints: 1 ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n. The second line has the n integers in arrival order.',
        output_format='One line with n integers separated by spaces: the median after each arrival.',
        samples=['6\n5 15 1 3 8 7\n'],
        gen=gen_running_median,
        py=r'''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    lo, hi = [], []   # lo is a max-heap (negated) holding the smaller half
    res = []
    for x in map(int, d[1:1 + n]):
        if lo and x > -lo[0]:
            heapq.heappush(hi, x)
        else:
            heapq.heappush(lo, -x)
        if len(lo) > len(hi) + 1:
            heapq.heappush(hi, -heapq.heappop(lo))
        elif len(hi) > len(lo):
            heapq.heappush(lo, -heapq.heappop(hi))
        res.append(-lo[0])
    print(' '.join(map(str, res)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    multiset<long long> s;
    multiset<long long>::iterator mid;
    string out;
    for (int i = 1; i <= n; i++) {
        long long x; cin >> x;
        s.insert(x);
        if (i == 1) mid = s.begin();
        else {
            // mid currently points at the ceil((i-1)/2)-th smallest
            if (x < *mid) { if (i % 2 == 0) --mid; }
            else { if (i % 2 == 1) ++mid; }
        }
        if (i > 1) out += ' ';
        out += to_string(*mid);
    }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='job-sequencing-deadlines',
        title='Job sequencing with deadlines',
        difficulty='medium',
        tags=['greedy', 'heap', 'scheduling'],
        statement='A freelancer is offered n jobs. Every job takes exactly one day, and only one job can be done per day, starting on day 1. Job i pays p_i if it is finished on or before day d_i, and pays nothing otherwise, so there is no point doing it late. Choose which jobs to do and in what order to maximise the total payment, and print that maximum.\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ d_i ≤ 10^9, 1 ≤ p_i ≤ 10^9.',
        input_format='The first line has n. Each of the next n lines has two integers d_i and p_i.',
        output_format='One integer, the maximum total payment.',
        samples=['5\n2 100\n1 19\n2 27\n1 25\n3 15\n'],
        gen=gen_jobs,
        py=r'''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    jobs = sorted((int(d[1 + 2 * i]), int(d[2 + 2 * i])) for i in range(n))
    h = []
    for dl, p in jobs:
        heapq.heappush(h, p)
        if len(h) > dl:
            heapq.heappop(h)
    print(sum(h))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<pair<long long,long long>> j(n);
    for (auto &x : j) cin >> x.second >> x.first;   // profit, deadline
    sort(j.rbegin(), j.rend());                      // highest profit first
    // place each job in the latest free day <= its deadline (dsu over days)
    int D = n;
    vector<int> par(D + 1);
    iota(par.begin(), par.end(), 0);
    function<int(int)> find = [&](int x) { while (par[x] != x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    long long total = 0;
    for (auto &x : j) {
        int dl = (int)min<long long>(x.second, D);
        int day = find(dl);
        if (day > 0) { total += x.first; par[day] = day - 1; }
    }
    cout << total << "\n";
}
''',
    ),
    dict(
        id='binomial-mod-prime',
        title='Binomial coefficients modulo a prime',
        difficulty='medium',
        tags=['number-theory', 'modular-inverse', 'combinatorics'],
        statement='Answer q queries. Each query gives n and k; print the binomial coefficient C(n, k), the number of ways to choose k items out of n, modulo 10^9 + 7. Precompute factorials and use Fermat\'s little theorem to get modular inverses.\n\nConstraints: 1 ≤ q ≤ 10^5, 0 ≤ k ≤ n ≤ 10^6.',
        input_format='The first line has q. Each of the next q lines has two integers n and k.',
        output_format='Print q lines, C(n, k) mod 10^9 + 7 for each query.',
        samples=['4\n5 2\n10 0\n10 10\n1000000 500000\n'],
        gen=gen_ncr,
        py=r'''import sys
MOD = 10 ** 9 + 7
def main():
    d = sys.stdin.buffer.read().split()
    q = int(d[0])
    qs = [(int(d[1 + 2 * i]), int(d[2 + 2 * i])) for i in range(q)]
    N = max(n for n, _ in qs)
    f = [1] * (N + 1)
    for i in range(1, N + 1):
        f[i] = f[i - 1] * i % MOD
    inv = [1] * (N + 1)
    inv[N] = pow(f[N], MOD - 2, MOD)
    for i in range(N, 0, -1):
        inv[i - 1] = inv[i] * i % MOD
    print('\n'.join(str(f[n] * inv[k] % MOD * inv[n - k] % MOD) for n, k in qs))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL;
long long pw(long long b, long long e) { long long r = 1; b %= MOD; while (e) { if (e & 1) r = r * b % MOD; b = b * b % MOD; e >>= 1; } return r; }
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    const int N = 1000000;
    vector<long long> f(N + 1), inv(N + 1);
    f[0] = 1;
    for (int i = 1; i <= N; i++) f[i] = f[i - 1] * i % MOD;
    inv[N] = pw(f[N], MOD - 2);
    for (int i = N; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;
    int q; cin >> q;
    string out;
    while (q--) {
        int n, k; cin >> n >> k;
        out += to_string(f[n] * inv[k] % MOD * inv[n - k] % MOD); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='prime-factorisation-spf',
        title='Prime factorisation of many numbers',
        difficulty='medium',
        tags=['number-theory', 'sieve', 'factorisation'],
        statement='You are given q integers, each at least 2. For each one, print its prime factorisation as a list of primes in non-decreasing order, repeating each prime as many times as it divides the number. For example 12 is written as 2 2 3. With many queries, a sieve that stores the smallest prime factor of every number up to 10^6 makes each factorisation fast.\n\nConstraints: 1 ≤ q ≤ 10^5, 2 ≤ x ≤ 10^6.',
        input_format='The first line has q. Each of the next q lines has one integer x.',
        output_format='Print q lines. The i-th line has the prime factors of the i-th number in non-decreasing order, separated by spaces.',
        samples=['4\n12\n97\n360\n1024\n'],
        gen=gen_factorise,
        py=r'''import sys
from math import isqrt
def main():
    d = sys.stdin.buffer.read().split()
    q = int(d[0])
    xs = list(map(int, d[1:1 + q]))
    N = max(xs)
    r = isqrt(N)
    small = bytearray([1]) * (r + 1)
    primes = []
    for i in range(2, r + 1):
        if small[i]:
            primes.append(i)
            small[i * i::i] = bytes(len(range(i * i, r + 1, i)))
    spf = list(range(N + 1))
    for p in reversed(primes):
        spf[p * p::p] = [p] * len(range(p * p, N + 1, p))
    out = []
    for x in xs:
        fs = []
        while x > 1:
            p = spf[x]
            fs.append(p)
            x //= p
        out.append(' '.join(map(str, fs)))
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    const int N = 1000000;
    vector<int> spf(N + 1, 0), primes;
    for (int i = 2; i <= N; i++) {
        if (!spf[i]) { spf[i] = i; primes.push_back(i); }
        for (int p : primes) {
            if (p > spf[i] || (long long)p * i > N) break;
            spf[p * i] = p;
        }
    }
    int q; cin >> q;
    string out;
    while (q--) {
        int x; cin >> x;
        bool first = true;
        while (x > 1) { int p = spf[x]; if (!first) out += ' '; first = false; out += to_string(p); x /= p; }
        out += '\n';
    }
    cout << out;
}
''',
    ),

    # ============================================================ hard
    dict(
        id='maximum-xor-pair',
        title='Maximum XOR of two numbers',
        difficulty='hard',
        tags=['bit-manipulation', 'trie', 'greedy'],
        statement='You are given n non-negative integers. Choose two of them at different positions so that their bitwise XOR is as large as possible, and print that XOR. Comparing every pair is O(n^2) and too slow; decide the answer bit by bit from the highest bit, for example with a binary trie.\n\nConstraints: 2 ≤ n ≤ 10^5, 0 ≤ a_i < 2^30.',
        input_format='The first line has n. The second line has the n integers.',
        output_format='One integer, the maximum value of a_i XOR a_j over i ≠ j.',
        samples=['6\n3 10 5 25 2 8\n'],
        gen=gen_max_xor,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    ans = 0
    mask = 0
    for b in range(29, -1, -1):
        mask |= 1 << b
        pre = {x & mask for x in a}
        cand = ans | (1 << b)
        for p in pre:
            if cand ^ p in pre:
                ans = cand
                break
    print(ans)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> a(n);
    for (auto &x : a) cin >> x;
    vector<array<int,2>> t(1, {0, 0});
    t.reserve((size_t)n * 31 + 1);
    auto ins = [&](int x) {
        int u = 0;
        for (int b = 29; b >= 0; b--) {
            int c = (x >> b) & 1;
            if (!t[u][c]) { t[u][c] = (int)t.size(); t.push_back({0, 0}); }
            u = t[u][c];
        }
    };
    auto query = [&](int x) {
        int u = 0, r = 0;
        for (int b = 29; b >= 0; b--) {
            int c = (x >> b) & 1;
            if (t[u][c ^ 1]) { r |= 1 << b; u = t[u][c ^ 1]; } else u = t[u][c];
        }
        return r;
    };
    int best = 0;
    ins(a[0]);
    for (int i = 1; i < n; i++) { best = max(best, query(a[i])); ins(a[i]); }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='kth-smallest-pair-distance',
        title='K-th smallest pair distance',
        difficulty='hard',
        tags=['binary-search', 'binary-search-on-answer', 'sorting', 'two-pointers'],
        statement='You are given n integers. For every pair of positions i < j, the distance of the pair is |a_i - a_j|. There are n(n-1)/2 such distances; sort them in non-decreasing order (keeping duplicates) and print the k-th one, counting from 1. Listing all pairs is too slow; binary search on the distance and count pairs with a sliding pointer.\n\nConstraints: 2 ≤ n ≤ 2·10^4, 1 ≤ k ≤ n(n-1)/2, 0 ≤ a_i ≤ 10^9.',
        input_format='The first line has n and k. The second line has the n integers.',
        output_format='One integer, the k-th smallest pair distance.',
        samples=['4 3\n1 6 1 3\n'],
        gen=gen_pair_distance,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = sorted(map(int, d[2:2 + n]))
    def count(g):
        c = 0
        i = 0
        for j in range(n):
            x = a[j] - g
            while a[i] < x:
                i += 1
            c += j - i
        return c
    lo, hi = 0, a[-1] - a[0]
    while lo < hi:
        m = (lo + hi) // 2
        if count(m) >= k:
            hi = m
        else:
            lo = m + 1
    print(lo)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long k; cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    sort(a.begin(), a.end());
    long long lo = -1, hi = a[n - 1] - a[0];   // count(hi) >= k, count(lo) < k
    while (hi - lo > 1) {
        long long m = lo + (hi - lo) / 2, c = 0;
        int i = 0;
        for (int j = 0; j < n; j++) { while (a[j] - a[i] > m) i++; c += j - i; }
        if (c >= k) hi = m; else lo = m;
    }
    cout << hi << "\n";
}
''',
    ),
    dict(
        id='maximise-capital-projects',
        title='Choosing projects to grow capital',
        difficulty='hard',
        tags=['greedy', 'heap', 'priority-queue'],
        statement='A startup begins with capital w and may complete at most k projects before its funding round. Project i can only be started while the current capital is at least c_i, and finishing it adds a pure profit of p_i to the capital (the requirement c_i is not spent). Each project can be done at most once and projects are done one after another. Print the largest capital the startup can have at the end.\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ k ≤ n, 0 ≤ w ≤ 10^9, 0 ≤ c_i ≤ 10^9, 1 ≤ p_i ≤ 10^9.',
        input_format='The first line has n, k and w. Each of the next n lines has two integers c_i and p_i.',
        output_format='One integer, the maximum final capital.',
        samples=['3 2 0\n0 1\n1 2\n1 3\n', '4 3 1\n2 5\n1 1\n10 100\n7 1\n'],
        gen=gen_ipo,
        py=r'''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n, k, w = int(d[0]), int(d[1]), int(d[2])
    pr = sorted((int(d[3 + 2 * i]), int(d[4 + 2 * i])) for i in range(n))
    h = []
    i = 0
    for _ in range(k):
        while i < n and pr[i][0] <= w:
            heapq.heappush(h, -pr[i][1])
            i += 1
        if not h:
            break
        w -= heapq.heappop(h)
    print(w)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; long long w; cin >> n >> k >> w;
    vector<pair<long long,long long>> p(n);
    for (auto &x : p) cin >> x.first >> x.second;
    sort(p.begin(), p.end());
    priority_queue<long long> pq;
    int i = 0;
    while (k--) {
        while (i < n && p[i].first <= w) pq.push(p[i++].second);
        if (pq.empty()) break;
        w += pq.top(); pq.pop();
    }
    cout << w << "\n";
}
''',
    ),
    dict(
        id='divisible-by-at-least-one',
        title='Numbers divisible by at least one',
        difficulty='hard',
        tags=['number-theory', 'inclusion-exclusion', 'bitmask', 'lcm'],
        statement='For each test case you are given N and a list of k integers d_1, …, d_k (they need not be distinct or coprime). Count the integers x with 1 ≤ x ≤ N that are divisible by at least one d_i. N is far too large to check each number, so use inclusion–exclusion over subsets of the divisors with least common multiples, taking care that the lcm of a subset can exceed 10^18.\n\nConstraints: 1 ≤ T ≤ 10, 1 ≤ N ≤ 10^18, 1 ≤ k ≤ 15, 2 ≤ d_i ≤ 10^9.',
        input_format='The first line has T. Each test case has two lines: the first has N and k, the second has the k integers d_i.',
        output_format='For each test case print one line with the count.',
        samples=['2\n30 2\n2 3\n100 3\n4 6 10\n'],
        gen=gen_divisible,
        py=r'''import sys
from math import gcd
def main():
    d = sys.stdin.buffer.read().split()
    T = int(d[0]); pos = 1
    out = []
    for _ in range(T):
        N, k = int(d[pos]), int(d[pos + 1]); pos += 2
        ds = list(map(int, d[pos:pos + k])); pos += k
        cap = N + 1
        L = [1] * (1 << k)
        odd = [0] * (1 << k)
        total = 0
        for mask in range(1, 1 << k):
            low = mask & -mask
            i = low.bit_length() - 1
            prev = L[mask ^ low]
            odd[mask] = odd[mask ^ low] ^ 1
            if prev > N:
                L[mask] = cap
                continue
            l = prev // gcd(prev, ds[i]) * ds[i]
            if l > N:
                L[mask] = cap
                continue
            L[mask] = l
            if odd[mask]:
                total += N // l
            else:
                total -= N // l
        out.append(str(total))
    print('\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
ll N; int k; vector<ll> ds; ll total;
void dfs(int i, ll l, int cnt) {
    if (i == k) { if (cnt) total += (cnt & 1 ? 1 : -1) * (N / l); return; }
    dfs(i + 1, l, cnt);
    ll g = __gcd(l, ds[i]);
    __int128 nl = (__int128)(l / g) * ds[i];
    if (nl <= N) dfs(i + 1, (ll)nl, cnt + 1);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int T; cin >> T;
    while (T--) {
        cin >> N >> k; ds.assign(k, 0);
        for (auto &x : ds) cin >> x;
        total = 0;
        dfs(0, 1, 0);
        cout << total << "\n";
    }
}
''',
    ),
    dict(
        id='minimum-refuelling-stops',
        title='Minimum refuelling stops',
        difficulty='hard',
        tags=['greedy', 'heap', 'priority-queue'],
        statement='A car drives east along a straight road from position 0 towards a destination at position T. It starts with F litres of fuel, uses exactly one litre per unit of distance, and its tank has no capacity limit. There are n fuel stations on the way; station i is at position p_i and holds f_i litres, and if the car stops there it takes all of that fuel. The car may arrive at a station or at the destination with an empty tank. Print the minimum number of stops needed to reach the destination, or -1 if it cannot be reached.\n\nConstraints: 1 ≤ T, F ≤ 10^9, 0 ≤ n ≤ 10^5, 0 < p_1 < p_2 < … < p_n < T, 1 ≤ f_i ≤ 10^9.',
        input_format='The first line has T, F and n. Each of the next n lines has two integers p_i and f_i, in increasing order of position.',
        output_format='One integer, the minimum number of stops, or -1.',
        samples=['100 10 4\n10 60\n20 30\n30 30\n60 40\n', '100 1 1\n10 100\n'],
        gen=gen_refuel,
        py=r'''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    T, F, n = int(d[0]), int(d[1]), int(d[2])
    st = [(int(d[3 + 2 * i]), int(d[4 + 2 * i])) for i in range(n)] + [(T, 0)]
    reach = F
    h = []
    stops = 0
    for p, f in st:
        while reach < p:
            if not h:
                print(-1)
                return
            reach -= heapq.heappop(h)
            stops += 1
        heapq.heappush(h, -f)
    print(stops)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    long long T, F; int n; cin >> T >> F >> n;
    vector<long long> p(n + 1), f(n + 1);
    for (int i = 0; i < n; i++) cin >> p[i] >> f[i];
    p[n] = T; f[n] = 0;
    priority_queue<long long> pq;
    long long reach = F; int stops = 0;
    for (int i = 0; i <= n; i++) {
        while (reach < p[i]) {
            if (pq.empty()) { cout << -1 << "\n"; return 0; }
            reach += pq.top(); pq.pop(); stops++;
        }
        pq.push(f[i]);
    }
    cout << stops << "\n";
}
''',
    ),
]
