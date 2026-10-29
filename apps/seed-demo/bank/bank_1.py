# bank 1: arrays, prefix sums, difference arrays, two pointers, sliding window,
# sorting, counting/hashing, simple simulation, basic string manipulation.

LOW = 'abcdefghijklmnopqrstuvwxyz'
SIZES = [1, 8, 300, 5000, 50000, 100000]


def J(xs):
    return ' '.join(map(str, xs))


# ---------------------------------------------------------------- generators

def gen_range_sum(rng, t):
    n = [1, 6, 300, 5000, 30000, 50000][t]
    q = [1, 5, 300, 5000, 30000, 50000][t]
    lim = 10**9 if t % 2 else 100
    a = [rng.randint(-lim, lim) for _ in range(n)]
    qs = [f'1 {n}']
    for _ in range(q - 1):
        l = rng.randint(1, n)
        qs.append(f'{l} {rng.randint(l, n)}')
    return f'{n} {q}\n{J(a)}\n' + '\n'.join(qs) + '\n'


def gen_range_add(rng, t):
    n = [1, 6, 300, 5000, 30000, 40000][t]
    q = [1, 4, 300, 5000, 30000, 40000][t]
    lim = 10**9 if t >= 3 else 50
    a = [rng.randint(-lim, lim) for _ in range(n)]
    ups = []
    for _ in range(q):
        l = rng.randint(1, n)
        ups.append(f'{l} {rng.randint(l, n)} {rng.randint(-lim, lim)}')
    return f'{n} {q}\n{J(a)}\n' + '\n'.join(ups) + '\n'


