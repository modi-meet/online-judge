import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="nav">
        <Link to="/problems" className="brand">online judge</Link>
        <nav>
          <NavLink to="/problems">problems</NavLink>
          {user ? (
            <>
              <NavLink to={`/u/${user.username}`}>{user.username}</NavLink>
              <button className="link" onClick={() => void logout()}>sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login">sign in</NavLink>
              <NavLink to="/register">register</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
