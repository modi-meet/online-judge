// reference solutions for the handful of problems created by hand in dev
// (not from the bank), so the community can take part in contests that use them.
// keyed by slug. ratings stand in for the bank's per-problem rating.

export const DEV_RATING = { easy: 850, medium: 1250, hard: 1650 } as const;

export const DEV_SOLUTIONS: Record<string, { cpp17: string; python3: string }> = {
  'sum-of-two': {
    python3: 'a, b = map(int, input().split())\nprint(a + b)\n',
    cpp17: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b << "\\n";\n    return 0;\n}\n',
  },
  'two-sum-sorted': {
    python3: 'import sys\n\ndata = sys.stdin.read().split()\nn, t = int(data[0]), int(data[1])\na = list(map(int, data[2:2 + n]))\ni, j = 0, n - 1\nwhile i < j:\n    s = a[i] + a[j]\n    if s == t:\n        print(i + 1, j + 1)\n        break\n    if s < t:\n        i += 1\n    else:\n        j -= 1\nelse:\n    print(-1)\n',
    cpp17: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    long long t;\n    cin >> n >> t;\n    vector<long long> a(n);\n    for (auto& x : a) cin >> x;\n    int i = 0, j = n - 1;\n    while (i < j) {\n        long long s = a[i] + a[j];\n        if (s == t) { cout << i + 1 << " " << j + 1 << "\\n"; return 0; }\n        if (s < t) i++;\n        else j--;\n    }\n    cout << -1 << "\\n";\n    return 0;\n}\n',
  },
  'lis-length': {
    python3: 'import sys\nfrom bisect import bisect_left\n\ndata = sys.stdin.read().split()\nn = int(data[0])\ntails = []\nfor x in map(int, data[1:1 + n]):\n    k = bisect_left(tails, x)\n    if k == len(tails):\n        tails.append(x)\n    else:\n        tails[k] = x\nprint(len(tails))\n',
    cpp17: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<long long> tails;\n    for (int i = 0; i < n; i++) {\n        long long x;\n        cin >> x;\n        auto it = lower_bound(tails.begin(), tails.end(), x);\n        if (it == tails.end()) tails.push_back(x);\n        else *it = x;\n    }\n    cout << tails.size() << "\\n";\n    return 0;\n}\n',
  },
};
