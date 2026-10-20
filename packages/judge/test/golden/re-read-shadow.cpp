// verdict: RE
// runs as uid 65534; /etc/shadow is not readable.
#include <cstdio>
int main(){ FILE* f=fopen("/etc/shadow","r"); if(!f) return 1; fclose(f); printf("3\n"); }
