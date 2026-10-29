# the shape every bank file follows. not part of the build.
PROBLEMS = [
    dict(
        id='count-pairs-with-sum',
        title='Pairs with a given sum',
        difficulty='easy',
        tags=['arrays', 'hashing'],
        statement='You are given n integers and a target k. Count the pairs of indices i < j with a_i + a_j = k.\n\nConstraints: 1 ≤ n ≤ 10^5, -10^9 ≤ a_i, k ≤ 10^9.',
        input_format='The first line has n and k. The second line has n integers.',
        output_format='One integer, the number of pairs.',
        samples=['5 6\n1 5 3 3 2\n'],
        gen=lambda rng, t: (lambda n: f"{n} {rng.randint(-20, 20)}\n{' '.join(str(rng.randint(-10, 10)) for _ in range(n))}\n")([5, 20, 300, 5000, 50000, 100000][t]),
        py='''import sys
from collections import Counter
def main():
    d = sys.stdin.buffer.read().split()
    n, k = int(d[0]), int(d[1])
    seen, ans = Counter(), 0
    for x in map(int, d[2:2 + n]):
        ans += seen[k - x]
        seen[x] += 1
    print(ans)
main()
''',
        cpp=r'''#include <bits/stdc++.h>
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int n; long long k; cin >> n >> k;
    unordered_map<long long, long long> seen; seen.reserve(n * 2);
    long long ans = 0;
    for (int i = 0; i < n; i++) { long long x; cin >> x; auto it = seen.find(k - x); if (it != seen.end()) ans += it->second; seen[x]++; }
    cout << ans << "\n";
}
''',
    ),
]
