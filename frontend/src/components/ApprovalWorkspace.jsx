import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Copy,
  Image as ImageIcon, Layers3, Link, Package, Pencil, Plus, RefreshCw, RotateCcw, Send, X, XCircle
} from 'lucide-react';
import BlotatoPanel from './BlotatoPanel';

const STATUS = {
  PENDING_REVIEW: { label: 'Waiting for client', tone: 'amber' },
  PRODUCT_CHANGE_REQUESTED: { label: 'Product change requested', tone: 'violet' },
  APPROVED: { label: 'Approved', tone: 'emerald' },
  REJECTED: { label: 'Rejected', tone: 'rose' },
  SCHEDULED: { label: 'Scheduled', tone: 'sky' },
  PUBLISHING: { label: 'Publishing', tone: 'sky' },
  PUBLISH_FAILED: { label: 'Publish failed', tone: 'rose' },
  POSTED: { label: 'Posted', tone: 'sky' }
};

const TIME_ZONE = 'Europe/Zurich';
const zonedParts = value => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(new Date(value)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
const prettyDate = value => value ? `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(new Date(value))} (Geneva)` : 'Not set';
const dateValue = value => {
  if (!value) return '';
  const parts = zonedParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
const genevaDateToIso = value => {
  if (!value) return null;
  const assumedUtc = new Date(`${value}:00Z`);
  const parts = zonedParts(assumedUtc);
  const shownAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(assumedUtc.getTime() - (shownAsUtc - assumedUtc.getTime())).toISOString();
};

function Pill({ status }) {
  const config = STATUS[status] || STATUS.PENDING_REVIEW;
  return <span className={`status-pill ${config.tone}`}>{config.label}</span>;
}

function SiteFooter() {
  return <footer className="site-footer">
    <span>NutriFit Social Media</span>
    <span>Managed by <a href="https://avadhbajaj.com" target="_blank" rel="noreferrer">Avadh Bajaj</a></span>
  </footer>;
}

function History({ draft }) {
  const events = [...(draft.revisionHistory || [])].reverse();
  return <div className="review-history">
    <p className="eyebrow">Review history</p>
    {events.length ? events.map((event, index) => (
      <div className="history-row" key={`${event.at}-${index}`}>
        <span className="history-dot" />
        <div><strong>{event.event.replaceAll('_', ' ')}</strong><p>{event.note || 'No note added.'}</p><time>{prettyDate(event.at)}</time></div>
      </div>
    )) : <p className="muted">This post has no recorded review events yet.</p>}
  </div>;
}

function ClientActions({ draft, onRespond, working }) {
  const [panel, setPanel] = useState(null);
  const [product, setProduct] = useState('');
  const [caption, setCaption] = useState(draft.captions?.instagramCaption || '');
  const [note, setNote] = useState('');

  useEffect(() => { setCaption(draft.captions?.instagramCaption || ''); setPanel(null); }, [draft.id, draft.captions?.instagramCaption]);
  const send = (action, payload = {}) => onRespond(draft.id, { action, ...payload });

  if (draft.status !== 'PENDING_REVIEW') return <div className="client-result"><Pill status={draft.status} />{draft.productRequest && <p>{draft.productRequest}</p>}</div>;
  return <section className="review-actions">
    <p className="small-label">Choose one response</p>
    <button className="action primary" disabled={working} onClick={() => send('approve')}><CheckCircle2 size={17} /> Approve</button>
    <button className="action" onClick={() => setPanel(panel === 'product' ? null : 'product')}><Package size={17} /> Keep design, change product</button>
    {panel === 'product' && <div className="inline-form"><input autoFocus value={product} onChange={e => setProduct(e.target.value)} placeholder="Which product should be shown?" /><button disabled={working || !product.trim()} onClick={() => send('product_change', { productRequest: product })}>Send request</button></div>}
    <button className="action" onClick={() => setPanel(panel === 'caption' ? null : 'caption')}><Pencil size={17} /> Edit caption & approve</button>
    {panel === 'caption' && <div className="inline-form stacked"><textarea value={caption} onChange={e => setCaption(e.target.value)} rows="7" /><button disabled={working || !caption.trim()} onClick={() => send('caption_approve', { caption })}><Check size={16} /> Save caption & approve</button></div>}
    <button className="action reject" onClick={() => setPanel(panel === 'reject' ? null : 'reject')}><XCircle size={17} /> Reject design</button>
    {panel === 'reject' && <div className="inline-form"><input autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="Optional reason (helps the creator)" /><button className="danger" disabled={working} onClick={() => send('reject', { note })}>Reject design</button></div>}
  </section>;
}

function ClientPortal({ drafts, onRespond, loading, notice }) {
  const reviewable = drafts.filter(item => item.status === 'PENDING_REVIEW');
  const [currentId, setCurrentId] = useState('');
  useEffect(() => { if (!currentId && reviewable[0]) setCurrentId(reviewable[0].id); }, [currentId, reviewable]);
  const current = drafts.find(item => item.id === currentId) || reviewable[0];
  return <main className="client-page">
    <header className="client-header"><div className="brand-mark">N</div><div><p className="eyebrow">NUTRIFITNESS</p><h1>Review posts</h1></div><span className="round-chip">{reviewable.length} waiting</span></header>
    {notice && <div className="notice success"><CheckCircle2 size={17} />{notice}</div>}
    {loading ? <div className="empty-card">Loading your posts…</div> : current ? <>
      <div className="client-switcher">{drafts.map((post, index) => <button key={post.id} onClick={() => setCurrentId(post.id)} className={current.id === post.id ? 'active' : ''}>Post {index + 1} <Pill status={post.status} /></button>)}</div>
      <article className="client-card">
        <div className="image-frame"><img src={current.media?.secure_url} alt="Post awaiting review" /></div>
        <div className="client-copy"><div className="card-heading"><div><p className="eyebrow">REVISION {current.revision || 1}</p><h2>Caption</h2></div><Pill status={current.status} /></div>
          <p className="caption-copy">{current.captions?.instagramCaption}</p>
          <ClientActions draft={current} onRespond={onRespond} working={loading} />
          <History draft={current} />
        </div>
      </article>
    </> : <div className="empty-card"><CheckCircle2 size={34} /><h2>All caught up</h2><p>There are no posts waiting for your review.</p></div>}
    <SiteFooter />
  </main>;
}

function Composer({ media, initial, onSave, onClose, working }) {
  const [selected, setSelected] = useState(initial?.media || media[0]);
  const [caption, setCaption] = useState(initial?.captions?.instagramCaption || '');
  const [date, setDate] = useState(dateValue(initial?.scheduledFor));
  const [showPicker, setShowPicker] = useState(!initial);
  const submit = () => onSave({ media: selected, captions: { ...initial?.captions, instagramCaption: caption }, scheduledFor: genevaDateToIso(date) });
  return <div className="modal-backdrop"><section className="composer modal-card" role="dialog" aria-modal="true" aria-label={initial ? 'Update and resubmit post' : 'Create a post'}><button className="icon-button close" aria-label="Close post editor" onClick={onClose}><X size={19} /></button><p className="eyebrow">{initial ? 'REWORK REQUEST' : 'NEW POST'}</p><h2>{initial ? 'Update and resubmit post' : 'Create a post for client approval'}</h2>
    <div className="composer-layout"><div><button className="media-preview" onClick={() => setShowPicker(!showPicker)}>{selected?.secure_url ? <img src={selected.secure_url} alt="Selected media" /> : <ImageIcon />}<span>Choose image</span></button>
      {showPicker && <div className="media-picker">{media.map((item, index) => <button className={selected?.public_id === item.public_id ? 'selected' : ''} onClick={() => { setSelected(item); setShowPicker(false); }} key={`${item.public_id}-${index}`}><img src={item.secure_url} alt="Available media" /></button>)}</div>}</div>
      <div className="form-stack"><label>Caption<textarea rows="9" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write the caption for the client…" /></label><label>Posting date — Geneva time (optional)<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></label>
        <button className="button dark" disabled={working || !selected || !caption.trim()} onClick={submit}><Send size={17} /> {initial ? 'Resubmit for approval' : 'Send to client review'}</button></div>
    </div></section></div>;
}

function OwnerPortal({ drafts, media, refresh, loading, notice, clientLink, onDraftUpdated }) {
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [composer, setComposer] = useState(null);
  const [publisher, setPublisher] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const filtered = useMemo(() => filter === 'ALL' ? drafts : drafts.filter(draft => draft.status === filter), [drafts, filter]);
  useEffect(() => { if (!selectedId && filtered[0]) setSelectedId(filtered[0].id); }, [selectedId, filtered]);
  const selected = drafts.find(draft => draft.id === selectedId) || filtered[0];

  const resetableCount = drafts.filter(d => ['APPROVED', 'SCHEDULED', 'REJECTED', 'PRODUCT_CHANGE_REQUESTED', 'PUBLISH_FAILED'].includes(d.status)).length;

  const create = async data => {
    const response = await fetch('/api/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error((await response.json()).error || 'Could not create the post.');
    setComposer(null); await refresh('Post sent to the client review board.');
  };
  const resubmit = async data => {
    const response = await fetch(`/api/drafts/${composer.id}/resubmit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error((await response.json()).error || 'Could not resubmit the post.');
    setComposer(null); await refresh('Updated post sent back for a new client review.');
  };
  const copyLink = async () => { await navigator.clipboard?.writeText(clientLink); refresh('Private client review link copied.'); };

  const handleSyncCloudinary = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/drafts/sync-cloudinary', { method: 'POST' });
      const data = await res.json();
      await refresh(data.newCount > 0 ? `Synced ${data.newCount} new Cloudinary images with nutrifitness.ch captions!` : 'Cloudinary is already up to date.');
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleResetAll = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/drafts/reset-all-to-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: 'Resubmitted for client review — please read each caption carefully.' })
      });
      const data = await res.json();
      setShowResetConfirm(false);
      await refresh(data.message || `${data.count} posts sent back for client approval.`);
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return <main className="owner-page"><header className="owner-header"><div><p className="eyebrow">NUTRIFITNESS • CREATOR</p><h1>Posts</h1><p>Create, review and publish from one place.</p></div><div className="header-actions"><button className="button ghost" disabled={!clientLink} onClick={copyLink}><Copy size={16} /> Copy review link</button><a className="button ghost" target="_blank" rel="noreferrer" href={clientLink || '#'}><Link size={16} /> Open client view</a><button className="button ghost" disabled={syncing} onClick={handleSyncCloudinary} title="Import new images from Cloudinary"><RefreshCw size={15} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync Cloudinary'}</button>{resetableCount > 0 && <button className="button ghost" onClick={() => setShowResetConfirm(true)} title={`Reset ${resetableCount} post(s) for client re-review`}><RotateCcw size={16} /> Re-send for approval ({resetableCount})</button>}<button className="button dark" onClick={() => setComposer({})}><Plus size={17} /> New post</button></div></header>
    {notice && <div className="notice success"><CheckCircle2 size={17} />{notice}</div>}
    <section className="stats"><div><Clock3 /><strong>{drafts.filter(d => d.status === 'PENDING_REVIEW').length}</strong><span>Waiting for client</span></div><div><Package /><strong>{drafts.filter(d => d.status === 'PRODUCT_CHANGE_REQUESTED').length}</strong><span>Needs rework</span></div><div><CheckCircle2 /><strong>{drafts.filter(d => d.status === 'APPROVED').length}</strong><span>Approved</span></div><div><XCircle /><strong>{drafts.filter(d => d.status === 'REJECTED').length}</strong><span>Rejected</span></div></section>
    <section className="board"><aside className="post-list"><div className="filter-row">{['ALL', ...Object.keys(STATUS)].map(item => <button className={filter === item ? 'active' : ''} onClick={() => { setFilter(item); setSelectedId(''); }} key={item}>{item === 'ALL' ? 'All' : STATUS[item].label}</button>)}</div>
      <div className="post-list-scroll">{filtered.map(draft => <button onClick={() => setSelectedId(draft.id)} key={draft.id} className={`post-row ${selected?.id === draft.id ? 'selected' : ''}`}><img src={draft.media?.secure_url} alt="Post thumbnail" /><div><Pill status={draft.status} /><strong>{draft.media?.filename || draft.media?.title || 'Social post'}</strong><small>Revision {draft.revision || 1} · {prettyDate(draft.updatedAt || draft.createdAt)}</small></div><ChevronRight size={17} /></button>)}{!filtered.length && <p className="muted list-empty">No posts here yet.</p>}</div>
    </aside>
    {selected ? <section className="detail"><div className="detail-top"><div><p className="eyebrow">REVISION {selected.revision || 1}</p><h2>{selected.media?.filename || 'Social post'}</h2></div><Pill status={selected.status} /></div><div className="detail-grid"><div><div className="image-frame"><img src={selected.media?.secure_url} alt="Selected social post" /></div>{selected.productRequest && <div className="request-box"><Package size={17} /><div><strong>Product change</strong><p>{selected.productRequest}</p></div></div>}</div><div><p className="eyebrow">CAPTION</p><p className="caption-copy">{selected.captions?.instagramCaption}</p><p className="schedule-line"><CalendarDays size={16} /> {selected.scheduledFor ? prettyDate(selected.scheduledFor) : 'Publishing time not set'}</p>{selected.status === 'PRODUCT_CHANGE_REQUESTED' ? <button className="button dark full" onClick={() => setComposer(selected)}><RefreshCw size={16} /> Edit & resubmit</button> : null}{['APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISH_FAILED'].includes(selected.status) ? <button className="button dark full" onClick={() => setPublisher(selected)}><Send size={16} /> {selected.status === 'APPROVED' ? 'Publish with Blotato' : 'Manage Blotato publication'}</button> : null}{selected.status === 'APPROVED' ? <p className="approval-note"><Check size={15} /> Approved by client</p> : null}<History draft={selected} /></div></div></section> : <section className="empty-card"><Layers3 size={35} /><h2>Create your first post</h2><p>Choose an image, add a caption, then send it to the client review page.</p><button className="button dark" onClick={() => setComposer({})}><Plus size={16} /> New post</button></section>}</section>
    <SiteFooter />
    {composer && <Composer media={media} initial={composer.id ? composer : null} onClose={() => setComposer(null)} onSave={composer.id ? resubmit : create} working={loading} />}
    {publisher && <BlotatoPanel draft={publisher} onClose={() => setPublisher(null)} onUpdated={onDraftUpdated} />}
    {showResetConfirm && (
      <div className="modal-backdrop">
        <div className="modal-card" style={{ maxWidth: 440 }}>
          <div className="card-heading">
            <h2 style={{ fontSize: 18, margin: 0 }}>Re-send {resetableCount} post{resetableCount !== 1 ? 's' : ''} for approval?</h2>
            <button className="icon-button close" onClick={() => setShowResetConfirm(false)}><X size={18} /></button>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '14px 0' }}>
            All <strong>{resetableCount} post{resetableCount !== 1 ? 's' : ''}</strong> (approved, rejected, and rework) will be reset to <strong>Waiting for client</strong>. The client will be able to review each caption carefully and approve from the beginning.
          </p>
          <p style={{ color: '#92400e', background: '#fef3c7', padding: '10px 12px', borderRadius: 7, fontSize: 12, margin: '0 0 18px' }}>
            ⚠️ This will reset their review state. No posts or images will be deleted.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="button ghost" onClick={() => setShowResetConfirm(false)}>Cancel</button>
            <button className="button dark" disabled={resetting} onClick={handleResetAll}>
              <RotateCcw size={15} />
              {resetting ? 'Resetting…' : `Re-send ${resetableCount} post{resetableCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    )}
  </main>;
}

export default function ApprovalWorkspace({ clientMode }) {
  const [drafts, setDrafts] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [clientLink, setClientLink] = useState('');
  const clientToken = new URLSearchParams(window.location.search).get('token') || '';
  const load = useCallback(async (message = '') => {
    setLoading(true);
    try {
      const endpoints = clientMode ? [`/api/drafts/client?token=${encodeURIComponent(clientToken)}`] : ['/api/drafts', '/api/media', '/api/drafts/client-link'];
      const responses = await Promise.all(endpoints.map(endpoint => fetch(endpoint)));
      if (!responses.every(response => response.ok)) throw new Error('The review board could not be loaded.');
      const data = await Promise.all(responses.map(response => response.json()));
      setDrafts(data[0].drafts || []); if (!clientMode) { setMedia(data[1].resources || []); setClientLink(data[2].url || `${window.location.origin}${window.location.pathname}?client=1&token=${encodeURIComponent(data[2].token)}`); }
      if (message) { setNotice(message); window.setTimeout(() => setNotice(''), 4500); }
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  }, [clientMode, clientToken]);
  useEffect(() => { load(); }, [load]);
  const respond = async (id, payload) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drafts/${id}/client-response`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-client-token': clientToken }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your decision could not be saved.');
      const messages = { approve: 'Approval recorded. The creator can now schedule this post.', product_change: 'Your product request was sent to the creator.', reject: 'This design was marked as rejected.', caption_approve: 'Your caption was saved and the post is approved.' };
      await load(messages[payload.action]);
    } catch (error) { setNotice(error.message); setLoading(false); }
  };
  const updateDraftInPlace = useCallback(updated => setDrafts(current => current.map(draft => draft.id === updated.id ? updated : draft)), []);
  return clientMode ? <ClientPortal drafts={drafts} onRespond={respond} loading={loading} notice={notice} /> : <OwnerPortal drafts={drafts} media={media} refresh={load} loading={loading} notice={notice} clientLink={clientLink} onDraftUpdated={updateDraftInPlace} />;
}
