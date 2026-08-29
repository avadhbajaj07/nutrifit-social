import { useEffect, useState } from 'react';
import ApprovalWorkspace from './components/ApprovalWorkspace';

function AdminGate({ children }) {
  const [state, setState] = useState('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/admin/session')
      .then(response => response.json())
      .then(data => { if (active) setState(data.authenticated ? 'authenticated' : 'login'); })
      .catch(() => { if (active) { setError('Could not check the admin session.'); setState('login'); } });
    return () => { active = false; };
  }, []);

  const login = async event => {
    event.preventDefault();
    setState('submitting');
    setError('');
    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not sign in.');
      setPassword('');
      setState('authenticated');
    } catch (loginError) {
      setError(loginError.message);
      setState('login');
    }
  };

  const logout = async () => {
    await fetch('/api/auth/admin/logout', { method: 'POST' });
    setState('login');
  };

  if (state === 'checking') return <main className="login-page"><p>Checking secure session…</p></main>;
  if (state !== 'authenticated') {
    return <main className="login-page">
      <form className="login-card" onSubmit={login}>
        <div className="brand-mark">N</div>
        <p className="eyebrow">NUTRIFITNESS · ADMIN</p>
        <h1>Welcome back</h1>
        <p>Enter your password to manage client approvals.</p>
        <label>Password<input autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error ? <div className="login-error" role="alert">{error}</div> : null}
        <button className="button dark" disabled={state === 'submitting' || !password}>{state === 'submitting' ? 'Signing in…' : 'Open admin panel'}</button>
      </form>
    </main>;
  }

  return <div className="admin-shell"><button className="admin-logout" onClick={logout}>Sign out</button>{children}</div>;
}

export default function App() {
  const host = window.location.hostname.toLowerCase();
  const clientMode = host === 'www.sdqure.com' || new URLSearchParams(window.location.search).has('client');
  return clientMode
    ? <ApprovalWorkspace clientMode />
    : <AdminGate><ApprovalWorkspace clientMode={false} /></AdminGate>;
}
