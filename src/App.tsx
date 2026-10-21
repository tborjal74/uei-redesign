import { useState, useRef, useEffect, useCallback } from 'react'
import { ProgressPanel, type ProgressEvents } from './Progress'

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'mentor' | 'specialist' | 'other'
type MessageRole = 'user' | 'assistant'

interface Source {
  id: string
  title: string
  type: string
  excerpt: string
}

interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

interface Message {
  id: string
  role: MessageRole
  content: string
  sources?: Source[]
  followUps?: string[]
  steps?: string[]
  saved?: boolean
  helpful?: boolean | null
  checklist?: ChecklistItem[] | null
  error?: boolean
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const SAMPLE_SOURCES: Source[] = [
  {
    id: 's1',
    title: 'UEI Mentor Role Overview',
    type: 'Guide',
    excerpt:
      'Mentors in the UEI program support education specialists by modeling best practices, providing feedback on instruction, and helping mentees navigate professional expectations. Effective mentors hold regular check-ins, maintain confidentiality, and focus on growth rather than evaluation.',
  },
  {
    id: 's2',
    title: 'Mentoring Conversation Frameworks',
    type: 'Resource',
    excerpt:
      "A productive mentoring conversation typically includes: (1) a warm-up check-in, (2) a focused topic aligned to the mentee's goals, (3) a reflective debrief, and (4) clear next steps. Using open-ended questions encourages deeper thinking and mentor–mentee trust.",
  },
  {
    id: 's3',
    title: 'UEI Resource Library Index',
    type: 'Index',
    excerpt:
      'The UEI resource library includes curriculum guides, observation templates, professional development modules, and policy references. Resources are organized by topic and grade band. Contact your program coordinator for access credentials.',
  },
  {
    id: 's4',
    title: 'Professional Growth Planning Guide',
    type: 'Template',
    excerpt:
      'A strong professional growth plan identifies two or three specific, measurable goals aligned to state standards. Plans should include evidence sources, timelines, and support needed. Revisit goals with your mentor at least monthly.',
  },
]

const DEMO_RESPONSES: Record<string, Omit<Message, 'id' | 'role'>> = {
  'understand my role as a mentor': {
    content:
      'As a UEI mentor, your primary role is to support and guide education specialists through reflective practice, not to evaluate them. You help your mentee develop instructional skills, navigate the professional environment, and build confidence in their work.',
    steps: [
      'Schedule a first meeting to set expectations and build rapport',
      'Review the UEI Mentor Role Overview document with your mentee',
      'Agree on communication preferences and meeting frequency',
      'Clarify the confidential, non-evaluative nature of the mentoring relationship',
    ],
    sources: [SAMPLE_SOURCES[0], SAMPLE_SOURCES[3]],
    followUps: [
      'What questions should I ask in my first mentoring meeting?',
      'How is mentoring different from supervision?',
      'What records should I keep as a mentor?',
    ],
  },
  'prepare for a mentoring conversation': {
    content:
      'A well-prepared mentoring conversation has a clear focus and leaves the mentee with actionable next steps. Start by reviewing notes from your last meeting and identifying one or two priority topics.',
    steps: [
      'Review your previous meeting notes and any agreed action items',
      'Ask your mentee in advance what they want to focus on',
      'Prepare two or three open-ended questions to prompt reflection',
      'Set aside 45–60 minutes and choose a private, comfortable space',
      'Follow up in writing within 24 hours with key takeaways',
    ],
    sources: [SAMPLE_SOURCES[1]],
    followUps: [
      'What are good open-ended questions for a mentoring conversation?',
      'How do I handle a mentee who is struggling?',
      'How do I keep conversations focused without being rigid?',
    ],
  },
  'find relevant uei resources': {
    content:
      "UEI maintains a library of curriculum guides, observation templates, and professional development materials. Access depends on your role and program phase — your program coordinator can provide credentials if you don't already have them.",
    steps: [
      "Log in to the UEI resource portal using your program credentials",
      'Browse by topic area or use the search to find specific materials',
      'Download templates relevant to your current mentoring focus',
      'Contact your coordinator if a resource seems missing or outdated',
    ],
    sources: [SAMPLE_SOURCES[2]],
    followUps: [
      'Which resources are most useful for new mentors?',
      'How do I share resources with my mentee?',
      'Can I suggest new resources to UEI?',
    ],
  },
  'plan next steps': {
    content:
      'Planning next steps after a mentoring conversation ensures momentum and accountability. A brief written summary shared with your mentee confirms what was discussed and what each person will do before the next meeting.',
    steps: [
      'Summarize the key topics discussed and any insights that emerged',
      'List one to three specific actions the mentee will take',
      'Note anything you as the mentor agreed to follow up on',
      'Set the date and focus for your next meeting',
      'Send the summary to your mentee within 24 hours',
    ],
    sources: [SAMPLE_SOURCES[3], SAMPLE_SOURCES[1]],
    followUps: [
      'How do I help a mentee who is not following through on next steps?',
      'Should I track progress toward goals over multiple sessions?',
      'How detailed should my follow-up notes be?',
    ],
  },
}

const STARTER_CARDS = [
  {
    label: 'Understand my role',
    icon: '🎓',
    prompt: 'What is my role and responsibility as a UEI mentor?',
    key: 'understand my role as a mentor',
  },
  {
    label: 'Prepare for a conversation',
    icon: '💬',
    prompt: 'How should I prepare for an upcoming mentoring conversation?',
    key: 'prepare for a mentoring conversation',
  },
  {
    label: 'Find UEI resources',
    icon: '📚',
    prompt: 'Where can I find relevant UEI resources for my mentoring work?',
    key: 'find relevant uei resources',
  },
  {
    label: 'Plan next steps',
    icon: '✅',
    prompt: 'How do I plan effective next steps after a mentoring conversation?',
    key: 'plan next steps',
  },
]

const ROLE_LABELS: Record<Role, string> = {
  mentor: 'Mentor',
  specialist: 'Education Specialist',
  other: 'Other',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function getDemoResponse(input: string): Omit<Message, 'id' | 'role'> {
  const lower = input.toLowerCase()
  for (const [key, resp] of Object.entries(DEMO_RESPONSES)) {
    if (lower.includes(key) || key.split(' ').filter(w => w.length > 4).some(w => lower.includes(w))) {
      return resp
    }
  }
  return {
    content:
      "I wasn't able to find specific UEI guidance on that topic. For authoritative answers, please consult your program coordinator or the official UEI documentation.",
    sources: [],
    followUps: [
      'What mentoring resources does UEI provide?',
      'How do I contact my program coordinator?',
      'Can you help me prepare for a mentoring conversation?',
    ],
  }
}

// ─── UEI Logo SVG ─────────────────────────────────────────────────────────────

function UEILogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size * 1.7}
      height={size}
      viewBox="0 0 85 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Education Utah Initiative logo"
      role="img"
    >
      {/* Book pages fanning */}
      <g transform="translate(54, 4)">
        <line x1="14" y1="28" x2="6" y2="4" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="10" y2="3" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="14" y2="3" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="18" y2="3" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="22" y2="4" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="25" y2="7" stroke="#1B2D4F" strokeWidth="1.5" strokeLinecap="round" />
        {/* Book base */}
        <path d="M4 28 Q14 32 24 28" stroke="#1B2D4F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
      {/* Text: EDUCATION */}
      <text x="0" y="18" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="700" fill="#1B2D4F" letterSpacing="0.5">
        EDUCATION
      </text>
      {/* Text: UTAH (larger) */}
      <text x="0" y="31" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="800" fill="#1B2D4F" letterSpacing="0.3">
        UTAH
      </text>
      {/* Text: INITIATIVE */}
      <text x="0" y="42" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="700" fill="#1B2D4F" letterSpacing="0.5">
        INITIATIVE
      </text>
    </svg>
  )
}

