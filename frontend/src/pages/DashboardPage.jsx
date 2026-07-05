import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profiles as profilesApi, conversations as convsApi, records as recordsApi, pendingActions as pendingApi, autoForward as afApi, blacklist as blApi, knowledge as knApi } from '../api';
import { ArrowLeft, CheckCircle, AlertTriangle, Bell, MessageSquare, Search, Archive, UserCheck, UserX, RefreshCw, Trash2, Plus, X, ChevronDown, ChevronUp, Save, Send, Ban, Brain, Scan, Database, Zap } from 'lucide-react';

function Card({ children, className = '', accentBorder = false }) {
  return <div className={`bg-surface border ${accentBorder ? 'border-accent/50' : 'border-border'} rounded-2xl p-5 ${className}`}>{children}</div>;
}
function SectionTitle({ icon: Icon, title, children }) {
  return <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Icon size={16} className="text-muted" /><span className="text-white font-medium text-sm">{title}</span></div><div className="flex items-center gap-2">{children}</div></div>;
}
function StatusBadge({ status }) {
  const map = { open: 'bg-danger/10 text-danger', in_progress: 'bg-warning/10 text-warning', resolved: 'bg-success/10 text-success' };
  const labels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status]}`}>{labels[status]}</span>;
}
function Avatar({ phone, size = 'md' }) {
  const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const color = colors[parseInt(phone?.slice(-2) || '0', 10) % colors.length];
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return <div className={`${s} ${color} rounded-full flex items-center justify-center text-white font-medium shrink-0`}>{phone?.slice(-2)}</div>;
}
function ConfirmModal({ msg, onConfirm, onCancel, danger = true }) {
  return <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
    <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full">
      <p className="text-white text-sm mb-6">{msg}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-muted border border-border rounded-lg">Cancel</button>
        <button onClick={onConfirm} className={`px-4 py-2 text-sm text-white rounded-lg ${danger ? 'bg-danger' : 'bg-accent'}`}>Confirm</button>
      </div>
    </div>
  </div>;
}

export default function DashboardPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [convs, setConvs] = useState([]);
  const [recs, setRecs] = useState([]);
  const [pending, setPending] = useState([]);
  const [afRules, setAfRules] = useState([]);
  const [bl, setBl] = useState([]);
  const [kn, setKn] = useState({ auto: [], taught: [] });
  const [search, setSearch] = useState('');
  const [liveDataExpanded, setLiveDataExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmToggleBot, setConfirmToggleBot] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newAfRule, setNewAfRule] = useState({ tag_name: '', tag_keyword: '', destination_group: '' });
  const [newKn, setNewKn] = useState({ question: '', answer: '' });
  const [settings, setSettings] = useState({ reply_delay_min: 2, reply_delay_max: 5, bulk_delay_min: 30, bulk_delay_max: 60, admin_phones: [] });
  const [bulk, setBulk] = useState({ numbers: '', message: '' });
  const [qrCode, setQrCode] = useState(null);
  const [waConnecting, setWaConnecting] = useState(false);

  const NICHE_LABELS = { isp: { tracker_title: 'Complaints Tracker', record_label: 'Complaint' }, restaurant: { tracker_title: 'Reservations & Orders', record_label: 'Reservation' }, pizza_shop: { tracker_title: 'Orders Tracker', record_label: 'Order' }, retail_generic: { tracker_title: 'Requests Tracker', record_label: 'Request' } };

  const load = useCallback(async () => {
    const [p, c, r, pa, af, b, k, s] = await Promise.allSettled([
      profilesApi.get(id), convsApi.list(id), recordsApi.list(id),
      pendingApi.list(id), afApi.list(id), blApi.list(id), knApi.list(id), profilesApi.getSettings(id)
    ]);
    if (p.status === 'fulfilled') setProfile(p.value.data);
    if (c.status === 'fulfilled') setConvs(c.value.data);
    if (r.status === 'fulfilled') setRecs(r.value.data);
    if (pa.status === 'fulfilled') setPending(pa.value.data);
    if (af.status === 'fulfilled') setAfRules(af.value.data);
    if (b.status === 'fulfilled') setBl(b.value.data);
    if (k.status === 'fulfilled') setKn(k.value.data);
    if (s.status === 'fulfilled') setSettings(s.value.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startWhatsappConnect = async () => {
    setWaConnecting(true);
    setQrCode(null);
    await profilesApi.connectWhatsapp(id);
    const poll = setInterval(async () => {
      const r = await profilesApi.getQR(id);
      if (r.data.status === 'qr_ready') setQrCode(r.data.qr);
      if (r.data.status === 'connected') {
        clearInterval(poll);
        setWaConnecting(false);
        setQrCode(null);
        load();
      }
    }, 2000);
    setTimeout(() => clearInterval(poll), 120000); // stop polling after 2 min
  };

  const toggleBot = async () => {
    const r = await profilesApi.toggleBot(id);
    setProfile(p => ({ ...p, bot_active: r.data.bot_active }));
    setConfirmToggleBot(false);
  };

  const filteredConvs = convs.filter(c => !search || c.customer_phone.includes(search) || c.last_message?.toLowerCase().includes(search.toLowerCase()));
  const labels = NICHE_LABELS[profile?.business_niche] || NICHE_LABELS.retail_generic;

  if (!profile) return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-bg">
      {/* HEADER */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-bg z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => nav('/')} className="flex items-center gap-1.5 text-muted hover:text-white text-sm transition"><ArrowLeft size={16} />Back to Portal</button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2"><MessageSquare size={16} className="text-accent" /><span className="text-white font-semibold">{profile.name} <span className="text-accent">AI Bot</span></span></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${profile.whatsapp_status === 'connected' ? 'bg-success' : 'bg-muted'}`} />
            <span className="text-muted hidden sm:block">{profile.whatsapp_status === 'connected' ? `Connected — ${profile.whatsapp_number}` : 'Not connected'}</span>
          </div>
          <button onClick={() => profile.bot_active ? setConfirmToggleBot(true) : toggleBot()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${profile.bot_active ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
            <div className={`w-3 h-3 rounded-full ${profile.bot_active ? 'bg-success' : 'bg-danger'}`} />
            Bot is {profile.bot_active ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* SECTION 1: WhatsApp + Knowledge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <SectionTitle icon={MessageSquare} title="WhatsApp Connection" />
            {profile.whatsapp_status === 'connected' ? (
              <div className="space-y-4">
                <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle size={20} className="text-success shrink-0" />
                  <div><p className="text-success font-medium text-sm">WhatsApp Connected</p><p className="text-muted text-xs mt-0.5">{profile.whatsapp_number}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'Messages today', val: convs.length }, { label: 'Open records', val: recs.filter(r => r.status === 'open').length }].map(s => (
                    <div key={s.label} className="bg-surface2 rounded-xl p-3"><p className="text-muted text-xs mb-1">{s.label}</p><p className="text-white text-xl font-semibold">{s.val}</p></div>
                  ))}
                </div>
                <button onClick={() => profilesApi.logoutWhatsapp(id).then(load)}
                  className="w-full py-2.5 text-sm border border-danger/30 text-danger rounded-xl hover:bg-danger/10 transition">Logout / Disconnect</button>
              </div>
            ) : qrCode ? (
              <div className="text-center py-4">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 mx-auto rounded-lg border border-border" />
                <p className="text-muted text-xs mt-3">WhatsApp app kholo → Settings → Linked Devices → Scan QR</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle size={32} className="text-warning mx-auto mb-3" />
                <p className="text-white text-sm font-medium mb-3">Not Connected</p>
                <button onClick={startWhatsappConnect} disabled={waConnecting}
                  className="bg-accent text-white text-sm px-5 py-2.5 rounded-xl hover:bg-accent-light transition disabled:opacity-50">
                  {waConnecting ? 'Generating QR...' : 'Connect WhatsApp'}
                </button>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle icon={Database} title="AI Knowledge Source" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[{ v: 'sheet', icon: '📊', label: 'Google Sheet', desc: 'For live data, pricing' },
                { v: 'manual', icon: '✏️', label: 'Manual Input', desc: 'For core instructions' }].map(o => (
                <button key={o.v} onClick={() => profilesApi.updateKnowledge(id, { data_source: o.v }).then(() => setProfile(p => ({ ...p, data_source: o.v })))}
                  className={`p-3 rounded-xl border text-left transition ${profile.data_source === o.v ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}>
                  <div className="text-lg mb-1">{o.icon}</div>
                  <p className={`text-sm font-medium ${profile.data_source === o.v ? 'text-accent' : 'text-white'}`}>{o.label}</p>
                  <p className="text-muted text-xs mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
            {profile.data_source === 'sheet' ? (
              <div className="space-y-3">
                <input className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                  placeholder="https://docs.google.com/spreadsheets/d/..." defaultValue={profile.google_sheet_url} />
                <div className="flex gap-2">
                  <button className="flex-1 bg-accent text-white text-sm py-2 rounded-xl hover:bg-accent-light transition flex items-center justify-center gap-2"><Save size={14} />Save & Apply</button>
                  <button className="px-3 py-2 border border-border text-muted rounded-xl hover:text-white"><RefreshCw size={14} /></button>
                </div>
                <p className="text-muted text-xs">Last synced 4 min ago</p>
              </div>
            ) : (
              <textarea className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent h-28 resize-none"
                placeholder="Paste your system prompt here..." defaultValue={profile.manual_prompt} />
            )}
          </Card>
        </div>

        {/* SECTION 2: Auto-Forward */}
        <Card>
          <SectionTitle icon={Zap} title="Auto-Forward Destinations">
            <button className="flex items-center gap-1.5 text-xs border border-border text-muted px-3 py-1.5 rounded-lg hover:text-white"><Plus size={12} />Add Alert Tag</button>
          </SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {afRules.map(rule => (
              <div key={rule.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3">
                <span className="bg-accent/20 text-accent text-xs px-2.5 py-1 rounded-full font-medium">{rule.tag_name}</span>
                <span className="text-muted text-xs flex-1 truncate">{rule.tag_keyword}</span>
                <span className="text-muted text-xs">→ {rule.destination_group}</span>
                <button onClick={() => afApi.remove(id, rule.id).then(() => setAfRules(p => p.filter(r => r.id !== rule.id)))} className="text-danger hover:bg-danger/10 p-1 rounded"><X size={14} /></button>
              </div>
            ))}
            {afRules.length === 0 && <p className="text-muted text-sm col-span-2 text-center py-4">No rules yet. Add an alert tag to get started.</p>}
          </div>
        </Card>

        {/* SECTION 3: Live Active Resolved Data */}
        <Card>
          <SectionTitle icon={Brain} title="Live Active Resolved Data">
            <button onClick={() => setLiveDataExpanded(p => !p)} className="flex items-center gap-1.5 text-xs border border-border text-muted px-3 py-1.5 rounded-lg hover:text-white">
              {liveDataExpanded ? <><ChevronUp size={12} />Collapse</> : <><ChevronDown size={12} />Expand</>}
            </button>
            <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 text-xs border border-danger/30 text-danger px-3 py-1.5 rounded-lg hover:bg-danger/10"><Trash2 size={12} />Clear</button>
          </SectionTitle>
          <div className={`relative bg-surface2 rounded-xl p-4 font-mono text-xs text-muted overflow-hidden transition-all ${liveDataExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-20'}`}>
            <pre className="whitespace-pre-wrap leading-relaxed">{profile.manual_prompt || 'No data loaded yet.'}</pre>
            {!liveDataExpanded && <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-surface2 to-transparent" />}
          </div>
          {!liveDataExpanded && <p className="text-muted text-xs mt-2">Showing preview — expand to view full source</p>}
          <p className="text-muted text-xs mt-2 italic">Clear removes cached data only — the source (sheet/file) itself won't be affected.</p>
        </Card>

        {/* SECTION 4: Pending Admin Actions */}
        <Card accentBorder={pending.length > 0}>
          <SectionTitle icon={Bell} title="Pending Admin Actions">
            {pending.length > 0 && <span className="bg-accent/20 text-accent text-xs px-2.5 py-1 rounded-full font-medium">{pending.length} waiting</span>}
          </SectionTitle>
          {pending.length === 0 ? (
            <div className="text-center py-8"><CheckCircle size={32} className="text-success mx-auto mb-2" /><p className="text-muted text-sm">No pending actions 🎉</p></div>
          ) : pending.map(action => (
            <div key={action.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-3 mb-2">
              <Avatar phone={action.customer_phone} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{action.customer_phone}</p>
                <p className="text-muted text-xs truncate">{action.reason}</p>
              </div>
              <span className={`text-xs shrink-0 ${action.wait_minutes > 15 ? 'text-danger' : 'text-muted'}`}>{action.wait_minutes}m ago</span>
              <button onClick={() => pendingApi.resolve(id, action.id).then(() => setPending(p => p.filter(a => a.id !== action.id)))}
                className="text-xs border border-border text-muted px-3 py-1.5 rounded-lg hover:text-white shrink-0">Reply</button>
            </div>
          ))}
        </Card>

        {/* SECTION 5: Records Tracker */}
        <Card>
          <SectionTitle icon={CheckCircle} title={labels.tracker_title}>
            <a href={recordsApi.export(id)} className="flex items-center gap-1.5 text-xs border border-border text-muted px-3 py-1.5 rounded-lg hover:text-white">Export CSV</a>
          </SectionTitle>
          {recs.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">No {labels.record_label.toLowerCase()}s yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left">
                  {['Customer', 'Issue', 'Status', 'Age'].map(h => <th key={h} className="text-muted font-normal pb-3 pr-4 text-xs">{h}</th>)}
                </tr></thead>
                <tbody>{recs.map(r => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 text-white text-xs">{r.username || r.customer_phone?.slice(-6)}</td>
                    <td className="py-3 pr-4 text-muted text-xs max-w-xs truncate">{r.issue}</td>
                    <td className="py-3 pr-4">
                      <button onClick={async () => {
                        const next = { open: 'in_progress', in_progress: 'resolved', resolved: 'open' }[r.status];
                        await recordsApi.updateStatus(id, r.id, next);
                        setRecs(p => p.map(x => x.id === r.id ? { ...x, status: next } : x));
                      }}><StatusBadge status={r.status} /></button>
                    </td>
                    <td className="py-3 text-muted text-xs">{Math.ceil((Date.now() - new Date(r.created_at)) / 3600000)}h</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>

        {/* SECTION 6: Conversation Logs */}
        <Card>
          <SectionTitle icon={MessageSquare} title="Conversation Logs">
            <button onClick={() => setConfirmArchive(true)} className="flex items-center gap-1.5 text-xs border border-border text-muted px-3 py-1.5 rounded-lg hover:text-white"><Archive size={12} />Archive All</button>
          </SectionTitle>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="w-full bg-surface2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
              placeholder="Search by name, phone, or message..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1">
            {filteredConvs.length === 0 ? <p className="text-center text-muted text-sm py-8">No conversations yet.</p>
              : filteredConvs.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-surface2 transition">
                <Avatar phone={c.customer_phone} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium">{c.customer_phone}</p>
                    {c.human_takeover && <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">Manual</span>}
                  </div>
                  <p className="text-muted text-xs truncate">{c.last_message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted text-xs">{c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <button onClick={() => convsApi.takeover(id, c.customer_phone, !c.human_takeover).then(() => setConvs(p => p.map(x => x.id === c.id ? { ...x, human_takeover: !c.human_takeover } : x)))}
                    title={c.human_takeover ? 'Release to bot' : 'Take over'}
                    className={`p-1.5 rounded-lg border transition ${c.human_takeover ? 'border-success/30 text-success hover:bg-success/10' : 'border-border text-muted hover:text-white'}`}>
                    {c.human_takeover ? <UserCheck size={14} /> : <UserX size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SECTION 7: Bulk Marketing + Blacklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <SectionTitle icon={Send} title="Bulk Marketing Messages">
              <span className="text-xs bg-warning/10 text-warning px-2.5 py-1 rounded-full">Slow Drip</span>
            </SectionTitle>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted mb-1.5 block">Phone numbers (one per line)</label>
                <textarea className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-white text-sm h-20 resize-none focus:outline-none focus:border-accent"
                  placeholder="923001234567" value={bulk.numbers} onChange={e => setBulk(p => ({ ...p, numbers: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Message template</label>
                <textarea className="w-full bg-surface2 border border-border rounded-xl px-3 py-2.5 text-white text-sm h-20 resize-none focus:outline-none focus:border-accent"
                  placeholder="Assalam o Alaikum! 👋 Aapke liye special offer..." value={bulk.message} onChange={e => setBulk(p => ({ ...p, message: e.target.value }))} />
              </div>
              {bulk.numbers.split('\n').filter(Boolean).length > 100 && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-warning text-xs">⚠️ Large list increases WhatsApp ban risk. Consider smaller batches.</div>
              )}
              <button className="w-full flex items-center justify-center gap-2 bg-success text-white text-sm py-2.5 rounded-xl hover:bg-emerald-500 transition"><Send size={14} />Start Sending</button>
            </div>
          </Card>

          <Card>
            <SectionTitle icon={Ban} title="Blacklist">
            </SectionTitle>
            <p className="text-muted text-xs mb-3">These numbers won't get any replies</p>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent"
                placeholder="923001234567" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              <button onClick={() => { blApi.add(id, { phone_number: newPhone }).then(r => { setBl(p => [r.data, ...p]); setNewPhone(''); }); }}
                className="px-4 py-2 bg-danger text-white text-sm rounded-xl hover:bg-red-600 transition shrink-0">Block</button>
            </div>
            {bl.length === 0 ? <p className="text-center text-muted text-sm py-4">No numbers blocked yet</p>
              : bl.map(b => (
              <div key={b.id} className="flex items-center justify-between border border-border rounded-xl px-4 py-2.5 mb-2">
                <span className="text-white text-sm">{b.phone_number}</span>
                <button onClick={() => blApi.remove(id, b.id).then(() => setBl(p => p.filter(x => x.id !== b.id)))} className="text-danger hover:bg-danger/10 p-1 rounded"><X size={14} /></button>
              </div>
            ))}
          </Card>
        </div>

        {/* SECTION 8: Settings */}
        <Card>
          <SectionTitle icon={Database} title="Settings" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-muted mb-2 block">Admin Phone Numbers</label>
              {(settings.admin_phones || []).map((phone, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none" defaultValue={phone} />
                  <button className="text-danger p-1"><X size={14} /></button>
                </div>
              ))}
              <button className="text-accent text-xs flex items-center gap-1 hover:text-accent-light"><Plus size={12} />Add admin</button>
            </div>
            <div>
              <label className="text-xs text-muted mb-2 block">Reply Delay (seconds)</label>
              <div className="flex items-center gap-2">
                <input type="number" className="w-16 bg-surface2 border border-border rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none" value={settings.reply_delay_min} onChange={e => setSettings(p => ({ ...p, reply_delay_min: e.target.value }))} />
                <span className="text-muted text-xs">to</span>
                <input type="number" className="w-16 bg-surface2 border border-border rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none" value={settings.reply_delay_max} onChange={e => setSettings(p => ({ ...p, reply_delay_max: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted mb-2 block">Bulk Delay (seconds)</label>
              <div className="flex items-center gap-2">
                <input type="number" className="w-16 bg-surface2 border border-border rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none" value={settings.bulk_delay_min} onChange={e => setSettings(p => ({ ...p, bulk_delay_min: e.target.value }))} />
                <span className="text-muted text-xs">to</span>
                <input type="number" className="w-16 bg-surface2 border border-border rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none" value={settings.bulk_delay_max} onChange={e => setSettings(p => ({ ...p, bulk_delay_max: e.target.value }))} />
              </div>
            </div>
          </div>
          <button onClick={() => profilesApi.updateSettings(id, settings)}
            className="mt-5 bg-accent text-white text-sm px-5 py-2.5 rounded-xl hover:bg-accent-light transition">Save Settings</button>
        </Card>

        {/* SECTION 9: AI Knowledge Database */}
        <Card>
          <SectionTitle icon={Brain} title="AI Learned Knowledge Database" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3"><Scan size={14} className="text-accent" /><span className="text-accent text-sm font-medium">Auto-scanned Facts</span></div>
              {kn.auto.length === 0 ? <p className="text-muted text-sm border border-dashed border-border rounded-xl p-4 text-center">No facts learned yet</p>
                : kn.auto.map(e => (
                <div key={e.id} className="flex items-start gap-2 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 mb-2">
                  <span className="text-accent text-xs flex-1">{e.answer || e.question}</span>
                  <button onClick={() => knApi.remove(id, e.id).then(() => setKn(p => ({ ...p, auto: p.auto.filter(x => x.id !== e.id) })))} className="text-muted hover:text-danger"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3"><UserCheck size={14} className="text-success" /><span className="text-success text-sm font-medium">Admin-taught Q&As</span></div>
              {kn.taught.length === 0 && <p className="text-muted text-sm border border-dashed border-border rounded-xl p-4 text-center mb-3">No Q&As taught yet</p>}
              {kn.taught.map(e => (
                <div key={e.id} className="border border-success/20 bg-success/5 rounded-xl px-4 py-3 mb-2">
                  <p className="text-success text-xs font-medium">{e.question}</p>
                  <p className="text-muted text-xs mt-1">{e.answer}</p>
                </div>
              ))}
              <div className="space-y-2 mt-3">
                <input className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-success/50" placeholder="Question..." value={newKn.question} onChange={e => setNewKn(p => ({ ...p, question: e.target.value }))} />
                <input className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-success/50" placeholder="Answer..." value={newKn.answer} onChange={e => setNewKn(p => ({ ...p, answer: e.target.value }))} />
                <button onClick={() => knApi.add(id, { ...newKn, entry_type: 'taught' }).then(r => { setKn(p => ({ ...p, taught: [...p.taught, r.data] })); setNewKn({ question: '', answer: '' }); })}
                  className="flex items-center gap-1.5 text-sm border border-success/30 text-success px-4 py-2 rounded-xl hover:bg-success/10"><Plus size={14} />Add Q&A</button>
              </div>
            </div>
          </div>
        </Card>

      </main>

      {/* Modals */}
      {confirmToggleBot && <ConfirmModal msg="Turning off the bot will stop all auto-replies. Are you sure?" onConfirm={toggleBot} onCancel={() => setConfirmToggleBot(false)} danger={false} />}
      {confirmClear && <ConfirmModal msg="Clear cached resolved data? The source (sheet/file) will not be affected." onConfirm={() => { profilesApi.clearCache(id); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} />}
      {confirmArchive && <ConfirmModal msg="Archive all conversations? They won't be deleted but will be hidden from the active view." onConfirm={() => { convsApi.archiveAll(id).then(() => setConvs([])); setConfirmArchive(false); }} onCancel={() => setConfirmArchive(false)} />}
    </div>
  );
}
