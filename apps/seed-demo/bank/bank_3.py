# bank 3: graphs and trees. see build.py for the contract.


# ---------------------------------------------------------------- generator helpers

def _shape(rng):
    return rng.choice(['random', 'random', 'line', 'star', 'deep', 'caterpillar'])


def _tree_par(rng, n, shape):
    """par[i] < i for i in 2..n, in index space (not yet relabelled)."""
    par = [0] * (n + 1)
    h = max(2, n // 2)
    for i in range(2, n + 1):
        if shape == 'line':
            p = i - 1
        elif shape == 'star':
            p = 1
        elif shape == 'deep':
            p = rng.randint(max(1, i - 3), i - 1)
        elif shape == 'caterpillar':
            p = i - 1 if i <= h else rng.randint(1, h)
        else:
            p = rng.randint(1, i - 1)
        par[i] = p
    return par


def _labels(rng, n, keep_one=False):
    lab = list(range(1, n + 1))
    if keep_one:
        rest = lab[1:]
        rng.shuffle(rest)
        lab = [1] + rest
    else:
        rng.shuffle(lab)
    return [0] + lab


def _tree_edges(rng, n, shape=None, keep_one=False):
    shape = shape or _shape(rng)
    par = _tree_par(rng, n, shape)
    lab = _labels(rng, n, keep_one)
    e = []
    for i in range(2, n + 1):
        a, b = lab[i], lab[par[i]]
        e.append((a, b) if rng.random() < 0.5 else (b, a))
    rng.shuffle(e)
    return e


def _rand_edges(rng, n, m):
    return [(rng.randint(1, n), rng.randint(1, n)) for _ in range(m)]


def _dag(rng, n, m, chain=False, local=None):
    order = list(range(1, n + 1))
    rng.shuffle(order)
    e = []
    if chain:
        e += [(order[i], order[i + 1]) for i in range(n - 1)]
    while len(e) < m and n > 1:
        if local:
            i = rng.randint(0, n - 2)
            j = min(n - 1, i + rng.randint(1, local))
        else:
            i, j = sorted(rng.sample(range(n), 2))
        e.append((order[i], order[j]))
    rng.shuffle(e)
    return e, order


def _lines(rows):
    return ''.join(' '.join(map(str, r)) + '\n' for r in rows)


def _graph_input(n, edges, extra=''):
    return f"{n} {len(edges)}\n{extra}" + _lines(edges)


# ---------------------------------------------------------------- generators

def g_components(rng, t):
    if t == 0:
        return '1 0\n'
    n = [1, 7, 40, 1000, 20000, 50000][t]
    if t <= 3:
        e = _rand_edges(rng, n, [0, 4, 25, 800][t])
    elif t == 4:
        e = _rand_edges(rng, n, 12000)
    else:
        lab = _labels(rng, n)
        blocks, i = [], 1
        while i <= n:
            s = rng.randint(1, 60)
            blocks.append((i, min(n, i + s - 1)))
            i += s
        e = []
        for _ in range(100000):
            a, b = rng.choice(blocks)
            e.append((lab[rng.randint(a, b)], lab[rng.randint(a, b)]))
    return _graph_input(n, e)


def g_islands(rng, t):
    r, c = [(1, 1), (4, 5), (20, 30), (100, 100), (400, 500), (700, 700)][t]
    p = [0.5, 0.5, 0.45, 0.4, 0.35, 0.5][t]
    rows = [''.join('#' if rng.random() < p else '.' for _ in range(c)) for _ in range(r)]
    return f"{r} {c}\n" + '\n'.join(rows) + '\n'


def g_maze(rng, t):
    r, c = [(1, 2), (3, 4), (10, 12), (60, 80), (300, 300), (699, 700)][t]
    if t == 5:
        g = [['.'] * c for _ in range(r)]
        for i in range(1, r, 2):
            for j in range(c):
                g[i][j] = '#'
            g[i][c - 1 if (i // 2) % 2 == 0 else 0] = '.'
        g[0][0] = 'S'
        g[r - 1][rng.randint(0, c - 1)] = 'T'
    else:
        p = [0.0, 0.2, 0.5, 0.35, 0.3][t]
        g = [['#' if rng.random() < p else '.' for _ in range(c)] for _ in range(r)]
        a, b = rng.sample(range(r * c), 2)
        g[a // c][a % c] = 'S'
        g[b // c][b % c] = 'T'
    return f"{r} {c}\n" + '\n'.join(''.join(row) for row in g) + '\n'


def g_bfs(rng, t):
    n = [1, 6, 30, 1000, 20000, 50000][t]
    if t <= 4:
        e = _rand_edges(rng, n, [0, 5, 35, 1200, 12000][t])
    else:
        lab = _labels(rng, n)
        e = [(lab[i], lab[i + 1]) for i in range(1, n)] + _rand_edges(rng, n, 50000)
        rng.shuffle(e)
    return _graph_input(n, e)


def g_subtree(rng, t):
    n = [1, 5, 12, 1000, 50000, 100000][t]
    shape = ['random', 'random', 'star', 'random', 'line', 'random'][t]
    par = [0] * (n + 1)
    p = _tree_par(rng, n, shape)
    lab = _labels(rng, n, keep_one=True)
    for i in range(2, n + 1):
        par[lab[i]] = lab[p[i]]
    return f"{n}\n" + ' '.join(str(par[i]) for i in range(2, n + 1)) + '\n'


def g_teams(rng, t):
    n = [1, 6, 50, 2000, 30000, 50000][t]
    m = [0, 5, 60, 2500, 40000, 100000][t]
    bad = t in (2, 4)
    side = [rng.randint(0, 1) for _ in range(n + 1)]
    A = [v for v in range(1, n + 1) if side[v] == 0]
    B = [v for v in range(1, n + 1) if side[v] == 1]
    m = min(m, len(A) * len(B))
    seen, e = set(), []
    while len(e) < m:
        a, b = rng.choice(A), rng.choice(B)
        k = (min(a, b), max(a, b))
        if k in seen:
            continue
        seen.add(k)
        e.append((a, b) if rng.random() < 0.5 else (b, a))
    if bad and len(A) >= 2:
        a, b = rng.sample(A, 2)
        e.append((a, b))
    rng.shuffle(e)
    return _graph_input(n, e)


def g_dcycle(rng, t):
    if t == 0:
        return '1 0\n'
    if t == 1:
        e, order = _dag(rng, 4, 4)
        v = rng.randint(1, 4)
        e.append((v, v))
        return _graph_input(4, e)
    if t == 2:
        e, _ = _dag(rng, 50, 120)
        return _graph_input(50, e)
    if t == 3:
        e, order = _dag(rng, 2000, 5000, chain=True)
        e.append((order[-1], order[0]))
        rng.shuffle(e)
        return _graph_input(2000, e)
    if t == 4:
        e, _ = _dag(rng, 50000, 100000, local=200)
        return _graph_input(50000, e)
    e, _ = _dag(rng, 50000, 99999, local=200)
    a, b = rng.choice(e)
    e.append((b, a))
    rng.shuffle(e)
    return _graph_input(50000, e)


def g_topo(rng, t):
    if t == 0:
        return '1 0\n'
    if t == 1:
        e, _ = _dag(rng, 5, 4)
        return _graph_input(5, e)
    if t == 2:
        e, order = _dag(rng, 8, 10, chain=True)
        e.append((order[-1], order[2]))
        return _graph_input(8, e)
    if t == 3:
        e, _ = _dag(rng, 1000, 3000)
        return _graph_input(1000, e)
    if t == 4:
        e, _ = _dag(rng, 30000, 60000, local=50)
        a, b = rng.choice(e)
        e.append((b, a))
        rng.shuffle(e)
        return _graph_input(30000, e)
    e, _ = _dag(rng, 50000, 100000, local=300)
    return _graph_input(50000, e)


def g_dijkstra(rng, t):
    n = [1, 5, 40, 2000, 20000, 30000][t]
    m = [0, 6, 80, 5000, 40000, 50000][t]
    W = 10 if t in (1, 3) else 10 ** 9
    if t == 5:
        lab = _labels(rng, n)
        pairs = [(lab[i], lab[i + 1]) for i in range(1, n)] + _rand_edges(rng, n, m - (n - 1))
        rng.shuffle(pairs)
    else:
        pairs = _rand_edges(rng, n, m)
    e = [(a, b, rng.randint(1, W)) for a, b in pairs]
    return _graph_input(n, e)


def g_walls(rng, t):
    r, c = [(1, 1), (2, 3), (10, 10), (50, 70), (300, 300), (500, 500)][t]
    p = [1.0, 0.5, 0.4, 0.5, 0.6, 0.45][t]
    rows = [''.join('#' if rng.random() < p else '.' for _ in range(c)) for _ in range(r)]
    return f"{r} {c}\n" + '\n'.join(rows) + '\n'


def g_dsu(rng, t):
    n = [1, 5, 50, 1000, 8000, 50000][t]
    q = [3, 8, 100, 3000, 60000, 100000][t]
    pm = [0.4, 0.4, 0.4, 0.45, 0.5, 0.6][t]
    ops = []
    for i in range(q):
        x = rng.random()
        if i == q - 1:
            x = max(x, pm)
        if x < pm:
            ops.append(f"1 {rng.randint(1, n)} {rng.randint(1, n)}")
        elif x < pm + (1 - pm) * 0.65:
            ops.append(f"2 {rng.randint(1, n)} {rng.randint(1, n)}")
        else:
            ops.append(f"3 {rng.randint(1, n)}")
    return f"{n} {q}\n" + '\n'.join(ops) + '\n'


def g_mst(rng, t):
    if t == 0:
        return '1 0\n'
    n = [1, 4, 30, 1000, 10000, 20000][t]
    if t in (1, 2):
        pairs = _rand_edges(rng, n, [0, 5, 25][t])
        W = 20
    else:
        extra = [0, 0, 0, 2000, 20000, 30000][t]
        pairs = _tree_edges(rng, n) + _rand_edges(rng, n, extra)
        rng.shuffle(pairs)
        W = 5 if t == 3 else 10 ** 9
    e = [(a, b, rng.randint(1, W)) for a, b in pairs]
    return _graph_input(n, e)


def g_diameter(rng, t):
    n = [1, 2, 50, 2000, 30000, 50000][t]
    W = [1, 10 ** 9, 100, 10 ** 9, 10 ** 9, 10 ** 9][t]
    shape = [None, None, 'star', 'caterpillar', 'line', 'random'][t]
    e = [(a, b, rng.randint(1, W)) for a, b in _tree_edges(rng, n, shape)]
    return f"{n}\n" + _lines(e)


def g_floyd(rng, t):
    n = [1, 4, 20, 60, 120, 150][t]
    m = [0, 6, 60, 600, 3000, 8000][t]
    q = [1, 5, 40, 1000, 5000, 10000][t]
    W = [5, 20, 100, 10 ** 6, 10 ** 6, 10 ** 6][t]
    e = [(a, b, rng.randint(1, W)) for a, b in _rand_edges(rng, n, m)]
    qs = _rand_edges(rng, n, q)
    return f"{n} {m} {q}\n" + _lines(e) + _lines(qs)


def g_stations(rng, t):
    n = [1, 6, 40, 2000, 20000, 50000][t]
    m = [0, 5, 40, 2500, 15000, 100000][t]
    k = [1, 2, 3, 20, 50, 500][t]
    st = rng.sample(range(1, n + 1), k)
    e = _rand_edges(rng, n, m)
    return f"{n} {m} {k}\n" + ' '.join(map(str, st)) + '\n' + _lines(e)


def g_semesters(rng, t):
    if t == 0:
        return '1 0\n'
    if t == 1:
        e, _ = _dag(rng, 6, 6)
        return _graph_input(6, e)
    if t == 2:
        e, order = _dag(rng, 40, 60)
        e.append((order[30], order[5]))
        e.append((order[5], order[30]))
        rng.shuffle(e)
        return _graph_input(40, e)
    if t == 3:
        e, _ = _dag(rng, 2000, 4000, chain=True)
        return _graph_input(2000, e)
    if t == 4:
        e, _ = _dag(rng, 30000, 59999, local=40)
        v = rng.randint(1, 30000)
        e.append((v, v))
        rng.shuffle(e)
        return _graph_input(30000, e)
    e, _ = _dag(rng, 50000, 100000, local=60)
    return _graph_input(50000, e)


def g_bellman(rng, t):
    if t == 0:
        return '1 1\n1 1 -5\n'
    n = [1, 4, 30, 200, 400, 400][t]
    m = [0, 6, 80, 1500, 4000, 4000][t]
    pot = [0] + [rng.randint(0, 2500) for _ in range(n)]

    def w(a, b, extra=0):
        return rng.randint(0, 5000) + pot[a] - pot[b] + extra

    e = []
    if t == 1:
        for _ in range(m):
            a, b = rng.sample(range(1, n + 1), 2)
            e.append((a, b, w(a, b)))
    elif t == 2:
        # a negative cycle on 28, 29, 30 that vertex 1 can never reach
        for _ in range(m - 5):
            a, b = rng.sample(range(1, n - 2), 2)
            e.append((a, b, w(a, b)))
        e += [(28, 29, -100), (29, 30, -100), (30, 28, -100), (29, 3, 7), (30, 5, -4)]
        rng.shuffle(e)
    elif t == 3:
        for _ in range(m - 4):
            a, b = rng.sample(range(1, n + 1), 2)
            e.append((a, b, w(a, b)))
        a, b, c = rng.sample(range(2, n + 1), 3)
        e += [(1, a, w(1, a)), (a, b, pot[a] - pot[b]), (b, c, pot[b] - pot[c]), (c, a, pot[c] - pot[a] - 10)]
        rng.shuffle(e)
    elif t == 4:
        # a chain listed backwards so the relaxation needs every pass
        e = [(i, i + 1, w(i, i + 1)) for i in range(n - 1, 0, -1)]
        while len(e) < m:
            a, b = rng.sample(range(1, n + 1), 2)
            e.append((a, b, w(a, b)))
    else:
        # a long cycle whose total is -1, reachable from vertex 1
        cyc = rng.sample(range(2, n + 1), 60)
        ce = []
        for i in range(60):
            a, b = cyc[i], cyc[(i + 1) % 60]
            ce.append((a, b, pot[a] - pot[b] - (1 if i == 59 else 0)))
        e = ce[::-1]
        while len(e) < m:
            a, b = rng.sample(range(1, n + 1), 2)
            e.append((a, b, w(a, b)))
    return _graph_input(n, e)


def _cut_graph(rng, t, shapes):
    if t == 0:
        return '1 0\n'
    if t == 1:
        return '2 1\n1 2\n'
    n = [0, 0, 30, 2000, 30000, 50000][t]
    shape = shapes[t - 2]
    extra = [6, 300, 5000, 15000][t - 2]
    win = [n, 10, 6, 8][t - 2]
    par = _tree_par(rng, n, shape)
    seen, e = set(), []
    for i in range(2, n + 1):
        if rng.random() < 0.01:
            continue
        seen.add((par[i], i))
        e.append((par[i], i))
    tries = 0
    while extra and tries < extra * 20:
        tries += 1
        i = rng.randint(1, n)
        j = i + rng.randint(1, win)
        if j > n or (i, j) in seen:
            continue
        seen.add((i, j))
        e.append((i, j))
        extra -= 1
    lab = _labels(rng, n)
    e = [(lab[a], lab[b]) if rng.random() < 0.5 else (lab[b], lab[a]) for a, b in e]
    rng.shuffle(e)
    return _graph_input(n, e)


def g_bridges(rng, t):
    return _cut_graph(rng, t, ['random', 'line', 'deep', 'random'])


def g_articulation(rng, t):
    return _cut_graph(rng, t, ['star', 'caterpillar', 'deep', 'random'])


def g_scc(rng, t):
    if t == 0:
        return '1 0\n'
    n = [1, 5, 40, 2000, 30000, 50000][t]
    maxg = [1, 3, 6, 30, 50, 200][t]
    back = [0, 1, 1, 3, 5, 2][t]
    fwd = [0, 3, 30, 2000, 30000, 45000][t]
    order = list(range(1, n + 1))
    rng.shuffle(order)
    groups, i = [], 0
    while i < n:
        s = rng.randint(1, maxg)
        groups.append(order[i:i + s])
        i += s
    e = []
    for gr in groups:
        if len(gr) > 1:
            for j in range(len(gr)):
                e.append((gr[j], gr[(j + 1) % len(gr)]))
            if len(gr) > 3:
                e.append((gr[0], gr[2]))
    G = len(groups)
    if G > 1:
        for _ in range(fwd):
            x, y = sorted(rng.sample(range(G), 2))
            e.append((rng.choice(groups[x]), rng.choice(groups[y])))
        for _ in range(back):
            x, y = sorted(rng.sample(range(G), 2))
            e.append((rng.choice(groups[y]), rng.choice(groups[x])))
    if t == 1:
        e.append((order[0], order[0]))
    rng.shuffle(e)
    return _graph_input(n, e)


def g_lca(rng, t):
    n = [1, 5, 40, 2000, 20000, 40000][t]
    q = [1, 6, 40, 2000, 20000, 40000][t]
    shape = [None, 'random', 'caterpillar', 'random', 'line', 'random'][t]
    e = [(a, b, rng.randint(1, 10 ** 6)) for a, b in _tree_edges(rng, n, shape)]
    qs = []
    for _ in range(q):
        u = rng.randint(1, n)
        v = u if rng.random() < 0.05 else rng.randint(1, n)
        qs.append((u, v))
    return f"{n} {q}\n" + _lines(e) + _lines(qs)


def g_sumdist(rng, t):
    n = [1, 2, 7, 2000, 30000, 50000][t]
    shape = [None, None, 'random', 'star', 'random', 'line'][t]
    return f"{n}\n" + _lines(_tree_edges(rng, n, shape))


def g_voucher(rng, t):
    if t == 0:
        return '1 0\n'
    n = [1, 3, 30, 2000, 20000, 50000][t]
    m = [0, 3, 60, 6000, 40000, 50000][t]
    L = [0, 2, 0, 50, 500, 2000][t]
    W = 20 if t == 1 else 10 ** 9
    pairs = []
    if L:
        path = [1] + rng.sample(range(2, n), L - 1) + [n]
        pairs = [(path[i], path[i + 1]) for i in range(L)]
    pairs += _rand_edges(rng, n, m - len(pairs))
    rng.shuffle(pairs)
    e = [(a, b, rng.randint(1, W)) for a, b in pairs]
    return _graph_input(n, e)


def g_countpaths(rng, t):
    if t == 0:
        return '1 0\n'
    if t == 1:
        e = [(1, 2, 3), (2, 3, 1), (1, 3, 4), (4, 5, 2)]
        return _graph_input(5, e)
    if t in (2, 4):
        n, m, W = [(0, 0, 0), (0, 0, 0), (30, 60, 3), (0, 0, 0), (20000, 50000, 10 ** 9)][t]
        e = []
        while len(e) < m:
            a, b = rng.randint(1, n), rng.randint(1, n)
            if a != b:
                e.append((a, b, rng.randint(1, W)))
        return _graph_input(n, e)
    R, C = (30, 30) if t == 3 else (200, 250)
    n = R * C
    lab = [0, 1] + rng.sample(range(2, n), n - 2) + [n]
    e = []
    for i in range(R):
        for j in range(C):
            v = i * C + j + 1
            if j + 1 < C:
                e.append((lab[v], lab[v + 1], 1 if rng.random() < 0.97 else 2))
            if i + 1 < R:
                e.append((lab[v], lab[v + C], 1 if rng.random() < 0.97 else 2))
    if t == 3:
        e += [rng.choice(e) for _ in range(40)]
    e = [(b, a, w) if rng.random() < 0.5 else (a, b, w) for a, b, w in e]
    rng.shuffle(e)
    return _graph_input(n, e)


def g_flood(rng, t):
    r, c = [(1, 1), (2, 3), (10, 10), (50, 60), (200, 300), (400, 400)][t]
    H = [10, 10, 100, 10 ** 6, 10 ** 6, 10 ** 6][t]
    rows = [[rng.randint(0, H) for _ in range(c)] for _ in range(r)]
    return f"{r} {c}\n" + _lines(rows)


# ---------------------------------------------------------------- problems

PROBLEMS = [
    # ============================================================ easy
    dict(
        id='count-connected-components',
        title='Counting connected components',
        difficulty='easy',
        tags=['graphs', 'dfs', 'dsu'],
        statement='A country has n towns numbered from 1 to n and m two-way roads. Two towns belong to the same region if one can be reached from the other by following roads. Count the regions, that is, the connected components of the undirected graph.\n\nThe road list may contain the same pair more than once, and a road may start and end at the same town.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, a road between towns u and v.',
        output_format='One integer, the number of connected components.',
        samples=['6 4\n1 2\n2 3\n4 5\n6 6\n', '3 0\n'],
        gen=g_components,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    p = list(range(n + 1))
    def find(x):
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x
    comps = n
    for i in range(m):
        a = find(int(d[2 + 2 * i]))
        b = find(int(d[3 + 2 * i]))
        if a != b:
            p[a] = b
            comps -= 1
    print(comps)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); g[b].push_back(a); }
    vector<char> vis(n + 1, 0);
    vector<int> st;
    int comps = 0;
    for (int s = 1; s <= n; s++) {
        if (vis[s]) continue;
        comps++; vis[s] = 1; st.push_back(s);
        while (!st.empty()) {
            int v = st.back(); st.pop_back();
            for (int w : g[v]) if (!vis[w]) { vis[w] = 1; st.push_back(w); }
        }
    }
    cout << comps << "\n";
}
''',
    ),
    dict(
        id='count-islands-grid',
        title='Counting islands on a map',
        difficulty='easy',
        tags=['graphs', 'grid', 'flood-fill'],
        statement='A map is drawn as an r × c grid. Each cell is either land (#) or water (.). Two land cells belong to the same island if they share a side; cells that touch only at a corner are not connected. Count the islands.\n\nConstraints: 1 ≤ r, c ≤ 700.',
        input_format='The first line has r and c. Each of the next r lines is a string of c characters; every character is # or .',
        output_format='One integer, the number of islands.',
        samples=['4 5\n##..#\n#...#\n..#..\n.#.##\n'],
        gen=g_islands,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    r, c = int(d[0]), int(d[1])
    g = bytearray(b''.join(d[2:2 + r]))
    N = r * c
    cnt = 0
    s = g.find(35)
    while s != -1:
        cnt += 1
        g[s] = 46
        st = [s]
        while st:
            x = st.pop()
            j = x % c
            if j and g[x - 1] == 35:
                g[x - 1] = 46; st.append(x - 1)
            if j + 1 < c and g[x + 1] == 35:
                g[x + 1] = 46; st.append(x + 1)
            if x >= c and g[x - c] == 35:
                g[x - c] = 46; st.append(x - c)
            if x + c < N and g[x + c] == 35:
                g[x + c] = 46; st.append(x + c)
        s = g.find(35, s + 1)
    print(cnt)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int r, c; cin >> r >> c;
    vector<string> g(r);
    for (auto &s : g) cin >> s;
    int cnt = 0;
    vector<pair<int,int>> st;
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) {
        if (g[i][j] != '#') continue;
        cnt++; g[i][j] = '.'; st.push_back({i, j});
        while (!st.empty()) {
            auto [x, y] = st.back(); st.pop_back();
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c || g[nx][ny] != '#') continue;
                g[nx][ny] = '.'; st.push_back({nx, ny});
            }
        }
    }
    cout << cnt << "\n";
}
''',
    ),
    dict(
        id='maze-shortest-path',
        title='Shortest route through a maze',
        difficulty='easy',
        tags=['graphs', 'grid', 'bfs'],
        statement='You are standing in a maze drawn as an r × c grid. Open cells are marked ., walls are marked #, your position is S and the exit is T. In one step you may move to an open cell that shares a side with your current cell; S and T are open cells too. You cannot leave the grid or walk through walls.\n\nFind the minimum number of steps needed to reach T from S, or report that T cannot be reached.\n\nThe grid contains exactly one S and exactly one T.\n\nConstraints: 1 ≤ r, c ≤ 700, r · c ≥ 2.',
        input_format='The first line has r and c. Each of the next r lines is a string of c characters from the set {., #, S, T}.',
        output_format='One integer, the minimum number of steps, or -1 if T is unreachable.',
        samples=['4 5\nS..#.\n.#...\n.#.#.\n...#T\n', '2 3\nS#.\n.#T\n'],
        gen=g_maze,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    r, c = int(d[0]), int(d[1])
    g = b''.join(d[2:2 + r])
    N = r * c
    s, t = g.find(b'S'), g.find(b'T')
    dist = [-1] * N
    dist[s] = 0
    q = [s]
    for x in q:
        if x == t:
            break
        nd = dist[x] + 1
        j = x % c
        if j and g[x - 1] != 35 and dist[x - 1] < 0:
            dist[x - 1] = nd; q.append(x - 1)
        if j + 1 < c and g[x + 1] != 35 and dist[x + 1] < 0:
            dist[x + 1] = nd; q.append(x + 1)
        if x >= c and g[x - c] != 35 and dist[x - c] < 0:
            dist[x - c] = nd; q.append(x - c)
        if x + c < N and g[x + c] != 35 and dist[x + c] < 0:
            dist[x + c] = nd; q.append(x + c)
    print(dist[t])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int r, c; cin >> r >> c;
    vector<string> g(r);
    for (auto &s : g) cin >> s;
    int sx = 0, sy = 0, tx = 0, ty = 0;
    for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) {
        if (g[i][j] == 'S') sx = i, sy = j;
        if (g[i][j] == 'T') tx = i, ty = j;
    }
    vector<vector<int>> dist(r, vector<int>(c, -1));
    queue<pair<int,int>> q;
    dist[sx][sy] = 0; q.push({sx, sy});
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [x, y] = q.front(); q.pop();
        for (int k = 0; k < 4; k++) {
            int nx = x + dx[k], ny = y + dy[k];
            if (nx < 0 || ny < 0 || nx >= r || ny >= c || g[nx][ny] == '#' || dist[nx][ny] != -1) continue;
            dist[nx][ny] = dist[x][y] + 1; q.push({nx, ny});
        }
    }
    cout << dist[tx][ty] << "\n";
}
''',
    ),
    dict(
        id='bfs-distances-unweighted',
        title='Distances in an unweighted graph',
        difficulty='easy',
        tags=['graphs', 'bfs'],
        statement='You are given an undirected graph with n vertices numbered from 1 to n and m edges. Every edge has length 1. For every vertex, find the length of the shortest path from vertex 1 to it.\n\nThe graph need not be connected, and it may contain repeated edges and self-loops.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, an edge between u and v.',
        output_format='One line with n integers: the distance from vertex 1 to vertices 1, 2, …, n, or -1 for a vertex that cannot be reached.',
        samples=['6 5\n1 2\n2 3\n1 4\n4 3\n5 6\n'],
        gen=g_bfs,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        adj[b].append(a)
    dist = [-1] * (n + 1)
    dist[1] = 0
    q = [1]
    for v in q:
        nd = dist[v] + 1
        for w in adj[v]:
            if dist[w] < 0:
                dist[w] = nd
                q.append(w)
    print(' '.join(map(str, dist[1:])))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); g[b].push_back(a); }
    vector<int> dist(n + 1, -1);
    deque<int> q; dist[1] = 0; q.push_back(1);
    while (!q.empty()) {
        int v = q.front(); q.pop_front();
        for (int w : g[v]) if (dist[w] == -1) { dist[w] = dist[v] + 1; q.push_back(w); }
    }
    string out;
    for (int i = 1; i <= n; i++) { out += to_string(dist[i]); out += (i == n ? '\n' : ' '); }
    cout << out;
}
''',
    ),
    dict(
        id='subtree-sizes',
        title='Subtree sizes in a rooted tree',
        difficulty='easy',
        tags=['trees', 'dfs'],
        statement='A company has n employees numbered from 1 to n. Employee 1 is the director and has no manager; every other employee i has exactly one manager p_i, and following managers upwards from anyone always ends at the director. In other words, the employees form a tree rooted at vertex 1.\n\nFor every employee, count how many people are in their team: the employee themself plus everyone who reports to them directly or indirectly.\n\nConstraints: 1 ≤ n ≤ 10^5, 1 ≤ p_i ≤ n.',
        input_format='The first line has n. The second line has n − 1 integers p_2, p_3, …, p_n (the line is empty when n = 1).',
        output_format='One line with n integers: the team sizes of employees 1, 2, …, n.',
        samples=['6\n1 1 2 2 3\n', '4\n3 4 1\n'],
        gen=g_subtree,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    par = [0, 0] + [int(x) for x in d[1:n]]
    ch = [[] for _ in range(n + 1)]
    for i in range(2, n + 1):
        ch[par[i]].append(i)
    order = [1]
    for v in order:
        order.extend(ch[v])
    sz = [1] * (n + 1)
    for v in reversed(order):
        if v != 1:
            sz[par[v]] += sz[v]
    print(' '.join(map(str, sz[1:])))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<int> par(n + 1, 0);
    vector<vector<int>> ch(n + 1);
    for (int i = 2; i <= n; i++) { cin >> par[i]; ch[par[i]].push_back(i); }
    vector<int> sz(n + 1, 1), st = {1}, post;
    post.reserve(n);
    while (!st.empty()) {
        int v = st.back(); st.pop_back(); post.push_back(v);
        for (int c : ch[v]) st.push_back(c);
    }
    for (int i = n - 1; i >= 0; i--) { int v = post[i]; if (v != 1) sz[par[v]] += sz[v]; }
    for (int i = 1; i <= n; i++) cout << sz[i] << (i == n ? '\n' : ' ');
}
''',
    ),

    # ============================================================ medium
    dict(
        id='two-teams-bipartite',
        title='Splitting rivals into two teams',
        difficulty='medium',
        tags=['graphs', 'bfs', 'bipartite'],
        statement='n players, numbered from 1 to n, must be split into two teams, A and B. Every player joins exactly one team, and a team may be empty. There are m rival pairs, and the two players of a rival pair must end up on different teams.\n\nIf no valid split exists, report it. Otherwise, among all valid splits, find the largest possible size of team A.\n\nNo pair is listed twice, and no player is their own rival. The rivalry graph need not be connected.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n, u ≠ v.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, a rival pair.',
        output_format='One integer: the largest possible size of team A, or -1 if the players cannot be split.',
        samples=['6 4\n1 2\n2 3\n3 4\n5 6\n', '3 3\n1 2\n2 3\n3 1\n'],
        gen=g_teams,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        adj[b].append(a)
    color = [-1] * (n + 1)
    total = 0
    for s in range(1, n + 1):
        if color[s] >= 0:
            continue
        color[s] = 0
        cnt = [1, 0]
        q = [s]
        for v in q:
            cv = color[v]
            for w in adj[v]:
                if color[w] < 0:
                    color[w] = cv ^ 1
                    cnt[cv ^ 1] += 1
                    q.append(w)
                elif color[w] == cv:
                    print(-1)
                    return
        total += max(cnt)
    print(total)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
// dsu with parity: par[x] relates x to its root
vector<int> p, par_, sz0, sz1;
pair<int,int> find(int x) {
    int parity = 0, r = x;
    vector<int> path;
    while (p[r] != r) { path.push_back(r); r = p[r]; }
    // compress: each node on the path ends up storing its parity to the root
    int acc = 0;
    vector<int> pr(path.size());
    for (int i = (int)path.size() - 1; i >= 0; i--) { acc ^= par_[path[i]]; pr[i] = acc; }
    for (size_t i = 0; i < path.size(); i++) { p[path[i]] = r; par_[path[i]] = pr[i]; }
    parity = path.empty() ? 0 : pr[0];
    return {r, parity};
}
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    p.resize(n + 1); par_.assign(n + 1, 0); sz0.assign(n + 1, 1); sz1.assign(n + 1, 0);
    iota(p.begin(), p.end(), 0);
    bool ok = true;
    for (int i = 0; i < m; i++) {
        int a, b; cin >> a >> b;
        if (!ok) continue;
        auto [ra, pa] = find(a);
        auto [rb, pb] = find(b);
        if (ra == rb) { if (pa == pb) ok = false; continue; }
        // attach rb under ra with parity so that a and b differ
        int x = pa ^ pb ^ 1;
        p[rb] = ra; par_[rb] = x;
        if (x == 0) { sz0[ra] += sz0[rb]; sz1[ra] += sz1[rb]; }
        else { sz0[ra] += sz1[rb]; sz1[ra] += sz0[rb]; }
    }
    if (!ok) { cout << -1 << "\n"; return 0; }
    long long total = 0;
    for (int v = 1; v <= n; v++) if (p[v] == v) total += max(sz0[v], sz1[v]);
    cout << total << "\n";
}
''',
    ),
    dict(
        id='directed-cycle-detection',
        title='Detecting a cycle in a directed graph',
        difficulty='medium',
        tags=['graphs', 'dfs', 'topological-sort'],
        statement='A build system has n modules numbered from 1 to n and m dependency arrows. An arrow u v means that module u must be built before module v. The build is impossible if the arrows contain a directed cycle, that is, if some module (directly or through other modules) must be built before itself.\n\nDecide whether the directed graph contains a cycle. Arrows may repeat, and an arrow u u is a cycle on its own.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, an arrow from u to v.',
        output_format='YES if the graph contains a directed cycle, otherwise NO.',
        samples=['4 4\n1 2\n2 3\n3 4\n1 3\n', '3 3\n1 2\n2 3\n3 1\n'],
        gen=g_dcycle,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        indeg[b] += 1
    q = [v for v in range(1, n + 1) if indeg[v] == 0]
    for v in q:
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                q.append(w)
    print('YES' if len(q) < n else 'NO')
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); }
    vector<int> col(n + 1, 0), it(n + 1, 0), st;
    bool cyc = false;
    for (int s = 1; s <= n && !cyc; s++) {
        if (col[s]) continue;
        col[s] = 1; st.push_back(s);
        while (!st.empty() && !cyc) {
            int v = st.back();
            if (it[v] < (int)g[v].size()) {
                int w = g[v][it[v]++];
                if (col[w] == 1) cyc = true;
                else if (col[w] == 0) { col[w] = 1; st.push_back(w); }
            } else { col[v] = 2; st.pop_back(); }
        }
    }
    cout << (cyc ? "YES" : "NO") << "\n";
}
''',
    ),
    dict(
        id='topological-order-smallest',
        title='Smallest order of tasks with prerequisites',
        difficulty='medium',
        tags=['graphs', 'topological-sort', 'heaps'],
        statement='There are n tasks numbered from 1 to n and m requirements. A requirement u v means task u must be done before task v. You must do every task exactly once, in some order that respects all requirements.\n\nAmong all valid orders, print the lexicographically smallest one: the order whose first task is as small as possible, then whose second task is as small as possible, and so on. If no valid order exists, print -1.\n\nRequirements may repeat, and a requirement u u can never be satisfied.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v.',
        output_format='One line with n integers, the lexicographically smallest valid order, or the single integer -1.',
        samples=['5 4\n3 1\n2 1\n5 4\n3 4\n', '3 3\n1 2\n2 3\n3 2\n'],
        gen=g_topo,
        py='''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        indeg[b] += 1
    h = [v for v in range(1, n + 1) if indeg[v] == 0]
    heapq.heapify(h)
    out = []
    while h:
        v = heapq.heappop(h)
        out.append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                heapq.heappush(h, w)
    print(' '.join(map(str, out)) if len(out) == n else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    vector<int> indeg(n + 1, 0);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); indeg[b]++; }
    set<int> ready;
    for (int v = 1; v <= n; v++) if (!indeg[v]) ready.insert(v);
    vector<int> out;
    while (!ready.empty()) {
        int v = *ready.begin(); ready.erase(ready.begin());
        out.push_back(v);
        for (int w : g[v]) if (--indeg[w] == 0) ready.insert(w);
    }
    if ((int)out.size() != n) { cout << -1 << "\n"; return 0; }
    for (int i = 0; i < n; i++) cout << out[i] << (i + 1 == n ? '\n' : ' ');
}
''',
    ),
    dict(
        id='dijkstra-weighted-distances',
        title='Shortest paths in a weighted road network',
        difficulty='medium',
        tags=['graphs', 'shortest-paths', 'dijkstra'],
        statement='A road network has n junctions numbered from 1 to n and m two-way roads. Road i joins junctions u_i and v_i and has length w_i. For every junction, find the length of the shortest route from junction 1 to it.\n\nThe network need not be connected. Several roads may join the same pair of junctions, and a road may start and end at the same junction.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 5·10^4, 1 ≤ u_i, v_i ≤ n, 1 ≤ w_i ≤ 10^9.',
        input_format='The first line has n and m. Each of the next m lines has three integers u_i, v_i and w_i.',
        output_format='One line with n integers: the shortest distance from junction 1 to junctions 1, 2, …, n, or -1 for a junction that cannot be reached.',
        samples=['5 6\n1 2 4\n1 3 1\n3 2 2\n2 4 5\n3 4 8\n4 4 1\n'],
        gen=g_dijkstra,
        py='''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b, w = int(d[2 + 3 * i]), int(d[3 + 3 * i]), int(d[4 + 3 * i])
        adj[a].append((b, w))
        adj[b].append((a, w))
    INF = 1 << 62
    dist = [INF] * (n + 1)
    dist[1] = 0
    h = [(0, 1)]
    while h:
        du, u = heapq.heappop(h)
        if du > dist[u]:
            continue
        for v, w in adj[u]:
            nd = du + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(h, (nd, v))
    print(' '.join(str(x) if x < INF else '-1' for x in dist[1:]))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,ll>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; ll w; cin >> a >> b >> w; g[a].push_back({b, w}); g[b].push_back({a, w}); }
    const ll INF = LLONG_MAX / 4;
    vector<ll> dist(n + 1, INF);
    priority_queue<pair<ll,int>, vector<pair<ll,int>>, greater<>> pq;
    dist[1] = 0; pq.push({0, 1});
    while (!pq.empty()) {
        auto [du, u] = pq.top(); pq.pop();
        if (du != dist[u]) continue;
        for (auto [v, w] : g[u]) if (du + w < dist[v]) { dist[v] = du + w; pq.push({dist[v], v}); }
    }
    for (int i = 1; i <= n; i++) cout << (dist[i] == INF ? -1 : dist[i]) << (i == n ? '\n' : ' ');
}
''',
    ),
    dict(
        id='break-walls-zero-one-bfs',
        title='Clearing rubble on the way out',
        difficulty='medium',
        tags=['graphs', 'grid', '0-1-bfs'],
        statement='After an earthquake, a building floor is an r × c grid. A cell is either clear (.) or full of rubble (#). You start in the top-left cell and want to reach the bottom-right cell, moving each step to a cell that shares a side with your current one. You may walk through rubble, but every rubble cell on your route has to be cleared first, which takes effort.\n\nFind the minimum number of rubble cells your route must pass through. The start and finish cells count too if they hold rubble.\n\nConstraints: 1 ≤ r, c ≤ 500.',
        input_format='The first line has r and c. Each of the next r lines is a string of c characters, each . or #.',
        output_format='One integer, the minimum number of rubble cells on a route from the top-left to the bottom-right cell.',
        samples=['3 4\n.#..\n.##.\n##..\n', '1 1\n#\n'],
        gen=g_walls,
        py='''import sys
