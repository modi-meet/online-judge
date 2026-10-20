// verdict: RE
// each process forks one child and waits for it; at the pids limit fork
// fails and the deepest process exits 1, which propagates to the top.
#include <unistd.h>
#include <sys/wait.h>
#include <cstdio>
int main(){ for(;;){ pid_t p=fork(); if(p<0) _exit(1); if(p>0){ int st=0; waitpid(p,&st,0); _exit(WIFEXITED(st)?WEXITSTATUS(st):1); } } }
