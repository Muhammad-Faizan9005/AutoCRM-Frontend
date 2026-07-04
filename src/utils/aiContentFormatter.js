const emojiPattern = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const sectionHeadingPattern = /\s*(?:#{1,6}\s*)?(Pipeline Overview|Key Observations|Recommended Actions|Next Steps|Note)\s*:?\s*/gi;
const implementationDetailPattern = /\b(RAG|FAISS|embedding|embeddings|prompt|token|tokens|memory)\b/i;

const cleanLine = (line) => String(line || '')
  .replace(emojiPattern, '')
  .replace(/#{1,6}\s*/g, '')
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/\s*[-=]{3,}\s*/g, ' ')
  .replace(/^\s*(?:[-*]+|\d+[.)])\s*/, '')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^[\s*:;-]+|[\s*:;*-]+$/g, '');

const splitSummaryCandidates = (value) => {
  const prepared = String(value || '')
    .replace(/\\n/g, '\n')
    .replace(sectionHeadingPattern, '\n$1: ')
    .replace(/\s+(?=\d+[.)]\s+)/g, '\n');

  const candidates = [];
  for (const rawLine of prepared.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const dashParts = line.split(/\s+[-\u2013\u2014]\s+(?=[A-Z0-9])/);
    for (const part of dashParts) {
      candidates.push(...part.split(/\s+(?=\d+[.)]\s+)/).map((item) => item.trim()).filter(Boolean));
    }
  }

  if (candidates.length <= 1) {
    return prepared.split(/\s+(?=(?:Follow up|Deal risk|Task due|Meeting note|Data gap|Review|Confirm|Schedule|Investigate|Update|Capture):)/i);
  }
  return candidates;
};

export const formatAiSummaryLines = (value) => {
  const lines = splitSummaryCandidates(value);

  const skippedPrefixes = [
    'daily crm summary',
    'pipeline overview',
    'key observations',
    'recommended actions',
    'next steps',
    'note:',
    'date:',
    'role:',
    'status:',
  ];
  const removablePrefixes = ['key observations:', 'recommended actions:', 'next steps:'];

  const cleaned = [];
  for (const line of lines) {
    let item = cleanLine(line);
    if (!item) continue;
    const lower = item.toLowerCase();
    if (skippedPrefixes.some((prefix) => lower.startsWith(prefix))) continue;
    const removablePrefix = removablePrefixes.find((prefix) => lower.startsWith(prefix));
    if (removablePrefix) {
      item = item.slice(removablePrefix.length).replace(/^[-:;\s]+/, '').trim();
    }
    if (!item) continue;
    if (implementationDetailPattern.test(item)) continue;
    if (item.length > 180) item = `${item.slice(0, 177).trim()}...`;
    cleaned.push(item);
    if (cleaned.length >= 6) break;
  }

  return cleaned.length
    ? cleaned
    : ['No meaningful CRM activity was available today. Review open leads, pending tasks, and active deals for updates.'];
};