from collections import deque
def main():
    d = sys.stdin.buffer.read().split()
    r, c = int(d[0]), int(d[1])
    g = b''.join(d[2:2 + r])
    N = r * c
    INF = 1 << 30
    dist = [INF] * N
    done = bytearray(N)
    dist[0] = 1 if g[0] == 35 else 0
    dq = deque([0])
    while dq:
        x = dq.popleft()
        if done[x]:
            continue
        done[x] = 1
        dx = dist[x]
        j = x % c
        nbs = []
        if j: nbs.append(x - 1)
        if j + 1 < c: nbs.append(x + 1)
        if x >= c: nbs.append(x - c)
        if x + c < N: nbs.append(x + c)
        for y in nbs:
            if g[y] == 35:
                if dx + 1 < dist[y]:
                    dist[y] = dx + 1
                    dq.append(y)
            elif dx < dist[y]:
                dist[y] = dx
                dq.appendleft(y)
    print(dist[N - 1])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int r, c; cin >> r >> c;
    vector<string> g(r);
    for (auto &s : g) cin >> s;
    const int INF = INT_MAX;
    vector<vector<int>> dist(r, vector<int>(c, INF));
    deque<pair<int,int>> dq;
    dist[0][0] = g[0][0] == '#';
    dq.push_back({0, 0});
    const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    while (!dq.empty()) {
        auto [x, y] = dq.front(); dq.pop_front();
        for (int k = 0; k < 4; k++) {
            int nx = x + dx[k], ny = y + dy[k];
            if (nx < 0 || ny < 0 || nx >= r || ny >= c) continue;
            int w = g[nx][ny] == '#';
            if (dist[x][y] + w < dist[nx][ny]) {
                dist[nx][ny] = dist[x][y] + w;
                if (w) dq.push_back({nx, ny}); else dq.push_front({nx, ny});
            }
        }
    }
    cout << dist[r - 1][c - 1] << "\n";
}
''',
    ),
    dict(
        id='dsu-friend-groups',
        title='Merging friend groups',
        difficulty='medium',
        tags=['dsu', 'graphs'],
        statement='n people, numbered from 1 to n, start out as strangers, each forming a group of one. Process q operations in order:\n\n1 a b: the groups of a and b merge into one group (nothing happens if they are already in the same group).\n2 a b: report whether a and b are currently in the same group.\n3 a: report the number of people in the group of a.\n\nAt least one operation is of type 2 or 3.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 1 ≤ q ≤ 10^5, 1 ≤ a, b ≤ n.',
        input_format='The first line has n and q. Each of the next q lines is an operation in one of the three forms above.',
        output_format='For every operation of type 2, print YES or NO on its own line. For every operation of type 3, print the group size on its own line. Answers appear in the order of the operations.',
        samples=['5 7\n1 1 2\n2 1 3\n1 3 2\n2 1 3\n3 2\n3 5\n1 4 5\n'],
        gen=g_dsu,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    p = list(range(n + 1))
    sz = [1] * (n + 1)
    def find(x):
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x
    out = []
    i = 2
    for _ in range(q):
        t = d[i]
        if t == b'3':
            out.append(str(sz[find(int(d[i + 1]))]))
            i += 2
            continue
        a, b = find(int(d[i + 1])), find(int(d[i + 2]))
        i += 3
        if t == b'1':
            if a != b:
                if sz[a] < sz[b]:
                    a, b = b, a
                p[b] = a
                sz[a] += sz[b]
        else:
            out.append('YES' if a == b else 'NO')
    print('\\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
vector<int> par;
int find(int x) { return par[x] < 0 ? x : par[x] = find(par[x]); }
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    par.assign(n + 1, -1);
    string out;
    while (q--) {
        int t, a; cin >> t >> a;
        if (t == 3) { out += to_string(-par[find(a)]); out += '\n'; continue; }
        int b; cin >> b;
        a = find(a); b = find(b);
        if (t == 1) {
            if (a != b) { if (par[a] > par[b]) swap(a, b); par[a] += par[b]; par[b] = a; }
        } else out += (a == b ? "YES\n" : "NO\n");
    }
    cout << out;
}
''',
    ),
    dict(
        id='minimum-spanning-tree-weight',
        title='Cheapest network of cables',
        difficulty='medium',
        tags=['graphs', 'mst', 'dsu'],
        statement='n computers, numbered from 1 to n, must all be linked into one network. There are m possible cables; cable i would link computers u_i and v_i directly and costs w_i. Data may travel through intermediate computers, so the network only needs every computer to be reachable from every other.\n\nFind the minimum total cost of a set of cables that connects all n computers, or report that it is impossible. Several cables may join the same pair, and a cable may join a computer to itself.\n\nConstraints: 1 ≤ n ≤ 2·10^4, 0 ≤ m ≤ 5·10^4, 1 ≤ u_i, v_i ≤ n, 1 ≤ w_i ≤ 10^9.',
        input_format='The first line has n and m. Each of the next m lines has three integers u_i, v_i and w_i.',
        output_format='One integer, the minimum total cost, or -1 if the computers cannot all be connected.',
        samples=['4 5\n1 2 3\n2 3 1\n3 4 4\n1 4 2\n1 3 5\n', '3 1\n1 2 7\n'],
        gen=g_mst,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    edges = sorted((int(d[4 + 3 * i]), int(d[2 + 3 * i]), int(d[3 + 3 * i])) for i in range(m))
    p = list(range(n + 1))
    def find(x):
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x
    total, used = 0, 0
    for w, a, b in edges:
        a, b = find(a), find(b)
        if a != b:
            p[a] = b
            total += w
            used += 1
            if used == n - 1:
                break
    print(total if used == n - 1 else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,ll>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; ll w; cin >> a >> b >> w; g[a].push_back({b, w}); g[b].push_back({a, w}); }
    vector<char> in(n + 1, 0);
    priority_queue<pair<ll,int>, vector<pair<ll,int>>, greater<>> pq;
    pq.push({0, 1});
    ll total = 0; int cnt = 0;
    while (!pq.empty()) {
        auto [w, v] = pq.top(); pq.pop();
        if (in[v]) continue;
        in[v] = 1; total += w; cnt++;
        for (auto [u, c] : g[v]) if (!in[u]) pq.push({c, u});
    }
    cout << (cnt == n ? total : -1) << "\n";
}
''',
    ),
    dict(
        id='weighted-tree-diameter',
        title='Longest path in a weighted tree',
        difficulty='medium',
        tags=['trees', 'dfs', 'diameter'],
        statement='A hiking park has n huts numbered from 1 to n, joined by n − 1 two-way trails so that every hut can be reached from every other in exactly one way; the huts and trails form a tree. Trail i has length w_i.\n\nFind the largest distance between two huts, where the distance is the total length of the trails on the path between them. If n = 1, the answer is 0.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 1 ≤ w_i ≤ 10^9.',
        input_format='The first line has n. Each of the next n − 1 lines has three integers u, v and w: a trail of length w between huts u and v.',
        output_format='One integer, the largest distance between two huts.',
        samples=['5\n1 2 3\n2 3 4\n2 4 6\n4 5 1\n', '1\n'],
        gen=g_diameter,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    adj = [[] for _ in range(n + 1)]
    for i in range(n - 1):
        a, b, w = int(d[1 + 3 * i]), int(d[2 + 3 * i]), int(d[3 + 3 * i])
        adj[a].append((b, w))
        adj[b].append((a, w))
    def far(s):
        dist = [-1] * (n + 1)
        dist[s] = 0
        st = [s]
        while st:
            v = st.pop()
            dv = dist[v]
            for w, c in adj[v]:
                if dist[w] < 0:
                    dist[w] = dv + c
                    st.append(w)
        best = max(range(1, n + 1), key=dist.__getitem__)
        return best, dist[best]
    a, _ = far(1)
    _, ans = far(a)
    print(ans)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<vector<pair<int,ll>>> g(n + 1);
    for (int i = 0; i < n - 1; i++) { int a, b; ll w; cin >> a >> b >> w; g[a].push_back({b, w}); g[b].push_back({a, w}); }
    vector<int> order, par(n + 1, 0);
    order.reserve(n); order.push_back(1); par[1] = -1;
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (auto [u, w] : g[v]) if (u != par[v]) { par[u] = v; order.push_back(u); }
    }
    vector<ll> down(n + 1, 0);
    ll best = 0;
    for (int i = n - 1; i >= 0; i--) {
        int v = order[i];
        ll a = 0, b = 0;
        for (auto [u, w] : g[v]) if (u != par[v]) {
            ll x = down[u] + w;
            if (x > a) { b = a; a = x; } else if (x > b) b = x;
        }
        down[v] = a;
        best = max(best, a + b);
    }
    cout << best << "\n";
}
''',
    ),
    dict(
        id='all-pairs-floyd-warshall',
        title='All-pairs travel times',
        difficulty='medium',
        tags=['graphs', 'shortest-paths', 'floyd-warshall'],
        statement='A small airline serves n cities numbered from 1 to n with m one-way flights. Flight i goes from city u_i to city v_i and takes w_i minutes. Layovers are free. Answer q questions: what is the minimum total flight time from city a to city b?\n\nThe time from a city to itself is 0. Several flights may connect the same pair of cities, and a flight may start and end in the same city.\n\nConstraints: 1 ≤ n ≤ 150, 0 ≤ m ≤ 10^4, 1 ≤ q ≤ 10^4, 1 ≤ u_i, v_i, a, b ≤ n, 1 ≤ w_i ≤ 10^6.',
        input_format='The first line has n, m and q. Each of the next m lines has three integers u_i, v_i and w_i. Each of the next q lines has two integers a and b.',
        output_format='For each question, print on its own line the minimum time from a to b, or -1 if b cannot be reached from a.',
        samples=['4 5 4\n1 2 5\n2 3 2\n1 3 9\n3 1 1\n4 4 3\n1 3\n3 2\n2 4\n4 4\n'],
        gen=g_floyd,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m, q = int(d[0]), int(d[1]), int(d[2])
    INF = 1 << 60
    dd = [[INF] * n for _ in range(n)]
    for i in range(n):
        dd[i][i] = 0
    p = 3
    for _ in range(m):
        a, b, w = int(d[p]) - 1, int(d[p + 1]) - 1, int(d[p + 2])
        p += 3
        if w < dd[a][b]:
            dd[a][b] = w
    for k in range(n):
        dk = dd[k]
        for i in range(n):
            di = dd[i]
            dik = di[k]
            if dik == INF:
                continue
            dd[i] = [x if x <= dik + y else dik + y for x, y in zip(di, dk)]
    out = []
    for _ in range(q):
        a, b = int(d[p]) - 1, int(d[p + 1]) - 1
        p += 2
        x = dd[a][b]
        out.append(str(x) if x < INF else '-1')
    print('\\n'.join(out))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m, q; cin >> n >> m >> q;
    const ll INF = LLONG_MAX / 4;
    vector<vector<ll>> d(n + 1, vector<ll>(n + 1, INF));
    for (int i = 1; i <= n; i++) d[i][i] = 0;
    for (int i = 0; i < m; i++) { int a, b; ll w; cin >> a >> b >> w; d[a][b] = min(d[a][b], w); }
    for (int k = 1; k <= n; k++)
        for (int i = 1; i <= n; i++) {
            if (d[i][k] == INF) continue;
            for (int j = 1; j <= n; j++)
                if (d[k][j] != INF && d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
        }
    string out;
    while (q--) {
        int a, b; cin >> a >> b;
        out += to_string(d[a][b] == INF ? -1 : d[a][b]); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='multi-source-bfs-stations',
        title='Distance to the nearest fire station',
        difficulty='medium',
        tags=['graphs', 'bfs', 'multi-source'],
        statement='A city has n intersections numbered from 1 to n and m two-way streets, each of length 1. Fire stations stand at k distinct intersections. For every intersection, find the distance to the nearest fire station along the streets.\n\nThe street graph need not be connected, and it may contain repeated streets and streets that start and end at the same intersection.\n\nConstraints: 1 ≤ k ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n, m and k. The second line has k distinct integers, the intersections with fire stations. Each of the next m lines has two integers u and v, a street between u and v.',
        output_format='One line with n integers: for intersections 1, 2, …, n, the distance to the nearest fire station, or -1 if no station can be reached.',
        samples=['7 6 2\n2 6\n1 2\n2 3\n3 4\n4 5\n6 5\n7 7\n'],
        gen=g_stations,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m, k = int(d[0]), int(d[1]), int(d[2])
    st = [int(x) for x in d[3:3 + k]]
    adj = [[] for _ in range(n + 1)]
    p = 3 + k
    for i in range(m):
        a, b = int(d[p + 2 * i]), int(d[p + 2 * i + 1])
        adj[a].append(b)
        adj[b].append(a)
    dist = [-1] * (n + 1)
    for s in st:
        dist[s] = 0
    q = st[:]
    for v in q:
        nd = dist[v] + 1
        for w in adj[v]:
            if dist[w] < 0:
                dist[w] = nd
                q.append(w)
    print(' '.join(map(str, dist[1:])))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m, k; cin >> n >> m >> k;
    vector<int> dist(n + 1, -1);
    queue<int> q;
    for (int i = 0; i < k; i++) { int s; cin >> s; dist[s] = 0; q.push(s); }
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); g[b].push_back(a); }
    while (!q.empty()) {
        int v = q.front(); q.pop();
        for (int w : g[v]) if (dist[w] == -1) { dist[w] = dist[v] + 1; q.push(w); }
    }
    for (int i = 1; i <= n; i++) cout << dist[i] << (i == n ? '\n' : ' ');
}
''',
    ),
    dict(
        id='minimum-semesters-dag',
        title='Minimum number of semesters',
        difficulty='medium',
        tags=['graphs', 'topological-sort', 'dag'],
        statement='A degree has n courses numbered from 1 to n and m prerequisite rules. A rule u v means course u must be passed in a strictly earlier semester than course v. In one semester a student may take any number of courses whose prerequisites were all passed in earlier semesters.\n\nFind the minimum number of semesters needed to pass all n courses, or report that it is impossible because the rules contain a cycle. Rules may repeat, and a rule u u can never be satisfied.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v.',
        output_format='One integer, the minimum number of semesters, or -1 if the courses cannot all be passed.',
        samples=['6 5\n1 3\n2 3\n3 4\n2 5\n5 4\n', '2 2\n1 2\n2 1\n'],
        gen=g_semesters,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    indeg = [0] * (n + 1)
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        indeg[b] += 1
    cur = [v for v in range(1, n + 1) if indeg[v] == 0]
    sem, done = 0, 0
    while cur:
        sem += 1
        done += len(cur)
        nxt = []
        for v in cur:
            for w in adj[v]:
                indeg[w] -= 1
                if indeg[w] == 0:
                    nxt.append(w)
        cur = nxt
    print(sem if done == n else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1);
    vector<int> indeg(n + 1, 0), level(n + 1, 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); indeg[b]++; }
    queue<int> q;
    for (int v = 1; v <= n; v++) if (!indeg[v]) q.push(v);
    int seen = 0, best = 0;
    while (!q.empty()) {
        int v = q.front(); q.pop(); seen++;
        best = max(best, level[v]);
        for (int w : g[v]) { level[w] = max(level[w], level[v] + 1); if (--indeg[w] == 0) q.push(w); }
    }
    cout << (seen == n ? best : -1) << "\n";
}
''',
    ),

    # ============================================================ hard
    dict(
        id='bellman-ford-negative-cycle',
        title='Shortest paths with negative edges',
        difficulty='hard',
        tags=['graphs', 'shortest-paths', 'bellman-ford'],
        statement='A directed graph has n vertices numbered from 1 to n and m edges. Edge i goes from u_i to v_i and has weight w_i, which may be negative. Find the shortest distance from vertex 1 to every vertex.\n\nIf some cycle of negative total weight can be reached from vertex 1, shortest distances are not well defined: print NEGATIVE CYCLE instead. A negative cycle that vertex 1 cannot reach does not matter.\n\nThe graph may contain repeated edges and self-loops (a self-loop of negative weight is a negative cycle).\n\nConstraints: 1 ≤ n ≤ 400, 0 ≤ m ≤ 4000, 1 ≤ u_i, v_i ≤ n, -10^4 ≤ w_i ≤ 10^4.',
        input_format='The first line has n and m. Each of the next m lines has three integers u_i, v_i and w_i.',
        output_format='Either the line NEGATIVE CYCLE, or one line with n values: the shortest distance from vertex 1 to vertices 1, 2, …, n, writing INF for a vertex that cannot be reached.',
        samples=['5 5\n1 2 4\n1 3 7\n2 3 -5\n3 4 2\n5 1 1\n', '3 4\n1 2 1\n2 3 -2\n3 2 1\n1 3 5\n'],
        gen=g_bellman,
        time_limit_ms=2000,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    E = [(int(d[2 + 3 * i]), int(d[3 + 3 * i]), int(d[4 + 3 * i])) for i in range(m)]
    INF = 1 << 62
    dist = [INF] * (n + 1)
    dist[1] = 0
    for _ in range(n):
        changed = False
        for u, v, w in E:
            du = dist[u]
            if du != INF and du + w < dist[v]:
                dist[v] = du + w
                changed = True
        if not changed:
            break
    else:
        print('NEGATIVE CYCLE')
        return
    print(' '.join(str(x) if x != INF else 'INF' for x in dist[1:]))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<array<ll,3>> e(m);
    for (auto &x : e) cin >> x[0] >> x[1] >> x[2];
    const ll INF = LLONG_MAX / 4;
    vector<ll> dist(n + 1, INF);
    dist[1] = 0;
    for (int it = 0; it < n - 1; it++) {
        bool ch = false;
        for (auto &x : e) if (dist[x[0]] != INF && dist[x[0]] + x[2] < dist[x[1]]) { dist[x[1]] = dist[x[0]] + x[2]; ch = true; }
        if (!ch) break;
    }
    for (auto &x : e) if (dist[x[0]] != INF && dist[x[0]] + x[2] < dist[x[1]]) { cout << "NEGATIVE CYCLE\n"; return 0; }
    for (int i = 1; i <= n; i++) {
        if (dist[i] == INF) cout << "INF"; else cout << dist[i];
        cout << (i == n ? '\n' : ' ');
    }
}
''',
    ),
    dict(
        id='count-bridges',
        title='Counting critical cables',
        difficulty='hard',
        tags=['graphs', 'dfs', 'bridges'],
        statement='A network has n routers numbered from 1 to n and m two-way cables. A cable is critical if cutting it increases the number of connected groups of routers, that is, if it is a bridge of the undirected graph. Count the critical cables.\n\nThe network need not be connected. There are no repeated cables and no cable joins a router to itself.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n, u ≠ v.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, a cable between u and v.',
        output_format='One integer, the number of bridges.',
        samples=['7 7\n1 2\n2 3\n3 1\n3 4\n4 5\n5 6\n6 4\n', '4 2\n1 2\n3 4\n'],
        gen=g_bridges,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adjv = [[] for _ in range(n + 1)]
    adje = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adjv[a].append(b); adje[a].append(i)
        adjv[b].append(a); adje[b].append(i)
    tin = [0] * (n + 1)
    low = [0] * (n + 1)
    pe = [-1] * (n + 1)
    it = [0] * (n + 1)
    timer = 1
    bridges = 0
    for s in range(1, n + 1):
        if tin[s]:
            continue
        tin[s] = low[s] = timer
        timer += 1
        st = [s]
        while st:
            v = st[-1]
            i = it[v]
            if i < len(adjv[v]):
                it[v] = i + 1
                if adje[v][i] == pe[v]:
                    continue
                to = adjv[v][i]
                if tin[to]:
                    if tin[to] < low[v]:
                        low[v] = tin[to]
                else:
                    tin[to] = low[to] = timer
                    timer += 1
                    pe[to] = adje[v][i]
                    st.append(to)
            else:
                st.pop()
                if st:
                    p = st[-1]
                    if low[v] < low[p]:
                        low[p] = low[v]
                    if low[v] > tin[p]:
                        bridges += 1
    print(bridges)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,int>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back({b, i}); g[b].push_back({a, i}); }
    vector<int> tin(n + 1, 0), low(n + 1, 0), pe(n + 1, -1), it(n + 1, 0), st;
    int timer = 0, br = 0;
    for (int s = 1; s <= n; s++) {
        if (tin[s]) continue;
        tin[s] = low[s] = ++timer; st.push_back(s);
        while (!st.empty()) {
            int v = st.back();
            if (it[v] < (int)g[v].size()) {
                auto [to, id] = g[v][it[v]++];
                if (id == pe[v]) continue;
                if (tin[to]) low[v] = min(low[v], tin[to]);
                else { tin[to] = low[to] = ++timer; pe[to] = id; st.push_back(to); }
            } else {
                st.pop_back();
                if (!st.empty()) { int p = st.back(); low[p] = min(low[p], low[v]); if (low[v] > tin[p]) br++; }
            }
        }
    }
    cout << br << "\n";
}
''',
    ),
    dict(
        id='count-articulation-points',
        title='Counting critical junctions',
        difficulty='hard',
        tags=['graphs', 'dfs', 'articulation-points'],
        statement='A road map has n junctions numbered from 1 to n and m two-way roads. A junction is critical if closing it, together with every road that touches it, increases the number of connected groups among the remaining junctions; such a junction is an articulation point of the undirected graph. Count the critical junctions.\n\nThe map need not be connected. There are no repeated roads and no road joins a junction to itself.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n, u ≠ v.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, a road between u and v.',
        output_format='One integer, the number of articulation points.',
        samples=['7 7\n1 2\n2 3\n3 1\n3 4\n4 5\n5 6\n6 4\n', '5 4\n1 2\n1 3\n1 4\n1 5\n'],
        gen=g_articulation,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b = int(d[2 + 2 * i]), int(d[3 + 2 * i])
        adj[a].append(b)
        adj[b].append(a)
    tin = [0] * (n + 1)
    low = [0] * (n + 1)
    par = [0] * (n + 1)
    it = [0] * (n + 1)
    ap = bytearray(n + 1)
    timer = 1
    for s in range(1, n + 1):
        if tin[s]:
            continue
        tin[s] = low[s] = timer
        timer += 1
        kids = 0
        st = [s]
        while st:
            v = st[-1]
            i = it[v]
            if i < len(adj[v]):
                it[v] = i + 1
                to = adj[v][i]
                if to == par[v]:
                    continue
                if tin[to]:
                    if tin[to] < low[v]:
                        low[v] = tin[to]
                else:
                    tin[to] = low[to] = timer
                    timer += 1
                    par[to] = v
                    st.append(to)
            else:
                st.pop()
                if st:
                    p = st[-1]
                    if low[v] < low[p]:
                        low[p] = low[v]
                    if p == s:
                        kids += 1
                    elif low[v] >= tin[p]:
                        ap[p] = 1
        if kids >= 2:
            ap[s] = 1
    print(sum(ap))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,int>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back({b, i}); g[b].push_back({a, i}); }
    vector<int> tin(n + 1, 0), low(n + 1, 0), pe(n + 1, -1), it(n + 1, 0), st;
    vector<char> ap(n + 1, 0);
    int timer = 0;
    for (int s = 1; s <= n; s++) {
        if (tin[s]) continue;
        tin[s] = low[s] = ++timer; st.push_back(s);
        int kids = 0;
        while (!st.empty()) {
            int v = st.back();
            if (it[v] < (int)g[v].size()) {
                auto [to, id] = g[v][it[v]++];
                if (id == pe[v]) continue;
                if (tin[to]) low[v] = min(low[v], tin[to]);
                else { tin[to] = low[to] = ++timer; pe[to] = id; st.push_back(to); }
            } else {
                st.pop_back();
                if (!st.empty()) {
                    int p = st.back();
                    low[p] = min(low[p], low[v]);
                    if (p == s) kids++;
                    else if (low[v] >= tin[p]) ap[p] = 1;
                }
            }
        }
        if (kids >= 2) ap[s] = 1;
    }
    cout << count(ap.begin(), ap.end(), 1) << "\n";
}
''',
    ),
    dict(
        id='strongly-connected-components',
        title='Strongly connected districts',
        difficulty='hard',
        tags=['graphs', 'scc', 'dfs'],
        statement='A city has n squares numbered from 1 to n and m one-way streets. Two squares belong to the same district if each can be reached from the other by following streets in their direction; the districts are the strongly connected components of the directed graph.\n\nPrint the number of districts and the number of squares in the largest district.\n\nStreets may repeat, and a street may start and end at the same square.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and m. Each of the next m lines has two integers u and v, a street from u to v.',
        output_format='Two integers: the number of strongly connected components and the size of the largest one.',
        samples=['6 7\n1 2\n2 3\n3 1\n3 4\n4 5\n5 4\n6 5\n'],
        gen=g_scc,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        adj[int(d[2 + 2 * i])].append(int(d[3 + 2 * i]))
    idx = [0] * (n + 1)
    low = [0] * (n + 1)
    onst = bytearray(n + 1)
    it = [0] * (n + 1)
    stk = []
    c = 1
    comps, best = 0, 0
    for s in range(1, n + 1):
        if idx[s]:
            continue
        idx[s] = low[s] = c
        c += 1
        stk.append(s); onst[s] = 1
        call = [s]
        while call:
            v = call[-1]
            i = it[v]
            if i < len(adj[v]):
                it[v] = i + 1
                w = adj[v][i]
                if not idx[w]:
                    idx[w] = low[w] = c
                    c += 1
                    stk.append(w); onst[w] = 1
                    call.append(w)
                elif onst[w] and idx[w] < low[v]:
                    low[v] = idx[w]
            else:
                call.pop()
                if call:
                    u = call[-1]
                    if low[v] < low[u]:
                        low[u] = low[v]
                if low[v] == idx[v]:
                    size = 0
                    while True:
                        w = stk.pop()
                        onst[w] = 0
                        size += 1
                        if w == v:
                            break
                    comps += 1
                    if size > best:
                        best = size
    print(comps, best)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<int>> g(n + 1), rg(n + 1);
    for (int i = 0; i < m; i++) { int a, b; cin >> a >> b; g[a].push_back(b); rg[b].push_back(a); }
    vector<char> vis(n + 1, 0);
    vector<int> it(n + 1, 0), order, st;
    order.reserve(n);
    for (int s = 1; s <= n; s++) {
        if (vis[s]) continue;
        vis[s] = 1; st.push_back(s);
        while (!st.empty()) {
            int v = st.back();
            if (it[v] < (int)g[v].size()) { int w = g[v][it[v]++]; if (!vis[w]) { vis[w] = 1; st.push_back(w); } }
            else { order.push_back(v); st.pop_back(); }
        }
    }
    vector<int> comp(n + 1, -1);
    int comps = 0, best = 0;
    for (int i = n - 1; i >= 0; i--) {
        int s = order[i];
        if (comp[s] != -1) continue;
        int size = 0;
        comp[s] = comps; st.push_back(s);
        while (!st.empty()) {
            int v = st.back(); st.pop_back(); size++;
            for (int w : rg[v]) if (comp[w] == -1) { comp[w] = comps; st.push_back(w); }
        }
        comps++; best = max(best, size);
    }
    cout << comps << " " << best << "\n";
}
''',
    ),
    dict(
        id='tree-distance-queries-lca',
        title='Distance queries on a weighted tree',
        difficulty='hard',
        tags=['trees', 'lca', 'binary-lifting'],
        statement='A railway has n stations numbered from 1 to n and n − 1 two-way tracks, laid so that there is exactly one route between any two stations; the network is a tree. Track i has length w_i. Answer q queries: what is the length of the route between stations u and v? The route from a station to itself has length 0.\n\nConstraints: 1 ≤ n ≤ 4·10^4, 1 ≤ q ≤ 4·10^4, 1 ≤ w_i ≤ 10^6, 1 ≤ u, v ≤ n.',
        input_format='The first line has n and q. Each of the next n − 1 lines has three integers a, b and w: a track of length w between stations a and b. Each of the next q lines has two integers u and v.',
        output_format='For each query, print the distance between u and v on its own line.',
        samples=['6 4\n1 2 3\n1 3 5\n2 4 2\n2 5 7\n3 6 1\n4 5\n4 6\n3 3\n6 1\n'],
        gen=g_lca,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n, q = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    p = 2
    for _ in range(n - 1):
        a, b, w = int(d[p]), int(d[p + 1]), int(d[p + 2])
        p += 3
        adj[a].append((b, w))
        adj[b].append((a, w))
    par = [0] * (n + 1)
    dep = [0] * (n + 1)
    dist = [0] * (n + 1)
    seen = bytearray(n + 1)
    seen[1] = 1
    par[1] = 1
    order = [1]
    for v in order:
        for w, c in adj[v]:
            if not seen[w]:
                seen[w] = 1
                par[w] = v
                dep[w] = dep[v] + 1
                dist[w] = dist[v] + c
                order.append(w)
    LOG = max(1, n.bit_length())
    up = [par]
    for _ in range(1, LOG):
        pr = up[-1]
        up.append([pr[pr[v]] for v in range(n + 1)])
    out = []
    for _ in range(q):
        u, v = int(d[p]), int(d[p + 1])
        p += 2
        a, b = u, v
        if dep[a] < dep[b]:
            a, b = b, a
        diff = dep[a] - dep[b]
        j = 0
        while diff:
            if diff & 1:
                a = up[j][a]
            diff >>= 1
            j += 1
        if a != b:
            for j in range(LOG - 1, -1, -1):
                uj = up[j]
                if uj[a] != uj[b]:
                    a, b = uj[a], uj[b]
            a = par[a]
        out.append(dist[u] + dist[v] - 2 * dist[a])
    print('\\n'.join(map(str, out)))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, q; cin >> n >> q;
    vector<vector<pair<int,int>>> g(n + 1);
    for (int i = 0; i < n - 1; i++) { int a, b, w; cin >> a >> b >> w; g[a].push_back({b, w}); g[b].push_back({a, w}); }
    // euler tour + sparse table on depth
    vector<int> first(n + 1), dep(n + 1, 0), par(n + 1, 0), it(n + 1, 0), euler, st;
    vector<ll> dist(n + 1, 0);
    euler.reserve(2 * n);
    st.push_back(1); first[1] = 0; euler.push_back(1);
    while (!st.empty()) {
        int v = st.back();
        if (it[v] < (int)g[v].size()) {
            auto [to, w] = g[v][it[v]++];
            if (to == par[v]) continue;
            par[to] = v; dep[to] = dep[v] + 1; dist[to] = dist[v] + w;
            first[to] = euler.size(); euler.push_back(to); st.push_back(to);
        } else {
            st.pop_back();
            if (!st.empty()) euler.push_back(st.back());
        }
    }
    int E = euler.size(), K = 1;
    while ((1 << K) <= E) K++;
    vector<vector<int>> sp(K, vector<int>(E));
    sp[0] = euler;
    for (int k = 1; k < K; k++)
        for (int i = 0; i + (1 << k) <= E; i++) {
            int a = sp[k - 1][i], b = sp[k - 1][i + (1 << (k - 1))];
            sp[k][i] = dep[a] < dep[b] ? a : b;
        }
    string out;
    while (q--) {
        int u, v; cin >> u >> v;
        int l = first[u], r = first[v];
        if (l > r) swap(l, r);
        int k = 31 - __builtin_clz(r - l + 1);
        int a = sp[k][l], b = sp[k][r - (1 << k) + 1];
        int lca = dep[a] < dep[b] ? a : b;
        out += to_string(dist[u] + dist[v] - 2 * dist[lca]); out += '\n';
    }
    cout << out;
}
''',
    ),
    dict(
        id='sum-of-distances-rerooting',
        title='Total distance from every vertex',
        difficulty='hard',
        tags=['trees', 'rerooting', 'dp'],
        statement='You are given a tree with n vertices numbered from 1 to n; every edge has length 1. For every vertex v, compute the sum of the distances from v to all other vertices.\n\nConstraints: 1 ≤ n ≤ 5·10^4.',
        input_format='The first line has n. Each of the next n − 1 lines has two integers u and v, an edge of the tree.',
        output_format='One line with n integers: the answers for vertices 1, 2, …, n.',
        samples=['5\n1 2\n1 3\n3 4\n3 5\n', '1\n'],
        gen=g_sumdist,
        py='''import sys
