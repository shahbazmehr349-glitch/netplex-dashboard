import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await login(form.username, form.password); nav('/'); }
    catch { setError('Invalid username or password'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4">
            <Bot size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">NetPlex</h1>
          <p className="text-muted text-sm mt-1">Unified Multi-Profile Manager</p>
        </div>

        <form onSubmit={submit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Username</label>
            <input className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="admin" autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Password</label>
            <div className="relative">
              <input className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-accent"
                type={showPass ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-light text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-xs text-muted mt-4">Default: admin / admin123</p>
      </div>
    </div>
  );
}
