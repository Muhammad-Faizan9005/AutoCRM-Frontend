import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Circle, Inbox, LoaderCircle, Mail, MessageSquare, Plus, RefreshCw, RotateCcw, Search, Send, Trash2, UserRound, X } from 'lucide-react';
import { apiFetch } from '../api/client';

const formatTime = (v) => v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
const formatDay = (v) => v ? new Date(v).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
// Minutes left for a rep to join and answer live before the visitor is emailed.
const waitLeft = (v) => v ? Math.ceil((new Date(v).getTime() - Date.now()) / 60000) : 0;

export default function FrontDesk({ user }) {
  const [sessions, setSessions] = useState([]), [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(''), [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const endRef = useRef(null);
  const load = async () => setSessions(await apiFetch('/api/frontdesk/sessions', {}, { cache: false }));
  const open = async (id) => setSelected(await apiFetch(`/api/frontdesk/sessions/${id}`, {}, { cache: false }));
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: busy ? 'auto' : 'smooth' }); }, [selected?.messages, busy]);
  const visible = useMemo(() => sessions.filter((s) => `${s.contact_name || ''} ${s.contact_email || ''} ${s.channel}`.toLowerCase().includes(search.toLowerCase())), [sessions, search]);
  const humanLive = selected?.mode === 'human_live';
  const closed = selected?.status === 'closed';
  const canDelete = ['admin', 'sales_manager'].includes(String(user?.role || ''));
  const minutesLeft = selected?.handoff_wait_until && !selected?.handoff_notified_at ? waitLeft(selected.handoff_wait_until) : 0;
  // Live conversations are driven by the visitor, so poll the open thread.
  useEffect(() => {
    if (!humanLive || !selected?.id) return;
    const id = selected.id;
    const timer = setInterval(() => { if (!busy) open(id).catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [humanLive, selected?.id, busy]);
  // One shared runner: every session control is the same POST-then-refresh.
  const act = async (path, label, method = 'POST') => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { await apiFetch(`/api/frontdesk/sessions/${selected.id}${path}`, { method }); await Promise.all([open(selected.id), load()]); }
    catch (e) { setError(e.message || `Could not ${label}.`); }
    finally { setBusy(false); }
  };
  const joinChat = () => act('/takeover', 'join the conversation');
  const closeChat = () => act('/close', 'close the conversation');
  const reopenChat = () => act('/reopen', 'reopen the conversation');
  const deleteChat = async () => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      await apiFetch(`/api/frontdesk/sessions/${selected.id}`, { method: 'DELETE' });
      setSelected(null); setConfirmDelete(null); await load();
    } catch (e) { setError(e.message || 'Could not delete the conversation.'); }
    finally { setBusy(false); }
  };
  const sendAsStaff = async () => {
    const content = message.trim();
    if (!content || !selected || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await apiFetch(`/api/frontdesk/sessions/${selected.id}/messages`, { method: 'POST', body: JSON.stringify({ content, direction: 'outbound' }) });
      await Promise.all([open(selected.id), load()]);
    } catch (e) { setError(e.message || 'Message could not be sent.'); setMessage(content); }
    finally { setBusy(false); }
  };
  const knownFacts = useMemo(() => {
    const facts = { ...(selected?.discovery_facts || {}), ...((selected?.ai_state && selected.ai_state.known_facts) || {}) };
    return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ''));
  }, [selected]);
  const createChat = async () => { setBusy(true); setError(''); try { const s = await apiFetch('/api/frontdesk/sessions', { method: 'POST', body: JSON.stringify({ channel: 'web_chat', name: 'Test visitor' }) }); await load(); await open(s.id); } catch (e) { setError(e.message || 'Could not start a conversation.'); } finally { setBusy(false); } };
  return <div className="frontdesk-page">
    <header className="frontdesk-header"><div><div className="frontdesk-eyebrow"><Bot size={14} /> AI workspace</div><h1>Front desk</h1><p>Test the customer-facing assistant and review routed conversations.</p></div><div className="frontdesk-header-actions"><a className="btn btn-ghost" href="/chat" target="_blank" rel="noreferrer"><MessageSquare size={16} /> Customer chat</a><button className="btn btn-ghost btn-icon" title="Refresh" onClick={() => load().catch((e) => setError(e.message))}><RefreshCw size={16} /></button><button className="btn btn-primary" onClick={createChat} disabled={busy}><Plus size={16} /> New conversation</button></div></header>
    {error && <div className="frontdesk-error">{error}</div>}
    <div className="frontdesk-workspace">
      <aside className="frontdesk-inbox"><div className="frontdesk-inbox-title"><span><Inbox size={16} /> Conversations</span><span className="badge badge-muted">{sessions.length}</span></div><label className="frontdesk-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" /></label><div className="frontdesk-session-list">{visible.length === 0 ? <div className="frontdesk-list-empty"><MessageSquare size={22} /><strong>No conversations</strong><span>Start a test conversation to talk with the agent.</span></div> : visible.map((s) => <button key={s.id} className={`frontdesk-session ${selected?.id === s.id ? 'active' : ''}`} onClick={() => open(s.id)}><div className="frontdesk-avatar">{s.channel === 'email' ? <Mail size={15} /> : <MessageSquare size={15} />}</div><div className="frontdesk-session-copy"><div><strong>{s.contact_name || s.contact_email || 'Visitor'}</strong><time>{formatDay(s.updated_at)}</time></div><span>{s.channel === 'email' ? 'Email' : 'Web chat'} · {s.status.replaceAll('_', ' ')}</span></div></button>)}</div></aside>
      <main className="frontdesk-chat">{!selected ? <div className="frontdesk-welcome"><div className="frontdesk-agent-mark"><Bot size={27} /></div><h2>Talk to Ava</h2><p>Start a customer conversation and review how the AutoCRM front desk qualifies, routes, and follows up.</p><button className="btn btn-primary" onClick={createChat} disabled={busy}><Plus size={16} /> Start conversation</button></div> : <><div className="frontdesk-chat-header"><div className="frontdesk-avatar large"><UserRound size={18} /></div><div><strong>{selected.contact_name || 'Visitor'}</strong><span className={closed ? 'is-closed' : ''}><Circle size={8} fill="currentColor" /> {selected.status.replaceAll('_', ' ')}</span></div><div className="frontdesk-channel">{selected.channel === 'email' ? <Mail size={14} /> : <MessageSquare size={14} />}{selected.channel === 'email' ? 'Email' : 'Web chat'}</div><div className="frontdesk-session-actions">{closed ? <button className="btn btn-ghost btn-sm" onClick={reopenChat} disabled={busy} title="Reopen and hand back to Ava"><RotateCcw size={15} /> Reopen</button> : <button className="btn btn-ghost btn-sm" onClick={closeChat} disabled={busy} title="Close this conversation"><X size={15} /> Close</button>}{humanLive && !closed && <button className="btn btn-ghost btn-sm" onClick={reopenChat} disabled={busy} title="Hand the conversation back to Ava"><Bot size={15} /> Back to Ava</button>}{canDelete && <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setConfirmDelete(selected.id)} disabled={busy} title="Delete this conversation and its transcript"><Trash2 size={15} /></button>}</div></div>{confirmDelete === selected.id && <div className="frontdesk-confirm">Delete this conversation and its whole transcript? The lead, tasks and notes it created are kept. <button className="btn btn-danger btn-sm" onClick={deleteChat} disabled={busy}>Delete</button><button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button></div>}<div className="frontdesk-messages">{(selected.messages || []).length === 0 && <div className="frontdesk-thread-start"><Bot size={20} /><strong>Ava is ready</strong><span>Send a message as a visitor to begin the conversation.</span></div>}{(selected.messages || []).map((m) => { const agent = m.sender_type === 'frontdesk_agent' || m.direction === 'outbound'; const staff = m.sender_type === 'staff'; return <div key={m.id} className={`frontdesk-message-row ${agent ? 'agent' : 'visitor'}`}><div className="frontdesk-message-author">{agent ? <Bot size={14} /> : <UserRound size={14} />}{staff ? 'You · Team' : agent ? 'Ava · AutoCRM' : selected.contact_name || 'Visitor'}<time>{formatTime(m.created_at)}</time></div><div className={`frontdesk-bubble ${m.streaming ? 'is-streaming' : ''}`}>{m.content || (m.streaming && <span className="frontdesk-thinking"><LoaderCircle size={15} /> Thinking</span>)}</div></div>; })}<div ref={endRef} /></div>{closed ? <div className="frontdesk-composer frontdesk-join"><small>This conversation is closed. Reopen it to let Ava or your team reply again.</small></div> : humanLive ? <div className="frontdesk-composer"><textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAsStaff(); } }} placeholder={`Reply to ${selected.contact_name || 'the visitor'}`} disabled={busy} /><button className="btn btn-primary btn-icon" onClick={sendAsStaff} disabled={busy || !message.trim()} title="Send reply"><Send size={17} /></button><small>You have taken over this conversation · Ava is paused</small></div> : <div className="frontdesk-composer frontdesk-join"><button className="btn btn-primary" onClick={joinChat} disabled={busy}>{busy ? <LoaderCircle size={16} /> : <UserRound size={16} />} Join the chat</button><small>{minutesLeft > 0 ? `The visitor is waiting — join within ${minutesLeft} min to answer live, or they'll be emailed a follow-up instead.` : selected.handoff_notified_at ? 'The wait ran out and the visitor has been emailed. Joining now emails them that you have picked it up.' : 'Ava is handling this conversation. Join to reply yourself — Ava stops once you do.'}</small></div>}</>}</main>
      <aside className="frontdesk-context"><h3>Conversation details</h3>{!selected ? <div className="frontdesk-context-empty">Select a conversation to inspect its discovery stage, identity, routing, and status.</div> : <><div className="frontdesk-detail-grid"><div><span>Stage</span><strong>{selected.discovery_stage || 'greeting'}</strong></div><div><span>Identity</span><strong>{selected.identity_status || 'unknown'}</strong></div></div><div className="frontdesk-detail"><span>Contact</span><strong>{selected.contact_name || 'Unidentified visitor'}</strong><small>{selected.contact_email || 'Email not collected'}</small></div><div className="frontdesk-detail"><span>CRM record</span><strong>{selected.contact_type === 'lead' ? 'Lead linked' : 'Unresolved'}</strong><small>{selected.contact_id ? `Lead ${selected.lead_name || `${String(selected.contact_id).slice(0, 8)}…`}` : 'No CRM record linked'}{selected.lead_owner_name || selected.lead_owner_id ? ` · Owner ${selected.lead_owner_name || `${String(selected.lead_owner_id).slice(0, 8)}…`}` : ''}</small></div><div className="frontdesk-detail-grid"><div><span>Intent</span><strong>{selected.intent || 'Not classified'}</strong></div><div><span>Urgency</span><strong>{selected.urgency || 'Normal'}</strong></div></div><div className="frontdesk-detail"><span>Known facts</span>{Object.keys(knownFacts).length ? <div className="frontdesk-facts">{Object.entries(knownFacts).map(([key, value]) => <div key={key} className="frontdesk-fact"><span>{key.replaceAll('_', ' ')}</span><strong>{String(value)}</strong></div>)}</div> : <small>No discovery facts captured yet.</small>}</div>{selected.summary && <div className="frontdesk-detail"><span>Summary</span><small>{selected.summary}</small></div>}<div className="frontdesk-detail"><span>Handoff</span><strong>{closed ? 'Closed' : selected.handoff_status === 'open' || selected.status === 'waiting_human' ? 'Human review needed' : 'AI handling'}</strong><small>{selected.handoff_reason || 'No handoff requested'}{minutesLeft > 0 ? ` · ${minutesLeft} min left to join live` : selected.handoff_notified_at ? ' · visitor emailed a follow-up' : ''}</small></div></>}</aside>
    </div>
  </div>;
}