def main():
    d = sys.stdin.buffer.read().split()
    n = int(d[0])
    adj = [[] for _ in range(n + 1)]
    for i in range(n - 1):
        a, b = int(d[1 + 2 * i]), int(d[2 + 2 * i])
        adj[a].append(b)
        adj[b].append(a)
    par = [0] * (n + 1)
    dep = [0] * (n + 1)
    par[1] = -1
    order = [1]
    for v in order:
        for w in adj[v]:
            if w != par[v]:
                par[w] = v
                dep[w] = dep[v] + 1
                order.append(w)
    sz = [1] * (n + 1)
    for v in reversed(order[1:]):
        sz[par[v]] += sz[v]
    ans = [0] * (n + 1)
    ans[1] = sum(dep)
    for v in order[1:]:
        ans[v] = ans[par[v]] + n - 2 * sz[v]
    print(' '.join(map(str, ans[1:])))
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; cin >> n;
    vector<vector<int>> g(n + 1);
    for (int i = 0; i < n - 1; i++) { int a, b; cin >> a >> b; g[a].push_back(b); g[b].push_back(a); }
    vector<int> par(n + 1, 0), order, st = {1};
    vector<ll> sz(n + 1, 1), down(n + 1, 0), ans(n + 1, 0);
    order.reserve(n);
    while (!st.empty()) {
        int v = st.back(); st.pop_back(); order.push_back(v);
        for (int w : g[v]) if (w != par[v]) { par[w] = v; st.push_back(w); }
    }
    for (int i = n - 1; i > 0; i--) { int v = order[i]; sz[par[v]] += sz[v]; down[par[v]] += down[v] + sz[v]; }
    ans[1] = down[1];
    for (int i = 1; i < n; i++) { int v = order[i]; ans[v] = ans[par[v]] - sz[v] + (n - sz[v]); }
    for (int i = 1; i <= n; i++) cout << ans[i] << (i == n ? '\n' : ' ');
}
''',
    ),
    dict(
        id='dijkstra-one-discount',
        title='Cheapest trip with one discount voucher',
        difficulty='hard',
        tags=['graphs', 'dijkstra', 'state-graph'],
        statement='There are n cities numbered from 1 to n and m one-way flights. Flight i goes from city u_i to city v_i and costs c_i. You want to travel from city 1 to city n as cheaply as possible, and you hold one voucher: on at most one flight of your trip, you may pay floor(c_i / 2) instead of c_i.\n\nFind the minimum total cost of the trip. If n = 1, the trip costs 0.\n\nSeveral flights may connect the same pair of cities, and a flight may start and end in the same city.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 5·10^4, 1 ≤ u_i, v_i ≤ n, 1 ≤ c_i ≤ 10^9.',
        input_format='The first line has n and m. Each of the next m lines has three integers u_i, v_i and c_i.',
        output_format='One integer, the minimum cost, or -1 if city n cannot be reached from city 1.',
        samples=['4 5\n1 2 3\n2 4 9\n1 3 6\n3 4 4\n4 1 1\n', '3 1\n2 3 5\n'],
        gen=g_voucher,
        py='''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b, c = int(d[2 + 3 * i]), int(d[3 + 3 * i]), int(d[4 + 3 * i])
        adj[a].append((b, c))
    INF = 1 << 62
    dist = [INF] * (2 * n + 2)
    dist[2] = 0
    h = [(0, 2)]
    while h:
        du, s = heapq.heappop(h)
        if du > dist[s]:
            continue
        u, used = s >> 1, s & 1
        for v, c in adj[u]:
            t = 2 * v + used
            nd = du + c
            if nd < dist[t]:
                dist[t] = nd
                heapq.heappush(h, (nd, t))
            if not used:
                t = 2 * v + 1
                nd = du + c // 2
                if nd < dist[t]:
                    dist[t] = nd
                    heapq.heappush(h, (nd, t))
    ans = min(dist[2 * n], dist[2 * n + 1])
    print(ans if ans < INF else -1)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,ll>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; ll c; cin >> a >> b >> c; g[a].push_back({b, c}); }
    const ll INF = LLONG_MAX / 4;
    vector<array<ll,2>> dist(n + 1, {INF, INF});
    priority_queue<tuple<ll,int,int>, vector<tuple<ll,int,int>>, greater<>> pq;
    dist[1][0] = 0; pq.push({0, 1, 0});
    while (!pq.empty()) {
        auto [du, u, k] = pq.top(); pq.pop();
        if (du != dist[u][k]) continue;
        for (auto [v, c] : g[u]) {
            if (du + c < dist[v][k]) { dist[v][k] = du + c; pq.push({dist[v][k], v, k}); }
            if (k == 0 && du + c / 2 < dist[v][1]) { dist[v][1] = du + c / 2; pq.push({dist[v][1], v, 1}); }
        }
    }
    ll ans = min(dist[n][0], dist[n][1]);
    cout << (ans >= INF ? -1 : ans) << "\n";
}
''',
    ),
    dict(
        id='count-shortest-paths',
        title='Counting shortest routes',
        difficulty='hard',
        tags=['graphs', 'dijkstra', 'counting'],
        statement='A city has n intersections numbered from 1 to n and m two-way roads. Road i joins u_i and v_i and has length w_i ≥ 1. Find the length of the shortest route from intersection 1 to intersection n, and the number of different routes that have this length.\n\nTwo routes are different if their sequences of roads differ; several roads may join the same pair of intersections, and they count as different roads. No road joins an intersection to itself. Print the number of routes modulo 10^9 + 7. If n = 1, the only shortest route is the empty one, of length 0.\n\nConstraints: 1 ≤ n ≤ 5·10^4, 0 ≤ m ≤ 10^5, 1 ≤ u_i, v_i ≤ n, u_i ≠ v_i, 1 ≤ w_i ≤ 10^9.',
        input_format='The first line has n and m. Each of the next m lines has three integers u_i, v_i and w_i.',
        output_format='Two integers: the shortest distance and the number of shortest routes modulo 10^9 + 7, or the single integer -1 if intersection n cannot be reached.',
        samples=['4 5\n1 2 1\n1 3 1\n2 4 1\n3 4 1\n1 4 3\n', '4 4\n1 2 2\n1 2 2\n2 4 1\n1 3 1\n'],
        gen=g_countpaths,
        py='''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    n, m = int(d[0]), int(d[1])
    MOD = 10 ** 9 + 7
    adj = [[] for _ in range(n + 1)]
    for i in range(m):
        a, b, w = int(d[2 + 3 * i]), int(d[3 + 3 * i]), int(d[4 + 3 * i])
        adj[a].append((b, w))
        adj[b].append((a, w))
    INF = 1 << 62
    dist = [INF] * (n + 1)
    cnt = [0] * (n + 1)
    dist[1] = 0
    cnt[1] = 1
    h = [(0, 1)]
    while h:
        du, u = heapq.heappop(h)
        if du > dist[u]:
            continue
        cu = cnt[u]
        for v, w in adj[u]:
            nd = du + w
            if nd < dist[v]:
                dist[v] = nd
                cnt[v] = cu
                heapq.heappush(h, (nd, v))
            elif nd == dist[v]:
                cnt[v] = (cnt[v] + cu) % MOD
    print(-1 if dist[n] == INF else f"{dist[n]} {cnt[n]}")
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const ll MOD = 1000000007LL;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n, m; cin >> n >> m;
    vector<vector<pair<int,ll>>> g(n + 1);
    for (int i = 0; i < m; i++) { int a, b; ll w; cin >> a >> b >> w; g[a].push_back({b, w}); g[b].push_back({a, w}); }
    const ll INF = LLONG_MAX / 4;
    vector<ll> dist(n + 1, INF), ways(n + 1, 0);
    vector<char> done(n + 1, 0);
    priority_queue<pair<ll,int>, vector<pair<ll,int>>, greater<>> pq;
    dist[1] = 0; ways[1] = 1; pq.push({0, 1});
    while (!pq.empty()) {
        auto [du, u] = pq.top(); pq.pop();
        if (done[u]) continue;
        done[u] = 1;
        for (auto [v, w] : g[u]) {
            if (du + w < dist[v]) { dist[v] = du + w; ways[v] = ways[u]; pq.push({dist[v], v}); }
            else if (du + w == dist[v]) ways[v] = (ways[v] + ways[u]) % MOD;
        }
    }
    if (dist[n] == INF) cout << -1 << "\n";
    else cout << dist[n] << " " << ways[n] << "\n";
}
''',
    ),
    dict(
        id='minimax-path-grid',
        title='Lowest flood level to cross the valley',
        difficulty='hard',
        tags=['graphs', 'grid', 'dijkstra', 'dsu'],
        statement='A valley is mapped as an r × c grid of heights. A traveller starts in the top-left cell and must reach the bottom-right cell, moving each step to a cell that shares a side with the current one. The danger of a route is the greatest height among all cells it visits, including the first and the last.\n\nFind the minimum possible danger of a route.\n\nConstraints: 1 ≤ r, c ≤ 400, 0 ≤ height ≤ 10^6.',
        input_format='The first line has r and c. Each of the next r lines has c integers, the heights of one row.',
        output_format='One integer, the minimum possible danger.',
        samples=['3 4\n1 8 2 3\n2 9 1 7\n3 4 6 2\n', '1 1\n5\n'],
        gen=g_flood,
        py='''import sys, heapq