// ─── Icon components ──────────────────────────────────────────────────────────

function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const icons: Record<string, React.ReactElement> = {
    menu: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    x: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    send: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
    stop: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
    copy: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
    bookmark: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
    'bookmark-fill': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
    'thumb-up': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
    ),
    'thumb-down': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
      </svg>
    ),
    list: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    'chevron-left': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    ),
    'chevron-down': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    ),
    help: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    refresh: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
    external: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    ),
    sparkle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  }
  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      {icons[name] ?? null}
    </span>
  )
}

// ─── Source Panel ─────────────────────────────────────────────────────────────

function SourcePanel({ source, onClose }: { source: Source; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Source: ${source.title}`}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg mx-0 sm:mx-4 p-6 z-10 max-h-[80vh] overflow-y-auto scroll-area">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mb-1.5">{source.type}</span>
            <h2 className="text-base font-semibold text-[#1B2D4F]">{source.title}</h2>
            <p className="text-xs text-[#6B7A99] mt-0.5">Sample resource — for prototype purposes</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-[#6B7A99] hover:bg-gray-100 transition-colors"
            aria-label="Close source panel"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="border border-[#DDE3EE] rounded-lg p-4 bg-[#F5F6F8]">
          <p className="text-sm text-[#1B2D4F] leading-relaxed">{source.excerpt}</p>
        </div>
        <p className="mt-4 text-xs text-[#6B7A99]">
          This is a labeled sample excerpt for prototype purposes. Verify all guidance with official UEI sources.
        </p>
        <button
          className="mt-3 flex items-center gap-1.5 text-xs text-[#3B69B0] hover:underline"
          onClick={onClose}
        >
          <Icon name="external" size={12} />
          Open full resource (placeholder)
        </button>
      </div>
    </div>
  )
}

// ─── Checklist Modal ──────────────────────────────────────────────────────────

function ChecklistModal({ items, onClose, onUpdate }: { items: ChecklistItem[]; onClose: () => void; onUpdate: (items: ChecklistItem[]) => void }) {
  const toggle = (id: string) => {
    onUpdate(items.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }
  const done = items.filter(i => i.done).length
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Checklist">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md mx-0 sm:mx-4 p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#1B2D4F]">Your Checklist</h2>
            <p className="text-xs text-[#6B7A99]">{done} of {items.length} complete</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7A99] hover:bg-gray-100 transition-colors" aria-label="Close checklist">
            <Icon name="x" size={18} />
          </button>
        </div>
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id}>
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-[#F5F6F8] transition-colors text-left group"
                aria-pressed={item.done}
              >
                <span className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${item.done ? 'bg-[#3B69B0] border-[#3B69B0]' : 'border-[#DDE3EE] group-hover:border-[#3B69B0]'}`}>
                  {item.done && <Icon name="check" size={11} className="text-white" />}
                </span>
                <span className={`text-sm leading-snug transition-colors ${item.done ? 'line-through text-[#6B7A99]' : 'text-[#1B2D4F]'}`}>
                  {item.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 h-1.5 bg-[#EBF0FA] rounded-full overflow-hidden">
          <div className="h-full bg-[#3B69B0] rounded-full transition-all duration-500" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  onSave,
  onHelpful,
  onSourceClick,
  onFollowUp,
  onChecklist,
}: {
  message: Message
  onSave: (id: string) => void
  onHelpful: (id: string, val: boolean) => void
  onSourceClick: (source: Source) => void
  onFollowUp: (text: string) => void
  onChecklist: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-[#3B69B0] text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.error) {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-[#EBF0FA] flex items-center justify-center mt-0.5">
          <span className="text-xs font-bold text-[#3B69B0]">A</span>
        </div>
        <div className="flex-1 max-w-[75%]">
          <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-red-700 font-medium">Something went wrong</p>
            <p className="text-xs text-red-500 mt-1">Could not retrieve a response. Please try again.</p>
            <button
              onClick={() => onFollowUp(message.content)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <Icon name="refresh" size={12} />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 shrink-0 rounded-full bg-[#EBF0FA] flex items-center justify-center mt-0.5">
        <span className="text-xs font-bold text-[#3B69B0]">A</span>
      </div>
      <div className="flex-1 min-w-0">
        {/* Main answer */}
        <div className="bg-white border border-[#DDE3EE] rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm">
          <p className="text-sm text-[#1B2D4F] leading-relaxed">{message.content}</p>

          {/* Next steps */}
          {message.steps && message.steps.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-2">Practical next steps</p>
              <ol className="space-y-1.5">
                {message.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-[#1B2D4F]">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#EBF0FA] text-[#3B69B0] text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#DDE3EE]">
              <p className="text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-2">Sources</p>
              <div className="flex flex-wrap gap-2">
                {message.sources.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onSourceClick(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-[#D0DCF4] bg-[#EBF0FA] text-[#3B69B0] hover:bg-[#D0DCF4] transition-colors font-medium"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Checklist */}
          {message.checklist && (
            <div className="mt-3 pt-3 border-t border-[#DDE3EE]">
              <button
                onClick={() => onChecklist(message.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-[#3B69B0] hover:text-[#1B2D4F] transition-colors"
              >
                <Icon name="list" size={13} />
                View checklist ({message.checklist.filter(i => i.done).length}/{message.checklist.length} done)
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-[#6B7A99] hover:bg-white hover:text-[#1B2D4F] hover:border-[#DDE3EE] border border-transparent transition-all"
            aria-label="Copy response"
          >
            <Icon name="copy" size={13} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => onSave(message.id)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${message.saved ? 'text-[#3B69B0] bg-[#EBF0FA] border-[#D0DCF4]' : 'text-[#6B7A99] hover:bg-white hover:text-[#1B2D4F] hover:border-[#DDE3EE] border-transparent'}`}
            aria-label={message.saved ? 'Saved' : 'Save response'}
          >
            <Icon name={message.saved ? 'bookmark-fill' : 'bookmark'} size={13} />
            {message.saved ? 'Saved' : 'Save'}
          </button>
          {message.steps && message.steps.length > 0 && !message.checklist && (
            <button
              onClick={() => onChecklist(message.id)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-[#6B7A99] hover:bg-white hover:text-[#1B2D4F] hover:border-[#DDE3EE] border border-transparent transition-all"
              aria-label="Create checklist from next steps"
            >
              <Icon name="list" size={13} />
              Create checklist
            </button>
          )}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-xs text-[#6B7A99]">Helpful?</span>
            <button
              onClick={() => onHelpful(message.id, true)}
              className={`p-1.5 rounded-lg border transition-all ${message.helpful === true ? 'text-[#2D7A4F] bg-green-50 border-green-200' : 'text-[#6B7A99] hover:bg-white hover:border-[#DDE3EE] border-transparent'}`}
              aria-label="Mark as helpful"
              aria-pressed={message.helpful === true}
            >
              <Icon name="thumb-up" size={13} />
            </button>
            <button
              onClick={() => onHelpful(message.id, false)}
              className={`p-1.5 rounded-lg border transition-all ${message.helpful === false ? 'text-[#B03B3B] bg-red-50 border-red-200' : 'text-[#6B7A99] hover:bg-white hover:border-[#DDE3EE] border-transparent'}`}
              aria-label="Mark as not helpful"
              aria-pressed={message.helpful === false}
            >
              <Icon name="thumb-down" size={13} />
            </button>
          </div>
        </div>

        {/* Follow-up chips */}
        {message.followUps && message.followUps.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-[#DDE3EE] text-[#3B69B0] hover:bg-[#EBF0FA] hover:border-[#D0DCF4] transition-all font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Loading bubble ───────────────────────────────────────────────────────────

function LoadingBubble() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 shrink-0 rounded-full bg-[#EBF0FA] flex items-center justify-center mt-0.5">
        <span className="text-xs font-bold text-[#3B69B0]">A</span>
      </div>
      <div className="bg-white border border-[#DDE3EE] rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-[#3B69B0]" />
          <span className="typing-dot w-2 h-2 rounded-full bg-[#3B69B0]" />
          <span className="typing-dot w-2 h-2 rounded-full bg-[#3B69B0]" />
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  conversations,
  activeId,
  savedMessages,
  onNew,
  onSelect,
  onClose,
  searchQuery,
  onSearch,
  tab,
  onTab,
}: {
  conversations: Conversation[]
  activeId: string
  savedMessages: Message[]
  onNew: () => void
  onSelect: (id: string) => void
  onClose?: () => void
  searchQuery: string
  onSearch: (q: string) => void
  tab: 'recent' | 'saved'
  onTab: (t: 'recent' | 'saved') => void
}) {
  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="flex flex-col h-full bg-white border-r border-[#DDE3EE] w-64">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#DDE3EE]">
        <span className="text-xs font-semibold text-[#6B7A99] uppercase tracking-wide">Navigation</span>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-[#6B7A99] hover:bg-gray-100 transition-colors" aria-label="Close sidebar">
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {/* New conversation */}
      <div className="px-3 py-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#DDE3EE] text-[#3B69B0] hover:bg-[#EBF0FA] hover:border-[#D0DCF4] transition-all text-sm font-medium"
        >
          <Icon name="plus" size={16} />
          New conversation
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-2 bg-[#F5F6F8] rounded-lg border border-[#DDE3EE]">
          <Icon name="search" size={14} className="text-[#6B7A99]" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-transparent text-xs text-[#1B2D4F] placeholder:text-[#6B7A99] outline-none min-w-0"
            aria-label="Search conversations"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pb-2">
        <div className="flex rounded-lg border border-[#DDE3EE] overflow-hidden text-xs font-medium">
          <button
            onClick={() => onTab('recent')}
            className={`flex-1 py-1.5 transition-colors ${tab === 'recent' ? 'bg-[#3B69B0] text-white' : 'text-[#6B7A99] hover:bg-[#F5F6F8]'}`}
          >
            Recent
          </button>
          <button
            onClick={() => onTab('saved')}
            className={`flex-1 py-1.5 transition-colors ${tab === 'saved' ? 'bg-[#3B69B0] text-white' : 'text-[#6B7A99] hover:bg-[#F5F6F8]'}`}
          >
            Saved
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scroll-area px-2 pb-3">
        {tab === 'recent' ? (
          filtered.length === 0 ? (
            <p className="text-xs text-[#6B7A99] text-center px-4 py-6">No conversations yet</p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map(c => (
                <li key={c.id}>
                  <button
                    onClick={() => { onSelect(c.id); onClose?.() }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${c.id === activeId ? 'bg-[#EBF0FA] text-[#1B2D4F] font-medium' : 'text-[#1B2D4F] hover:bg-[#F5F6F8]'}`}
                  >
                    <p className="text-xs truncate">{c.title}</p>
                    <p className="text-[10px] text-[#6B7A99] mt-0.5">{c.messages.length} messages</p>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : savedMessages.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Icon name="bookmark" size={24} className="text-[#DDE3EE] mx-auto mb-2" />
            <p className="text-xs text-[#6B7A99]">No saved responses yet.</p>
            <p className="text-[10px] text-[#6B7A99] mt-1">Save a helpful answer to revisit it here.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {savedMessages.map(msg => (
              <li key={msg.id} className="px-3 py-2.5 rounded-lg bg-[#F5F6F8] border border-[#DDE3EE]">
                <p className="text-xs text-[#1B2D4F] line-clamp-3 leading-snug">{msg.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────

function WelcomeScreen({
  role,
  onRole,
  onCard,
}: {
  role: Role
  onRole: (r: Role) => void
  onCard: (prompt: string) => void
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold text-[#1B2D4F] mb-2">How can I help you today?</h1>
      <p className="text-sm text-[#6B7A99] max-w-sm mb-8">
        Find guidance, explore UEI resources, and plan your next steps.
      </p>

      {/* Role selector */}
      <div className="flex items-center gap-2 mb-8 flex-wrap justify-center">
        <span className="text-xs text-[#6B7A99] font-medium">I am a</span>
        {(['mentor', 'specialist', 'other'] as Role[]).map(r => (
          <button
            key={r}
            onClick={() => onRole(r)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${role === r ? 'bg-[#3B69B0] text-white border-[#3B69B0]' : 'border-[#DDE3EE] text-[#6B7A99] hover:border-[#3B69B0] hover:text-[#3B69B0]'}`}
            aria-pressed={role === r}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Starter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {STARTER_CARDS.map(card => (
          <button
            key={card.key}
            onClick={() => onCard(card.prompt)}
            className="flex items-start gap-3 p-4 bg-white border border-[#DDE3EE] rounded-xl hover:border-[#3B69B0] hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
          >
            <span className="text-xl shrink-0 mt-0.5">{card.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[#1B2D4F] group-hover:text-[#3B69B0] transition-colors">{card.label}</p>
              <p className="text-xs text-[#6B7A99] mt-0.5 leading-snug">{card.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string>('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileDrawer, setMobileDrawer] = useState(false)
  const [role, setRole] = useState<Role>('mentor')
  const fireEvent = useCallback((key: keyof ProgressEvents) => {
    setProgressEvents(prev => prev[key] ? prev : { ...prev, [key]: true })
  }, [])
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [activeChecklist, setActiveChecklist] = useState<{ msgId: string; items: ChecklistItem[] } | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'saved'>('recent')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressEvents, setProgressEvents] = useState<ProgressEvents>({
    roleSelected: false, questionAsked: false, sourceOpened: false, responseSaved: false,
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const stopFlagRef = useRef(false)
  const progressDropdownRef = useRef<HTMLDivElement>(null)

  // Close progress dropdown on outside click
  useEffect(() => {
    if (!progressOpen) return
    const handler = (e: MouseEvent) => {
      if (progressDropdownRef.current && !progressDropdownRef.current.contains(e.target as Node)) {
        setProgressOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [progressOpen])

  const activeConv = conversations.find(c => c.id === activeConvId)

  const savedMessages = conversations
    .flatMap(c => c.messages)
    .filter(m => m.saved && m.role === 'assistant')

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages.length, loading])

  const newConversation = useCallback(() => {
    setActiveConvId('')
    setInput('')
    textareaRef.current?.focus()
  }, [])

  const updateMessages = (convId: string, updater: (msgs: Message[]) => Message[]) => {
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, messages: updater(c.messages) } : c)
    )
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: uid(), role: 'user', content: text.trim() }

    let convId = activeConvId
    if (!convId) {
      convId = uid()
      const newConv: Conversation = {
        id: convId,
        title: text.trim().slice(0, 48) + (text.trim().length > 48 ? '…' : ''),
        messages: [userMsg],
        createdAt: new Date(),
      }
      setConversations(prev => [newConv, ...prev])
      setActiveConvId(convId)
    } else {
      updateMessages(convId, msgs => [...msgs, userMsg])
    }

    setInput('')
    setLoading(true)
    stopFlagRef.current = false

    await new Promise(r => setTimeout(r, 900 + Math.random() * 600))

    if (stopFlagRef.current) {
      setLoading(false)
      return
    }

    fireEvent('questionAsked')
    const demoResp = getDemoResponse(text)
    const assistantMsg: Message = { id: uid(), role: 'assistant', helpful: null, ...demoResp }

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
    )
    setLoading(false)
  }, [activeConvId, loading, fireEvent])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleStop = () => {
    stopFlagRef.current = true
    setLoading(false)
  }

  const handleSave = (msgId: string) => {
    if (!activeConvId) return
    updateMessages(activeConvId, msgs =>
      msgs.map(m => m.id === msgId ? { ...m, saved: !m.saved } : m)
    )
    fireEvent('responseSaved')
  }

  const handleHelpful = (msgId: string, val: boolean) => {
    if (!activeConvId) return
    updateMessages(activeConvId, msgs =>
      msgs.map(m => m.id === msgId ? { ...m, helpful: m.helpful === val ? null : val } : m)
    )
  }

  const handleChecklist = (msgId: string) => {
    const msg = activeConv?.messages.find(m => m.id === msgId)
    if (!msg) return

    if (msg.checklist) {
      setActiveChecklist({ msgId, items: msg.checklist })
      return
    }

    if (!msg.steps) return
    const items: ChecklistItem[] = msg.steps.map(s => ({ id: uid(), text: s, done: false }))
    updateMessages(activeConvId, msgs =>
      msgs.map(m => m.id === msgId ? { ...m, checklist: items } : m)
    )
    setActiveChecklist({ msgId, items })
  }

  const handleChecklistUpdate = (items: ChecklistItem[]) => {
    if (!activeChecklist) return
    setActiveChecklist(prev => prev ? { ...prev, items } : null)
    updateMessages(activeConvId, msgs =>
      msgs.map(m => m.id === activeChecklist.msgId ? { ...m, checklist: items } : m)
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F6F8]">
      {/* Desktop sidebar */}
      <div className={`hidden md:flex transition-all duration-200 ${sidebarOpen ? 'w-64' : 'w-0'} overflow-hidden shrink-0`}>
        {sidebarOpen && (
          <Sidebar
            conversations={conversations}
            activeId={activeConvId}
            savedMessages={savedMessages}
            onNew={newConversation}
            onSelect={setActiveConvId}
            searchQuery={sidebarSearch}
            onSearch={setSidebarSearch}
            tab={sidebarTab}
            onTab={setSidebarTab}
          />
        )}
      </div>

      {/* Mobile drawer */}
      {mobileDrawer && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileDrawer(false)} />
          <div className="relative z-10 h-full w-64 flex-shrink-0">
            <Sidebar
              conversations={conversations}
              activeId={activeConvId}
              savedMessages={savedMessages}
              onNew={() => { newConversation(); setMobileDrawer(false) }}
              onSelect={setActiveConvId}
              onClose={() => setMobileDrawer(false)}
              searchQuery={sidebarSearch}
              onSearch={setSidebarSearch}
              tab={sidebarTab}
              onTab={setSidebarTab}
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#DDE3EE] shrink-0">
          <button
            onClick={() => {
              if (window.innerWidth >= 768) setSidebarOpen(v => !v)
              else setMobileDrawer(v => !v)
            }}
            className="p-1.5 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8] transition-colors"
            aria-label="Toggle sidebar"
          >
            {(sidebarOpen || mobileDrawer) ? <Icon name="chevron-left" size={18} /> : <Icon name="menu" size={18} />}
          </button>

          <div className="flex items-center gap-2.5">
            <UEILogo size={32} />
            <div className="h-5 w-px bg-[#DDE3EE] hidden sm:block" />
            <span className="hidden sm:block text-sm font-semibold text-[#1B2D4F]">Mentor Assistant</span>
          </div>

          <div className="flex-1" />

          {/* My Progress dropdown trigger — always visible */}
          <div className="relative" ref={progressDropdownRef}>
            <button
              onClick={() => setProgressOpen(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${progressOpen ? 'bg-[#EBF0FA] border-[#D0DCF4] text-[#3B69B0]' : 'text-[#6B7A99] border-transparent hover:border-[#DDE3EE] hover:bg-[#F5F6F8] hover:text-[#1B2D4F]'}`}
              aria-label="My Progress"
              aria-expanded={progressOpen}
              aria-haspopup="true"
            >
              <Icon name="sparkle" size={15} />
              <span className="hidden sm:inline">My Progress</span>
              <Icon name="chevron-down" size={13} className={`hidden sm:inline transition-transform duration-200 ${progressOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown panel */}
            {progressOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 max-h-[calc(100vh-80px)] flex flex-col rounded-xl border border-[#DDE3EE] shadow-xl bg-[#F5F6F8] overflow-hidden">
                <ProgressPanel
                  events={progressEvents}
                  onPromptInsert={text => { setInput(text); textareaRef.current?.focus(); setProgressOpen(false) }}
                  compact
                  onClose={() => setProgressOpen(false)}
                />
              </div>
            )}
          </div>

          <button
            className="flex items-center gap-1.5 text-xs font-medium text-[#6B7A99] hover:text-[#1B2D4F] px-3 py-2 rounded-lg border border-transparent hover:border-[#DDE3EE] hover:bg-white transition-all"
            aria-label="Help"
          >
            <Icon name="help" size={15} />
            <span className="hidden sm:inline">Help</span>
          </button>
        </header>

        {/* Chat content + optional progress drawer */}
        <div className="flex flex-1 min-h-0">
          {/* Chat column */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <div className="flex-1 overflow-y-auto scroll-area" aria-live="polite" aria-label="Conversation">
              {!activeConv || activeConv.messages.length === 0 ? (
                <WelcomeScreen
                  role={role}
                  onRole={r => { setRole(r); fireEvent('roleSelected') }}
                  onCard={prompt => {
                    setInput(prompt)
                    textareaRef.current?.focus()
                  }}
                />
              ) : (
                <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                  {activeConv.messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onSave={handleSave}
                      onHelpful={handleHelpful}
                      onSourceClick={s => { setSelectedSource(s); fireEvent('sourceOpened') }}
                      onFollowUp={text => { setInput(text); textareaRef.current?.focus() }}
                      onChecklist={handleChecklist}
                    />
                  ))}
                  {loading && <LoadingBubble />}
                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 bg-white border-t border-[#DDE3EE] px-4 pt-3 pb-4">
              <div className="max-w-2xl mx-auto">
                {loading && (
                  <div className="flex justify-center mb-2">
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#6B7A99] border border-[#DDE3EE] bg-white px-3 py-1.5 rounded-full hover:bg-[#F5F6F8] transition-colors"
                    >
                      <Icon name="stop" size={12} />
                      Stop generating
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 bg-[#F5F6F8] border border-[#DDE3EE] rounded-xl px-3 py-2 focus-within:border-[#3B69B0] focus-within:ring-1 focus-within:ring-[#3B69B0] transition-all">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your mentoring role or next steps…"
                    className="auto-textarea flex-1 bg-transparent text-sm text-[#1B2D4F] placeholder:text-[#6B7A99] outline-none leading-relaxed py-1"
                    aria-label="Message input"
                    disabled={loading}
                    rows={1}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="shrink-0 mb-0.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#3B69B0] hover:bg-[#2D4A7A] text-white"
                    aria-label="Send message"
                  >
                    <Icon name="send" size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-[#6B7A99] text-center mt-2 leading-snug px-2">
                  Based on UEI-provided resources. Responses may contain errors; verify important guidance with official sources.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Source panel */}
      {selectedSource && (
        <SourcePanel source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}

      {/* Checklist modal */}
      {activeChecklist && (
        <ChecklistModal
          items={activeChecklist.items}
          onClose={() => setActiveChecklist(null)}
          onUpdate={handleChecklistUpdate}
        />
      )}
    </div>
  )
}
