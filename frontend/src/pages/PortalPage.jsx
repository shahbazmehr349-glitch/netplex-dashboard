import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profiles as profilesApi } from '../api';
import { Bot, Plus, Settings, Link, Trash2, CheckCircle, AlertTriangle, Calendar, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function daysUntil(date) {
  return Math.ceil((new Date(date) - new Date()) / 86400000);
}

function ExpiryBadge({ date }) {
  const days = daysUntil(date);
  if (days <= 7) return <span className="text-danger font-semibold">{days} Days</span>;
  if (days <= 30) return <span className="text-warning font-semibold">{days} Days</span>;
  return <span className="text-white font-semibold">{days} Days</span>;
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full">
        <p className="text-white text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:text-white">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-red-600">Confirm Delete</button>
        </div>
      </div>
    </div>
  );
}

function AddProfileModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', gemini_api_key: '', gemini_model: 'gemini-flash-lite', business_niche: 'isp', licence_days: 30 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const NICHES = [{ v: 'isp', l: '📡 Internet Service Provider (ISP)' }, { v: 'restaurant', l: '🍽️ Restaurant' }, { v: 'pizza_shop', l: '🍕 Pizza Shop' }, { v: 'retail_generic', l: '🛒 Retail / Generic' }];
  const MODELS = [{ v: 'gemini-flash-lite', l: 'Gemini Flash Lite (Free & Fast)' }, { v: 'gemini-flash', l: 'Gemini Flash' }, { v: 'gemini-pro', l: 'Gemini Pro' }];
  const DURATIONS = [{ v: 1, l: 'Daily' }, { v: 30, l: 'Monthly' }, { v: 365, l: 'Yearly' }];

  const submit = async () => {
    if (!form.name) return setErr('Business name required');
    setLoading(true); setErr('');
    try { const r = await profilesApi.create(form); onCreated(r.data); onClose(); }
    catch { setErr('Failed to create profile. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center"><Bot size={16} className="text-accent" /></div>
          <h2 className="text-white font-semibold">Add Business Profile</h2>
        </div>

        <div className="space-y-4">
          {[{ label: 'Business Profile Name', key: 'name', placeholder: 'e.g. NetPlex ISP, Pizza House' },
            { label: 'Google Gemini API Key', key: 'gemini_api_key', placeholder: 'AIza...', type: 'password' }].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted mb-1.5 block">{f.label}</label>
              <input type={f.type || 'text'} placeholder={f.placeholder}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}

          <div>
            <label className="text-xs text-muted mb-1.5 block">Gemini Model</label>
            <select className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              value={form.gemini_model} onChange={e => setForm(p => ({ ...p, gemini_model: e.target.value }))}>
              {MODELS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted mb-1.5 block">Business Niche Category</label>
            <select className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              value={form.business_niche} onChange={e => setForm(p => ({ ...p, business_niche: e.target.value }))}>
              {NICHES.map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted mb-2 block">Licence Duration</label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button key={d.v} onClick={() => setForm(p => ({ ...p, licence_days: d.v }))}
                  className={`flex-1 py-2 text-sm rounded-lg border transition ${form.licence_days === d.v ? 'bg-accent border-accent text-white' : 'border-border text-muted hover:text-white'}`}>
                  {d.l}
                </button>
              ))}
              <button onClick={() => setForm(p => ({ ...p, licence_days: 0 }))}
                className={`flex-1 py-2 text-sm rounded-lg border transition ${form.licence_days === 0 ? 'bg-accent border-accent text-white' : 'border-border text-muted hover:text-white'}`}>
                Custom
              </button>
            </div>
          </div>

          {err && <p className="text-danger text-xs">{err}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-muted border border-border rounded-lg hover:text-white">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition disabled:opacity-50">
            {loading ? 'Creating...' : 'Create & Initialize'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onDelete, onNavigate }) {
  const [delConfirm, setDelConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const isConnected = profile.whatsapp_status === 'connected';

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/dashboard/${profile.profile_id}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-accent/30 transition">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{profile.name}</p>
            <p className="text-muted text-xs mt-0.5 truncate">ID: {profile.profile_id}</p>
          </div>
          {isConnected
            ? <span className="flex items-center gap-1.5 bg-success/10 text-success text-xs px-2.5 py-1 rounded-full shrink-0"><CheckCircle size={12} />Connected</span>
            : <span className="flex items-center gap-1.5 bg-warning/10 text-warning text-xs px-2.5 py-1 rounded-full shrink-0"><AlertTriangle size={12} />Action Needed</span>}
        </div>

        <div className="bg-surface2 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted text-sm"><Calendar size={14} /><span>Licence Expiry</span></div>
          <ExpiryBadge date={profile.licence_expiry} />
        </div>

        <div className="flex gap-2">
          <button onClick={() => onNavigate(profile.profile_id)}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white text-sm py-2.5 rounded-xl transition">
            <Settings size={15} />Dashboard
          </button>
          <button onClick={copyLink} title="Copy link"
            className="w-11 flex items-center justify-center border border-border rounded-xl text-muted hover:text-white transition">
            <Link size={15} className={copied ? 'text-success' : ''} />
          </button>
          <button onClick={() => setDelConfirm(true)} title="Delete profile"
            className="w-11 flex items-center justify-center border border-danger/30 rounded-xl text-danger hover:bg-danger/10 transition">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {delConfirm && <ConfirmDialog
        message={`Delete "${profile.name}"? This cannot be undone.`}
        onConfirm={() => { onDelete(profile.profile_id); setDelConfirm(false); }}
        onCancel={() => setDelConfirm(false)} />}
    </>
  );
}

export default function PortalPage() {
  const [profileList, setProfileList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const nav = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    profilesApi.list().then(r => setProfileList(r.data)).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    await profilesApi.delete(id);
    setProfileList(p => p.filter(x => x.profile_id !== id));
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center"><Bot size={20} className="text-white" /></div>
          <div>
            <h1 className="text-white font-bold text-lg">NetPlex</h1>
            <p className="text-muted text-xs">Unified Multi-Profile Manager Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-border text-muted text-sm px-4 py-2 rounded-xl hover:text-white transition">
            <Wifi size={15} />Configure Ngrok
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-accent text-white text-sm px-4 py-2 rounded-xl hover:bg-accent-light transition">
            <Plus size={15} />Add Profile
          </button>
          <button onClick={logout} className="text-muted text-sm hover:text-white">Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="bg-surface border border-border rounded-2xl h-48 animate-pulse" />)}
          </div>
        ) : profileList.length === 0 ? (
          <div className="text-center py-24">
            <Bot size={48} className="text-muted mx-auto mb-4" />
            <p className="text-white font-medium mb-2">No profiles yet</p>
            <p className="text-muted text-sm mb-6">Add your first business profile to get started</p>
            <button onClick={() => setShowAdd(true)} className="bg-accent text-white px-6 py-2.5 rounded-xl text-sm hover:bg-accent-light transition">
              + Add Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profileList.map(p => <ProfileCard key={p.profile_id} profile={p} onDelete={handleDelete} onNavigate={id => nav(`/dashboard/${id}`)} />)}
          </div>
        )}
      </main>

      {showAdd && <AddProfileModal onClose={() => setShowAdd(false)} onCreated={p => setProfileList(prev => [p, ...prev])} />}
    </div>
  );
}
