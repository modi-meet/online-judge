import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
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
      <h1>sign in</h1>
      <label>username<input value={u} onChange={(e) => setU(e.target.value)} autoFocus autoComplete="username" /></label>
      <label>password<input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>sign in</button>
      <p className="muted">new here? <Link to="/register">register</Link></p>
    </form>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const [u, setU] = useState(''); const [e, setE] = useState(''); const [p, setP] = useState('');
  const { error, busy, onSubmit } = useSubmit(() => register(u, e, p));
  return (
    <form className="card narrow" onSubmit={onSubmit}>
      <h1>register</h1>
      <label>username<input value={u} onChange={(ev) => setU(ev.target.value)} autoFocus autoComplete="username" placeholder="lowercase, digits, _" /></label>
      <label>email<input type="email" value={e} onChange={(ev) => setE(ev.target.value)} autoComplete="email" /></label>
      <label>password<input type="password" value={p} onChange={(ev) => setP(ev.target.value)} autoComplete="new-password" placeholder="8+ characters" /></label>
      {error && <p className="error">{error}</p>}
      <button disabled={busy}>create account</button>
      <p className="muted">have an account? <Link to="/login">sign in</Link></p>
    </form>
  );
}
