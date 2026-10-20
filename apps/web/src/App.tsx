import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './lib/auth';
import { LoginPage, RegisterPage } from './pages/Auth';
import { ProblemPage } from './pages/Problem';
import { ProblemsPage } from './pages/Problems';
import { ProfilePage } from './pages/Profile';

export default function App() {
  const { ready } = useAuth();
  if (!ready) return <div className="center muted">loading…</div>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/problems" replace />} />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route path="/problems/:slug" element={<ProblemPage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<div className="center muted">no such page</div>} />
      </Route>
    </Routes>
  );
}
