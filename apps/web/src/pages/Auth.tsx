import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { PageHead } from '../components/PageHead';
import { useAuth } from '../lib/auth';

function useSubmit(fn: () => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await fn();
      nav(loc.state?.from ?? '/problems', { replace: true });
    } catch (err) {
      const detail = err instanceof ApiError && err.code === 'VALIDATION_FAILED'
        ? (err.details as { fields: { path: string; message: string }[] }).fields.map((f) => `${f.path}: ${f.message}`).join(' · ')
        : (err as Error).message;
      setError(detail);
    } finally { setBusy(false); }
  };
  return { error, busy, onSubmit };
}

export function LoginPage() {
  const { login } = useAuth();
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const { error, busy, onSubmit } = useSubmit(() => login(u, p));
  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <PageHead title="Sign in" lead="Welcome back. Sign in to submit solutions, join contests and talk to the mentor." />
      <label>Username<input value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" /></label>
      <label>Password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>Sign in</button>
      <p className="muted">New here? <Link to="/register">Register</Link></p>
    </form>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [u, setU] = useState(''); const [e, setE] = useState(''); const [p, setP] = useState('');
  const { error, busy, onSubmit } = useSubmit(() => register(u, e, p));
  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <PageHead title="Register" lead="Create an account to keep your submissions, enter contests and get help from the mentor. It takes a few seconds." />
      <label>Username<input value={u} onChange={(ev) => setU(ev.target.value)} autoFocus autoComplete="username" placeholder="Lowercase letters, digits, _" /></label>
      <label>Email<input type="email" value={e} onChange={(ev) => setE(ev.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" value={p} onChange={(ev) => setP(ev.target.value)} autoComplete="new-password" placeholder="8+ characters" /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>Create account</button>
      <p className="muted">Have an account? <Link to="/login">Sign in</Link></p>
    </form>
  );
}
