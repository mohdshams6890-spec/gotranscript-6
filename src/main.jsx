import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { ArrowUpRight, Check, Copy, FileText, History, Link2, Loader2, LockKeyhole, LogIn, Menu, Play, Search, Settings2, Sparkles, UserRound, X, Zap } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const hasRealSupabaseConfig = supabaseUrl.startsWith('https://') && !supabaseUrl.includes('your-project.supabase.co') && !supabaseAnonKey.includes('your-supabase-anon-key');
const supabase = hasRealSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
const demoHistory = [
  { id: 1, title: 'The art of doing less, better', meta: 'Today · 12 min read', words: '2,418' },
  { id: 2, title: 'How I built a $1M newsletter', meta: 'Yesterday · 28 min read', words: '5,802' },
  { id: 3, title: 'Design systems that scale', meta: 'Oct 16 · 19 min read', words: '3,107' }
];
const DAILY_CREDITS = 5;

function App() {
  const [user, setUser] = useState(null), [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState('signup');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState(null), [loading, setLoading] = useState(false), [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(''), [history, setHistory] = useState(demoHistory), [historyQuery, setHistoryQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [creditsLeft, setCreditsLeft] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('gotranscript-credits') || 'null'); return saved?.date === new Date().toISOString().slice(0, 10) ? saved.credits : DAILY_CREDITS; } catch { return DAILY_CREDITS; }
  });
  const outputRef = useRef(null);
  const normalized = useMemo(() => url.trim(), [url]);
  const filteredHistory = history.filter(item => item.title.toLowerCase().includes(historyQuery.toLowerCase()));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from('transcripts').select('id,title,word_count,created_at').order('created_at', { ascending: false }).limit(20).then(({ data }) => {
      if (data?.length) setHistory(data.map(item => ({ id: item.id, title: item.title, meta: `${new Date(item.created_at).toLocaleDateString()} · transcript`, words: item.word_count.toLocaleString() })));
    });
  }, [user]);
  useEffect(() => { localStorage.setItem('gotranscript-credits', JSON.stringify({ date: new Date().toISOString().slice(0, 10), credits: creditsLeft })); }, [creditsLeft]);
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
  }, []);
  useEffect(() => {
    const onShortcut = event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); generate(); } };
    window.addEventListener('keydown', onShortcut); return () => window.removeEventListener('keydown', onShortcut);
  });

  const signIn = async event => {
    event.preventDefault(); setNotice('');
    if (!supabase) { setUser({ email }); setAuthOpen(false); setNotice('Demo account active — connect Supabase for real auth.'); return; }
    const action = authMode === 'signup' ? supabase.auth.signUp({ email, password }) : supabase.auth.signInWithPassword({ email, password });
    const { error } = await action;
    if (error) {
      const message = error.message?.toLowerCase() || '';
      setNotice(message.includes('rate limit') || message.includes('email rate')
        ? 'Supabase has temporarily limited signup emails. Wait a few minutes, then try again, or use an existing account. For local testing, disable email confirmation in Supabase Auth settings.'
        : error.message);
    } else {
      setAuthOpen(false); setNotice(authMode === 'signup' ? 'Check your inbox to confirm your account.' : 'Welcome back.');
    }
  };
  async function generate() {
    if (!normalized || loading) return;
    if (!isOnline) { setNotice('You’re offline. Reconnect to generate a transcript.'); return; }
    if (!user) { setAuthMode('signup'); setAuthOpen(true); setNotice('Your first generation is free — create an account to continue.'); return; }
    if (creditsLeft <= 0) { setNotice('You have used all 5 credits for today. Your credits reset tomorrow.'); return; }
    setLoading(true); setTranscript(null); setNotice('');
    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/transcript`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: normalized }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not fetch transcript.');
      const data = await response.json(); setTranscript(data); setCreditsLeft(current => Math.max(0, current - 1));
      setHistory(current => [{ id: Date.now(), title: data.title, meta: 'Just now · transcript', words: data.wordCount.toLocaleString() }, ...current]);
      if (supabase && user) await supabase.from('transcripts').insert({ user_id: user.id, title: data.title, source_url: data.sourceUrl, transcript: data.transcript, word_count: data.wordCount });
    } catch (error) {
      setNotice('We could not generate this transcript. Please check the link and try again.');
    } finally { setLoading(false); setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); }
  }
  const copy = async () => { if (!transcript) return; await navigator.clipboard?.writeText(transcript.transcript); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const openAuth = mode => { setAuthMode(mode); setNotice(''); setAuthOpen(true); };
  const goTo = id => { setMobileMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><Sparkles size={15} /></span><span>GoTranscript</span></div><nav><a href="#generator">Generator</a><a href="#history">History</a><a href="#account">Account</a></nav><div className="top-actions"><div className="credits"><Zap size={13} fill="currentColor" /> {user ? `${creditsLeft} credits` : 'Guest'}</div>{user ? <button className="avatar" onClick={() => document.getElementById('account')?.scrollIntoView()}>{user.email?.[0]?.toUpperCase() || 'U'}</button> : <button className="login-button" onClick={() => openAuth('login')}><UserRound size={14} /> Login</button>}<button className="hamburger-button" aria-label="Open navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(value => !value)}><Menu size={18} /></button></div></header>
    {mobileMenuOpen && <div className="mobile-menu-panel"><button onClick={() => goTo('generator')}><Link2 size={15} /> Generator</button><button onClick={() => goTo('history')}><History size={15} /> History</button><button onClick={() => goTo('account')}><UserRound size={15} /> Account</button></div>}
    <main className="dashboard">
      <div className="dashboard-intro"><div><div className="eyebrow intro-kicker"><span>✦</span> AI POWERED YOUTUBE TRANSCRIPTS</div><h1>Paste any YouTube<br />link. Get a clean<br /><em>transcript in seconds.</em></h1><p className="intro-copy">Built for creators, researchers, and editors who want the transcript first, not<br className="desktop-break" /> another dashboard maze.</p></div></div>
      <section className="generator-stack" id="generator">
        <article className="panel input-panel"><PanelHeading icon={<Link2 size={15} />} title="Paste a video to begin" badge={!user ? 'Login required' : `${creditsLeft} credits available`} badgeType={!user ? 'orange' : 'green'} /><p className="panel-hint">YouTube URL, Shorts link, share link, or video ID</p><div className="url-field"><input aria-label="YouTube URL or ID" value={url} onChange={e => setUrl(e.target.value)} onPaste={e => setUrl(e.clipboardData.getData('text'))} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="Paste your YouTube link here…" />{url && <button className="field-clear" onClick={() => setUrl('')}><X size={14} /></button>}<button className="primary-action" onClick={generate} disabled={!url || loading || !isOnline}>{loading ? <Loader2 className="spin" size={15} /> : <Play size={14} fill="currentColor" />} {loading ? 'Extracting…' : isOnline ? 'Generate transcript' : 'Offline'}</button></div></article>
        <article className={`panel output-panel ${loading ? 'is-extracting' : ''}`} ref={outputRef}><PanelHeading icon={<Sparkles size={15} />} title="Output" badge={transcript ? 'Ready' : loading ? 'Working' : null} badgeType="green" />{loading ? <div className="extracting-state"><Loader2 className="spin extracting-icon" size={28} /><h3>Extracting transcript…</h3><p>Cleaning the YouTube link and preparing your copy-<br className="desktop-break" />ready text.</p><div className="extracting-bars"><span /><span /><span /></div></div> : transcript ? <div className="output-ready"><div className="output-meta"><div><span className="eyebrow">TRANSCRIPT READY</span><h2>{transcript.title}</h2><span className="muted-mono">{transcript.wordCount.toLocaleString()} words · English</span></div><button className="copy-button" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button></div><div className="transcript-scroll">{transcript.transcript}</div></div> : <div className="empty-output"><LockKeyhole size={21} /><h3>Your transcript will land here.</h3><p>Paste a link above and your generated text will appear here, ready to copy.</p></div>}</article>
      </section>
      <section className="bottom-grid"><article className="panel history-panel" id="history"><PanelHeading icon={<History size={15} />} title="History" badge={`${history.length} saved`} badgeType="green" /><div className="history-toolbar"><span>Recent transcripts</span><div className="history-search"><Search size={13} /><input value={historyQuery} onChange={e => setHistoryQuery(e.target.value)} placeholder="Search" /></div></div><div className="history-items">{filteredHistory.length ? filteredHistory.map(item => <button className="history-item" key={item.id} onClick={() => setUrl('')}><div className="history-file"><FileText size={15} /></div><div><strong>{item.title}</strong><span>{item.meta}</span></div><span className="history-word-count">{item.words} words <ArrowUpRight size={13} /></span></button>) : <p className="empty-history">No transcript history yet.</p>}</div></article><article className="panel account-panel" id="account"><PanelHeading icon={<Settings2 size={15} />} title="Account settings" badge={user ? 'Active' : 'Guest'} badgeType={user ? 'green' : 'orange'} /><div className="account-stats"><div><span>Credits today</span><strong>{user ? creditsLeft : '0'}</strong><small>{user ? 'resets at midnight' : 'Login to unlock'}</small></div><div><span>Billing</span><strong className={!user ? 'locked' : ''}>{user ? 'Free plan' : 'Locked'}</strong><small>{user ? `${DAILY_CREDITS} daily credits` : 'Login to view'}</small></div><div><span>Offer</span><strong>7 days</strong><small>Unlimited transcripts</small></div></div><div className="account-actions">{user ? <><button className="secondary-action">Manage billing <ArrowUpRight size={13} /></button><button className="offer-action">Unlock 7-day offer <ArrowUpRight size={13} /></button></> : <button className="primary-action" onClick={() => openAuth('signup')}><LogIn size={14} /> Login or sign up</button>}</div></article></section>
      {!isOnline && <div className="notice">You’re offline. Reconnect to use authentication, generation, and cloud history.</div>}
      {notice && <div className="notice">{notice}</div>}
    </main>
    <footer><span>© 2026 GoTranscript</span><span>Made for ideas worth keeping.</span><span>Privacy · Terms</span></footer>
    <nav className="mobile-bottom-nav"><a href="#generator"><Link2 size={17} /><span>Generator</span></a><a href="#history"><History size={17} /><span>History</span></a><a href="#account"><UserRound size={17} /><span>Account</span></a></nav>
    {authOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setAuthOpen(false)}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)}><X size={17} /></button><div className="auth-logo"><Sparkles size={17} /></div><h2>{authMode === 'signup' ? 'Make room for good ideas.' : 'Welcome back.'}</h2><p>{notice || 'Create your account to generate transcripts and keep your history saved.'}</p><form onSubmit={signIn}><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" required minLength="6" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label><button className="auth-submit">{authMode === 'signup' ? 'Create free account' : 'Log in'} <ArrowUpRight size={15} /></button></form><button className="switch-auth" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setNotice(''); }}>{authMode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}</button></div></div>}
  </div>;
}

function PanelHeading({ icon, title, badge, badgeType }) { return <div className="panel-heading"><div className="panel-title"><span className="panel-icon">{icon}</span><h2>{title}</h2></div>{badge && <span className={`panel-badge ${badgeType}`}>{badge}</span>}</div>; }

createRoot(document.getElementById('root')).render(<App />);
