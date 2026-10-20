// verdict: MLE
#include <cstdio>
#include <cstring>
#include <cstdlib>
int main(){ long long a,b; scanf("%lld %lld",&a,&b); size_t n=600ull<<20; char* p=(char*)malloc(n); for(size_t i=0;i<n;i+=4096) p[i]=1; printf("%lld\n",a+b+p[0]-1); }
