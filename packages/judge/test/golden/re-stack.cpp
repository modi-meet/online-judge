// verdict: RE
// unbounded recursion. the stack guard kills it with sigsegv.
#include <cstdio>
long long f(long long n){ volatile char pad[512]; pad[0]=0; return f(n+1)+pad[0]; }
int main(){ long long a,b; scanf("%lld %lld",&a,&b); printf("%lld\n",f(a)); }
