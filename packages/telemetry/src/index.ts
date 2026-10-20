import { createServer } from 'node:http';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// the metrics from hld §15, named once. every service imports from here so a
// dashboard built against the worker works against the api.
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const metrics = {
  httpDuration: new Histogram({ name: 'http_request_duration_seconds', help: 'request latency by route and status', labelNames: ['method', 'route', 'status'], buckets: [0.005, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5], registers: [registry] }),
  queueDepth: new Gauge({ name: 'submission_queue_depth', help: 'jobs waiting to be judged — the autoscaling signal', registers: [registry] }),
  judgeDuration: new Histogram({ name: 'judge_duration_seconds', help: 'end-to-end judgement time by language', labelNames: ['language'], buckets: [0.5, 1, 2, 4, 8, 16, 30, 60], registers: [registry] }),
  verdicts: new Counter({ name: 'verdict_total', help: 'terminal verdicts', labelNames: ['verdict', 'language'], registers: [registry] }),
  slotsBusy: new Gauge({ name: 'worker_slots_busy', help: 'judge slots currently executing', registers: [registry] }),
  sandboxOom: new Counter({ name: 'sandbox_oom_total', help: 'runs killed by the memory limit', registers: [registry] }),
  sandboxTimeout: new Counter({ name: 'sandbox_timeout_total', help: 'runs killed by the wall timer', registers: [registry] }),
  aiTokens: new Counter({ name: 'ai_tokens_total', help: 'llm tokens by mode and direction', labelNames: ['mode', 'direction'], registers: [registry] }),
  leakGuard: new Counter({ name: 'leak_guard_triggered_total', help: 'mentor responses blocked by the leak guard', labelNames: ['rule'], registers: [registry] }),
};

/** a bare /metrics listener for processes that have no http server of their own */
export function serveMetrics(port: number) {
  const srv = createServer(async (req, res) => {
    if (req.url !== '/metrics') { res.statusCode = 404; res.end(); return; }
    res.setHeader('content-type', registry.contentType);
    res.end(await registry.metrics());
  });
  srv.listen(port);
  return srv;
}
