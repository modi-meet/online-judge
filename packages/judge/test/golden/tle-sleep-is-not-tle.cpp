// verdict: AC
// sleeping burns wall time, not cpu time. the wall cap is 2*limit+1s, so a
// short sleep stays under it and the verdict is decided on cpu time: ac.
#include <cstdio>
#include <unistd.h>
int main(){ long long a,b; scanf("%lld %lld",&a,&b); usleep(300000); printf("%lld\n",a+b); }
