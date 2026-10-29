# bank 4: dynamic programming, advanced strings, range-query data structures.
from math import isqrt


def _word(rng, n, alpha):
    return ''.join(rng.choice(alpha) for _ in range(n))


def _mutate(rng, s, rate, alpha):
    out = []
    for ch in s:
        r = rng.random()
        if r < rate / 3:
            continue
        if r < 2 * rate / 3:
            out.append(rng.choice(alpha))
            continue
        out.append(ch)
        if r < rate:
            out.append(rng.choice(alpha))
    return ''.join(out) or rng.choice(alpha)


# ---------------------------------------------------------------- generators

def gen_stairs(rng, t):
    n = [5, 12, 100, 2000, 50000, 100000][t]
    m = rng.randint(0, min(n - 1, isqrt(n)))
    br = sorted(rng.sample(range(1, n), m))
    return f"{n} {m}\n{' '.join(map(str, br))}\n"


def gen_minpath(rng, t):
    n, m = [(1, 4), (4, 5), (30, 40), (100, 200), (300, 400), (500, 500)][t]
    rows = [' '.join(str(rng.randint(0, 1000)) for _ in range(m)) for _ in range(n)]
    return f"{n} {m}\n" + '\n'.join(rows) + '\n'


def gen_gridpaths(rng, t):
    n, m = [(2, 3), (6, 6), (40, 50), (200, 300), (600, 700), (1000, 1000)][t]
    p = [0.1, 0.15, 0.2, 0.1, 0.08, 0.05][t]
    g = [['#' if rng.random() < p else '.' for _ in range(m)] for _ in range(n)]
    g[0][0] = '.'
    g[n - 1][m - 1] = '.'
    return f"{n} {m}\n" + '\n'.join(''.join(r) for r in g) + '\n'


def gen_robber(rng, t):
    n = [3, 10, 200, 5000, 50000, 100000][t]
    hi = [10, 100, 10**9, 10**9, 10**9, 10**9][t]
    return f"{n}\n{' '.join(str(rng.randint(0, hi)) for _ in range(n))}\n"


def gen_coins(rng, t):
    n = [2, 3, 5, 10, 15, 20][t]
    x = [10, 51, 1000, 20000, 100000, 100000][t]
    if t == 1:
        coins = rng.sample(range(2, 21, 2), n)          # all even, odd amount
    elif t == 5:
        coins = rng.sample(range(37, 5000), n)
    else:
        coins = rng.sample(range(2, [6, 0, 60, 500, 500][t] + 1), n)
        if all(c % 2 == 0 for c in coins) and 3 not in coins:
            coins[0] = 3
    return f"{n} {x}\n{' '.join(map(str, coins))}\n"


