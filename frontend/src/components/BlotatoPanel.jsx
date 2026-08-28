import { useEffect, useState } from 'react';
import { Check, ChevronDown, Clock3, ExternalLink, LoaderCircle, Radio, Send, UploadCloud, X } from 'lucide-react';

const PLATFORM_LABELS = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  tiktok: 'TikTok',
  threads: 'Threads',
  bluesky: 'Bluesky',
  youtube: 'YouTube'
};
const TERMINAL_STATUSES = new Set(['published', 'failed', 'scheduled']);
const TIME_ZONE = 'Europe/Zurich';

const zonedParts = value => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
}).formatToParts(new Date(value)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));

const genevaDateToIso = value => {
  if (!value) return null;
  const assumedUtc = new Date(`${value}:00Z`);
  const parts = zonedParts(assumedUtc);
  const shownAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(assumedUtc.getTime() - (shownAsUtc - assumedUtc.getTime())).toISOString();
};

const parseAdditionalPosts = value => value
  .split('\n---\n')
  .map(text => text.trim())
  .filter(Boolean)
  .map(text => ({ text, mediaUrls: [] }));

function Field({ label, children }) {
  return <label className="field-label"><span>{label}</span>{children}</label>;
}

function Toggle({ checked, onChange, label }) {
  return <label className="mini-toggle"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function PlatformOptions({ platform, fields, setFields, subaccounts }) {
  const update = (key, value) => setFields(current => ({ ...current, [key]: value }));
  if (platform === 'instagram') return <div className="platform-options">
    <Field label="Alt text"><input value={fields.altText || ''} onChange={event => update('altText', event.target.value)} placeholder="Describe the image" /></Field>
    <Field label="Collaborators"><input value={fields.collaborators || ''} onChange={event => update('collaborators', event.target.value)} placeholder="username, username" /></Field>
    <Toggle checked={fields.shareToFeed !== false} onChange={value => update('shareToFeed', value)} label="Share reel to feed" />
  </div>;

  if (platform === 'pinterest') return <div className="platform-options two-col">
    <Field label="Board ID"><input required value={fields.boardId || ''} onChange={event => update('boardId', event.target.value)} placeholder="Required" /></Field>
    <Field label="Pin title"><input value={fields.title || ''} onChange={event => update('title', event.target.value)} placeholder="NutriFitness" /></Field>
    <Field label="Destination link"><input value={fields.link || ''} onChange={event => update('link', event.target.value)} placeholder="https://nutrifitness.ch" /></Field>
    <Field label="Alt text"><input value={fields.altText || ''} onChange={event => update('altText', event.target.value)} placeholder="Describe the image" /></Field>
  </div>;

  if (platform === 'facebook' || platform === 'linkedin') return <div className="platform-options">
    <Field label={platform === 'facebook' ? 'Facebook page' : 'Company page (optional)'}>
      <select value={fields.pageId || ''} onChange={event => update('pageId', event.target.value)}>
        <option value="">{platform === 'facebook' ? 'Select a page' : 'Personal profile'}</option>
        {subaccounts.map(page => <option key={page.id} value={page.id}>{page.name || page.fullname || page.id}</option>)}
      </select>
    </Field>
    {platform === 'facebook' ? <Field label="Destination link"><input value={fields.link || ''} onChange={event => update('link', event.target.value)} placeholder="Optional URL" /></Field> : null}
  </div>;

  if (platform === 'tiktok') return <div className="platform-options two-col">
    <Field label="Privacy"><select value={fields.privacyLevel || 'PUBLIC_TO_EVERYONE'} onChange={event => update('privacyLevel', event.target.value)}><option value="PUBLIC_TO_EVERYONE">Public</option><option value="MUTUAL_FOLLOW_FRIENDS">Friends</option><option value="SELF_ONLY">Only me</option></select></Field>
    <Field label="Video title"><input value={fields.title || ''} onChange={event => update('title', event.target.value)} /></Field>
    <Toggle checked={Boolean(fields.disabledComments)} onChange={value => update('disabledComments', value)} label="Disable comments" />
    <Toggle checked={Boolean(fields.disabledDuet)} onChange={value => update('disabledDuet', value)} label="Disable duet" />
    <Toggle checked={Boolean(fields.disabledStitch)} onChange={value => update('disabledStitch', value)} label="Disable stitch" />
    <Toggle checked={Boolean(fields.isAiGenerated)} onChange={value => update('isAiGenerated', value)} label="AI-generated" />
  </div>;

  if (platform === 'threads') return <div className="platform-options"><Field label="Who can reply"><select value={fields.replyControl || 'everyone'} onChange={event => update('replyControl', event.target.value)}><option value="everyone">Everyone</option><option value="accounts_you_follow">Accounts you follow</option><option value="mentioned_only">Mentioned only</option></select></Field></div>;

  if (platform === 'youtube') return <div className="platform-options two-col">
    <Field label="Video title"><input required value={fields.title || ''} onChange={event => update('title', event.target.value)} /></Field>
    <Field label="Visibility"><select value={fields.privacyStatus || 'public'} onChange={event => update('privacyStatus', event.target.value)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></Field>
    <Toggle checked={fields.shouldNotifySubscribers !== false} onChange={value => update('shouldNotifySubscribers', value)} label="Notify subscribers" />
    <Toggle checked={Boolean(fields.isMadeForKids)} onChange={value => update('isMadeForKids', value)} label="Made for kids" />
    <Toggle checked={Boolean(fields.containsSyntheticMedia)} onChange={value => update('containsSyntheticMedia', value)} label="Contains synthetic media" />
  </div>;

  return <p className="quiet-note">No extra fields are required for {PLATFORM_LABELS[platform] || platform}.</p>;
}

const compactTarget = (platform, fields) => {
  const target = {};
  const set = (key, value) => { if (value !== '' && value !== undefined && value !== null) target[key] = value; };
  if (platform === 'instagram') {
    set('altText', fields.altText);
    set('collaborators', fields.collaborators ? fields.collaborators.split(',').map(value => value.trim()).filter(Boolean) : undefined);
    set('shareToFeed', fields.shareToFeed !== false);
  } else if (platform === 'pinterest') {
    set('boardId', fields.boardId); set('title', fields.title); set('altText', fields.altText); set('link', fields.link);
  } else if (platform === 'facebook') {
    set('pageId', fields.pageId); set('link', fields.link);
  } else if (platform === 'linkedin') set('pageId', fields.pageId);
  else if (platform === 'tiktok') {
    ['privacyLevel', 'title', 'disabledComments', 'disabledDuet', 'disabledStitch', 'isBrandedContent', 'isYourBrand', 'isAiGenerated'].forEach(key => set(key, fields[key]));
  } else if (platform === 'threads') set('replyControl', fields.replyControl || 'everyone');
  else if (platform === 'youtube') {
    ['title', 'privacyStatus', 'shouldNotifySubscribers', 'isMadeForKids', 'containsSyntheticMedia'].forEach(key => set(key, fields[key]));
  }
  return target;
};

export default function BlotatoPanel({ draft, onClose, onUpdated }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [connection, setConnection] = useState(null);
  const [subaccounts, setSubaccounts] = useState([]);
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [relayMedia, setRelayMedia] = useState(false);
  const [fields, setFields] = useState({
    shareToFeed: true,
    shouldNotifySubscribers: true,
    privacyLevel: 'PUBLIC_TO_EVERYONE',
    disabledComments: false,
    disabledDuet: false,
    disabledStitch: false,
    isBrandedContent: false,
    isYourBrand: true,
    isAiGenerated: false
  });
  const [threadText, setThreadText] = useState('');
  const [working, setWorking] = useState(true);
  const [notice, setNotice] = useState('');
  const [publication, setPublication] = useState(draft.blotatoPublication || null);
  const selectedAccount = accounts.find(account => account.id === selectedAccountId) || accounts[0];
  const platform = selectedAccount?.platform || '';

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/blotato/connection', { signal: controller.signal }),
      fetch('/api/blotato/accounts', { signal: controller.signal })
    ]).then(async ([connectionResponse, accountsResponse]) => {
      const [connectionData, accountsData] = await Promise.all([connectionResponse.json(), accountsResponse.json()]);
      if (!connectionResponse.ok || !accountsResponse.ok) throw new Error(connectionData.error || accountsData.error || 'Blotato could not be loaded.');
      const nextAccounts = accountsData.accounts || [];
      setConnection(connectionData);
      setAccounts(nextAccounts);
      setSelectedAccountId(nextAccounts[0]?.id || '');
    }).catch(error => {
      if (error.name !== 'AbortError') setNotice(error.message);
    }).finally(() => setWorking(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setFields({
      shareToFeed: true,
      shouldNotifySubscribers: true,
      privacyLevel: 'PUBLIC_TO_EVERYONE',
      disabledComments: false,
      disabledDuet: false,
      disabledStitch: false,
      isBrandedContent: false,
      isYourBrand: true,
      isAiGenerated: false
    });
    setSubaccounts([]);
    if (!selectedAccount || !['facebook', 'linkedin'].includes(selectedAccount.platform)) return;
    fetch(`/api/blotato/accounts/${encodeURIComponent(selectedAccount.id)}/subaccounts`)
      .then(response => response.json().then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Pages could not be loaded.');
        setSubaccounts(data.subaccounts || []);
      })
      .catch(error => setNotice(error.message));
  }, [selectedAccountId, platform]);

  useEffect(() => {
    const submissionId = publication?.postSubmissionId;
    if (!submissionId || TERMINAL_STATUSES.has(publication.status)) return undefined;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/drafts/${draft.id}/blotato-publication`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Publication status could not be checked.');
        if (cancelled) return;
        setPublication(data.publication);
        onUpdated?.(data.draft);
        if (TERMINAL_STATUSES.has(data.publication.status)) window.clearInterval(timer);
      } catch (error) {
        if (!cancelled) setNotice(error.message);
      }
    }, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [draft.id, publication?.postSubmissionId, publication?.status, onUpdated]);

  const publish = async () => {
    if (!selectedAccount) return setNotice('Select a Blotato account.');
    if (platform === 'pinterest' && !fields.boardId?.trim()) return setNotice('Pinterest requires a board ID.');
    if (platform === 'facebook' && !fields.pageId) return setNotice('Facebook requires a page.');
    if (platform === 'youtube' && !fields.title?.trim()) return setNotice('YouTube requires a title.');
    if (scheduleMode === 'date' && !scheduledTime) return setNotice('Choose a Geneva posting date.');

    setWorking(true);
    setNotice('');
    try {
      const response = await fetch(`/api/drafts/${draft.id}/blotato-publication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          platform,
          target: compactTarget(platform, fields),
          scheduledTime: scheduleMode === 'date' ? genevaDateToIso(scheduledTime) : null,
          useNextFreeSlot: scheduleMode === 'next',
          relayMedia,
          additionalPosts: ['twitter', 'threads', 'bluesky'].includes(platform) ? parseAdditionalPosts(threadText) : []
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The post could not be sent to Blotato.');
      setPublication(data.publication);
      onUpdated?.(data.draft);
      setNotice(data.publication.isMock ? 'Preview submission created. Add a Blotato API key for live publishing.' : 'Post sent to Blotato.');
    } catch (error) { setNotice(error.message); }
    finally { setWorking(false); }
  };

  return <div className="modal-backdrop"><section className="publish-panel" role="dialog" aria-modal="true" aria-label="Publish with Blotato">
    <header className="panel-header"><div><p className="eyebrow">BLOTATO PUBLISHING</p><h2>Publish approved post</h2></div><button className="icon-button" aria-label="Close publishing panel" onClick={onClose}><X size={18} /></button></header>
    <div className={`connection-line ${connection?.connected ? 'live' : 'preview'}`}><Radio size={15} /><span>{connection?.connected ? 'Live connection' : 'Preview mode'}</span><small>{connection?.message}</small></div>
    {notice ? <div className="panel-notice">{notice}</div> : null}
    <div className="publish-layout">
      <div className="publish-preview"><img src={draft.media?.secure_url} alt="Approved post" /><PillLine platform={platform} status={publication?.status} /></div>
      <div className="publish-form">
        <Field label="Connected account"><select value={selectedAccount?.id || ''} onChange={event => setSelectedAccountId(event.target.value)} disabled={working}>{accounts.map(account => <option key={account.id} value={account.id}>{PLATFORM_LABELS[account.platform] || account.platform} · @{account.username || account.fullname || account.id}</option>)}</select></Field>
        <div className="schedule-switch" aria-label="Publishing time"><button className={scheduleMode === 'now' ? 'active' : ''} onClick={() => setScheduleMode('now')}>Now</button><button className={scheduleMode === 'date' ? 'active' : ''} onClick={() => setScheduleMode('date')}>Schedule</button><button className={scheduleMode === 'next' ? 'active' : ''} onClick={() => setScheduleMode('next')}>Next slot</button></div>
        {scheduleMode === 'date' ? <Field label="Geneva posting date"><input type="datetime-local" value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} /></Field> : null}
        <PlatformOptions platform={platform} fields={fields} setFields={setFields} subaccounts={subaccounts} />
        {['twitter', 'threads', 'bluesky'].includes(platform) ? <Field label="Thread continuation (separate posts with ---)"><textarea rows="4" value={threadText} onChange={event => setThreadText(event.target.value)} placeholder={'Second post\n---\nThird post'} /></Field> : null}
        <details className="publish-advanced"><summary>Media options <ChevronDown size={15} /></summary><Toggle checked={relayMedia} onChange={setRelayMedia} label="Copy media to Blotato before publishing" /><p>Direct public URLs are supported. Enable this only when a platform rejects the source URL.</p></details>
        <button className="button dark publish-submit" disabled={working || !selectedAccount} onClick={publish}>{working ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}{scheduleMode === 'now' ? 'Send to Blotato' : 'Schedule with Blotato'}</button>
      </div>
    </div>
    {publication ? <footer className="publication-footer"><div><span className="status-dot" /><strong>{publication.status || 'queued'}</strong><small>{publication.postSubmissionId}</small></div>{publication.publicUrl ? <a href={publication.publicUrl} target="_blank" rel="noreferrer">View post <ExternalLink size={14} /></a> : <span><Clock3 size={14} /> Status checks automatically</span>}</footer> : null}
  </section></div>;
}

function PillLine({ platform, status }) {
  return <div className="preview-meta"><span>{PLATFORM_LABELS[platform] || 'Select account'}</span>{status ? <strong><Check size={13} /> {status}</strong> : null}</div>;
}
