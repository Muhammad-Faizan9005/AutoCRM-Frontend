import React, { useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, MessageSquare, RefreshCw, Send, ShieldCheck, UserRound } from 'lucide-react';
import { API_BASE } from '../api/client';

const STORAGE_KEY = 'autocrm_public_chat';
const HUMAN_REQUEST_TEXT = "I'd like to talk to a team member, please.";
const MEETING_REQUEST_TEXT = "I'd like to book a meeting.";

const formatTime = (v) => (v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

const readStoredSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.session_id && parsed?.visitor_token ? parsed : null;
  } catch {
    return null;
  }
};

export default function PublicChat() {
  const [session, setSession] = useState(readStoredSession);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('active');
  const [summary, setSummary] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState('');
  const [consentName, setConsentName] = useState('');
  const [consentEmail, setConsentEmail] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [starting, setStarting] = useState(false);
  const endRef = useRef(null);
  const streamControllerRef = useRef(null);

  const abandonSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setMessages([]);
    setStatus('active');
    setSummary('');
  };

  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      setBooting(false);
      return;
    }
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/frontdesk/public/sessions/${stored.session_id}`, {
          headers: { 'X-Visitor-Token': stored.visitor_token },
        });
        if (!response.ok) {
          abandonSession();
          return;
        }
        const detail = await response.json();
        setSession(stored);
        setMessages(detail.messages || []);
        setStatus(detail.status || 'active');
        setSummary(detail.summary || '');
      } catch {
        setError('Could not restore your conversation. Please start a new chat.');
        abandonSession();
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: busy ? 'auto' : 'smooth' });
  }, [messages, busy]);

  useEffect(() => () => streamControllerRef.current?.abort(), []);

  // Once a teammate takes over, replies arrive out-of-band — poll for them.
  useEffect(() => {
    if (!session || (status !== 'human_live' && status !== 'waiting_human')) return;
    const timer = setInterval(async () => {
      if (busy) return;
      try {
        const response = await fetch(`${API_BASE}/api/frontdesk/public/sessions/${session.session_id}`, {
          headers: { 'X-Visitor-Token': session.visitor_token },
        });
        if (!response.ok) return;
        const detail = await response.json();
        setMessages(detail.messages || []);
        setStatus(detail.status || status);
      } catch { /* transient network error: retry on the next tick */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [session, status, busy]);

  const startChat = async () => {
    if (!consentChecked || starting) return;
    setStarting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/frontdesk/public/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: consentName.trim() || null, email: consentEmail.trim() || null, consent: true }),
      });
      if (!response.ok) throw new Error('Could not start the chat. Please try again.');
      const created = await response.json();
      const next = { session_id: created.session_id, visitor_token: created.visitor_token };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSession(next);
      setStatus(created.status || 'active');
      setMessages([]);
    } catch (e) {
      setError(e.message || 'Could not start the chat.');
    } finally {
      setStarting(false);
    }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !session || busy) return;
    const stamp = Date.now();
    const visitorId = `local-visitor-${stamp}`;
    const assistantId = `local-assistant-${stamp}`;
    const controller = new AbortController();
    streamControllerRef.current = controller;
    setBusy(true);
    setError('');
    setInput('');
    setMessages((current) => [
      ...current,
      { id: visitorId, direction: 'inbound', sender_type: 'visitor', content, created_at: new Date().toISOString() },
      { id: assistantId, direction: 'outbound', sender_type: 'frontdesk_agent', content: '', streaming: true, created_at: new Date().toISOString() },
    ]);

    try {
      const response = await fetch(`${API_BASE}/api/frontdesk/public/sessions/${session.session_id}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-Token': session.visitor_token },
        signal: controller.signal,
        body: JSON.stringify({ content, direction: 'inbound' }),
      });
      if (!response.ok || !response.body) {
        const detail = await response.text();
        throw new Error(detail || 'Ava could not respond right now.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      const consumeEvent = (block) => {
        let event = 'message';
        const dataLines = [];
        block.split(/\r?\n/).forEach((line) => {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        });
        if (!dataLines.length) return;
        let payload;
        try { payload = JSON.parse(dataLines.join('\n')); } catch { payload = { token: dataLines.join('\n') }; }
        event = String(payload.type || (event === 'message' && payload.token != null ? 'token' : event)).toLowerCase();
        if (event === 'message' && (payload === '[DONE]' || payload.done === true)) event = 'done';
        if (event === 'token') {
          const token = payload.token ?? payload.text ?? payload.content ?? '';
          setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, content: item.content + token } : item)));
        } else if (event === 'done') {
          completed = true;
          if (payload.human_live) {
            // A teammate is answering: drop the empty assistant placeholder.
            setStatus('human_live');
            setMessages((current) => current.filter((item) => item.id !== assistantId));
            return;
          }
          if (payload.state?.stage === 'handoff' || payload.handoff) setStatus('waiting_human');
          if (payload.state?.stage === 'completed') setStatus('completed');
          setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, streaming: false } : item)));
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        blocks.forEach(consumeEvent);
        if (done) break;
      }
      if (buffer.trim()) consumeEvent(buffer);
      if (!completed) setMessages((current) => current.map((item) => (item.id === assistantId ? { ...item, streaming: false } : item)));
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Message could not be sent.');
        setMessages((current) => current.filter((item) => item.id !== assistantId));
      }
    } finally {
      if (streamControllerRef.current === controller) streamControllerRef.current = null;
      setBusy(false);
    }
  };

  if (booting) {
    return <div className="pchat-shell"><div className="pchat-boot"><LoaderCircle size={22} className="spin" /> Loading your conversation…</div></div>;
  }

  if (!session) {
    return (
      <div className="pchat-shell">
        <div className="pchat-consent">
          <div className="pchat-brand"><Bot size={30} /><span>AutoCRM</span></div>
          <h1>Chat with Ava</h1>
          <p>Ava is AutoCRM's AI front desk assistant. Ask about our CRM, share what you need help with, or book time with the team.</p>
          <label className="pchat-field">Your name (optional)<input value={consentName} onChange={(e) => setConsentName(e.target.value)} placeholder="Jane Cooper" maxLength={120} /></label>
          <label className="pchat-field">Email (optional)<input value={consentEmail} onChange={(e) => setConsentEmail(e.target.value)} placeholder="jane@company.com" maxLength={120} /></label>
          <label className="pchat-check">
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
            <span>I agree that AutoCRM may process this conversation and my contact details to respond to my request.</span>
          </label>
          {error && <div className="pchat-error">{error}</div>}
          <button className="pchat-start" onClick={startChat} disabled={!consentChecked || starting}>
            {starting ? <LoaderCircle size={16} className="spin" /> : <MessageSquare size={16} />} Start chat
          </button>
          <div className="pchat-privacy"><ShieldCheck size={13} /> Your conversation is kept private and used only to assist you.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pchat-shell">
      <div className="pchat-window">
        <header className="pchat-header">
          <div className="pchat-avatar"><Bot size={19} /></div>
          <div className="pchat-title">
            <strong>Ava · AutoCRM</strong>
            <span>{status === 'human_live' ? 'A team member has joined the chat' : status === 'waiting_human' ? 'Connecting you with a team member' : 'AI assistant · replies instantly'}</span>
          </div>
          <button className="pchat-reset" title="Start a new chat" onClick={() => { streamControllerRef.current?.abort(); abandonSession(); }}><RefreshCw size={15} /></button>
        </header>
        {summary && messages.length === 0 && <div className="pchat-summary">{summary}</div>}
        <div className="pchat-messages">
          {messages.length === 0 && (
            <div className="pchat-empty">
              <div className="pchat-empty-mark"><Bot size={24} /></div>
              <strong>Hi, I'm Ava</strong>
              <span>Tell me a little about your business and what you'd like to improve — I'll point you in the right direction.</span>
            </div>
          )}
          {messages.map((m) => {
            const agent = m.sender_type === 'frontdesk_agent' || m.direction === 'outbound';
            return (
              <div key={m.id} className={`pchat-row ${agent ? 'agent' : 'visitor'}`}>
                <div className="pchat-author">{agent ? <Bot size={13} /> : <UserRound size={13} />}{m.sender_type === 'staff' ? 'Team' : agent ? 'Ava' : 'You'}<time>{formatTime(m.created_at)}</time></div>
                <div className={`pchat-bubble ${m.streaming ? 'is-streaming' : ''}`}>{m.content || (m.streaming && <span className="pchat-thinking"><LoaderCircle size={14} className="spin" /> Thinking</span>)}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {error && <div className="pchat-error inline">{error}</div>}
        <div className="pchat-chips">
          <button disabled={busy} onClick={() => send(MEETING_REQUEST_TEXT)}>Book a meeting</button>
          <button disabled={busy} onClick={() => send(HUMAN_REQUEST_TEXT)}>Talk to a human</button>
        </div>
        <div className="pchat-composer">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Write a message…"
            disabled={busy}
          />
          <button className="pchat-send" onClick={() => send()} disabled={busy || !input.trim()}><Send size={16} /></button>
        </div>
        <footer className="pchat-footer">Powered by AutoCRM</footer>
      </div>
    </div>
  );
}
