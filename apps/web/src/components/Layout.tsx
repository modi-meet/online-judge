import { motion } from 'motion/react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { springSnappy, useEnter } from '../lib/motion';

// chrome is a translucent material the content scrolls under; the active
// item is a pill that slides between links. pages enter with a short settle
// from just below, never a slide from the side — nothing here has a side.
export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const enter = useEnter(6);
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
          <Link to="/problems" className="brand"><span className="brand-mark" aria-hidden="true" />online judge</Link>
          <nav>
            {item('/problems', 'problems')}
            {item('/contests', 'contests')}
            {user ? (
              <>
                {item(`/u/${user.username}`, user.username)}
                <button className="link" onClick={() => void logout()}>sign out</button>
              </>
            ) : (
              <>
                {item('/login', 'sign in')}
                {item('/register', 'register')}
              </>
            )}
          </nav>
        </div>
      </header>
      <motion.main key={loc.pathname} className="page" initial={enter.initial} animate={enter.animate} transition={enter.transition}>
        <Outlet />
      </motion.main>
    </>
  );
}