def gen_knap(rng, t):
    n = [3, 8, 50, 200, 400, 500][t]
    W = [10, 50, 1000, 5000, 10000, 10000][t]
    lines = []
    for _ in range(n):
        w = rng.randint(1, max(1, W // 4)) if rng.random() < 0.9 else rng.randint(1, 10000)
        lines.append(f"{w} {rng.randint(1, 10**9 if t >= 2 else 50)}")
    return f"{n} {W}\n" + '\n'.join(lines) + '\n'


def gen_two_strings(caps, mutate_rate):
    def g(rng, t):
        la, lb = caps[t]
        alpha = rng.choice(['ab', 'abcd', 'abcdefghijklmnopqrstuvwxyz'])
        a = _word(rng, la, alpha)
        if rng.random() < 0.6:
            b = _mutate(rng, a, mutate_rate, alpha)[:lb]
        else:
            b = _word(rng, lb, alpha)
        return f"{a}\n{b}\n"
    return g


def gen_partition(rng, t):
    n = [1, 4, 20, 100, 500, 1000][t]
    hi = [10, 20, 100, 1000, 1000, 1000][t]
    return f"{n}\n{' '.join(str(rng.randint(1, hi)) for _ in range(n))}\n"


def gen_lps(rng, t):
    n = [1, 7, 100, 1000, 3000, 5000][t]
    alpha = rng.choice(['ab', 'abc', 'abcdefghijklmnopqrstuvwxyz'])
    if t >= 3 and t % 2 == 1:
        h = _word(rng, n // 2, alpha)
        s = _mutate(rng, h + h[::-1], 0.1, alpha)[:n]
    else:
        s = _word(rng, n, alpha)
    return s + '\n'


def gen_kmp(rng, t):
    n = [6, 20, 200, 5000, 100000, 500000][t]
    if t == 4:
        txt = ['a'] * n
        for _ in range(20):
            txt[rng.randrange(n)] = 'b'
        return ''.join(txt) + '\n' + 'a' * 100 + '\n'
    if t == 5:
        base = 'abaab' * (n // 5)
        txt = list(base)
        for _ in range(200):
            txt[rng.randrange(len(txt))] = rng.choice('ab')
        return ''.join(txt) + '\n' + 'abaab' * 20 + '\n'
    txt = _word(rng, n, 'ab' if t < 3 else 'abc')
    i = rng.randrange(n)
    p = txt[i:i + rng.randint(1, 4)]
    return f"{txt}\n{p}\n"


def gen_fenwick(rng, t):
    n = [3, 10, 100, 2000, 50000, 100000][t]
    q = [3, 10, 100, 2000, 50000, 50000][t]
    hi = [10, 100, 10**9, 10**9, 10**9, 10**4][t]
    a = [rng.randint(-hi, hi) for _ in range(n)]
    out = [f"{n} {q}", ' '.join(map(str, a))]
    for qi in range(q):
        if qi < q - 1 and rng.random() < 0.5:
            out.append(f"1 {rng.randint(1, n)} {rng.randint(-hi, hi)}")
        else:
            l = rng.randint(1, n); r = rng.randint(l, n)
            out.append(f"2 {l} {r}")
    return '\n'.join(out) + '\n'


def gen_inv(rng, t):
    n = [3, 10, 200, 5000, 50000, 100000][t]
    hi = [5, 10**9, 10, 10**9, 100, 10**9][t]
    if t == 3:
        a = list(range(n, 0, -1))
    else:
        a = [rng.randint(1, hi) for _ in range(n)]
    return f"{n}\n{' '.join(map(str, a))}\n"


def gen_mchain(rng, t):
    n = [1, 3, 10, 50, 120, 200][t]
    return f"{n}\n{' '.join(str(rng.randint(1, 100)) for _ in range(n + 1))}\n"


def gen_palcut(rng, t):
    n = [1, 8, 50, 300, 1500, 2000][t]
    if t == 5:
        s = ['a'] * n
        for _ in range(3):
            s[rng.randrange(n)] = 'b'
        return ''.join(s) + '\n'
    alpha = ['ab', 'ab', 'abc', 'ab', 'abc', ''][t]
    return _word(rng, n, alpha) + '\n'


def gen_tsp(rng, t):
    n = [1, 2, 4, 8, 12, 15][t]
    hi = [10, 10, 20, 1000, 10**6, 10**6][t]
    rows = []
    for i in range(n):
        rows.append(' '.join('0' if i == j else str(rng.randint(1, hi)) for j in range(n)))
    return f"{n}\n" + '\n'.join(rows) + '\n'


def gen_digit(rng, t):
    q = [3, 10, 100, 1000, 5000, 10000][t]
    k = [3, 7, 1, 13, 100, 9][t] if t != 2 else rng.randint(1, 100)
    top = [100, 10**4, 10**9, 10**18, 10**18, 10**18][t]
    out = [f"{q} {k}"]
    for _ in range(q):
        if rng.random() < 0.2:
            r = top
            l = rng.randint(1, top) if rng.random() < 0.5 else 1
        else:
            digits = rng.randint(1, len(str(top)))
            r = rng.randint(1, min(top, 10**digits))
            l = rng.randint(1, r)
        out.append(f"{l} {r}")
    return '\n'.join(out) + '\n'


def gen_distsub(rng, t):
    n = [1, 8, 100, 3000, 50000, 100000][t]
    if t == 4:
        return 'ab' * (n // 2) + '\n'
    alpha = ['a', 'ab', 'abc', 'ab', '', 'abcdefghijklmnopqrstuvwxyz'][t]
    return _word(rng, n, alpha) + '\n'


def gen_manacher(rng, t):
    n = [1, 9, 200, 5000, 200000, 500000][t]
    alpha = ['a', 'ab', 'abc', 'ab', 'abcd', 'ab'][t]
    s = list(_word(rng, n, alpha))
    if n > 10:
        for _ in range(3):
            L = rng.randint(1, n // 4)
            st = rng.randrange(n - 2 * L)
            for i in range(L):
                s[st + 2 * L - 1 - i] = s[st + i]
    return ''.join(s) + '\n'


def gen_minrot(rng, t):
    n = [1, 6, 100, 5000, 200000, 500000][t]
    if t in (3, 5):
        unit = _word(rng, [1, 1, 1, 7, 1, 13][t], 'ab')
        return (unit * (n // len(unit) + 1))[:n - n % len(unit)] + '\n'
    alpha = ['a', 'ab', 'abc', '', 'ab', ''][t]
    s = list(_word(rng, n, alpha))
    for i in range(0, n, max(1, n // 50)):
        s[i] = 'a'
    return ''.join(s) + '\n'


def gen_segmin(rng, t):
    n = [3, 10, 100, 2000, 50000, 100000][t]
    q = [3, 10, 100, 2000, 30000, 50000][t]
    hi = [3, 5, 10, 20, 10**9, 10**5][t]
    a = [rng.randint(1, hi) for _ in range(n)]
    out = [f"{n} {q}", ' '.join(map(str, a))]
    for qi in range(q):
        if qi < q - 1 and rng.random() < 0.5:
            out.append(f"1 {rng.randint(1, n)} {rng.randint(1, hi)}")
        else:
            l = rng.randint(1, n); r = rng.randint(l, n)
            out.append(f"2 {l} {r}")
    return '\n'.join(out) + '\n'


def gen_rangeadd(rng, t):
    n = [3, 10, 100, 2000, 50000, 100000][t]
    q = [3, 10, 100, 2000, 30000, 50000][t]
    hi = [10, 100, 10**9, 10**9, 10**9, 10**4][t]
    a = [rng.randint(-hi, hi) for _ in range(n)]
    out = [f"{n} {q}", ' '.join(map(str, a))]
    for qi in range(q):
        l = rng.randint(1, n); r = rng.randint(l, n)
        if qi < q - 1 and rng.random() < 0.5:
            out.append(f"1 {l} {r} {rng.randint(-10**6, 10**6)}")
        else:
            out.append(f"2 {l} {r}")
    return '\n'.join(out) + '\n'


def gen_password(rng, t):
    n = [3, 10, 100, 5000, 100000, 500000][t]
    if t == 0:
        return 'aaa\n'
    if t == 4:
        u = 'abaab'
        return (u * (n // 5)) + '\n'
    alpha = ['', 'ab', 'abc', 'ab', '', 'abc'][t]
    u = _word(rng, max(1, n // 10), alpha)
    mid = _word(rng, max(1, n // 4), alpha)
    # the middle copy of u is sometimes cut short, so the answer is not always |u|
    cut = rng.randint(1, 2) if rng.random() < 0.4 else 0
    s = u + mid + u[:len(u) - cut] + mid + u
    return s + '\n'


def gen_distseq(rng, t):
    n = [1, 6, 100, 5000, 100000, 500000][t]
    alpha = ['a', 'ab', 'abc', 'abcdefghijklmnopqrstuvwxyz', 'ab', 'abcdefghijklmnopqrstuvwxyz'][t]
    return _word(rng, n, alpha) + '\n'


# ---------------------------------------------------------------- problems

PROBLEMS = [
    # ------------------------------------------------------------ easy
    dict(
        id='stairs-with-broken-steps',
        title='Climbing stairs with broken steps',
        difficulty='easy',
        tags=['dynamic-programming', 'counting'],
        statement=(
            'A staircase has n steps numbered 1 to n above the floor, which counts as step 0. You start on the floor '
            'and want to stand on step n. In one move you climb either one step or two steps. Some m of the steps are '
            'broken, and you may never stand on a broken step.\n\n'
            'Count the different sequences of moves that take you from the floor to step n, modulo 10^9 + 7.\n\n'
            'Constraints: 1 ≤ n ≤ 10^5, 0 ≤ m ≤ n - 1, the broken steps are distinct and each lies between 1 and n - 1.'
        ),
        input_format='The first line has n and m. The second line has the m broken step numbers (it is empty when m = 0).',
        output_format='One integer, the number of ways modulo 10^9 + 7.',
        samples=['5 1\n2\n', '4 0\n\n'],
        gen=gen_stairs,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    broken = set(map(int, d[2:2 + m]))
    MOD = 10**9 + 7
    a, b = 0, 1  # ways to reach step i-2, i-1 (b is step 0 initially)
    for i in range(1, n + 1):
        c = 0 if i in broken else (a + b) % MOD
        a, b = b, c
    print(b)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<char> bad(n + 1, 0);
    for (int i = 0; i < m; i++) { int x; cin >> x; bad[x] = 1; }
    const long long MOD = 1000000007LL;
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;
    for (int i = 1; i <= n; i++) {
        if (bad[i]) continue;
        dp[i] = dp[i - 1];
        if (i >= 2) dp[i] = (dp[i] + dp[i - 2]) % MOD;
    }
    cout << dp[n] << "\n";
}
''',
    ),
    dict(
        id='grid-minimum-path-sum',
        title='Cheapest path through a grid',
        difficulty='easy',
        tags=['dynamic-programming', 'grids'],
        statement=(
            'A grid has n rows and m columns, and every cell holds a non-negative cost. You start in the top-left cell '
            'and must reach the bottom-right cell, moving only one cell right or one cell down at a time. The cost of a '
            'path is the sum of the costs of every cell it visits, including the first and the last.\n\n'
            'Find the minimum possible cost of such a path.\n\n'
            'Constraints: 1 ≤ n, m ≤ 500, 0 ≤ each cost ≤ 1000.'
        ),
        input_format='The first line has n and m. Each of the next n lines has m integers, one row of the grid.',
        output_format='One integer, the minimum path cost.',
        samples=['3 3\n1 3 1\n1 5 1\n4 2 1\n'],
        gen=gen_minpath,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    v = list(map(int, d[2:2 + n * m]))
    prev = None
    for i in range(n):
        row = v[i * m:(i + 1) * m]
        cur = [0] * m
        if prev is None:
            s = 0
            for j in range(m):
                s += row[j]
                cur[j] = s
        else:
            left = prev[0] + row[0]
            cur[0] = left
            for j in range(1, m):
                up = prev[j]
                left = (up if up < left else left) + row[j]
                cur[j] = left
        prev = cur
    print(prev[m - 1])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    const long long INF = LLONG_MAX / 4;
    vector<long long> dp(m, INF);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            long long c; cin >> c;
            if (i == 0 && j == 0) dp[j] = c;
            else dp[j] = min(dp[j], j ? dp[j - 1] : INF) + c;
        }
    cout << dp[m - 1] << "\n";
}
''',
    ),
    dict(
        id='grid-paths-around-obstacles',
        title='Grid paths around obstacles',
        difficulty='easy',
        tags=['dynamic-programming', 'grids', 'counting'],
        statement=(
            'A robot stands in the top-left cell of a grid with n rows and m columns and wants to reach the bottom-right '
            'cell. Each move takes it one cell to the right or one cell down. Some cells contain rocks and the robot may '
            'not enter them. The top-left and bottom-right cells are always free.\n\n'
            'Count the different paths the robot can take, modulo 10^9 + 7.\n\n'
            'Constraints: 1 ≤ n, m ≤ 1000.'
        ),
        input_format="The first line has n and m. Each of the next n lines has m characters: '.' for a free cell and '#' for a rock.",
        output_format='One integer, the number of paths modulo 10^9 + 7.',
        samples=['3 3\n...\n.#.\n...\n', '2 4\n.#..\n....\n'],
        gen=gen_gridpaths,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    MOD = 10**9 + 7
    prev = [1] + [0] * (m - 1)
    for i in range(n):
        row = d[2 + i]
        cur = [0] * m
        left = 0
        for j in range(m):
            if row[j] == 35:
                left = 0
            else:
                left = (left + prev[j]) % MOD
            cur[j] = left
        prev = cur
    print(prev[m - 1])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    const int MOD = 1000000007;
    vector<string> g(n);
    for (auto &r : g) cin >> r;
    vector<vector<int>> dp(n, vector<int>(m, 0));
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            if (g[i][j] == '#') continue;
            if (i == 0 && j == 0) { dp[i][j] = 1; continue; }
            long long v = 0;
            if (i) v += dp[i - 1][j];
            if (j) v += dp[i][j - 1];
            dp[i][j] = v % MOD;
        }
    cout << dp[n - 1][m - 1] << "\n";
}
''',
    ),
    dict(
        id='non-adjacent-maximum-sum',
        title='Robbing houses along a street',
        difficulty='easy',
        tags=['dynamic-programming'],
        statement=(
            'A street has n houses in a row, and house i holds a_i coins. A burglar wants to collect as many coins as '
            'possible, but the alarm system goes off if two neighbouring houses are both robbed on the same night.\n\n'
            'Find the largest number of coins the burglar can collect without robbing two adjacent houses. Robbing no '
            'house at all is allowed.\n\n'
            'Constraints: 1 ≤ n ≤ 10^5, 0 ≤ a_i ≤ 10^9.'
        ),
        input_format='The first line has n. The second line has n integers a_1, ..., a_n.',
        output_format='One integer, the maximum total number of coins.',
        samples=['5\n2 7 9 3 1\n', '4\n5 1 1 5\n'],
        gen=gen_robber,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = b = 0
    for x in map(int, d[1:1 + n]):
        c = a + x
        a, b = b, (b if b > c else c)
    print(b)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> a(n), dp(n + 1, 0);
    for (auto &x : a) cin >> x;
    for (int i = 1; i <= n; i++) dp[i] = max(dp[i - 1], (i >= 2 ? dp[i - 2] : 0) + a[i - 1]);
    cout << dp[n] << "\n";
}
''',
    ),

    # ------------------------------------------------------------ medium
    dict(
        id='fewest-coins-for-amount',
        title='Fewest coins for an amount',
        difficulty='medium',
        tags=['dynamic-programming', 'knapsack'],
        statement=(
            'A shop has coins of n distinct denominations c_1, ..., c_n, and an unlimited supply of each. You must pay '
            'exactly x using these coins.\n\n'
            'Find the smallest number of coins that adds up to exactly x, or print -1 if the amount cannot be paid exactly.\n\n'
            'Constraints: 1 ≤ n ≤ 20, 1 ≤ x ≤ 10^5, 1 ≤ c_i ≤ 10^5.'
        ),
        input_format='The first line has n and x. The second line has the n denominations.',
        output_format='One integer, the minimum number of coins, or -1.',
        samples=['3 11\n1 5 7\n', '2 7\n4 6\n'],
        gen=gen_coins,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, x = int(d[0]), int(d[1])
    coins = sorted(set(int(v) for v in d[2:2 + n]))
    INF = x + 1
    dp = [INF] * (x + 1)
    dp[0] = 0
    for c in coins:
        if c > x:
            continue
        for v in range(c, x + 1):
            t = dp[v - c] + 1
            if t < dp[v]:
                dp[v] = t
    print(dp[x] if dp[x] <= x else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, x; cin >> n >> x;
    vector<int> c(n);
    for (auto &v : c) cin >> v;
    const int INF = INT_MAX / 2;
    vector<int> dp(x + 1, INF);
    dp[0] = 0;
    for (int v = 1; v <= x; v++)
        for (int k : c)
            if (k <= v && dp[v - k] + 1 < dp[v]) dp[v] = dp[v - k] + 1;
    cout << (dp[x] >= INF ? -1 : dp[x]) << "\n";
}
''',
    ),
    dict(
        id='ways-to-make-change',
        title='Ways to make change',
        difficulty='medium',
        tags=['dynamic-programming', 'counting', 'knapsack'],
        statement=(
            'You have an unlimited supply of coins of n distinct denominations c_1, ..., c_n. Count the number of ways to '
            'pay exactly x. Two ways that use the same number of coins of every denomination are the same way, no '
            'matter in which order the coins are handed over.\n\n'
            'Print the count modulo 10^9 + 7.\n\n'
            'Constraints: 1 ≤ n ≤ 20, 1 ≤ x ≤ 10^5, 1 ≤ c_i ≤ 10^5.'
        ),
        input_format='The first line has n and x. The second line has the n denominations.',
        output_format='One integer, the number of ways modulo 10^9 + 7.',
        samples=['3 5\n1 2 5\n', '2 3\n2 4\n'],
        gen=gen_coins,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, x = int(d[0]), int(d[1])
    MOD = 10**9 + 7
    dp = [0] * (x + 1)
    dp[0] = 1
    for c in sorted(set(int(v) for v in d[2:2 + n])):
        if c > x:
            continue
        for v in range(c, x + 1):
            s = dp[v] + dp[v - c]
            dp[v] = s - MOD if s >= MOD else s
    print(dp[x])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, x; cin >> n >> x;
    const int MOD = 1000000007;
    vector<int> dp(x + 1, 0);
    dp[0] = 1;
    for (int i = 0; i < n; i++) {
        int c; cin >> c;
        for (int v = c; v <= x; v++) { dp[v] += dp[v - c]; if (dp[v] >= MOD) dp[v] -= MOD; }
    }
    cout << dp[x] << "\n";
}
''',
    ),
    dict(
        id='zero-one-knapsack',
        title='Packing a knapsack',
        difficulty='medium',
        tags=['dynamic-programming', 'knapsack'],
        statement=(
            'You are packing for a trip. There are n items; item i weighs w_i and is worth v_i. Your knapsack can carry '
            'a total weight of at most W, and each item can be taken at most once.\n\n'
            'Find the largest total worth of a set of items whose total weight does not exceed W.\n\n'
            'Constraints: 1 ≤ n ≤ 500, 1 ≤ W ≤ 10^4, 1 ≤ w_i ≤ 10^4, 1 ≤ v_i ≤ 10^9.'
        ),
        input_format='The first line has n and W. Each of the next n lines has w_i and v_i.',
        output_format='One integer, the maximum total worth.',
        samples=['4 7\n1 1\n3 4\n4 5\n5 7\n'],
        gen=gen_knap,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, W = int(d[0]), int(d[1])
    dp = [0] * (W + 1)
    for i in range(n):
        w, v = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        if w > W:
            continue
        dp[w:] = map(max, dp[w:], [x + v for x in dp[:W + 1 - w]])
    print(dp[W])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, W; cin >> n >> W;
    vector<long long> dp(W + 1, 0);
    for (int i = 0; i < n; i++) {
        int w; long long v; cin >> w >> v;
        for (int c = W; c >= w; c--) dp[c] = max(dp[c], dp[c - w] + v);
    }
    cout << dp[W] << "\n";
}
''',
    ),
    dict(
        id='longest-common-subsequence',
        title='Longest common subsequence of two strings',
        difficulty='medium',
        tags=['dynamic-programming', 'strings'],
        statement=(
            'A subsequence of a string is what remains after deleting zero or more of its characters without changing '
            'the order of the rest. Given two strings a and b, find the length of the longest string that is a '
            'subsequence of both.\n\n'
            'Constraints: 1 ≤ |a|, |b| ≤ 5000, both strings consist of lowercase English letters.'
        ),
        input_format='The first line has a. The second line has b.',
        output_format='One integer, the length of the longest common subsequence.',
        samples=['abcbdab\nbdcaba\n', 'abc\nxyz\n'],
        gen=gen_two_strings([(3, 4), (10, 12), (100, 150), (1000, 800), (3000, 4000), (5000, 5000)], 0.2),
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    a, b = d[0], d[1]
    n = len(a)
    mask = (1 << n) - 1
    M = {}
    for i, c in enumerate(a):
        M[c] = M.get(c, 0) | (1 << i)
    V = mask
    for c in b:
        U = V & M.get(c, 0)
        V = ((V + U) | (V - U)) & mask
    print(n - bin(V).count('1'))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string a, b; cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<int> prev(m + 1, 0), cur(m + 1, 0);
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++)
            cur[j] = a[i - 1] == b[j - 1] ? prev[j - 1] + 1 : max(prev[j], cur[j - 1]);
        swap(prev, cur);
    }
    cout << prev[m] << "\n";
}
''',
    ),
    dict(
        id='edit-distance',
        title='Edit distance between two words',
        difficulty='medium',
        tags=['dynamic-programming', 'strings'],
        statement=(
            'You may change a word using three operations: insert one character anywhere, delete one character, or '
            'replace one character with another. Given two words a and b, find the smallest number of operations that '
            'turns a into b.\n\n'
            'Constraints: 1 ≤ |a|, |b| ≤ 1000, both words consist of lowercase English letters.'
        ),
        input_format='The first line has a. The second line has b.',
        output_format='One integer, the edit distance.',
        samples=['kitten\nsitting\n', 'flaw\nlawn\n'],
        gen=gen_two_strings([(3, 4), (8, 10), (60, 50), (300, 400), (800, 900), (1000, 1000)], 0.3),
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    a, b = d[0], d[1]
    m = len(b)
    prev = list(range(m + 1))
    for i in range(1, len(a) + 1):
        ca = a[i - 1]
        cur = [i] * (m + 1)
        left = i
        for j in range(1, m + 1):
            if b[j - 1] == ca:
                left = prev[j - 1]
            else:
                x = prev[j - 1]
                y = prev[j]
                if y < x: x = y
                if left < x: x = left
                left = x + 1
            cur[j] = left
        prev = cur
    print(prev[m])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string a, b; cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = min({dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] != b[j - 1])});
    cout << dp[n][m] << "\n";
}
''',
    ),
    dict(
        id='closest-two-way-split',
        title='Two teams of nearly equal strength',
        difficulty='medium',
        tags=['dynamic-programming', 'knapsack', 'subset-sum'],
        statement=(
            'A coach has n players, and player i has strength a_i. Every player must join exactly one of two teams, and '
            'a team may be empty. The strength of a team is the sum of the strengths of its players.\n\n'
            'Find the smallest possible absolute difference between the strengths of the two teams. A difference of 0 '
            'means the players can be split into two equal halves.\n\n'
            'Constraints: 1 ≤ n ≤ 1000, 1 ≤ a_i ≤ 1000.'
        ),
        input_format='The first line has n. The second line has n integers a_1, ..., a_n.',
        output_format='One integer, the minimum difference.',
        samples=['4\n1 5 11 5\n', '3\n3 1 7\n'],
        gen=gen_partition,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    total = sum(a)
    reach = 1
    for x in a:
        reach |= reach << x
    half = total // 2
    low = reach & ((1 << (half + 1)) - 1)
    s = low.bit_length() - 1
    print(total - 2 * s)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    static bitset<1000001> b;
    b[0] = 1;
    int total = 0;
    for (int i = 0; i < n; i++) { int x; cin >> x; total += x; b |= b << x; }
    int best = 0;
    for (int s = total / 2; s >= 0; s--) if (b[s]) { best = s; break; }
    cout << total - 2 * best << "\n";
}
''',
    ),
    dict(
        id='longest-palindromic-subsequence',
        title='Longest palindromic subsequence',
        difficulty='medium',
        tags=['dynamic-programming', 'strings', 'palindromes'],
        statement=(
            'A palindrome reads the same forwards and backwards. Given a string s, delete as few characters as you like '
            '(keeping the order of the rest) so that what remains is a palindrome, and make it as long as possible.\n\n'
            'Print the length of the longest subsequence of s that is a palindrome.\n\n'
            'Constraints: 1 ≤ |s| ≤ 5000, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='One integer, the length of the longest palindromic subsequence.',
        samples=['bbbab\n', 'character\n'],
        gen=gen_lps,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    n = len(s)
    mask = (1 << n) - 1
    M = {}
    for i, c in enumerate(s):
        M[c] = M.get(c, 0) | (1 << i)
    V = mask
    for c in reversed(s):
        U = V & M[c]
        V = ((V + U) | (V - U)) & mask
    print(n - bin(V).count('1'))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    int n = s.size();
    vector<int> nxt(n, 0), cur(n, 0);  // nxt = row i+1, cur = row i
    for (int i = n - 1; i >= 0; i--) {
        cur[i] = 1;
        for (int j = i + 1; j < n; j++)
            cur[j] = s[i] == s[j] ? (j - 1 >= i + 1 ? nxt[j - 1] : 0) + 2 : max(nxt[j], cur[j - 1]);
        swap(nxt, cur);
    }
    cout << nxt[n - 1] << "\n";
}
''',
    ),
    dict(
        id='pattern-occurrences-kmp',
        title='Counting pattern occurrences',
        difficulty='medium',
        tags=['strings', 'kmp', 'string-matching'],
        statement=(
            'Given a text t and a pattern p, count the positions in t where p starts. Occurrences may overlap: in the '
            'text aaaa the pattern aa occurs three times.\n\n'
            'Constraints: 1 ≤ |t| ≤ 5·10^5, 1 ≤ |p| ≤ 5·10^5, both strings consist of lowercase English letters.'
        ),
        input_format='The first line has the text t. The second line has the pattern p.',
        output_format='One integer, the number of occurrences.',
        samples=['abababa\naba\n', 'hello\nworld\n'],
        gen=gen_kmp,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    t, p = d[0], d[1]
    m = len(p)
    if m > len(t):
        print(0); return
    pi = [0] * m
    k = 0
    for i in range(1, m):
        c = p[i]
        while k and c != p[k]:
            k = pi[k - 1]
        if c == p[k]:
            k += 1
        pi[i] = k
    k = 0
    cnt = 0
    for c in t:
        while k and c != p[k]:
            k = pi[k - 1]
        if c == p[k]:
            k += 1
            if k == m:
                cnt += 1
                k = pi[k - 1]
    print(cnt)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string t, p; cin >> t >> p;
    string s = p + "#" + t;
    int n = s.size(), m = p.size();
    vector<int> z(n, 0);
    for (int i = 1, l = 0, r = 0; i < n; i++) {
        if (i < r) z[i] = min(r - i, z[i - l]);
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) z[i]++;
        if (i + z[i] > r) l = i, r = i + z[i];
    }
    long long cnt = 0;
    for (int i = m + 1; i < n; i++) if (z[i] >= m) cnt++;
    cout << cnt << "\n";
}
''',
    ),
    dict(
        id='fenwick-point-update-range-sum',
        title='Point updates and range sums',
        difficulty='medium',
        tags=['data-structures', 'fenwick-tree'],
        statement=(
            'You are given an array a_1, ..., a_n and q queries of two kinds:\n\n'
            '1 i x: set a_i to x.\n'
            '2 l r: print a_l + a_(l+1) + ... + a_r.\n\n'
            'Answer every query of the second kind in order.\n\n'
            'Constraints: 1 ≤ n, q ≤ 10^5, 1 ≤ i ≤ n, 1 ≤ l ≤ r ≤ n, -10^9 ≤ a_i, x ≤ 10^9.'
        ),
        input_format='The first line has n and q. The second line has a_1, ..., a_n. Each of the next q lines has one query.',
        output_format='For every query of the second kind, one line with the sum.',
        samples=['5 4\n1 2 3 4 5\n2 1 3\n1 2 10\n2 1 3\n2 4 5\n'],
        gen=gen_fenwick,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    a = [0] + [int(x) for x in d[2:2 + n]]
    tree = a[:]
    for i in range(1, n + 1):
        j = i + (i & -i)
        if j <= n:
            tree[j] += tree[i]
    out = []
    p = 2 + n
    for _ in range(q):
        if d[p] == b'1':
            i = int(d[p + 1]); x = int(d[p + 2])
            delta = x - a[i]; a[i] = x
            while i <= n:
                tree[i] += delta
                i += i & -i
        else:
            l = int(d[p + 1]) - 1; r = int(d[p + 2])
            s = 0
            while r > 0:
                s += tree[r]; r &= r - 1
            while l > 0:
                s -= tree[l]; l &= l - 1
            out.append(s)
        p += 3
    sys.stdout.write('\n'.join(map(str, out)) + ('\n' if out else ''))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int n;
vector<long long> seg;
void upd(int p, long long v) { for (seg[p += n] = v; p > 1; p >>= 1) seg[p >> 1] = seg[p] + seg[p ^ 1]; }
long long qry(int l, int r) { long long s = 0; for (l += n, r += n; l < r; l >>= 1, r >>= 1) { if (l & 1) s += seg[l++]; if (r & 1) s += seg[--r]; } return s; }
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> n >> q;
    seg.assign(2 * n, 0);
    for (int i = 0; i < n; i++) cin >> seg[n + i];
    for (int i = n - 1; i > 0; i--) seg[i] = seg[2 * i] + seg[2 * i + 1];
    string out;
    while (q--) {
        int t; long long a, b; cin >> t >> a >> b;
        if (t == 1) upd(a - 1, b);
        else { out += to_string(qry(a - 1, b)); out += '\n'; }
    }
    cout << out;
}
''',
    ),
    dict(
        id='count-inversions',
        title='Counting inversions in an array',
        difficulty='medium',
        tags=['data-structures', 'fenwick-tree', 'divide-and-conquer'],
        statement=(
            'An inversion in an array a_1, ..., a_n is a pair of indices i < j with a_i > a_j. It measures how far the '
            'array is from being sorted in non-decreasing order. Count the inversions.\n\n'
            'Constraints: 1 ≤ n ≤ 10^5, 1 ≤ a_i ≤ 10^9.'
        ),
        input_format='The first line has n. The second line has a_1, ..., a_n.',
        output_format='One integer, the number of inversions.',
        samples=['5\n2 4 1 3 5\n', '4\n3 3 2 2\n'],
        gen=gen_inv,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    a = list(map(int, d[1:1 + n]))
    rank = {v: i + 1 for i, v in enumerate(sorted(set(a)))}
    m = len(rank)
    tree = [0] * (m + 1)
    inv = 0
    for idx, v in enumerate(a):
        r = rank[v]
        s = 0
        j = r
        while j > 0:
            s += tree[j]; j &= j - 1
        inv += idx - s
        while r <= m:
            tree[r] += 1; r += r & -r
    print(inv)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
long long sortCount(vector<int> &a, vector<int> &tmp, int l, int r) {
    if (r - l <= 1) return 0;
    int m = (l + r) / 2;
    long long c = sortCount(a, tmp, l, m) + sortCount(a, tmp, m, r);
    int i = l, j = m, k = l;
    while (i < m && j < r) {
        if (a[i] <= a[j]) tmp[k++] = a[i++];
        else { c += m - i; tmp[k++] = a[j++]; }
    }
    while (i < m) tmp[k++] = a[i++];
    while (j < r) tmp[k++] = a[j++];
    for (int t = l; t < r; t++) a[t] = tmp[t];
    return c;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> a(n), tmp(n);
    for (auto &x : a) cin >> x;
    cout << sortCount(a, tmp, 0, n) << "\n";
}
''',
    ),

    # ------------------------------------------------------------ hard
    dict(
        id='matrix-chain-order',
        title='Cheapest order to multiply matrices',
        difficulty='hard',
        tags=['dynamic-programming', 'interval-dp'],
        statement=(
            'You need the product of n matrices M_1 M_2 ... M_n, where M_i has p_(i-1) rows and p_i columns, so '
            'neighbouring matrices always fit together. Multiplying an x by y matrix with a y by z matrix costs x·y·z '
            'scalar multiplications and gives an x by z matrix. Matrix multiplication is associative, so you may '
            'choose the order of the multiplications by placing parentheses, but you may not reorder the matrices.\n\n'
            'Find the minimum total cost of computing the whole product. A single matrix costs nothing.\n\n'
            'Constraints: 1 ≤ n ≤ 200, 1 ≤ p_i ≤ 100.'
        ),
        input_format='The first line has n. The second line has n + 1 integers p_0, p_1, ..., p_n.',
        output_format='One integer, the minimum number of scalar multiplications.',
        samples=['3\n10 30 5 60\n', '4\n40 20 30 10 30\n'],
        gen=gen_mchain,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    p = list(map(int, d[1:2 + n]))
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(0, n - length + 1):
            j = i + length - 1
            row = dp[i]
            pij = p[i] * p[j + 1]
            best = min(row[k] + dp[k + 1][j] + pij * p[k + 1] for k in range(i, j))
            row[j] = best
    print(dp[0][n - 1])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<long long> p(n + 1);
    for (auto &x : p) cin >> x;
    vector<vector<long long>> dp(n + 1, vector<long long>(n + 1, 0));
    for (int i = n; i >= 1; i--)
        for (int j = i + 1; j <= n; j++) {
            long long best = LLONG_MAX;
            for (int k = i; k < j; k++) best = min(best, dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j]);
            dp[i][j] = best;
        }
    cout << dp[1][n] << "\n";
}
''',
    ),
    dict(
        id='palindrome-partition-min-cuts',
        title='Fewest cuts into palindromes',
        difficulty='hard',
        tags=['dynamic-programming', 'strings', 'palindromes'],
        statement=(
            'You want to cut a string s into pieces so that every piece is a palindrome, meaning it reads the same '
            'forwards and backwards. A cut goes between two neighbouring characters, and k cuts produce k + 1 pieces. '
            'Single characters are palindromes, so this is always possible.\n\n'
            'Find the minimum number of cuts needed.\n\n'
            'Constraints: 1 ≤ |s| ≤ 2000, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='One integer, the minimum number of cuts.',
        samples=['aab\n', 'banana\n'],
        gen=gen_palcut,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    n = len(s)
    cut = [i - 1 for i in range(n + 1)]
    for c in range(n):
        for l, r in ((c, c), (c, c + 1)):
            while l >= 0 and r < n and s[l] == s[r]:
                v = cut[l] + 1
                if v < cut[r + 1]:
                    cut[r + 1] = v
                l -= 1
                r += 1
    print(cut[n])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    int n = s.size();
    vector<vector<char>> pal(n, vector<char>(n, 0));
    for (int i = n - 1; i >= 0; i--)
        for (int j = i; j < n; j++)
            pal[i][j] = s[i] == s[j] && (j - i < 2 || pal[i + 1][j - 1]);
    vector<int> dp(n + 1, INT_MAX);  // dp[i] = min pieces for prefix of length i
    dp[0] = 0;
    for (int j = 1; j <= n; j++)
        for (int i = 0; i < j; i++)
            if (pal[i][j - 1] && dp[i] + 1 < dp[j]) dp[j] = dp[i] + 1;
    cout << dp[n] - 1 << "\n";
}
''',
    ),
    dict(
        id='travelling-salesman-bitmask',
        title='Shortest tour through all cities',
        difficulty='hard',
        tags=['dynamic-programming', 'bitmask-dp'],
        statement=(
            'A salesman lives in city 1 of a country with n cities. Travelling directly from city i to city j costs '
            'd_(i,j); the costs need not be symmetric, so d_(i,j) and d_(j,i) may differ. He wants to leave city 1, '
            'visit every other city exactly once, and return to city 1.\n\n'
            'Find the minimum total cost of such a tour. With only one city the tour is empty and costs 0.\n\n'
            'Constraints: 1 ≤ n ≤ 15, d_(i,i) = 0, 1 ≤ d_(i,j) ≤ 10^6 for i ≠ j.'
        ),
        input_format='The first line has n. Each of the next n lines has n integers; the j-th number on line i is d_(i,j).',
        output_format='One integer, the minimum cost of a tour.',
        samples=['4\n0 10 15 20\n5 0 9 10\n6 13 0 12\n8 8 9 0\n'],
        gen=gen_tsp,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    D = [list(map(int, d[1 + i * n:1 + (i + 1) * n])) for i in range(n)]
    if n == 1:
        print(0); return
    m = n - 1
    full = 1 << m
    INF = float('inf')
    dp = [INF] * (full * m)
    for j in range(m):
        dp[(1 << j) * m + j] = D[0][j + 1]
    W = [D[j + 1][1:] for j in range(m)]
    for mask in range(1, full):
        base = mask * m
        free = [k for k in range(m) if not mask >> k & 1]
        if not free:
            continue
        for j in range(m):
            if not mask >> j & 1:
                continue
            v = dp[base + j]
            if v == INF:
                continue
            wj = W[j]
            for k in free:
                idx = (mask | 1 << k) * m + k
                t = v + wj[k]
                if t < dp[idx]:
                    dp[idx] = t
    base = (full - 1) * m
    print(min(dp[base + j] + D[j + 1][0] for j in range(m)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<vector<long long>> d(n, vector<long long>(n));
    for (auto &r : d) for (auto &x : r) cin >> x;
    const long long INF = LLONG_MAX / 4;
    vector<vector<long long>> dp(1 << n, vector<long long>(n, INF));
    dp[1][0] = 0;
    for (int mask = 1; mask < (1 << n); mask += 2)
        for (int j = 0; j < n; j++) {
            if (!(mask >> j & 1) || dp[mask][j] >= INF) continue;
            for (int k = 0; k < n; k++) {
                if (mask >> k & 1) continue;
                int nm = mask | 1 << k;
                dp[nm][k] = min(dp[nm][k], dp[mask][j] + d[j][k]);
            }
        }
    long long best = INF;
    int full = (1 << n) - 1;
    for (int j = 0; j < n; j++) best = min(best, dp[full][j] + d[j][0]);
    cout << best << "\n";
}
''',
    ),
    dict(
        id='digit-sum-divisible-count',
        title='Numbers whose digit sum is divisible by k',
        difficulty='hard',
        tags=['dynamic-programming', 'digit-dp'],
        statement=(
            'For a fixed positive integer k, call a number lucky if the sum of its decimal digits is divisible by k. '
            'For example, with k = 7 the number 1240 is lucky because 1 + 2 + 4 + 0 = 7.\n\n'
            'You are given k and q questions. Each question gives two integers L and R; count the lucky numbers x with '
            'L ≤ x ≤ R.\n\n'
            'Constraints: 1 ≤ q ≤ 10^4, 1 ≤ k ≤ 100, 1 ≤ L ≤ R ≤ 10^18.'
        ),
        input_format='The first line has q and k. Each of the next q lines has L and R.',
        output_format='For every question, one line with the count.',
        samples=['3 7\n1 100\n1240 1240\n1 7\n', '1 1\n5 10\n'],
        gen=gen_digit,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    q, k = int(d[0]), int(d[1])
    L = 19
    W = [[0] * k for _ in range(L + 1)]
    W[0][0] = 1
    for ln in range(1, L + 1):
        prev = W[ln - 1]
        cur = W[ln]
        for r in range(k):
            pr = prev[r]
            if pr:
                for dg in range(10):
                    cur[(r + dg) % k] += pr
    # P[rem][t][need] = sum over digits dg < t of W[rem][(need - dg) % k]
    P = []
    for rem in range(L + 1):
        w = W[rem]
        rows = [[0] * k]
        for t in range(1, 11):
            dg = t - 1
            last = rows[-1]
            rows.append([last[need] + w[(need - dg) % k] for need in range(k)])
        P.append(rows)
    def f(N):
        if N < 0:
            return 0
        s = str(N)
        ln = len(s)
        ps = 0
        res = 0
        for idx, ch in enumerate(s):
            t = ord(ch) - 48
            res += P[ln - idx - 1][t][(-ps) % k]
            ps += t
        if ps % k == 0:
            res += 1
        return res
    out = []
    p = 2
    for _ in range(q):
        lo, hi = int(d[p]), int(d[p + 1]); p += 2
        out.append(f(hi) - f(lo - 1))
    print('\n'.join(map(str, out)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int k;
long long W[20][100];
long long countUpTo(long long N) {  // numbers in [0, N] with digit sum % k == 0
    if (N < 0) return 0;
    string s = to_string(N);
    int len = s.size(), ps = 0;
    long long res = 0;
    for (int i = 0; i < len; i++) {
        int t = s[i] - '0', rem = len - i - 1;
        for (int dg = 0; dg < t; dg++) res += W[rem][((-(ps + dg)) % k + k) % k];
        ps += t;
    }
    if (ps % k == 0) res++;
    return res;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> q >> k;
    W[0][0] = 1;
    for (int l = 1; l < 20; l++)
        for (int r = 0; r < k; r++)
            for (int dg = 0; dg < 10; dg++) W[l][(r + dg) % k] += W[l - 1][r];
    string out;
    while (q--) {
        long long L, R; cin >> L >> R;
        out += to_string(countUpTo(R) - countUpTo(L - 1)); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='distinct-substrings-count',
        title='Distinct substrings of a string',
        difficulty='hard',
        tags=['strings', 'suffix-structures', 'hashing'],
        statement=(
            'A substring is a contiguous, non-empty part of a string. The string aba has the substrings a, b, ab, ba '
            'and aba, plus a second copy of a, so it has 5 distinct substrings.\n\n'
            'Given a string s, count its distinct substrings.\n\n'
            'Constraints: 1 ≤ |s| ≤ 10^5, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='One integer, the number of distinct substrings.',
        samples=['aba\n', 'aaaa\n'],
        gen=gen_distsub,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    nxt = [{}]
    link = [-1]
    length = [0]
    last = 0
    for ch in s:
        cur = len(length)
        length.append(length[last] + 1); link.append(-1); nxt.append({})
        p = last
        while p != -1 and ch not in nxt[p]:
            nxt[p][ch] = cur
            p = link[p]
        if p == -1:
            link[cur] = 0
        else:
            q = nxt[p][ch]
            if length[p] + 1 == length[q]:
                link[cur] = q
            else:
                clone = len(length)
                length.append(length[p] + 1); link.append(link[q]); nxt.append(dict(nxt[q]))
                while p != -1 and nxt[p].get(ch) == q:
                    nxt[p][ch] = clone
                    p = link[p]
                link[q] = clone
                link[cur] = clone
        last = cur
    print(sum(length[v] - length[link[v]] for v in range(1, len(length))))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    int n = s.size();
    vector<int> sa(n), rk(n), tmp(n), lcp(n, 0);
    for (int i = 0; i < n; i++) sa[i] = i, rk[i] = s[i];
    for (int k = 1;; k <<= 1) {
        auto cmp = [&](int a, int b) {
            if (rk[a] != rk[b]) return rk[a] < rk[b];
            int ra = a + k < n ? rk[a + k] : -1, rb = b + k < n ? rk[b + k] : -1;
            return ra < rb;
        };
        sort(sa.begin(), sa.end(), cmp);
        tmp[sa[0]] = 0;
        for (int i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + cmp(sa[i - 1], sa[i]);
        rk = tmp;
        if (rk[sa[n - 1]] == n - 1) break;
    }
    for (int i = 0, h = 0; i < n; i++) {
        if (rk[i] == 0) { h = 0; continue; }
        int j = sa[rk[i] - 1];
        while (i + h < n && j + h < n && s[i + h] == s[j + h]) h++;
        lcp[rk[i]] = h;
        if (h) h--;
    }
    long long ans = (long long)n * (n + 1) / 2;
    for (int i = 0; i < n; i++) ans -= lcp[i];
    cout << ans << "\n";
}
''',
    ),
    dict(
        id='longest-palindromic-substring',
        title='Longest palindromic substring',
        difficulty='hard',
        tags=['strings', 'palindromes', 'manacher'],
        statement=(
            'Given a string s, find its longest contiguous substring that reads the same forwards and backwards. If '
            'several palindromic substrings share the maximum length, choose the one that starts furthest to the left.\n\n'
            'Print its length and the position where it starts, counting positions of s from 1.\n\n'
            'Constraints: 1 ≤ |s| ≤ 5·10^5, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='Two integers: the length of the longest palindromic substring and its 1-based starting position.',
        samples=['babad\n', 'forgeeksskeegfor\n'],
        gen=gen_manacher,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    n = len(s)
    best_len, best_st = 1, 0
    d1 = [0] * n
    l, r = 0, -1
    for i in range(n):
        k = 1 if i > r else min(d1[l + r - i], r - i + 1)
        while i - k >= 0 and i + k < n and s[i - k] == s[i + k]:
            k += 1
        d1[i] = k
        if i + k - 1 > r:
            l, r = i - k + 1, i + k - 1
        ln = 2 * k - 1
        if ln > best_len or (ln == best_len and i - k + 1 < best_st):
            best_len, best_st = ln, i - k + 1
    d2 = [0] * n
    l, r = 0, -1
    for i in range(n):
        k = 0 if i > r else min(d2[l + r - i + 1], r - i + 1)
        while i - k - 1 >= 0 and i + k < n and s[i - k - 1] == s[i + k]:
            k += 1
        d2[i] = k
        if i + k - 1 > r:
            l, r = i - k, i + k - 1
        ln = 2 * k
        if k and (ln > best_len or (ln == best_len and i - k < best_st)):
            best_len, best_st = ln, i - k
    print(best_len, best_st + 1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    string t = "^#";
    for (char c : s) { t += c; t += '#'; }
    t += '$';
    int m = t.size();
    vector<int> P(m, 0);
    int c = 0, r = 0, bestLen = 0, bestStart = 0;
    for (int i = 1; i < m - 1; i++) {
        if (i < r) P[i] = min(r - i, P[2 * c - i]);
        while (t[i + P[i] + 1] == t[i - P[i] - 1]) P[i]++;
        if (i + P[i] > r) c = i, r = i + P[i];
        if (P[i] > bestLen) bestLen = P[i], bestStart = (i - 1 - P[i]) / 2;
    }
    cout << bestLen << " " << bestStart + 1 << "\n";
}
''',
    ),
    dict(
        id='minimum-string-rotation',
        title='Smallest rotation of a string',
        difficulty='hard',
        tags=['strings', 'lyndon', 'two-pointers'],
        statement=(
            'A rotation of a string moves some number of characters from its front to its back, keeping their order. '
            'The rotations of abc are abc, bca and cab.\n\n'
            'Given a string s, print the lexicographically smallest of its rotations.\n\n'
            'Constraints: 1 ≤ |s| ≤ 5·10^5, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='One line with the smallest rotation.',
        samples=['bbaaccaadd\n', 'abab\n'],
        gen=gen_minrot,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    n = len(s)
    s2 = s + s
    i, j, k = 0, 1, 0
    while i < n and j < n and k < n:
        a = s2[i + k]; b = s2[j + k]
        if a == b:
            k += 1
            continue
        if a > b:
            i += k + 1
        else:
            j += k + 1
        if i == j:
            j += 1
        k = 0
    st = min(i, j)
    sys.stdout.write(s2[st:st + n].decode() + '\n')
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    int half = s.size();
    s += s;
    int n = s.size(), i = 0, ans = 0;
    while (i < half) {
        ans = i;
        int j = i + 1, k = i;
        while (j < n && s[k] <= s[j]) {
            if (s[k] < s[j]) k = i; else k++;
            j++;
        }
        while (i <= k) i += j - k;
    }
    cout << s.substr(ans, half) << "\n";
}
''',
    ),
    dict(
        id='segment-tree-min-and-count',
        title='Range minimum and how often it occurs',
        difficulty='hard',
        tags=['data-structures', 'segment-tree'],
        statement=(
            'You are given an array a_1, ..., a_n and q queries of two kinds:\n\n'
            '1 i x: set a_i to x.\n'
            '2 l r: print the minimum of a_l, ..., a_r and the number of indices in that range where the minimum occurs.\n\n'
            'Answer every query of the second kind in order.\n\n'
            'Constraints: 1 ≤ n ≤ 10^5, 1 ≤ q ≤ 5·10^4, 1 ≤ i ≤ n, 1 ≤ l ≤ r ≤ n, 1 ≤ a_i, x ≤ 10^9.'
        ),
        input_format='The first line has n and q. The second line has a_1, ..., a_n. Each of the next q lines has one query.',
        output_format='For every query of the second kind, one line with two integers: the minimum and its count.',
        samples=['5 4\n3 1 2 1 4\n2 1 5\n1 2 5\n2 1 5\n2 1 3\n'],
        gen=gen_segmin,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    size = 1
    while size < n:
        size *= 2
    INF = 1 << 62
    mn = [INF] * (2 * size)
    ct = [0] * (2 * size)
    for i in range(n):
        mn[size + i] = int(d[2 + i]); ct[size + i] = 1
    for v in range(size - 1, 0, -1):
        a = mn[2 * v]; b = mn[2 * v + 1]
        if a < b: mn[v] = a; ct[v] = ct[2 * v]
        elif b < a: mn[v] = b; ct[v] = ct[2 * v + 1]
        else: mn[v] = a; ct[v] = ct[2 * v] + ct[2 * v + 1]
    out = []
    p = 2 + n
    for _ in range(q):
        if d[p] == b'1':
            v = size + int(d[p + 1]) - 1
            mn[v] = int(d[p + 2]); ct[v] = 1
            v >>= 1
            while v:
                a = mn[2 * v]; b = mn[2 * v + 1]
                if a < b: mn[v] = a; ct[v] = ct[2 * v]
                elif b < a: mn[v] = b; ct[v] = ct[2 * v + 1]
                else: mn[v] = a; ct[v] = ct[2 * v] + ct[2 * v + 1]
                v >>= 1
        else:
            l = int(d[p + 1]) - 1 + size; r = int(d[p + 2]) + size
            best = INF; c = 0
            while l < r:
                if l & 1:
                    x = mn[l]
                    if x < best: best = x; c = ct[l]
                    elif x == best: c += ct[l]
                    l += 1
                if r & 1:
                    r -= 1
                    x = mn[r]
                    if x < best: best = x; c = ct[r]
                    elif x == best: c += ct[r]
                l >>= 1; r >>= 1
            out.append(f"{best} {c}")
        p += 3
    sys.stdout.write('\n'.join(out) + ('\n' if out else ''))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef pair<long long, int> P;
int n;
vector<P> t;
P comb(P a, P b) {
    if (a.first != b.first) return a.first < b.first ? a : b;
    return {a.first, a.second + b.second};
}
void build(int v, int l, int r, vector<long long> &a) {
    if (l == r) { t[v] = {a[l], 1}; return; }
    int m = (l + r) / 2;
    build(2 * v, l, m, a); build(2 * v + 1, m + 1, r, a);
    t[v] = comb(t[2 * v], t[2 * v + 1]);
}
void upd(int v, int l, int r, int pos, long long x) {
    if (l == r) { t[v] = {x, 1}; return; }
    int m = (l + r) / 2;
    if (pos <= m) upd(2 * v, l, m, pos, x); else upd(2 * v + 1, m + 1, r, pos, x);
    t[v] = comb(t[2 * v], t[2 * v + 1]);
}
P qry(int v, int l, int r, int ql, int qr) {
    if (ql <= l && r <= qr) return t[v];
    int m = (l + r) / 2;
    if (qr <= m) return qry(2 * v, l, m, ql, qr);
    if (ql > m) return qry(2 * v + 1, m + 1, r, ql, qr);
    return comb(qry(2 * v, l, m, ql, qr), qry(2 * v + 1, m + 1, r, ql, qr));
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> n >> q;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    t.assign(4 * n, {0, 0});
    build(1, 0, n - 1, a);
    string out;
    while (q--) {
        int ty; long long x, y; cin >> ty >> x >> y;
        if (ty == 1) upd(1, 0, n - 1, x - 1, y);
        else { P r = qry(1, 0, n - 1, x - 1, y - 1); out += to_string(r.first) + " " + to_string(r.second) + "\n"; }
    }
    cout << out;
}
''',
    ),
    dict(
        id='range-add-range-sum',
        title='Range additions and range sums',
        difficulty='hard',
        tags=['data-structures', 'fenwick-tree', 'segment-tree', 'lazy-propagation'],
        statement=(
            'You are given an array a_1, ..., a_n and q queries of two kinds:\n\n'
            '1 l r x: add x to every element a_l, ..., a_r.\n'
            '2 l r: print a_l + a_(l+1) + ... + a_r.\n\n'
            'Answer every query of the second kind in order.\n\n'
            'Constraints: 1 ≤ n ≤ 10^5, 1 ≤ q ≤ 5·10^4, 1 ≤ l ≤ r ≤ n, -10^9 ≤ a_i ≤ 10^9, -10^6 ≤ x ≤ 10^6.'
        ),
        input_format='The first line has n and q. The second line has a_1, ..., a_n. Each of the next q lines has one query.',
        output_format='For every query of the second kind, one line with the sum.',
        samples=['5 4\n1 2 3 4 5\n2 2 4\n1 1 3 10\n2 2 4\n2 1 5\n'],
        gen=gen_rangeadd,
        time_limit_ms=2000,
        py=r'''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    pre = [0] * (n + 1)
    s = 0
    for i in range(n):
        s += int(d[2 + i]); pre[i + 1] = s
    B1 = [0] * (n + 2)
    B2 = [0] * (n + 2)
    N = n + 1
    def add(i, x, y):
        while i <= N:
            B1[i] += x; B2[i] += y
            i += i & -i
    def prefix(i):
        a = b = 0
        j = i
        while j > 0:
            a += B1[j]; b += B2[j]
            j &= j - 1
        return a * i - b + pre[i]
    out = []
    p = 2 + n
    for _ in range(q):
        if d[p] == b'1':
            l, r, x = int(d[p + 1]), int(d[p + 2]), int(d[p + 3])
            add(l, x, x * (l - 1))
            add(r + 1, -x, -x * r)
            p += 4
        else:
            l, r = int(d[p + 1]), int(d[p + 2])
            out.append(prefix(r) - prefix(l - 1))
            p += 3
    sys.stdout.write('\n'.join(map(str, out)) + ('\n' if out else ''))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int n;
vector<long long> sm, lz;
void build(int v, int l, int r, vector<long long> &a) {
    if (l == r) { sm[v] = a[l]; return; }
    int m = (l + r) / 2;
    build(2 * v, l, m, a); build(2 * v + 1, m + 1, r, a);
    sm[v] = sm[2 * v] + sm[2 * v + 1];
}
void push(int v, int l, int r) {
    if (!lz[v]) return;
    int m = (l + r) / 2;
    sm[2 * v] += lz[v] * (m - l + 1); lz[2 * v] += lz[v];
    sm[2 * v + 1] += lz[v] * (r - m); lz[2 * v + 1] += lz[v];
    lz[v] = 0;
}
void upd(int v, int l, int r, int ql, int qr, long long x) {
    if (qr < l || r < ql) return;
    if (ql <= l && r <= qr) { sm[v] += x * (r - l + 1); lz[v] += x; return; }
    push(v, l, r);
    int m = (l + r) / 2;
    upd(2 * v, l, m, ql, qr, x); upd(2 * v + 1, m + 1, r, ql, qr, x);
    sm[v] = sm[2 * v] + sm[2 * v + 1];
}
long long qry(int v, int l, int r, int ql, int qr) {
    if (qr < l || r < ql) return 0;
    if (ql <= l && r <= qr) return sm[v];
    push(v, l, r);
    int m = (l + r) / 2;
    return qry(2 * v, l, m, ql, qr) + qry(2 * v + 1, m + 1, r, ql, qr);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int q; cin >> n >> q;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;
    sm.assign(4 * n, 0); lz.assign(4 * n, 0);
    build(1, 0, n - 1, a);
    string out;
    while (q--) {
        int t; cin >> t;
        if (t == 1) { int l, r; long long x; cin >> l >> r >> x; upd(1, 0, n - 1, l - 1, r - 1, x); }
        else { int l, r; cin >> l >> r; out += to_string(qry(1, 0, n - 1, l - 1, r - 1)); out += '\n'; }
    }
    cout << out;
}
''',
    ),
    dict(
        id='prefix-suffix-middle',
        title='Prefix that is also a suffix and appears inside',
        difficulty='hard',
        tags=['strings', 'z-function', 'prefix-function'],
        statement=(
            'Given a string s of length n, find the longest non-empty string t that satisfies all three conditions:\n\n'
            't is a prefix of s;\n'
            't is a suffix of s;\n'
            't also occurs somewhere strictly inside s, that is, at a position that starts after the first character '
            'of s and ends before the last character of s.\n\n'
            'Print the length of t, or 0 if no such string exists.\n\n'
            'Constraints: 1 ≤ n ≤ 5·10^5, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='One integer, the length of the longest such t, or 0.',
        samples=['fixprefixsuffix\n', 'abcdabc\n'],
        gen=gen_password,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    n = len(s)
    z = [0] * n
    l = r = 0
    for i in range(1, n):
        k = 0
        if i < r:
            k = z[i - l]
            if r - i < k: k = r - i
        while i + k < n and s[k] == s[i + k]:
            k += 1
        z[i] = k
        if i + k > r:
            l, r = i, i + k
    inner = 0
    for i in range(1, n - 1):
        v = z[i]
        lim = n - 1 - i
        if lim < v: v = lim
        if v > inner: inner = v
    best = 0
    for i in range(1, n):
        if i + z[i] == n:
            L = n - i
            if L <= inner and L > best:
                best = L
    print(best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    int n = s.size();
    vector<int> pi(n, 0);
    for (int i = 1; i < n; i++) {
        int k = pi[i - 1];
        while (k && s[i] != s[k]) k = pi[k - 1];
        if (s[i] == s[k]) k++;
        pi[i] = k;
    }
    int L = pi[n - 1], ans = 0;
    if (L > 0) {
        int mx = 0;
        for (int i = 0; i < n - 1; i++) mx = max(mx, pi[i]);
        if (mx >= L) ans = L;
        else ans = pi[L - 1];
    }
    cout << ans << "\n";
}
''',
    ),
    dict(
        id='distinct-subsequences-count',
        title='Counting distinct subsequences',
        difficulty='hard',
        tags=['dynamic-programming', 'strings', 'counting'],
        statement=(
            'A subsequence of a string is obtained by deleting some of its characters (possibly none) without changing '
            'the order of the rest. The string aba has the non-empty subsequences a, b, ab, aa, ba and aba, and the '
            'subsequence a can be formed in two ways but is counted once, so it has 6 distinct non-empty subsequences.\n\n'
            'Given a string s, count its distinct non-empty subsequences modulo 10^9 + 7.\n\n'
            'Constraints: 1 ≤ |s| ≤ 5·10^5, s consists of lowercase English letters.'
        ),
        input_format='One line with the string s.',
        output_format='One integer, the number of distinct non-empty subsequences modulo 10^9 + 7.',
        samples=['aba\n', 'abc\n'],
        gen=gen_distseq,
        py=r'''import sys
def main():
    s = sys.stdin.buffer.read().split()[0]
    MOD = 10**9 + 7
    last = [0] * 128
    total = 1  # includes the empty subsequence
    for c in s:
        nt = (2 * total - last[c]) % MOD
        last[c] = total
        total = nt
    print((total - 1) % MOD)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    string s; cin >> s;
    const long long MOD = 1000000007LL;
    long long endWith[26] = {0}, sum = 0;  // distinct subsequences ending with each letter
    for (char ch : s) {
        int c = ch - 'a';
        long long nv = (sum + 1) % MOD;
        sum = ((sum - endWith[c] + nv) % MOD + MOD) % MOD;
        endWith[c] = nv;
    }
    cout << sum << "\n";
}
''',
    ),
]
