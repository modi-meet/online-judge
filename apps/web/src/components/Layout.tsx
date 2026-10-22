import { motion } from 'motion/react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { springSnappy, useEnter } from '../lib/motion';
import { Icon } from './Icon';

// chrome is a translucent material the content scrolls under; the active
// item is a pill that slides between links. pages enter with a short settle
// from just below, never a slide from the side — nothing here has a side.
export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const enter = useEnter(6);
  // each kind of page gets its own feel; css keys off this
  const kind = loc.pathname === '/' ? 'landing' : loc.pathname === '/problems' ? 'catalogue' : loc.pathname === '/contests' ? 'contests'
    : loc.pathname.startsWith('/contests/') ? 'contest' : loc.pathname.startsWith('/u/') ? 'profile'
    : loc.pathname === '/login' || loc.pathname === '/register' ? 'auth' : loc.pathname.startsWith('/problems/') ? 'arena' : 'page';
  const item = (to: string, label: string) => (
    <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-pill" className="pill-bg" transition={springSnappy} />}
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link to={user ? '/problems' : '/'} className="brand"><span className="brand-mark" aria-hidden="true"><Icon name="code" size={13} /></span>Online Judge</Link>
          <nav>
            {item('/problems', 'Problems')}
            {item('/contests', 'Contests')}
            {user ? (
              <>
                {item(`/u/${user.username}`, user.username)}
                <button className="link" onClick={() => void logout()}>Sign out</button>
              </>
            ) : (
              <>
                {item('/login', 'Sign in')}
                {item('/register', 'Register')}
              </>
            )}
          </nav>
        </div>
      </header>
      <motion.main key={loc.pathname} className="page" data-page={kind} initial={enter.initial} animate={enter.animate} transition={enter.transition}>
        <Outlet />
      </motion.main>
    </>
  );
}
