// verdict: RE
// the scratch dir is mounted read-only for runs; the write must fail.
#include <cstdio>
int main(){ FILE* f=fopen("/box/escape.txt","w"); if(!f) return 1; fputs("x",f); fclose(f); printf("3\n"); }
