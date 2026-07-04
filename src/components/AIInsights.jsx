import React, { useState } from 'react';
import { Bot, CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, ShieldAlert, Sparkles } from 'lucide-react';

const STATUS_TONE = {
  pending: 'badge-warning',
  pending_approval: 'badge-warning',
  auto_approved: 'badge-success',
  approved: 'badge-success',
  rejected: 'badge-danger',
  failed: 'badge-danger',
  completed: 'badge-success',
  dispatched: 'badge-success',
  not_dispatched: 'badge-muted',
};

const labelFor = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const stripMarkdown = (value) => String(value || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/^\s{0,3}#{1,6}\s*/gm, '')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\*([^*]+)\*/g, '$1')
  .replace(/^\s*[-*]\s+/gm, '')
  .replace(/^\s*\d+\.\s+/gm, '')
  .replace(/\s+/g, ' ')
  .trim();

const sentenceClamp = (value, maxLength = 190) => {
  const text = stripMarkdown(value);
  if (!text) return '';
  const bottomLine = text.match(/bottom line:\s*([^#]+)/i)?.[1];
  const source = stripMarkdown(bottomLine || text);
  if (source.length <= maxLength) return source;
  const sentenceEnd = source.search(/[.!?]\s/);
  if (sentenceEnd > 40 && sentenceEnd <= maxLength) return source.slice(0, sentenceEnd + 1);
  return `${source.slice(0, maxLength).replace(/\s+\S*$/, '').trim()}...`;
};

const differentText = (a, b) => (
  stripMarkdown(a).toLowerCase() !== stripMarkdown(b).toLowerCase()
);

export const getInsightPayload = (item) => {
  const payload = item?.payload;
  return payload && typeof payload === 'object' ? payload : {};
};

export const getInsightTitle = (item) => {
  const payload = getInsightPayload(item);
  return sentenceClamp(payload.title || labelFor(item?.trigger_type || item?.action_type) || 'AI Insight', 84);
};

export const getInsightBody = (item) => {
  const payload = getInsightPayload(item);
  return sentenceClamp(
    payload.summary ||
    payload.description ||
    payload.message ||
    payload.content ||
    payload.note_content ||
    item?.reason ||
    '',
    190
  );
};

export const getInsightAction = (item) => {
  const payload = getInsightPayload(item);
  return sentenceClamp(
    payload.next_step ||
    payload.recommended_action ||
    payload.action ||
    payload.follow_up ||
    '',
    150
  );
};

export const getInsightStatus = (item) => (
  item?.approval_status ||
  item?.dispatch_status ||
  item?.run_status ||
  'recorded'
);

export const getInsightToneClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  return STATUS_TONE[normalized] || 'badge-muted';
};

const getInsightIcon = (item) => {
  const action = String(item?.action_type || '').toLowerCase();
  const trigger = String(item?.trigger_type || '').toLowerCase();
  if (action.includes('alert') || trigger.includes('risk')) return ShieldAlert;
  if (action.includes('task')) return CheckCircle2;
  if (action.includes('note') || trigger.includes('summary')) return FileText;
  return Sparkles;
};

const AIInsightCard = ({ item, compact = false }) => {
  const Icon = getInsightIcon(item);
  const title = getInsightTitle(item);
  const body = getInsightBody(item);
  const action = getInsightAction(item);
  const status = getInsightStatus(item);
  const createdAt = formatDateTime(item?.created_at);
  const trigger = labelFor(item?.trigger_type || item?.action_type || 'AI action');
  const reason = sentenceClamp(item?.reason, 120);

  return (
    <article className={`ai-insight-card${compact ? ' ai-insight-card-compact' : ''}`}>
      <div className="ai-insight-icon" aria-hidden="true">
        <Icon size={16} />
      </div>
      <div className="ai-insight-body">
        <div className="ai-insight-topline">
          <div>
            <div className="ai-insight-kicker">{trigger}</div>
            <h3 className="ai-insight-title">{title}</h3>
          </div>
          <span className={`badge ${getInsightToneClass(status)}`}>{labelFor(status)}</span>
        </div>
        {body && <p className="ai-insight-copy">{body}</p>}
        {action && differentText(action, body) && (
          <div className="ai-insight-action">
            <span>Next step</span>
            <strong>{action}</strong>
          </div>
        )}
        <div className="ai-insight-meta">
          {reason && differentText(reason, body) && <span>{reason}</span>}
          {createdAt && (
            <span>
              <Clock3 size={12} />
              {createdAt}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

const AIInsights = ({
  items = [],
  title = 'AI Insights',
  eyebrow = 'Agent Intelligence',
  emptyTitle = 'No AI insights yet',
  emptyDescription = 'AI recommendations will appear here after an agent run.',
  compact = false,
  limit,
  collapsible = false,
  defaultOpen = true,
}) => {
  const visibleItems = Number.isFinite(limit) ? items.slice(0, limit) : items;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`ai-insights-panel${collapsible ? ' ai-insights-panel-collapsible' : ''}`}>
      <div className="ai-insights-header">
        <div className="ai-insights-heading">
          <div className="ai-insights-mark" aria-hidden="true">
            <Bot size={16} />
          </div>
          <div>
            <div className="ai-insights-eyebrow">{eyebrow}</div>
            <h2 className="section-title">{title}</h2>
          </div>
        </div>
        <div className="ai-insights-header-actions">
          <span className="badge badge-purple">{items.length} total</span>
          {collapsible && (
            <button
              className="btn btn-ghost btn-icon"
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? 'Collapse AI insights' : 'Expand AI insights'}
              aria-expanded={open}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
        </div>
      </div>

      {open && (
        visibleItems.length === 0 ? (
          <div className="ai-insights-empty">
            <strong>{emptyTitle}</strong>
            <span>{emptyDescription}</span>
          </div>
        ) : (
          <div className="ai-insights-list">
            {visibleItems.map((item) => (
              <AIInsightCard key={item.id || `${item.action_type}-${item.created_at}`} item={item} compact={compact} />
            ))}
          </div>
        )
      )}
    </section>
  );
};

export default AIInsights;