def main():
    d = sys.stdin.buffer.read().split()
    r, c = int(d[0]), int(d[1])
    h = list(map(int, d[2:2 + r * c]))
    N = r * c
    INF = 1 << 60
    best = [INF] * N
    best[0] = h[0]
    pq = [(h[0], 0)]
    while pq:
        b, x = heapq.heappop(pq)
        if b > best[x]:
            continue
        if x == N - 1:
            break
        j = x % c
        nbs = []
        if j: nbs.append(x - 1)
        if j + 1 < c: nbs.append(x + 1)
        if x >= c: nbs.append(x - c)
        if x + c < N: nbs.append(x + c)
        for y in nbs:
            nb = h[y] if h[y] > b else b
            if nb < best[y]:
                best[y] = nb
                heapq.heappush(pq, (nb, y))
    print(best[N - 1])
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
vector<int> p;
int find(int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int r, c; cin >> r >> c;
    int N = r * c;
    vector<int> h(N);
    for (auto &x : h) cin >> x;
    vector<int> idx(N);
    iota(idx.begin(), idx.end(), 0);
    sort(idx.begin(), idx.end(), [&](int a, int b) { return h[a] < h[b]; });
    p.resize(N); iota(p.begin(), p.end(), 0);
    vector<char> on(N, 0);
    for (int x : idx) {
        on[x] = 1;
        int i = x / c, j = x % c;
        int nb[4] = {j > 0 ? x - 1 : -1, j + 1 < c ? x + 1 : -1, i > 0 ? x - c : -1, i + 1 < r ? x + c : -1};
        for (int y : nb) if (y >= 0 && on[y]) { int a = find(x), b = find(y); if (a != b) p[a] = b; }
        if (on[0] && on[N - 1] && find(0) == find(N - 1)) { cout << h[x] << "\n"; return 0; }
    }
}
''',
    ),
]
