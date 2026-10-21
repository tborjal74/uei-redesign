import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Local storage hook ───────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key)
      return s ? JSON.parse(s) : initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setState(prev => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
        return next
      })
    },
    [key]
  )
  return [state, set]
}

// ─── Week helpers ─────────────────────────────────────────────────────────────

function weekStart(d = new Date()): string {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  c.setDate(c.getDate() - c.getDay())
  return c.toISOString().split('T')[0]
}

function weekEnd(start: string): string {
  const d = new Date(start)
  d.setDate(d.getDate() + 6)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function weekStartLabel(start: string): string {
  return new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JourneyState {
  roleSelected: boolean
  questionAsked: boolean
  sourceOpened: boolean
  responseSaved: boolean
  dismissed: boolean
  collapsed: boolean
}

type MissionStatus = 'available' | 'in-progress' | 'completed' | 'skipped'

interface MissionData {
  id: string
  title: string
  description: string
  estimatedTime: string
  purpose: string
  steps: string[]
  prompt: string
}

interface MissionRecord {
  missionId: string
  status: MissionStatus
  reflection: string
  completedAt?: string
}

interface WeekMissions {
  weekOf: string
  activeMissionId: string
  records: MissionRecord[]
}

type GoalType = 'missions' | 'resources' | 'reflections' | 'custom'

interface Goal {
  id: string
  title: string
  target: number
  unit: string
  type: GoalType
  progress: number
  paused: boolean
  autoRenew: boolean
}

interface WeekGoals {
  weekOf: string
  goals: Goal[]
  trackedResources: string[]
  trackedMissions: string[]
}

// ─── Sample content ───────────────────────────────────────────────────────────

const MISSIONS: MissionData[] = [
  {
    id: 'm1',
    title: 'Craft open-ended questions',
    description: 'Prepare three open-ended questions for your next mentoring conversation.',
    estimatedTime: '10–15 min',
    purpose:
      'Open-ended questions help mentees think more deeply and take ownership of their growth. Practicing these before a conversation builds confidence and leads to richer discussions. This is sample mission content for the prototype.',
    steps: [
      "Think of a recent observation or goal your mentee has shared.",
      'Draft three questions beginning with "What", "How", or "Tell me about…".',
      'Review each — make sure none can be answered with a simple yes or no.',
    ],
    prompt: 'Can you suggest three open-ended questions I could use in my next mentoring conversation?',
  },
  {
    id: 'm2',
    title: 'Explore a UEI resource',
    description: 'Find and read one UEI resource relevant to your current mentoring focus.',
    estimatedTime: '15–20 min',
    purpose:
      'Staying familiar with available resources helps you guide your mentee more effectively and point them to the right support at the right time. This is sample mission content for the prototype.',
    steps: [
      'Ask the assistant for a resource recommendation, or browse the UEI library.',
      'Choose one resource relevant to your current mentoring focus.',
      'Note one insight you could share or apply in your next conversation.',
    ],
    prompt: 'What UEI resources would you recommend for a mentor supporting a new education specialist?',
  },
  {
    id: 'm3',
    title: 'Reflect on your last conversation',
    description: 'Take a few minutes to identify one thing to strengthen in your next conversation.',
    estimatedTime: '5–10 min',
    purpose:
      'Regular reflection is a hallmark of effective mentoring. Even small improvements compound into meaningful growth over a school year. This is sample mission content for the prototype.',
    steps: [
      'Recall your most recent mentoring conversation.',
      'Identify one moment where you could have responded differently.',
      'Write a brief note on what you would try next time.',
    ],
    prompt: 'What are effective strategies for reflecting on mentoring conversations and identifying areas for growth?',
  },
]

const GOAL_PRESETS: Array<{ title: string; target: number; unit: string; type: GoalType }> = [
  { title: 'Complete one mentoring mission', target: 1, unit: 'missions', type: 'missions' },
  { title: 'Explore two resources', target: 2, unit: 'resources', type: 'resources' },
  { title: 'Record one reflection', target: 1, unit: 'reflections', type: 'reflections' },
]

// ─── Icon ─────────────────────────────────────────────────────────────────────

function Ic({ n, s = 16, cls = '' }: { n: string; s?: number; cls?: string }) {
  const map: Record<string, React.ReactElement> = {
    check: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
    'check-circle': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    chevron: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>,
    'chevron-up': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>,
    x: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    edit: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    trash: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
    pause: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
    play: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    plus: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    minus: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    sparkle: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" /></svg>,
    flag: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>,
    'arrow-right': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
    rotate: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.02" /></svg>,
    skip: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>,
    history: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.02" /></svg>,
  }
  return <span className={`inline-flex items-center justify-center ${cls}`} aria-hidden="true">{map[n]}</span>
}

// ─── Confetti (CSS-only, reduced-motion safe) ─────────────────────────────────

function Confetti() {
  const dots = ['#3B69B0', '#2D7A4F', '#F59E0B', '#7C3AED', '#3B69B0', '#2D7A4F']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
      {dots.map((color, i) => (
        <span
          key={i}
          className="absolute w-2 h-2 rounded-full motion-safe:animate-bounce"
          style={{
            background: color,
            top: `${10 + (i % 3) * 25}%`,
            left: `${10 + i * 14}%`,
            animationDelay: `${i * 0.12}s`,
            animationDuration: '0.8s',
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = '#3B69B0', label }: { value: number; max: number; color?: string; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-[#EBF0FA] rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div
        className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#DDE3EE] rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. JOURNEY CARD
// ═══════════════════════════════════════════════════════════════════════════════

const JOURNEY_STEPS = [
  { id: 'roleSelected' as const, label: 'Select your role', action: 'Choose your role above' },
  { id: 'questionAsked' as const, label: 'Ask your first question', action: 'Type a question below' },
  { id: 'sourceOpened' as const, label: 'Explore a source', action: 'Click a source link in a response' },
  { id: 'responseSaved' as const, label: 'Save a useful response', action: 'Click Save on any response' },
]

interface JourneyCardProps {
  journey: JourneyState
  onDismiss: () => void
  onCollapse: () => void
}

export function JourneyCard({ journey, onDismiss, onCollapse }: JourneyCardProps) {
  if (journey.dismissed) return null

  const completed = JOURNEY_STEPS.filter(s => journey[s.id]).length
  const allDone = completed === JOURNEY_STEPS.length

  return (
    <Card className="relative overflow-hidden">
      {allDone && <Confetti />}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              {allDone && <Ic n="sparkle" s={14} cls="text-amber-400" />}
              <h3 className="text-sm font-semibold text-[#1B2D4F]">
                {allDone ? "You're ready to explore" : 'Get started with your Mentor Assistant'}
              </h3>
            </div>
            <p className="text-xs text-[#6B7A99] mt-0.5">
              {allDone
                ? 'You have completed all four steps. The assistant is here whenever you need it.'
                : `${completed} of ${JOURNEY_STEPS.length} steps complete`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onCollapse}
              className="p-1 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8] transition-colors"
              aria-label={journey.collapsed ? 'Expand getting-started steps' : 'Collapse getting-started steps'}
            >
              <Ic n={journey.collapsed ? 'chevron' : 'chevron-up'} s={15} />
            </button>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8] transition-colors"
              aria-label="Dismiss getting-started card"
            >
              <Ic n="x" s={15} />
            </button>
          </div>
        </div>

        <ProgressBar value={completed} max={JOURNEY_STEPS.length} label={`Getting started: ${completed} of ${JOURNEY_STEPS.length} steps complete`} />
      </div>

      {!journey.collapsed && !allDone && (
        <ul className="border-t border-[#DDE3EE] divide-y divide-[#DDE3EE]">
          {JOURNEY_STEPS.map(step => {
            const done = journey[step.id]
            return (
              <li key={step.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center border transition-colors ${done ? 'bg-[#3B69B0] border-[#3B69B0]' : 'border-[#DDE3EE] bg-[#F5F6F8]'}`}
                  aria-hidden="true"
                >
                  {done && <Ic n="check" s={11} cls="text-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${done ? 'line-through text-[#6B7A99]' : 'text-[#1B2D4F]'}`}>{step.label}</span>
                  {!done && <p className="text-[10px] text-[#6B7A99] mt-0.5">{step.action}</p>}
                </div>
                {done && <span className="text-[10px] text-[#2D7A4F] font-medium shrink-0">Done</span>}
              </li>
            )
          })}
        </ul>
      )}

      {!journey.collapsed && allDone && (
        <div className="border-t border-[#DDE3EE] px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {JOURNEY_STEPS.map(step => (
              <span key={step.id} className="flex items-center gap-1 text-[10px] text-[#2D7A4F] bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                <Ic n="check" s={10} cls="text-[#2D7A4F]" /> {step.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MISSION DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface MissionDetailProps {
  mission: MissionData
  record: MissionRecord
  onClose: () => void
  onPromptInsert: (text: string) => void
  onUpdateRecord: (r: Partial<MissionRecord>) => void
}

function MissionDetail({ mission, record, onClose, onPromptInsert, onUpdateRecord }: MissionDetailProps) {
  const [reflection, setReflection] = useState(record.reflection)
  const done = record.status === 'completed'

  const handleComplete = () => {
    onUpdateRecord({ status: 'completed', reflection, completedAt: new Date().toISOString() })
  }

  const handleSkip = () => {
    onUpdateRecord({ status: 'skipped' })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Mission: ${mission.title}`}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg mx-0 sm:mx-4 z-10 max-h-[90vh] overflow-y-auto scroll-area">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#DDE3EE] px-5 py-4 flex items-start gap-3 rounded-t-2xl sm:rounded-t-xl">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-[#3B69B0] uppercase tracking-wide">Sample mission — prototype content</span>
            <h2 className="text-base font-semibold text-[#1B2D4F] mt-0.5">{mission.title}</h2>
            <p className="text-xs text-[#6B7A99] mt-0.5">{mission.estimatedTime}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8] transition-colors" aria-label="Close">
            <Ic n="x" s={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Purpose */}
          <div>
            <p className="text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-1.5">Purpose</p>
            <p className="text-sm text-[#1B2D4F] leading-relaxed">{mission.purpose}</p>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-2">Steps</p>
            <ol className="space-y-2">
              {mission.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-[#1B2D4F]">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[#EBF0FA] text-[#3B69B0] text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                  <span className="leading-snug pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Ask assistant */}
          <div className="bg-[#EBF0FA] border border-[#D0DCF4] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#3B69B0] mb-2">Ask the Assistant for Help</p>
            <p className="text-xs text-[#1B2D4F] leading-snug mb-3 italic">"{mission.prompt}"</p>
            <button
              onClick={() => { onPromptInsert(mission.prompt); onClose() }}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#3B69B0] hover:bg-[#2D4A7A] px-3 py-2 rounded-lg transition-colors"
            >
              <Ic n="arrow-right" s={13} />
              Use This Prompt
            </button>
          </div>

          {/* Reflection */}
          {!done && (
            <div>
              <label htmlFor="mission-reflection" className="block text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-1.5">
                Optional reflection
              </label>
              <textarea
                id="mission-reflection"
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="What did you notice or learn? (optional)"
                className="w-full text-sm text-[#1B2D4F] bg-[#F5F6F8] border border-[#DDE3EE] rounded-lg px-3 py-2.5 outline-none focus:border-[#3B69B0] resize-none placeholder:text-[#6B7A99] leading-relaxed"
                rows={3}
              />
            </div>
          )}

          {done ? (
            <div className="flex items-center gap-2 text-sm text-[#2D7A4F] bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <Ic n="check-circle" s={18} cls="text-[#2D7A4F]" />
              <div>
                <p className="font-medium">Mission Complete</p>
                {record.reflection && <p className="text-xs text-[#6B7A99] mt-0.5 italic">"{record.reflection}"</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleComplete}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#3B69B0] hover:bg-[#2D4A7A] py-2.5 rounded-xl transition-colors"
              >
                <Ic n="check" s={15} />
                Mark Complete
              </button>
              <button
                onClick={handleSkip}
                className="flex items-center gap-1.5 text-xs font-medium text-[#6B7A99] border border-[#DDE3EE] hover:bg-[#F5F6F8] px-4 py-2.5 rounded-xl transition-colors"
              >
                <Ic n="skip" s={13} />
                Skip Mission
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MISSION CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface MissionCardProps {
  weekMissions: WeekMissions
  onUpdate: (wm: WeekMissions) => void
  onPromptInsert: (text: string) => void
  onMissionCompleted: (missionId: string) => void
}

function MissionCard({ weekMissions, onUpdate, onPromptInsert, onMissionCompleted }: MissionCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [altOpen, setAltOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const activeMission = MISSIONS.find(m => m.id === weekMissions.activeMissionId) ?? MISSIONS[0]
  const record = weekMissions.records.find(r => r.missionId === activeMission.id) ?? {
    missionId: activeMission.id, status: 'available' as MissionStatus, reflection: '',
  }

  const updateRecord = (partial: Partial<MissionRecord>) => {
    const updated: MissionRecord = { ...record, ...partial }
    const existing = weekMissions.records.find(r => r.missionId === activeMission.id)
    const records = existing
      ? weekMissions.records.map(r => r.missionId === activeMission.id ? updated : r)
      : [...weekMissions.records, updated]
    onUpdate({ ...weekMissions, records })
    if (partial.status === 'completed') {
      onMissionCompleted(activeMission.id)
      setDetailOpen(false)
    }
  }

  const chooseAlternative = (mId: string) => {
    onUpdate({ ...weekMissions, activeMissionId: mId })
    setAltOpen(false)
  }

  const statusColor: Record<MissionStatus, string> = {
    available: 'text-[#6B7A99] bg-[#F5F6F8]',
    'in-progress': 'text-[#3B69B0] bg-[#EBF0FA]',
    completed: 'text-[#2D7A4F] bg-green-50',
    skipped: 'text-[#6B7A99] bg-[#F5F6F8]',
  }
  const statusLabel: Record<MissionStatus, string> = {
    available: 'Available',
    'in-progress': 'In progress',
    completed: 'Complete',
    skipped: 'Skipped',
  }

  return (
    <>
      <Card>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Ic n="flag" s={14} cls="text-[#3B69B0]" />
              <h3 className="text-sm font-semibold text-[#1B2D4F]">This Week's Mission</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCollapsed(v => !v)} className="p-1 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8]" aria-label={collapsed ? 'Expand' : 'Collapse'}>
                <Ic n={collapsed ? 'chevron' : 'chevron-up'} s={15} />
              </button>
            </div>
          </div>

          {!collapsed && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[record.status]}`}>
                  {statusLabel[record.status]}
                </span>
                <span className="text-[10px] text-[#6B7A99]">{activeMission.estimatedTime}</span>
              </div>
              <p className="text-sm font-medium text-[#1B2D4F]">{activeMission.title}</p>
              <p className="text-xs text-[#6B7A99] mt-1 leading-snug">{activeMission.description}</p>

              {record.status === 'completed' ? (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-[#2D7A4F] font-medium">
                  <Ic n="check-circle" s={14} cls="text-[#2D7A4F]" />
                  Great Work — Mission Complete!
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setDetailOpen(true); updateRecord({ status: 'in-progress' }) }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#3B69B0] hover:bg-[#2D4A7A] px-3 py-2 rounded-lg transition-colors"
                  >
                    {record.status === 'in-progress' ? 'Continue Mission' : 'Start Mission'}
                  </button>
                  <button
                    onClick={() => setAltOpen(v => !v)}
                    className="text-xs text-[#6B7A99] hover:text-[#3B69B0] font-medium px-2 py-2 transition-colors"
                  >
                    Choose Different
                  </button>
                </div>
              )}

              {altOpen && (
                <div className="mt-3 border-t border-[#DDE3EE] pt-3 space-y-1">
                  <p className="text-[10px] text-[#6B7A99] font-semibold uppercase tracking-wide mb-2">Alternative Missions</p>
                  {MISSIONS.filter(m => m.id !== activeMission.id).map(m => (
                    <button
                      key={m.id}
                      onClick={() => chooseAlternative(m.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#EBF0FA] transition-colors"
                    >
                      <p className="text-xs font-medium text-[#1B2D4F]">{m.title}</p>
                      <p className="text-[10px] text-[#6B7A99]">{m.estimatedTime}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {detailOpen && (
        <MissionDetail
          mission={activeMission}
          record={record}
          onClose={() => setDetailOpen(false)}
          onPromptInsert={onPromptInsert}
          onUpdateRecord={updateRecord}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GOAL EDITOR MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface GoalEditorProps {
  goal?: Goal
  onSave: (g: Goal) => void
  onClose: () => void
}

function GoalEditor({ goal, onSave, onClose }: GoalEditorProps) {
  const isNew = !goal
  const [title, setTitle] = useState(goal?.title ?? '')
  const [target, setTarget] = useState(goal?.target ?? 1)
  const [unit, setUnit] = useState(goal?.unit ?? 'activities')
  const [type, setType] = useState<GoalType>(goal?.type ?? 'custom')
  const [autoRenew, setAutoRenew] = useState(goal?.autoRenew ?? false)
  const [presetChosen, setPresetChosen] = useState<string | null>(null)

  const choosePreset = (p: typeof GOAL_PRESETS[0]) => {
    setTitle(p.title); setTarget(p.target); setUnit(p.unit); setType(p.type)
    setPresetChosen(p.title)
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      id: goal?.id ?? uid(),
      title: title.trim(),
      target,
      unit,
      type,
      progress: goal?.progress ?? 0,
      paused: goal?.paused ?? false,
      autoRenew,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={isNew ? 'Add goal' : 'Edit goal'}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md mx-0 sm:mx-4 p-5 z-10 max-h-[90vh] overflow-y-auto scroll-area">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#1B2D4F]">{isNew ? 'Add a Goal' : 'Edit Goal'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8]" aria-label="Close"><Ic n="x" s={18} /></button>
        </div>

        {isNew && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-2">Presets</p>
            <div className="space-y-1.5">
              {GOAL_PRESETS.map(p => (
                <button
                  key={p.title}
                  onClick={() => choosePreset(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${presetChosen === p.title ? 'border-[#3B69B0] bg-[#EBF0FA]' : 'border-[#DDE3EE] hover:border-[#3B69B0]'}`}
                >
                  <p className="text-xs font-medium text-[#1B2D4F]">{p.title}</p>
                  <p className="text-[10px] text-[#6B7A99]">Target: {p.target} {p.unit}</p>
                </button>
              ))}
            </div>
            <div className="my-3 flex items-center gap-2">
              <div className="flex-1 h-px bg-[#DDE3EE]" />
              <span className="text-[10px] text-[#6B7A99] font-medium">OR CUSTOM</span>
              <div className="flex-1 h-px bg-[#DDE3EE]" />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#6B7A99] mb-1" htmlFor="goal-title">Goal title</label>
            <input
              id="goal-title"
              value={title}
              onChange={e => { setTitle(e.target.value); setPresetChosen(null); setType('custom') }}
              placeholder="e.g. Review mentoring strategies"
              className="w-full text-sm text-[#1B2D4F] bg-[#F5F6F8] border border-[#DDE3EE] rounded-lg px-3 py-2 outline-none focus:border-[#3B69B0]"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#6B7A99] mb-1" htmlFor="goal-target">Weekly target</label>
              <input
                id="goal-target"
                type="number"
                min={1}
                max={20}
                value={target}
                onChange={e => setTarget(Math.max(1, Number(e.target.value)))}
                className="w-full text-sm text-[#1B2D4F] bg-[#F5F6F8] border border-[#DDE3EE] rounded-lg px-3 py-2 outline-none focus:border-[#3B69B0]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#6B7A99] mb-1" htmlFor="goal-unit">Unit</label>
              <input
                id="goal-unit"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="e.g. activities"
                className="w-full text-sm text-[#1B2D4F] bg-[#F5F6F8] border border-[#DDE3EE] rounded-lg px-3 py-2 outline-none focus:border-[#3B69B0]"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={e => setAutoRenew(e.target.checked)}
              className="accent-[#3B69B0] w-4 h-4"
            />
            <span className="text-xs text-[#1B2D4F]">Renew automatically each week</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="mt-4 w-full py-2.5 text-sm font-semibold text-white bg-[#3B69B0] hover:bg-[#2D4A7A] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isNew ? 'Add Goal' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GOALS CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface GoalsCardProps {
  weekGoals: WeekGoals
  onUpdate: (wg: WeekGoals) => void
}

function GoalsCard({ weekGoals, onUpdate }: GoalsCardProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined)
  const [collapsed, setCollapsed] = useState(false)
  const [lastUndo, setLastUndo] = useState<{ goalId: string; prev: number } | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goals = weekGoals.goals

  const saveGoal = (g: Goal) => {
    const exists = goals.find(x => x.id === g.id)
    const updated = exists ? goals.map(x => x.id === g.id ? g : x) : [...goals, g]
    onUpdate({ ...weekGoals, goals: updated })
    setEditorOpen(false)
    setEditingGoal(undefined)
  }

  const deleteGoal = (id: string) => {
    onUpdate({ ...weekGoals, goals: goals.filter(g => g.id !== id) })
  }

  const togglePause = (id: string) => {
    onUpdate({ ...weekGoals, goals: goals.map(g => g.id === id ? { ...g, paused: !g.paused } : g) })
  }

  const adjustProgress = (id: string, delta: number) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const prev = goal.progress
    const next = Math.max(0, Math.min(goal.target, prev + delta))
    if (next === prev) return
    onUpdate({ ...weekGoals, goals: goals.map(g => g.id === id ? { ...g, progress: next } : g) })
    if (delta > 0) {
      setLastUndo({ goalId: id, prev })
      if (undoTimer.current) clearTimeout(undoTimer.current)
      undoTimer.current = setTimeout(() => setLastUndo(null), 4000)
    }
  }

  const handleUndo = () => {
    if (!lastUndo) return
    onUpdate({ ...weekGoals, goals: goals.map(g => g.id === lastUndo.goalId ? { ...g, progress: lastUndo.prev } : g) })
    setLastUndo(null)
  }

  const canAdd = goals.length < 3

  const ws = weekGoals.weekOf
  const weekLabel = `${weekStartLabel(ws)} – ${weekEnd(ws)}`

  return (
    <>
      <Card>
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="flex items-center gap-1.5">
                <Ic n="sparkle" s={14} cls="text-amber-400" />
                <h3 className="text-sm font-semibold text-[#1B2D4F]">My Goals</h3>
              </div>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Week of {weekLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              {canAdd && !collapsed && (
                <button
                  onClick={() => { setEditingGoal(undefined); setEditorOpen(true) }}
                  className="p-1 rounded-lg text-[#3B69B0] hover:bg-[#EBF0FA] transition-colors"
                  aria-label="Add goal"
                >
                  <Ic n="plus" s={15} />
                </button>
              )}
              <button onClick={() => setCollapsed(v => !v)} className="p-1 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8]" aria-label={collapsed ? 'Expand goals' : 'Collapse goals'}>
                <Ic n={collapsed ? 'chevron' : 'chevron-up'} s={15} />
              </button>
            </div>
          </div>

          {!collapsed && (
            goals.length === 0 ? (
              <div className="mt-3 text-center py-4">
                <p className="text-xs text-[#6B7A99] mb-2">No goals set for this week.</p>
                <button
                  onClick={() => { setEditingGoal(undefined); setEditorOpen(true) }}
                  className="text-xs font-medium text-[#3B69B0] hover:underline"
                >
                  + Add Your First Goal
                </button>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {goals.map(g => {
                  const pct = g.target > 0 ? Math.min(100, (g.progress / g.target) * 100) : 0
                  const done = g.progress >= g.target
                  return (
                    <li key={g.id} className={`${g.paused ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1B2D4F] leading-snug">{g.title}</p>
                          <p className="text-[10px] text-[#6B7A99] mt-0.5">
                            {g.progress} of {g.target} {g.unit}
                            {done && ' ✓'}
                            {g.paused && ' · Paused'}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {g.type === 'custom' && !g.paused && (
                            <>
                              <button
                                onClick={() => adjustProgress(g.id, -1)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B7A99] hover:bg-[#F5F6F8] border border-[#DDE3EE]"
                                aria-label="Decrease progress"
                              >
                                <Ic n="minus" s={12} />
                              </button>
                              <button
                                onClick={() => adjustProgress(g.id, 1)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B7A99] hover:bg-[#F5F6F8] border border-[#DDE3EE]"
                                aria-label="Increase progress"
                              >
                                <Ic n="plus" s={12} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { setEditingGoal(g); setEditorOpen(true) }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B7A99] hover:bg-[#F5F6F8]"
                            aria-label={`Edit goal: ${g.title}`}
                          >
                            <Ic n="edit" s={12} />
                          </button>
                          <button
                            onClick={() => togglePause(g.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B7A99] hover:bg-[#F5F6F8]"
                            aria-label={g.paused ? `Resume goal: ${g.title}` : `Pause goal: ${g.title}`}
                          >
                            <Ic n={g.paused ? 'play' : 'pause'} s={12} />
                          </button>
                          <button
                            onClick={() => deleteGoal(g.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#6B7A99] hover:bg-red-50 hover:text-red-500"
                            aria-label={`Delete goal: ${g.title}`}
                          >
                            <Ic n="trash" s={12} />
                          </button>
                        </div>
                      </div>
                      <ProgressBar
                        value={g.progress}
                        max={g.target}
                        color={done ? '#2D7A4F' : '#3B69B0'}
                        label={`${g.title}: ${g.progress} of ${g.target} ${g.unit}`}
                      />
                    </li>
                  )
                })}

                {canAdd && (
                  <li>
                    <button
                      onClick={() => { setEditingGoal(undefined); setEditorOpen(true) }}
                      className="w-full flex items-center gap-1.5 text-xs text-[#6B7A99] hover:text-[#3B69B0] transition-colors"
                    >
                      <Ic n="plus" s={13} />
                      Add Goal ({3 - goals.length} remaining)
                    </button>
                  </li>
                )}
              </ul>
            )
          )}

          {/* Undo toast */}
          {lastUndo && (
            <div className="mt-3 flex items-center justify-between bg-[#1B2D4F] text-white rounded-lg px-3 py-2">
              <span className="text-xs">Progress updated</span>
              <button onClick={handleUndo} className="text-xs font-semibold text-[#EBF0FA] hover:text-white ml-3">Undo</button>
            </div>
          )}
        </div>
      </Card>

      {editorOpen && (
        <GoalEditor
          goal={editingGoal}
          onSave={saveGoal}
          onClose={() => { setEditorOpen(false); setEditingGoal(undefined) }}
        />
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS PANEL — main export
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProgressEvents {
  roleSelected: boolean
  questionAsked: boolean
  sourceOpened: boolean
  responseSaved: boolean
}

interface ProgressPanelProps {
  events: ProgressEvents
  onPromptInsert: (text: string) => void
  compact?: boolean
  onClose?: () => void
}

const DEFAULT_JOURNEY: JourneyState = {
  roleSelected: false, questionAsked: false, sourceOpened: false, responseSaved: false,
  dismissed: false, collapsed: false,
}

function makeDefaultWeekMissions(): WeekMissions {
  return { weekOf: weekStart(), activeMissionId: 'm1', records: [] }
}

function makeDefaultWeekGoals(): WeekGoals {
  return { weekOf: weekStart(), goals: [], trackedResources: [], trackedMissions: [] }
}

const DEFAULT_EVENTS: ProgressEvents = { roleSelected: false, questionAsked: false, sourceOpened: false, responseSaved: false }

export function ProgressPanel({ events = DEFAULT_EVENTS, onPromptInsert, compact = false, onClose }: ProgressPanelProps) {
  const [journey, setJourney] = useLocalStorage<JourneyState>('uei_journey', DEFAULT_JOURNEY)
  const [weekMissions, setWeekMissions] = useLocalStorage<WeekMissions>('uei_missions', makeDefaultWeekMissions())
  const [weekGoals, setWeekGoals] = useLocalStorage<WeekGoals>('uei_goals', makeDefaultWeekGoals())

  // Sync week if stale
  useEffect(() => {
    const current = weekStart()
    if (weekMissions.weekOf !== current) {
      setWeekMissions(wm => ({
        weekOf: current,
        activeMissionId: wm.activeMissionId,
        records: [],
      }))
    }
  }, [])

  useEffect(() => {
    const current = weekStart()
    if (weekGoals.weekOf !== current) {
      setWeekGoals(wg => ({
        weekOf: current,
        goals: wg.goals
          .filter(g => g.autoRenew)
          .map(g => ({ ...g, progress: 0 })),
        trackedResources: [],
        trackedMissions: [],
      }))
    }
  }, [])

  // Apply events to journey
  const { roleSelected, questionAsked, sourceOpened, responseSaved } = events ?? DEFAULT_EVENTS
  useEffect(() => {
    setJourney(j => ({
      ...j,
      roleSelected: j.roleSelected || roleSelected,
      questionAsked: j.questionAsked || questionAsked,
      sourceOpened: j.sourceOpened || sourceOpened,
      responseSaved: j.responseSaved || responseSaved,
    }))
  }, [roleSelected, questionAsked, sourceOpened, responseSaved])

  // Auto-update goals for resource/mission events
  const handleResourceTracked = useCallback((resourceId: string) => {
    setWeekGoals(wg => {
      if (wg.trackedResources.includes(resourceId)) return wg
      const goals = wg.goals.map(g =>
        g.type === 'resources' && !g.paused && g.progress < g.target
          ? { ...g, progress: g.progress + 1 }
          : g
      )
      return { ...wg, goals, trackedResources: [...wg.trackedResources, resourceId] }
    })
  }, [setWeekGoals])

  const handleMissionCompleted = useCallback((missionId: string) => {
    setWeekGoals(wg => {
      if (wg.trackedMissions.includes(missionId)) return wg
      const goals = wg.goals.map(g =>
        g.type === 'missions' && !g.paused && g.progress < g.target
          ? { ...g, progress: g.progress + 1 }
          : g
      )
      return { ...wg, goals, trackedMissions: [...wg.trackedMissions, missionId] }
    })
  }, [setWeekGoals])

  const resetDemo = () => {
    setJourney(DEFAULT_JOURNEY)
    setWeekMissions(makeDefaultWeekMissions())
    setWeekGoals(makeDefaultWeekGoals())
  }

  if (compact) {
    // Compact drawer view for active conversation
    return (
      <div className="flex flex-col h-full bg-[#F5F6F8]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDE3EE] bg-white shrink-0">
          <h2 className="text-sm font-semibold text-[#1B2D4F]">My Progress</h2>
          <div className="flex items-center gap-2">
            {onClose && (
              <button onClick={onClose} className="p-1 rounded-lg text-[#6B7A99] hover:bg-[#F5F6F8]" aria-label="Close">
                <Ic n="x" s={16} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area px-3 py-3 space-y-3">
          <JourneyCard
            journey={journey}
            onDismiss={() => setJourney(j => ({ ...j, dismissed: true }))}
            onCollapse={() => setJourney(j => ({ ...j, collapsed: !j.collapsed }))}
          />
          <MissionCard
            weekMissions={weekMissions}
            onUpdate={setWeekMissions}
            onPromptInsert={onPromptInsert}
            onMissionCompleted={handleMissionCompleted}
          />
          <GoalsCard weekGoals={weekGoals} onUpdate={setWeekGoals} />
        </div>
      </div>
    )
  }

  // Full inline view for welcome screen
  return (
    <div className="w-full max-w-xl mx-auto px-0 pb-2 space-y-3">
      <JourneyCard
        journey={journey}
        onDismiss={() => setJourney(j => ({ ...j, dismissed: true }))}
        onCollapse={() => setJourney(j => ({ ...j, collapsed: !j.collapsed }))}
      />
      <MissionCard
        weekMissions={weekMissions}
        onUpdate={setWeekMissions}
        onPromptInsert={onPromptInsert}
        onMissionCompleted={handleMissionCompleted}
      />
      <GoalsCard weekGoals={weekGoals} onUpdate={setWeekGoals} />
    </div>
  )
}