def gen_equilibrium(rng, t):
    n = SIZES[t]
    if t in (2, 4, 5):
        a = [rng.randint(-1000, 1000) for _ in range(n)]
        m = rng.randint(n // 3, n - 2)
        a[n - 1] = sum(a[:m]) - sum(a[m + 1:n - 1])
    elif t == 3:
        a = [rng.randint(-10**9, 10**9) for _ in range(n)]
    else:
        a = [rng.randint(-2, 2) for _ in range(n)]
    return f'{n}\n{J(a)}\n'


def gen_anagram(rng, t):
    n = SIZES[t]
    alpha = LOW[:[1, 3, 5, 26, 4, 26][t]]
    s = [rng.choice(alpha) for _ in range(n)]
    u = s[:]
    rng.shuffle(u)
    if t in (1, 3):
        i = rng.randrange(n)
        u[i] = rng.choice([c for c in LOW if c != u[i]])
    elif t == 4:
        u.append(rng.choice(alpha))
    return ''.join(s) + '\n' + ''.join(u) + '\n'


def gen_rle(rng, t):
    total = SIZES[t]
    alpha = LOW[:[1, 3, 26, 1, 4, 26][t]]
    maxrun = [1, 4, 10, 1, 30, 3][t]
    s = []
    while len(s) < total:
        s.extend(rng.choice(alpha) * rng.randint(1, maxrun))
    return ''.join(s[:total]) + '\n'


def gen_pal_sentence(rng, t):
    if t == 0:
        return '?!\n'
    half = [3, 40, 2000, 15000, 30000][t - 1]
    pal = t in (1, 3, 5)
    alnum = 'abc123' if t < 3 else 'abcdefghij0123456789'
    base = [rng.choice(alnum) for _ in range(half)]
    core = base + ([rng.choice(alnum)] if rng.random() < 0.5 else []) + base[::-1]
    if not pal:
        i = rng.randrange(len(core) // 2)
        j = len(core) - 1 - i
        core[i] = rng.choice([c for c in alnum if c != core[j]])
    noise = " ,.!?'-:;"
    out = []
    for c in core:
        if c.isalpha() and rng.random() < 0.5:
            c = c.upper()
        out.append(c)
        while rng.random() < 0.3:
            out.append(rng.choice(noise))
    return ''.join(out).strip() + '\n'


def gen_mode(rng, t):
    n = SIZES[t]
    if t == 1:
        a = rng.sample(range(-50, 50), n)
    else:
        lim = [5, 0, 20, 1000, 10**9, 50000][t]
        a = [rng.randint(-lim, lim) for _ in range(n)]
    return f'{n}\n{J(a)}\n'


def gen_move_zeros(rng, t):
    n = SIZES[t]
    p = [1.0, 0.5, 0.3, 0.0, 0.5, 0.1][t]
    a = []
    for _ in range(n):
        if rng.random() < p:
            a.append(0)
        else:
            x = rng.randint(1, 10**9)
            a.append(x if rng.random() < 0.5 else -x)
    return f'{n}\n{J(a)}\n'


def gen_rotate(rng, t):
    n = SIZES[t]
    k = [10**18, 3, 0, n, rng.randint(0, 10**18), rng.randint(0, n - 1)][t]
    a = [rng.randint(-10**9, 10**9) for _ in range(n)]
    return f'{n} {k}\n{J(a)}\n'


def gen_window_sum(rng, t):
    n = SIZES[t]
    k = [1, 3, n, rng.randint(1, n), rng.randint(1, 100), rng.randint(1, n)][t]
    if t == 3:
        a = [rng.randint(-10**9, -1) for _ in range(n)]
    else:
        lim = 10**9 if t >= 4 else 20
        a = [rng.randint(-lim, lim) for _ in range(n)]
    return f'{n} {k}\n{J(a)}\n'


def gen_merge(rng, t):
    total = [2, 8, 300, 5000, 50000, 100000][t]
    n = rng.randint(1, total - 1)
    m = total - n
    if t == 4:
        a = sorted(rng.randint(-10**9, 0) for _ in range(n))
        b = sorted(rng.randint(1, 10**9) for _ in range(m))
    else:
        lim = 10 if t < 3 else 10**9
        a = sorted(rng.randint(-lim, lim) for _ in range(n))
        b = sorted(rng.randint(-lim, lim) for _ in range(m))
    return f'{n} {m}\n{J(a)}\n{J(b)}\n'


def gen_first_unique(rng, t):
    if t == 0:
        return 'q\n'
    if t == 1:
        return ''.join(rng.choice('abc') for _ in range(8)) + '\n'
    if t == 2:
        return 'abc' * 100 + '\n'
    if t == 4:
        s = [c for c in LOW for _ in range(2)] * 1000
        rng.shuffle(s)
        return ''.join(s) + '\n'
    n = SIZES[t]
    extra = 'z' if t == 3 else 'xyz'
    s = [rng.choice(LOW[:20] if t == 5 else LOW[:25]) for _ in range(n - len(extra))]
    for c in extra:
        s.insert(rng.randint(0, len(s)), c)
    return ''.join(s) + '\n'


def gen_leaders(rng, t):
    n = SIZES[t]
    if t == 2:
        a = [7] * n
    elif t == 3:
        a = sorted(rng.sample(range(-10**9, 10**9), n), reverse=True)
    else:
        lim = 10**9 if t >= 4 else 10
        a = [rng.randint(-lim, lim) for _ in range(n)]
    return f'{n}\n{J(a)}\n'


def gen_majority(rng, t):
    n = SIZES[t]
    v = rng.randint(1, 10**9)
    c = n // 2 + 1 if t % 2 == 0 else n // 2
    a = [v] * c + [rng.randint(1, 10**9) for _ in range(n - c)]
    rng.shuffle(a)
    return f'{n}\n{J(a)}\n'


def gen_no_repeat(rng, t):
    n = SIZES[t]
    alpha = LOW[:[1, 3, 5, 26, 10, 26][t]]
    return ''.join(rng.choice(alpha) for _ in range(n)) + '\n'


def gen_sum_k(rng, t):
    n = SIZES[t]
    if t == 4:
        return f'{n} 0\n{J([0] * n)}\n'
    lim = 10**4 if t == 5 else 3
    a = [rng.randint(-lim, lim) for _ in range(n)]
    if t == 0:
        k = a[0]
    elif t == 5:
        l = rng.randrange(n)
        k = sum(a[l:rng.randint(l + 1, n)])
    else:
        k = rng.randint(-5, 5)
    return f'{n} {k}\n{J(a)}\n'


def gen_container(rng, t):
    n = [2, 8, 300, 5000, 50000, 100000][t]
    if t == 3:
        a = sorted(rng.sample(range(10**9), n))
    elif t == 4:
        a = [123456789] * n
    elif t == 1:
        a = [rng.randint(0, 5) for _ in range(n)]
    else:
        a = [rng.randint(0, 10**9) for _ in range(n)]
    return f'{n}\n{J(a)}\n'


def gen_shortest_sum(rng, t):
    n = SIZES[t]
    lim = [10, 10, 100, 10**4, 10**4, 10**4][t]
    a = [rng.randint(1, lim) for _ in range(n)]
    total = sum(a)
    if t == 0:
        s = a[0]
    elif t == 1:
        s = total + 1
    elif t == 5:
        s = rng.randint(total // 2, total)
    else:
        s = rng.randint(1, min(total, 10**9))
    return f'{n} {s}\n{J(a)}\n'


def gen_group_anagrams(rng, t):
    n = [1, 8, 300, 5000, 30000, 50000][t]
    L = [5, 3, 4, 6, 6, 8][t]
    alpha = 'abc' if t < 3 else 'abcd'
    ws = [''.join(rng.choice(alpha) for _ in range(rng.randint(1, L))) for _ in range(n)]
    return f'{n}\n{J(ws)}\n'


def gen_k_distinct(rng, t):
    n = SIZES[t]
    if t == 4:
        a = rng.sample(range(1, 10**9), n)
        k = 7
    else:
        vals = [3, 3, 6, 10, 0, 40][t]
        a = [rng.randint(1, vals) for _ in range(n)]
        k = [1, 2, 3, n, 0, 12][t]
    return f'{n} {k}\n{J(a)}\n'


def gen_product(rng, t):
    n = [2, 8, 300, 5000, 50000, 100000][t]
    if t == 0:
        a = [0, 5]
    else:
        lim = 10 if t == 1 else 10**9
        a = [rng.randint(1, lim) for _ in range(n)]
        zeros = [0, 0, 1, 2, 0, 1][t]
        for i in rng.sample(range(n), zeros):
            a[i] = 0
    return f'{n}\n{J(a)}\n'


def gen_balanced(rng, t):
    n = SIZES[t]
    if t == 2:
        a = [1] * n
    else:
        p = [0.5, 0.5, 0, 0.45, 0.5, 0.6][t]
        a = [1 if rng.random() < p else 0 for _ in range(n)]
    return f'{n}\n{J(a)}\n'


def gen_trap(rng, t):
    n = SIZES[t]
    if t == 3:
        a = sorted(rng.randint(0, 10**9) for _ in range(n))
    elif t == 4:
        a = [abs(i - n // 2) * 10000 + rng.randint(0, 9999) for i in range(n)]
    else:
        lim = 10 if t < 3 else 10**9
        a = [rng.randint(0, lim) for _ in range(n)]
    return f'{n}\n{J(a)}\n'


def gen_min_window(rng, t):
    if t == 0:
        return 'a\na\n'
    n = SIZES[t]
    salpha = [None, 'abc', 'abcde', LOW[:25], LOW, 'abcdef'][t]
    talpha = [None, 'abc', 'abcde', LOW, LOW, 'abcdef'][t]
    m = [None, 2, 4, 6, 30, 1000][t]
    s = ''.join(rng.choice(salpha) for _ in range(n))
    tt = [rng.choice(talpha) for _ in range(m)]
    if t == 3:
        tt[rng.randrange(m)] = 'z'
    return s + '\n' + ''.join(tt) + '\n'


def gen_exact_k(rng, t):
    n = SIZES[t]
    vals = [1, 3, 5, 50, 1000, 20][t]
    k = [1, 2, 3, 10, 100, 5][t]
    a = [rng.randint(1, vals) for _ in range(n)]
    if t == 4:
        a = [x * 999983 for x in a]
    return f'{n} {k}\n{J(a)}\n'


# ---------------------------------------------------------------- problems

PROBLEMS = [
    # ------------------------------------------------------------ easy
    dict(
        id='range-sum-queries',
        title='Range sum queries',
        difficulty='easy',
        tags=['arrays', 'prefix-sums'],
        statement='You are given an array of n integers and q queries. Each query names two positions l and r (1-based, inclusive). For every query, print the sum a_l + a_(l+1) + ... + a_r.\n\nAnswering each query by walking the range is too slow when both n and q are large; precompute something once and answer each query in O(1).\n\nConstraints: 1 ≤ n, q ≤ 5·10^4, |a_i| ≤ 10^9, 1 ≤ l ≤ r ≤ n.',
        input_format='The first line has n and q. The second line has n integers a_1 … a_n. Each of the next q lines has two integers l and r.',
        output_format='Print q lines, the answer to each query in order.',
        samples=['5 3\n3 -1 4 1 5\n1 3\n2 5\n4 4\n'],
        gen=gen_range_sum,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    p = [0] * (n + 1)
    for i in range(n):
        p[i + 1] = p[i] + int(d[2 + i])
    out = []
    j = 2 + n
    for _ in range(q):
        l, r = int(d[j]), int(d[j + 1])
        j += 2
        out.append(p[r] - p[l - 1])
    print('\\n'.join(map(str, out)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> p(n + 1, 0);
    for (int i = 1; i <= n; i++) { long long x; cin >> x; p[i] = p[i - 1] + x; }
    string out;
    while (q--) { int l, r; cin >> l >> r; out += to_string(p[r] - p[l - 1]); out += '\n'; }
    cout << out;
}
''',
    ),
    dict(
        id='apply-range-additions',
        title='Apply range additions',
        difficulty='easy',
        tags=['arrays', 'difference-array', 'prefix-sums'],
        statement='A row of n counters starts with the values a_1 … a_n. Then q updates arrive. Each update is three integers l, r and v, and adds v to every counter from position l to position r (1-based, inclusive). Print the values of the counters after all updates.\n\nConstraints: 1 ≤ n, q ≤ 5·10^4, |a_i| ≤ 10^9, 1 ≤ l ≤ r ≤ n, |v| ≤ 10^9.',
        input_format='The first line has n and q. The second line has n integers a_1 … a_n. Each of the next q lines has three integers l, r and v.',
        output_format='One line with n integers, the final values separated by spaces.',
        samples=['5 2\n1 2 3 4 5\n1 3 10\n2 5 -1\n'],
        gen=gen_range_add,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    a = [int(x) for x in d[2:2 + n]]
    diff = [0] * (n + 1)
    j = 2 + n
    for _ in range(q):
        l, r, v = int(d[j]), int(d[j + 1]), int(d[j + 2])
        j += 3
        diff[l - 1] += v
        diff[r] -= v
    run = 0
    for i in range(n):
        run += diff[i]
        a[i] += run
    print(' '.join(map(str, a)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<long long> a(n), d(n + 1, 0);
    for (auto &x : a) cin >> x;
    while (q--) { int l, r; long long v; cin >> l >> r >> v; d[l - 1] += v; d[r] -= v; }
    long long run = 0;
    string out;
    for (int i = 0; i < n; i++) { run += d[i]; if (i) out += ' '; out += to_string(a[i] + run); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='equilibrium-index',
        title='Equilibrium index',
        difficulty='easy',
        tags=['arrays', 'prefix-sums'],
        statement='An index i of an array is an equilibrium index if the sum of the elements strictly to its left equals the sum of the elements strictly to its right. An empty side sums to 0.\n\nGiven an array of n integers, print the smallest equilibrium index (1-based), or -1 if there is none.\n\nConstraints: 1 ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n. The second line has n integers a_1 … a_n.',
        output_format='One integer, the smallest equilibrium index, or -1.',
        samples=['7\n-7 1 5 2 -4 3 0\n', '3\n1 2 3\n'],
        gen=gen_equilibrium,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    total = sum(a)
    left = 0
    for i, x in enumerate(a):
        if left == total - left - x:
            print(i + 1)
            return
        left += x
    print(-1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    long long total = 0;
    for (auto &x : a) { cin >> x; total += x; }
    long long left = 0;
    for (int i = 0; i < n; i++) {
        if (left == total - left - a[i]) { cout << i + 1 << "\n"; return 0; }
        left += a[i];
    }
    cout << -1 << "\n";
}
''',
    ),
    dict(
        id='anagram-check',
        title='Anagram check',
        difficulty='easy',
        tags=['strings', 'counting'],
        statement='Two strings are anagrams of each other if one can be turned into the other by rearranging its letters, using every letter exactly once. Given two strings of lowercase English letters, decide whether they are anagrams.\n\nConstraints: 1 ≤ |s|, |t| ≤ 10^5, both strings contain only the letters a to z.',
        input_format='The first line has the string s. The second line has the string t.',
        output_format='Print YES if s and t are anagrams, otherwise NO.',
        samples=['listen\nsilent\n', 'rat\ncar\n'],
        gen=gen_anagram,
        py='''import sys
from collections import Counter
def main():
    d = sys.stdin.buffer.read().split()
    print('YES' if Counter(d[0]) == Counter(d[1]) else 'NO')
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s, t; cin >> s >> t;
    array<int, 26> c{};
    for (char ch : s) c[ch - 'a']++;
    for (char ch : t) c[ch - 'a']--;
    bool ok = true;
    for (int x : c) if (x) ok = false;
    cout << (ok ? "YES" : "NO") << "\n";
}
''',
    ),
    dict(
        id='run-length-encoding',
        title='Run-length encoding',
        difficulty='easy',
        tags=['strings', 'simulation'],
        statement='Run-length encoding compresses a string by replacing every maximal block of equal consecutive characters with the character followed by the length of the block. For example, aaabccdddd becomes a3b1c2d4. Note that a block of length one is still written with its count.\n\nGiven a string of lowercase English letters, print its run-length encoding.\n\nConstraints: 1 ≤ |s| ≤ 10^5, s contains only the letters a to z.',
        input_format='One line with the string s.',
        output_format='One line with the encoded string.',
        samples=['aaabccdddd\n', 'abc\n'],
        gen=gen_rle,
        py='''import sys
def main():
    s = sys.stdin.buffer.read().split()[0].decode()
    out = []
    i, n = 0, len(s)
    while i < n:
        j = i
        while j < n and s[j] == s[i]:
            j += 1
        out.append(s[i] + str(j - i))
        i = j
    print(''.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    string out;
    for (size_t i = 0; i < s.size();) {
        size_t j = i;
        while (j < s.size() && s[j] == s[i]) j++;
        out += s[i]; out += to_string(j - i);
        i = j;
    }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='palindrome-sentence',
        title='Palindrome sentence',
        difficulty='easy',
        tags=['strings', 'two-pointers'],
        statement='A sentence reads the same both ways if, after removing every character that is not a letter or a digit and turning all uppercase letters into lowercase, the remaining string is a palindrome. A sentence with no letters or digits at all counts as a palindrome.\n\nGiven one line of text, decide whether it reads the same both ways.\n\nConstraints: the line has between 1 and 10^5 characters, each a printable ASCII character (spaces and punctuation included).',
        input_format='One line of text.',
        output_format='Print YES if the sentence reads the same both ways, otherwise NO.',
        samples=['Was it a car or a cat I saw?\n', 'Step on no pets, please.\n'],
        gen=gen_pal_sentence,
        py='''import sys
def main():
    data = sys.stdin.buffer.read()
    s = bytes(c | 32 if 65 <= c <= 90 else c for c in data
              if 48 <= c <= 57 or 65 <= c <= 90 or 97 <= c <= 122)
    print('YES' if s == s[::-1] else 'NO')
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    string all((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
    string s;
    for (unsigned char c : all) if (isalnum(c)) s += (char)tolower(c);
    int i = 0, j = (int)s.size() - 1;
    bool ok = true;
    while (i < j) { if (s[i] != s[j]) { ok = false; break; } i++; j--; }
    cout << (ok ? "YES" : "NO") << "\n";
}
''',
    ),
    dict(
        id='most-frequent-value',
        title='Most frequent value',
        difficulty='easy',
        tags=['arrays', 'hashing', 'counting'],
        statement='Given n integers, find the value that occurs the most times. If several values share the highest count, choose the smallest of them. Print that value and how many times it occurs.\n\nConstraints: 1 ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='Two integers separated by a space: the value and its number of occurrences.',
        samples=['7\n4 1 4 2 1 3 5\n'],
        gen=gen_mode,
        py='''import sys
from collections import Counter
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    c = Counter(map(int, d[1:1 + n]))
    best = max(c.values())
    v = min(x for x, k in c.items() if k == best)
    print(v, best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    sort(a.begin(), a.end());
    long long bestV = a[0]; int bestC = 0;
    for (int i = 0; i < n;) {
        int j = i;
        while (j < n && a[j] == a[i]) j++;
        if (j - i > bestC) { bestC = j - i; bestV = a[i]; }
        i = j;
    }
    cout << bestV << " " << bestC << "\n";
}
''',
    ),
    dict(
        id='move-zeros-to-end',
        title='Move zeros to the end',
        difficulty='easy',
        tags=['arrays', 'two-pointers'],
        statement='Given an array of n integers, move every zero to the end of the array while keeping the relative order of the non-zero elements unchanged. Print the resulting array.\n\nConstraints: 1 ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='One line with the n integers of the rearranged array, separated by spaces.',
        samples=['6\n0 1 0 3 12 0\n'],
        gen=gen_move_zeros,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = d[1:1 + n]
    nz = [str(v) for v in map(int, a) if v != 0]
    print(' '.join(nz + ['0'] * (n - len(nz))))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    int w = 0;
    for (int i = 0; i < n; i++) if (a[i] != 0) a[w++] = a[i];
    while (w < n) a[w++] = 0;
    string out;
    for (int i = 0; i < n; i++) { if (i) out += ' '; out += to_string(a[i]); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='rotate-array-right',
        title='Rotate an array',
        difficulty='easy',
        tags=['arrays', 'simulation'],
        statement='Rotating an array to the right by one step moves its last element to the front. Given an array of n integers and a number k, print the array after rotating it to the right by k steps. Note that k can be much larger than n.\n\nConstraints: 1 ≤ n ≤ 10^5, 0 ≤ k ≤ 10^18, |a_i| ≤ 10^9.',
        input_format='The first line has n and k. The second line has n integers.',
        output_format='One line with the n integers of the rotated array, separated by spaces.',
        samples=['5 2\n1 2 3 4 5\n', '3 7\n10 20 30\n'],
        gen=gen_rotate,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = [x.decode() for x in d[2:2 + n]]
    k %= n
    print(' '.join(a[n - k:] + a[:n - k]))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; unsigned long long k; cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    int s = (int)(k % n);
    rotate(a.begin(), a.begin() + (n - s) % n, a.end());
    string out;
    for (int i = 0; i < n; i++) { if (i) out += ' '; out += to_string(a[i]); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='max-sum-k-consecutive',
        title='Maximum sum of k consecutive elements',
        difficulty='easy',
        tags=['arrays', 'sliding-window'],
        statement='Given an array of n integers and a window length k, find the largest sum of any k consecutive elements.\n\nConstraints: 1 ≤ k ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n and k. The second line has n integers.',
        output_format='One integer, the largest sum of a window of length k.',
        samples=['6 3\n2 -1 3 5 -2 4\n'],
        gen=gen_window_sum,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    cur = sum(a[:k])
    best = cur
    for i in range(k, n):
        cur += a[i] - a[i - k]
        if cur > best:
            best = cur
    print(best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    long long cur = 0;
    for (int i = 0; i < k; i++) cur += a[i];
    long long best = cur;
    for (int i = k; i < n; i++) { cur += a[i] - a[i - k]; best = max(best, cur); }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='merge-two-sorted-arrays',
        title='Merge two sorted arrays',
        difficulty='easy',
        tags=['arrays', 'two-pointers', 'sorting'],
        statement='You are given two arrays, each already sorted in non-decreasing order. Merge them into a single sorted array containing all n + m elements and print it. Try to do it in O(n + m) without sorting again.\n\nConstraints: 1 ≤ n, m ≤ 10^5, n + m ≤ 10^5, |a_i|, |b_i| ≤ 10^9.',
        input_format='The first line has n and m. The second line has the n elements of the first array. The third line has the m elements of the second array.',
        output_format='One line with the n + m elements of the merged array, separated by spaces.',
        samples=['3 4\n1 4 9\n2 4 5 10\n'],
        gen=gen_merge,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    b = list(map(int, d[2 + n:2 + n + m]))
    i = j = 0
    out = []
    while i < n and j < m:
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    print(' '.join(map(str, out)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<long long> a(n), b(m), c(n + m);
    for (auto &x : a) cin >> x;
    for (auto &x : b) cin >> x;
    merge(a.begin(), a.end(), b.begin(), b.end(), c.begin());
    string out;
    for (int i = 0; i < n + m; i++) { if (i) out += ' '; out += to_string(c[i]); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='first-unique-character',
        title='First unique character',
        difficulty='easy',
        tags=['strings', 'hashing', 'counting'],
        statement='Given a string of lowercase English letters, find the first character that appears exactly once in the whole string. Print its position (1-based), or -1 if every character repeats.\n\nConstraints: 1 ≤ |s| ≤ 10^5, s contains only the letters a to z.',
        input_format='One line with the string s.',
        output_format='One integer, the position of the first unique character, or -1.',
        samples=['swiss\n', 'abab\n'],
        gen=gen_first_unique,
        py='''import sys
from collections import Counter
def main():
    s = sys.stdin.buffer.read().split()[0]
    c = Counter(s)
    for i, ch in enumerate(s):
        if c[ch] == 1:
            print(i + 1)
            return
    print(-1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    int c[26] = {0};
    for (char ch : s) c[ch - 'a']++;
    for (size_t i = 0; i < s.size(); i++) if (c[s[i] - 'a'] == 1) { cout << i + 1 << "\n"; return 0; }
    cout << -1 << "\n";
}
''',
    ),
    dict(
        id='leaders-in-array',
        title='Leaders in an array',
        difficulty='easy',
        tags=['arrays', 'suffix-max'],
        statement='An element of an array is a leader if it is strictly greater than every element to its right. The last element is always a leader. Given an array of n integers, print all its leaders in the order they appear in the array.\n\nConstraints: 1 ≤ n ≤ 10^5, |a_i| ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='One line with the leaders, left to right, separated by spaces.',
        samples=['6\n16 17 4 3 5 2\n'],
        gen=gen_leaders,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    res = []
    best = None
    for x in reversed(a):
        if best is None or x > best:
            res.append(x)
            best = x
    print(' '.join(map(str, reversed(res))))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    vector<long long> res;
    long long best = LLONG_MIN;
    for (int i = n - 1; i >= 0; i--) if (a[i] > best) { res.push_back(a[i]); best = a[i]; }
    reverse(res.begin(), res.end());
    string out;
    for (size_t i = 0; i < res.size(); i++) { if (i) out += ' '; out += to_string(res[i]); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='majority-element',
        title='Majority element',
        difficulty='easy',
        tags=['arrays', 'counting'],
        statement='A value is the majority element of an array of length n if it occurs strictly more than n/2 times. Given an array of positive integers, print its majority element, or -1 if it has none. Can you do it with O(1) extra memory?\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ a_i ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='One integer, the majority element, or -1.',
        samples=['7\n2 2 1 1 2 2 3\n', '4\n1 2 1 2\n'],
        gen=gen_majority,
        py='''import sys
from collections import Counter
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    v, c = Counter(map(int, d[1:1 + n])).most_common(1)[0]
    print(v if 2 * c > n else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    long long cand = 0; int cnt = 0;
    for (long long x : a) { if (cnt == 0) { cand = x; cnt = 1; } else if (x == cand) cnt++; else cnt--; }
    long long occ = count(a.begin(), a.end(), cand);
    cout << (2 * occ > n ? cand : -1) << "\n";
}
''',
    ),
    # ------------------------------------------------------------ medium
    dict(
        id='longest-substring-no-repeats',
        title='Longest substring without repeats',
        difficulty='medium',
        tags=['strings', 'sliding-window', 'hashing'],
        statement='Given a string of lowercase English letters, find the length of the longest contiguous substring in which no character appears more than once.\n\nConstraints: 1 ≤ |s| ≤ 10^5, s contains only the letters a to z.',
        input_format='One line with the string s.',
        output_format='One integer, the length of the longest substring with all distinct characters.',
        samples=['abcabcbb\n', 'pwwkew\n'],
        gen=gen_no_repeat,
        py='''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    last = [-1] * 256
    left = 0
    best = 0
    for i, c in enumerate(s):
        if last[c] >= left:
            left = last[c] + 1
        last[c] = i
        if i - left + 1 > best:
            best = i - left + 1
    print(best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    vector<int> cnt(26, 0);
    int l = 0, best = 0;
    for (int r = 0; r < (int)s.size(); r++) {
        int c = s[r] - 'a';
        cnt[c]++;
        while (cnt[c] > 1) cnt[s[l++] - 'a']--;
        best = max(best, r - l + 1);
    }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='count-subarrays-sum-k',
        title='Subarrays summing to k',
        difficulty='medium',
        tags=['arrays', 'prefix-sums', 'hashing'],
        statement='Given an array of n integers, which may be negative, and a target k, count the non-empty contiguous subarrays whose elements sum to exactly k. Two subarrays are different if they start or end at different positions.\n\nConstraints: 1 ≤ n ≤ 10^5, |a_i| ≤ 10^4, |k| ≤ 10^9.',
        input_format='The first line has n and k. The second line has n integers.',
        output_format='One integer, the number of subarrays with sum k.',
        samples=['5 3\n1 2 1 2 1\n', '4 0\n1 -1 1 -1\n'],
        gen=gen_sum_k,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    seen = {0: 1}
    cur = 0
    ans = 0
    for x in map(int, d[2:2 + n]):
        cur += x
        ans += seen.get(cur - k, 0)
        seen[cur] = seen.get(cur, 0) + 1
    print(ans)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long k; cin >> n >> k;
    vector<long long> p(n + 1, 0);
    for (int i = 1; i <= n; i++) { long long x; cin >> x; p[i] = p[i - 1] + x; }
    vector<long long> s = p;
    sort(s.begin(), s.end());
    s.erase(unique(s.begin(), s.end()), s.end());
    vector<long long> cnt(s.size(), 0);
    long long ans = 0;
    for (int i = 0; i <= n; i++) {
        long long want = p[i] - k;
        auto it = lower_bound(s.begin(), s.end(), want);
        if (it != s.end() && *it == want) ans += cnt[it - s.begin()];
        cnt[lower_bound(s.begin(), s.end(), p[i]) - s.begin()]++;
    }
    cout << ans << "\n";
}
''',
    ),
    dict(
        id='container-with-most-water',
        title='Container with most water',
        difficulty='medium',
        tags=['arrays', 'two-pointers', 'greedy'],
        statement='There are n vertical walls standing at positions 1 to n on a line, the i-th of height h_i. Choosing two walls i < j forms a container whose water level is limited by the shorter wall, so it holds (j - i) · min(h_i, h_j) units of water. Find the largest amount any pair of walls can hold.\n\nAn O(n^2) scan of all pairs is too slow; look for an O(n) idea.\n\nConstraints: 2 ≤ n ≤ 10^5, 0 ≤ h_i ≤ 10^9.',
        input_format='The first line has n. The second line has n integers h_1 … h_n.',
        output_format='One integer, the maximum amount of water.',
        samples=['5\n3 1 2 4 2\n'],
        gen=gen_container,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    h = list(map(int, d[1:1 + n]))
    i, j = 0, n - 1
    best = 0
    while i < j:
        if h[i] < h[j]:
            v = (j - i) * h[i]
            i += 1
        else:
            v = (j - i) * h[j]
            j -= 1
        if v > best:
            best = v
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
    int i = 0, j = n - 1;
    long long best = 0;
    while (i < j) {
        best = max(best, (long long)(j - i) * min(h[i], h[j]));
        if (h[i] <= h[j]) i++; else j--;
    }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='shortest-subarray-sum-at-least',
        title='Shortest subarray with sum at least s',
        difficulty='medium',
        tags=['arrays', 'sliding-window', 'two-pointers'],
        statement='Given an array of n positive integers and a number s, find the length of the shortest contiguous subarray whose sum is at least s. Print -1 if even the whole array sums to less than s.\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ a_i ≤ 10^4, 1 ≤ s ≤ 10^9.',
        input_format='The first line has n and s. The second line has n integers.',
        output_format='One integer, the minimum length, or -1.',
        samples=['6 8\n2 3 1 2 4 3\n', '3 100\n5 5 5\n'],
        gen=gen_shortest_sum,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, s = int(d[0]), int(d[1])
    a = list(map(int, d[2:2 + n]))
    best = n + 1
    cur = 0
    l = 0
    for r in range(n):
        cur += a[r]
        while cur >= s:
            if r - l + 1 < best:
                best = r - l + 1
            cur -= a[l]
            l += 1
    print(best if best <= n else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long s; cin >> n >> s;
    vector<long long> p(n + 1, 0);
    for (int i = 1; i <= n; i++) { long long x; cin >> x; p[i] = p[i - 1] + x; }
    int best = INT_MAX;
    for (int r = 1; r <= n; r++) {
        if (p[r] < s) continue;
        // largest l with p[r] - p[l] >= s, i.e. p[l] <= p[r] - s
        int l = int(upper_bound(p.begin(), p.begin() + r, p[r] - s) - p.begin()) - 1;
        best = min(best, r - l);
    }
    cout << (best == INT_MAX ? -1 : best) << "\n";
}
''',
    ),
    dict(
        id='group-anagrams',
        title='Group anagrams',
        difficulty='medium',
        tags=['strings', 'hashing', 'sorting'],
        statement='You are given n words. Two words belong to the same group if they are anagrams of each other, that is, one is a rearrangement of the letters of the other. Every word belongs to exactly one group, and identical words fall in the same group.\n\nPrint the number of groups, and then the sizes of all groups in non-increasing order.\n\nConstraints: 1 ≤ n ≤ 5·10^4, each word has between 1 and 10 lowercase English letters.',
        input_format='The first line has n. The second line has n words separated by spaces.',
        output_format='The first line has the number of groups g. The second line has g integers, the group sizes from largest to smallest.',
        samples=['7\nlisten silent enlist google banana gogole tinsel\n'],
        gen=gen_group_anagrams,
        py='''import sys
from collections import Counter
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    c = Counter(bytes(sorted(w)) for w in d[1:1 + n])
    sizes = sorted(c.values(), reverse=True)
    print(len(sizes))
    print(' '.join(map(str, sizes)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<string> keys(n);
    for (auto &w : keys) { cin >> w; sort(w.begin(), w.end()); }
    sort(keys.begin(), keys.end());
    vector<int> sizes;
    for (int i = 0; i < n;) { int j = i; while (j < n && keys[j] == keys[i]) j++; sizes.push_back(j - i); i = j; }
    sort(sizes.rbegin(), sizes.rend());
    string out = to_string(sizes.size()) + "\n";
    for (size_t i = 0; i < sizes.size(); i++) { if (i) out += ' '; out += to_string(sizes[i]); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='longest-subarray-k-distinct',
        title='Longest subarray with at most k distinct values',
        difficulty='medium',
        tags=['arrays', 'sliding-window', 'hashing'],
        statement='Given an array of n integers and a number k, find the length of the longest contiguous subarray that contains at most k distinct values.\n\nConstraints: 1 ≤ k ≤ n ≤ 10^5, 1 ≤ a_i ≤ 10^9.',
        input_format='The first line has n and k. The second line has n integers.',
        output_format='One integer, the maximum length.',
        samples=['7 2\n1 2 1 3 3 4 3\n'],
        gen=gen_k_distinct,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = d[2:2 + n]
    cnt = {}
    l = 0
    best = 0
    for r in range(n):
        x = a[r]
        cnt[x] = cnt.get(x, 0) + 1
        while len(cnt) > k:
            y = a[l]
            cnt[y] -= 1
            if cnt[y] == 0:
                del cnt[y]
            l += 1
        if r - l + 1 > best:
            best = r - l + 1
    print(best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    vector<long long> s = a;
    sort(s.begin(), s.end()); s.erase(unique(s.begin(), s.end()), s.end());
    vector<int> id(n), cnt(s.size(), 0);
    for (int i = 0; i < n; i++) id[i] = lower_bound(s.begin(), s.end(), a[i]) - s.begin();
    int l = 0, distinct = 0, best = 0;
    for (int r = 0; r < n; r++) {
        if (cnt[id[r]]++ == 0) distinct++;
        while (distinct > k) if (--cnt[id[l++]] == 0) distinct--;
        best = max(best, r - l + 1);
    }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='product-of-others',
        title='Product of all other elements',
        difficulty='medium',
        tags=['arrays', 'prefix-sums'],
        statement='Given an array of n non-negative integers, compute for every position i the product of all elements except a_i, taken modulo 10^9 + 7. Division is not allowed: the array may contain zeros, so build the answer from products of prefixes and suffixes instead.\n\nConstraints: 2 ≤ n ≤ 10^5, 0 ≤ a_i ≤ 10^9.',
        input_format='The first line has n. The second line has n integers.',
        output_format='One line with n integers, the i-th being the product of all elements except a_i, modulo 10^9 + 7.',
        samples=['4\n1 2 3 4\n', '4\n2 0 5 3\n'],
        gen=gen_product,
        py='''import sys
def main():
    M = 10**9 + 7
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = [int(x) % M for x in d[1:1 + n]]
    res = [1] * n
    p = 1
    for i in range(n):
        res[i] = p
        p = p * a[i] % M
    p = 1
    for i in range(n - 1, -1, -1):
        res[i] = res[i] * p % M
        p = p * a[i] % M
    print(' '.join(map(str, res)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
const long long MOD = 1000000007LL;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n), pre(n + 1, 1), suf(n + 1, 1);
    for (auto &x : a) { cin >> x; x %= MOD; }
    for (int i = 0; i < n; i++) pre[i + 1] = pre[i] * a[i] % MOD;
    for (int i = n - 1; i >= 0; i--) suf[i] = suf[i + 1] * a[i] % MOD;
    string out;
    for (int i = 0; i < n; i++) { if (i) out += ' '; out += to_string(pre[i] * suf[i + 1] % MOD); }
    cout << out << "\n";
}
''',
    ),
    dict(
        id='longest-balanced-binary-subarray',
        title='Longest balanced binary subarray',
        difficulty='medium',
        tags=['arrays', 'prefix-sums', 'hashing'],
        statement='You are given an array of n bits, each 0 or 1. A contiguous subarray is balanced if it contains as many zeros as ones. Find the length of the longest balanced subarray, or print 0 if no subarray is balanced.\n\nConstraints: 1 ≤ n ≤ 10^5, a_i ∈ {0, 1}.',
        input_format='The first line has n. The second line has n integers, each 0 or 1.',
        output_format='One integer, the length of the longest balanced subarray.',
        samples=['7\n0 1 1 0 1 1 1\n'],
        gen=gen_balanced,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    first = {0: 0}
    bal = 0
    best = 0
    for i in range(n):
        bal += 1 if d[1 + i] == b'1' else -1
        if bal in first:
            if i + 1 - first[bal] > best:
                best = i + 1 - first[bal]
        else:
            first[bal] = i + 1
    print(best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> first(2 * n + 1, -1);
    first[n] = 0;
    int bal = n, best = 0;
    for (int i = 1; i <= n; i++) {
        int x; cin >> x;
        bal += x ? 1 : -1;
        if (first[bal] < 0) first[bal] = i; else best = max(best, i - first[bal]);
    }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='trapping-rain-water',
        title='Trapping rain water',
        difficulty='medium',
        tags=['arrays', 'two-pointers', 'prefix-sums'],
        statement='An elevation map is made of n columns of width 1 standing side by side, the i-th of height h_i. After heavy rain, water settles on top of the columns wherever it is held in by taller columns on both sides; water over the first and last columns runs off. Compute the total amount of water held, in unit squares.\n\nConstraints: 1 ≤ n ≤ 10^5, 0 ≤ h_i ≤ 10^9.',
        input_format='The first line has n. The second line has n integers h_1 … h_n.',
        output_format='One integer, the total trapped water.',
        samples=['6\n3 0 2 0 4 1\n'],
        gen=gen_trap,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    h = list(map(int, d[1:1 + n]))
    right = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        right[i] = max(right[i + 1], h[i])
    left = 0
    total = 0
    for i in range(n):
        if h[i] > left:
            left = h[i]
        total += min(left, right[i]) - h[i]
    print(total)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> h(n);
    for (auto &x : h) cin >> x;
    int i = 0, j = n - 1;
    long long lm = 0, rm = 0, total = 0;
    while (i <= j) {
        if (lm <= rm) { lm = max(lm, h[i]); total += lm - h[i]; i++; }
        else { rm = max(rm, h[j]); total += rm - h[j]; j--; }
    }
    cout << total << "\n";
}
''',
    ),
    # ------------------------------------------------------------ hard
    dict(
        id='minimum-window-substring',
        title='Minimum window containing all characters',
        difficulty='hard',
        tags=['strings', 'sliding-window', 'hashing'],
        statement='You are given two strings s and t of lowercase English letters. Find the shortest contiguous substring of s that contains every character of t, counting multiplicity: if t has a letter three times, the window must contain it at least three times.\n\nIf several shortest windows exist, choose the one that starts earliest. If no window exists, print -1.\n\nConstraints: 1 ≤ |s|, |t| ≤ 10^5, both strings contain only the letters a to z.',
        input_format='The first line has the string s. The second line has the string t.',
        output_format='One line with the shortest window, or -1 if there is none.',
        samples=['xaybzcaxb\nabc\n', 'aab\nabb\n'],
        gen=gen_min_window,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    s, t = d[0], d[1]
    need = [0] * 128
    for c in t:
        need[c] += 1
    missing = len(t)
    l = 0
    best_len, best_l = len(s) + 1, -1
    for r, c in enumerate(s):
        if need[c] > 0:
            missing -= 1
        need[c] -= 1
        if missing == 0:
            while need[s[l]] < 0:
                need[s[l]] += 1
                l += 1
            if r - l + 1 < best_len:
                best_len, best_l = r - l + 1, l
    print(-1 if best_l < 0 else s[best_l:best_l + best_len].decode())
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s, t; cin >> s >> t;
    int need[26] = {0}, have[26] = {0};
    for (char c : t) need[c - 'a']++;
    int kinds = 0, done = 0;
    for (int i = 0; i < 26; i++) if (need[i]) kinds++;
    int n = s.size(), bl = -1, blen = INT_MAX, l = 0;
    for (int r = 0; r < n; r++) {
        int c = s[r] - 'a';
        if (++have[c] == need[c]) done++;
        while (done == kinds) {
            if (r - l + 1 < blen) { blen = r - l + 1; bl = l; }
            int x = s[l] - 'a';
            if (have[x]-- == need[x]) done--;
            l++;
        }
    }
    if (bl < 0) cout << -1 << "\n"; else cout << s.substr(bl, blen) << "\n";
}
''',
    ),
    dict(
        id='subarrays-exactly-k-distinct',
        title='Subarrays with exactly k distinct values',
        difficulty='hard',
        tags=['arrays', 'sliding-window', 'two-pointers', 'hashing'],
        statement='Given an array of n integers and a number k, count the contiguous subarrays that contain exactly k distinct values. Two subarrays are different if they start or end at different positions.\n\nHint: counting subarrays with at most k distinct values is a classic sliding window; think about how to get "exactly" from "at most".\n\nConstraints: 1 ≤ k ≤ n ≤ 10^5, 1 ≤ a_i ≤ 10^9.',
        input_format='The first line has n and k. The second line has n integers.',
        output_format='One integer, the number of subarrays with exactly k distinct values.',
        samples=['6 2\n1 1 2 3 2 2\n', '3 3\n1 1 1\n'],
        gen=gen_exact_k,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    a = d[2:2 + n]
    def at_most(k):
        cnt = {}
        l = 0
        res = 0
        for r in range(n):
            x = a[r]
            cnt[x] = cnt.get(x, 0) + 1
            while len(cnt) > k:
                y = a[l]
                cnt[y] -= 1
                if cnt[y] == 0:
                    del cnt[y]
                l += 1
            res += r - l + 1
        return res
    print(at_most(k) - at_most(k - 1))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, k; cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    vector<long long> s = a;
    sort(s.begin(), s.end()); s.erase(unique(s.begin(), s.end()), s.end());
    vector<int> id(n);
    for (int i = 0; i < n; i++) id[i] = lower_bound(s.begin(), s.end(), a[i]) - s.begin();
    // two left pointers: l1 is the leftmost start with <= k distinct, l2 the leftmost with <= k-1
    vector<int> c1(s.size(), 0), c2(s.size(), 0);
    int l1 = 0, l2 = 0, d1 = 0, d2 = 0;
    long long ans = 0;
    for (int r = 0; r < n; r++) {
        if (c1[id[r]]++ == 0) d1++;
        if (c2[id[r]]++ == 0) d2++;
        while (d1 > k) if (--c1[id[l1++]] == 0) d1--;
        while (d2 > k - 1) if (--c2[id[l2++]] == 0) d2--;
        ans += l2 - l1;
    }
    cout << ans << "\n";
}
''',
    ),
]
