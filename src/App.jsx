import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_TASKS = 'todo.tasks.v1'
const STORAGE_PROFILE = 'todo.profile.v1'
const STORAGE_PRESETS = 'todo.presets.v1'

const LANG = {
  ZH: 'zh-CN',
  EN: 'en',
}

const DEFAULT_PROFILE = {
  name: '你',
  avatar: '',
  lang: LANG.ZH,
  title: 'To‑Do',
  theme: 'soft-white',
}

const DEFAULT_PRESETS = ['作业', '健身', '开会']

// 6 种主题颜色配置
const THEMES = [
  { id: 'soft-white', name: 'Soft White', bgClass: 'from-zinc-50 to-white', textClass: 'text-zinc-900' },
  { id: 'deep-grey', name: 'Deep Grey', bgClass: 'from-zinc-900 to-zinc-950', textClass: 'text-zinc-100' },
  { id: 'sakura-pink', name: 'Sakura Pink', bgClass: 'from-rose-50 to-white', textClass: 'text-zinc-900' },
  { id: 'mint-green', name: 'Mint Green', bgClass: 'from-emerald-50 to-white', textClass: 'text-zinc-900' },
  { id: 'morandi-blue', name: 'Morandi Blue', bgClass: 'from-sky-50 to-white', textClass: 'text-zinc-900' },
  { id: 'creamy-yellow', name: 'Creamy Yellow', bgClass: 'from-amber-50 to-white', textClass: 'text-zinc-900' },
]

const PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

const PRIORITY_RANK = {
  [PRIORITY.HIGH]: 3,
  [PRIORITY.MEDIUM]: 2,
  [PRIORITY.LOW]: 1,
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isTomorrow(ts, nowTs) {
  const d = new Date(ts)
  const n = new Date(nowTs)
  const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const nMid = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()
  const diffDays = Math.round((dMid - nMid) / (24 * 60 * 60 * 1000))
  return diffDays === 1
}

function startOfLocalDay(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999)
  const ts = dt.getTime()
  return Number.isFinite(ts) ? ts : null
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_TASKS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        id: typeof t.id === 'string' ? t.id : uid(),
        title: typeof t.title === 'string' ? t.title : '',
        priority: [PRIORITY.HIGH, PRIORITY.MEDIUM, PRIORITY.LOW].includes(t.priority)
          ? t.priority
          : PRIORITY.MEDIUM,
        done: Boolean(t.done),
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
        dueAt: typeof t.dueAt === 'number' ? t.dueAt : null,
        completedAt: typeof t.completedAt === 'number' ? t.completedAt : null,
      }))
      .filter((t) => t.title.trim().length > 0)
  } catch {
    return []
  }
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE)
    if (!raw) return DEFAULT_PROFILE
    const p = JSON.parse(raw)
    const lang = p?.lang === LANG.EN || p?.lang === LANG.ZH ? p.lang : LANG.ZH
    const theme = THEMES.find(t => t.id === p?.theme)?.id || THEMES[0].id
    return {
      name: typeof p?.name === 'string' && p.name.trim() ? p.name.trim() : '你',
      avatar: typeof p?.avatar === 'string' ? p.avatar : '',
      lang,
      title:
        typeof p?.title === 'string' && p.title.trim()
          ? p.title.trim()
          : (TEXT?.[lang]?.title || DEFAULT_PROFILE.title),
      theme,
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_PRESETS)
    if (!raw) return DEFAULT_PRESETS
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return DEFAULT_PRESETS
    const cleaned = arr
      .filter((x) => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30)
    return cleaned.length ? cleaned : DEFAULT_PRESETS
  } catch {
    return DEFAULT_PRESETS
  }
}

function formatDate(ts) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleDateString()
  }
}

function formatDateTime(ts, lang) {
  try {
    return new Intl.DateTimeFormat(lang === LANG.EN ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

function avatarNode(avatar) {
  if (avatar) {
    return <img src={avatar} alt="avatar" className="h-10 w-10 rounded-2xl object-cover" />
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    </div>
  )
}

const PRIORITY_META = {
  [PRIORITY.HIGH]: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-200' },
  [PRIORITY.MEDIUM]: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
  [PRIORITY.LOW]: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
}

function monthTitle(d, lang) {
  try {
    return new Intl.DateTimeFormat(lang === LANG.EN ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'long',
    }).format(d)
  } catch {
    return `${d.getFullYear()}-${d.getMonth() + 1}`
  }
}

const TEXT = {
  [LANG.ZH]: {
    title: 'To‑Do',
    subtitle: '自动按优先级排序（高 > 中 > 低）',
    remaining: (n) => (n === 0 ? '全部完成了' : `还有 ${n} 条待办`),
    addPlaceholder: '添加一个任务…（例如：整理邮箱）',
    add: '添加',
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
    hasDDL: '设置截止日期',
    sortBy: '排序方式',
    sortByPriority: '按重要性',
    sortByDeadline: '按截止日期',
    noTasks: '还没有任务',
    noTasksHint: '在上面输入标题并选择优先级，然后回车。',
    noTasksDate: (d) => `所选日期（${d}）没有任务`,
    ddlNone: '无 DDL',
    ddlSoon: '（24h 内）',
    ddlOverdue: '（已超期）',
    clearCompleted: '清除已完成',
    clearAll: '清空',
    delete: '删除',
    completedAt: (s) => `完成时间：${s}`,
    presetsAdd: '添加常用预设',
    presetsModalTitle: '添加常用预设',
    presetsModalDesc: '例如：复盘、读书、买菜',
    presetsPlaceholder: '输入一个常用选项',
    nicknamePlaceholder: '输入昵称',
    profileTitle: '用户信息 / 设置',
    profileDesc: '修改昵称、头像和语言（保存在本地）',
    uploadAvatar: '上传头像',
    removeAvatar: '移除',
    cancel: '取消',
    save: '保存',
    language: '语言 / Language',
    appTitleLabel: 'App Name / 应用名称',
    themeLabel: '主题背景',
    settingsSection: '设置',
    clearData: '清空所有数据',
    clearDataDesc: '包括任务、常用预设和用户配置',
    clearConfirmTitle: '确认清空',
    clearConfirmText: '你确定要清空所有任务和配置吗？此操作不可逆。',
    clearConfirmOk: '彻底清空',
    clearConfirmCancel: '取消',
    calendarTitle: 'DDL 日历',
    calendarHint: '点击某一天可以筛选该日 DDL 任务；再次点击可取消筛选。',
    clearFilter: '清除筛选',
    weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    footer: (k) => `数据已自动保存到 localStorage（${k}）`,
  },
  [LANG.EN]: {
    title: 'To‑Do',
    subtitle: 'Auto-sorted by priority (High > Medium > Low)',
    remaining: (n) => (n === 0 ? 'All done' : `${n} task${n === 1 ? '' : 's'} remaining`),
    addPlaceholder: 'Add a task… (e.g. Clean inbox)',
    add: 'Add',
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Low priority',
    hasDDL: 'Has DDL',
    sortBy: 'Sort by',
    sortByPriority: 'Priority',
    sortByDeadline: 'Deadline',
    noTasks: 'No tasks yet',
    noTasksHint: 'Type a title, choose priority, then press Enter.',
    noTasksDate: (d) => `No tasks on ${d}`,
    ddlNone: 'No DDL',
    ddlSoon: '(within 24h)',
    ddlOverdue: '(overdue)',
    clearCompleted: 'Clear completed',
    clearAll: 'Clear all',
    delete: 'Delete',
    completedAt: (s) => `Completed at ${s}`,
    presetsAdd: 'Add quick preset',
    presetsModalTitle: 'Add quick preset',
    presetsModalDesc: 'Examples: Review, Reading, Groceries',
    presetsPlaceholder: 'Enter a preset',
    nicknamePlaceholder: 'Nickname',
    profileTitle: 'Settings',
    profileDesc: 'Update name, avatar and language (saved locally)',
    uploadAvatar: 'Upload avatar',
    removeAvatar: 'Remove',
    cancel: 'Cancel',
    save: 'Save',
    language: 'Language',
    appTitleLabel: 'App Name / 应用名称',
    themeLabel: 'Theme background',
    settingsSection: 'Settings',
    clearData: 'Clear all data',
    clearDataDesc: 'Tasks, presets and user settings will be removed',
    clearConfirmTitle: 'Clear all data',
    clearConfirmText: 'Are you sure you want to remove all tasks and settings? This cannot be undone.',
    clearConfirmOk: 'Clear everything',
    clearConfirmCancel: 'Cancel',
    calendarTitle: 'Deadline calendar',
    calendarHint: 'Click a date to filter tasks with DDL on that day; click again to clear.',
    clearFilter: 'Clear filter',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    footer: (k) => `Auto-saved to localStorage (${k})`,
  },
}

export default function App() {
  const [tasks, setTasks] = useState(() => loadTasks())
  const [profile, setProfile] = useState(() => loadProfile())
  const [presets, setPresets] = useState(() => loadPresets())

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(PRIORITY.MEDIUM)
  // 页面刷新时 hasDDL 始终为 false
  const [hasDDL, setHasDDL] = useState(false)
  const [dueDate, setDueDate] = useState('')

  const [nowTs, setNowTs] = useState(() => Date.now())

  const [profileOpen, setProfileOpen] = useState(false)
  const [draftName, setDraftName] = useState(profile.name)
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar)
  const [draftLang, setDraftLang] = useState(profile.lang)
  const [draftTitle, setDraftTitle] = useState(profile.title || TEXT[profile.lang || LANG.ZH].title)
  const [draftTheme, setDraftTheme] = useState(() => {
    const saved = profile.theme
    return THEMES.find(t => t.id === saved)?.id || THEMES[0].id
  })
  const avatarInputRef = useRef(null)

  const [presetOpen, setPresetOpen] = useState(false)
  const [presetDraft, setPresetDraft] = useState('')

  const [selectedDateStr, setSelectedDateStr] = useState('')
  const inputRef = useRef(null)

  const [sortMode, setSortMode] = useState('priority') // 'priority' | 'deadline'

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const [ddlPickerOpen, setDdlPickerOpen] = useState(false)
  const [ddlPickerMonth, setDdlPickerMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // DDL 记忆逻辑：记住上一个任务的 DDL 状态
  const [lastHasDDL, setLastHasDDL] = useState(false)

  const lang = profile.lang
  const t = TEXT[lang] || TEXT[LANG.ZH]

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TASKS, JSON.stringify(tasks))
    } catch {
      // ignore
    }
  }, [tasks])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile))
    } catch {
      // ignore
    }
  }, [profile])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESETS, JSON.stringify(presets))
    } catch {
      // ignore
    }
  }, [presets])

  useEffect(() => {
    setNowTs(Date.now())
    const id = setInterval(() => setNowTs(Date.now()), 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    setDraftName(profile.name)
    setDraftAvatar(profile.avatar)
    setDraftLang(profile.lang)
    setDraftTitle(profile.title || TEXT[profile.lang || LANG.ZH].title)
    setDraftTheme(THEMES.find(t => t.id === profile.theme)?.id || THEMES[0].id)
  }, [profileOpen, profile])

  function toDateStr(ts) {
    const d = new Date(ts)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  const sortedTasks = useMemo(() => {
    const compareWithinGroup = (a, b) => {
      if (sortMode === 'deadline') {
        const aHas = !!a.dueAt
        const bHas = !!b.dueAt
        if (aHas && bHas && a.dueAt !== b.dueAt) return a.dueAt - b.dueAt
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
        if (pr !== 0) return pr
        return b.createdAt - a.createdAt
      }
      // priority mode
      const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      if (pr !== 0) return pr
      if (a.dueAt && b.dueAt && a.dueAt !== b.dueAt) return a.dueAt - b.dueAt
      if (a.dueAt && !b.dueAt) return -1
      if (!a.dueAt && b.dueAt) return 1
      return b.createdAt - a.createdAt
    }

    const unfinished = tasks.filter((t) => !t.done).sort(compareWithinGroup)
    const finished = tasks.filter((t) => t.done).sort(compareWithinGroup)
    const all = [...unfinished, ...finished]

    if (!selectedDateStr) return all
    return all.filter((t) => t.dueAt && toDateStr(t.dueAt) === selectedDateStr)
  }, [tasks, sortMode, selectedDateStr])

  const remaining = tasks.filter((t) => !t.done).length

  function handleAddTask(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    if (hasDDL && !dueDate) return
    const now = Date.now()
    const dueAt = hasDDL ? startOfLocalDay(dueDate) : null
    const next = {
      id: uid(),
      title: trimmed,
      priority,
      done: false,
      createdAt: now,
      dueAt,
      completedAt: null,
    }
    setTasks((prev) => [next, ...prev])
    setTitle('')
    setPriority(PRIORITY.MEDIUM)
    // 记住当前任务的 DDL 状态
    setLastHasDDL(hasDDL)
    // 如果上一个任务有 DDL，保持勾选状态方便连续添加
    setHasDDL(hasDDL ? true : lastHasDDL)
    // 如果没有 DDL，清空日期；如果有 DDL，保留日期方便连续输入
    if (!hasDDL) setDueDate('')
  }

  function toggleDone(id) {
    const now = Date.now()
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              done: !t.done,
              completedAt: !t.done ? now : null,
            }
          : t,
      ),
    )
  }

  function removeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function clearCompleted() {
    setTasks((prev) => prev.filter((t) => !t.done))
  }

  function clearAll() {
    setTasks([])
  }

  function usePreset(text) {
    setTitle(text)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function addPreset() {
    const v = presetDraft.trim()
    if (!v) return
    setPresets((prev) => [v, ...prev.filter((x) => x !== v)].slice(0, 30))
    setPresetDraft('')
    setPresetOpen(false)
  }

  function removePreset(v) {
    setPresets((prev) => prev.filter((x) => x !== v))
  }

  function saveProfile() {
    const name = draftName.trim() || '你'
    const langNext = draftLang === LANG.EN ? LANG.EN : LANG.ZH
    const title =
      draftTitle.trim() || (TEXT[langNext]?.title || DEFAULT_PROFILE.title)
    const theme = draftTheme || THEMES[0].id
    setProfile({ name, avatar: draftAvatar || '', lang: langNext, title, theme })
    setProfileOpen(false)
  }

  function onPickAvatar(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type?.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setDraftAvatar(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function dayHasDue(dateStr) {
    return tasks.some((t) => t.dueAt && (() => {
      const d = new Date(t.dueAt)
      const s = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      return s === dateStr
    })())
  }

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startWeekday = first.getDay() // 0-6 (Sun-Sat)
    const mondayIndex = startWeekday === 0 ? 7 : startWeekday
    const leading = mondayIndex - 1
    const cells = []
    for (let i = 0; i < leading; i++) cells.push(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calendarMonth])

  function handleClearAllData() {
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
    setTasks([])
    setPresets(DEFAULT_PRESETS)
    setProfile(DEFAULT_PROFILE)
    setSelectedDateStr('')
    setTitle('')
    setPriority(PRIORITY.MEDIUM)
    setHasDDL(false)
    setDueDate('')
    setLastHasDDL(false)
    setProfileOpen(false)
    setClearConfirmOpen(false)
  }

  // 获取当前主题背景样式
  const currentTheme = THEMES.find(t => t.id === profile.theme) || THEMES[0]

  return (
    <div
      className={[
        'min-h-screen bg-gradient-to-b transition-colors duration-500',
        currentTheme.bgClass,
      ].join(' ')}
    >
      {/* 左上角用户按钮 */}
      <div className="fixed left-4 top-4 z-20">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="group flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-2 shadow-sm backdrop-blur hover:bg-white/80"
        >
          <div className="relative">
            {avatarNode(profile.avatar)}
            <span className="pointer-events-none absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-zinc-900">{profile.name}</div>
            <div className="text-xs text-zinc-500">{lang === LANG.EN ? 'Edit profile' : '点击编辑'}</div>
          </div>
        </button>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                  {profile.title || t.title}
                </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {t.remaining(remaining)}
                <span className="mx-2 text-zinc-300">·</span>
                {t.subtitle}
              </p>
            </div>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
                >
                  {t.clearCompleted}
                </button>
              </div>
          </div>
        </header>

        <main className="rounded-3xl border border-zinc-200/70 bg-white/80 p-4 shadow-soft-xl backdrop-blur sm:p-6">
          {/* 添加任务区域 */}
          <form onSubmit={handleAddTask} className="flex flex-col gap-3">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.addPlaceholder}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition-all focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
            />

            <div className="flex flex-wrap items-center gap-2">
              {/* DDL 切换按钮 */}
              <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDDL}
                  onChange={(e) => {
                    const next = e.target.checked
                    setHasDDL(next)
                    if (!next) setDueDate('')
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200"
                />
                <span>{t.hasDDL}</span>
              </label>

              {/* 日期选择器 - 点击弹出日历 */}
              <div
                className={[
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm transition-all cursor-pointer',
                  hasDDL && dueDate
                    ? 'bg-white border-zinc-200 text-zinc-900'
                    : hasDDL
                    ? 'bg-white border-zinc-200 text-zinc-400'
                    : 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed',
                ].join(' ')}
                onClick={() => {
                  if (!hasDDL) return
                  const base = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : todayStr()
                  const [y, m] = base.split('-').map(Number)
                  if (y && m) {
                    setDdlPickerMonth(new Date(y, m - 1, 1))
                  }
                  setDdlPickerOpen(true)
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 flex-none"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" ry="2" />
                  <path d="M8 3v4M16 3v4M3 9h18" strokeLinecap="round" />
                </svg>
                <span>
                  {dueDate ? dueDate : t.ddlNone}
                </span>
              </div>

              {/* 优先级 Clickbox */}
              <div className="flex items-center gap-1 rounded-xl bg-zinc-50 px-2 py-1.5 text-xs shadow-sm transition-all">
                <button
                  type="button"
                  onClick={() => setPriority(PRIORITY.HIGH)}
                  className={[
                    'rounded-lg border px-2.5 py-1.5 text-center text-xs transition-all',
                    priority === PRIORITY.HIGH
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                      : 'border-transparent text-zinc-500 hover:border-red-200 hover:bg-red-50/60',
                  ].join(' ')}
                >
                  {t.high}
                </button>
                <button
                  type="button"
                  onClick={() => setPriority(PRIORITY.MEDIUM)}
                  className={[
                    'rounded-lg border px-2.5 py-1.5 text-center text-xs transition-all',
                    priority === PRIORITY.MEDIUM
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                      : 'border-transparent text-zinc-500 hover:border-orange-200 hover:bg-orange-50/60',
                  ].join(' ')}
                >
                  {t.medium}
                </button>
                <button
                  type="button"
                  onClick={() => setPriority(PRIORITY.LOW)}
                  className={[
                    'rounded-lg border px-2.5 py-1.5 text-center text-xs transition-all',
                    priority === PRIORITY.LOW
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-transparent text-zinc-500 hover:border-blue-200 hover:bg-blue-50/60',
                  ].join(' ')}
                >
                  {t.low}
                </button>
              </div>

              {/* 添加按钮 */}
              <button
                type="submit"
                className="ml-auto inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-200"
              >
                {t.add}
              </button>
            </div>
          </form>

          {/* 常用预设栏 */}
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center gap-2 pb-1">
                  {presets.map((p) => (
                    <div key={p} className="group relative whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => usePreset(p)}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 pr-6 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
                      >
                        {p}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePreset(p)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-[10px] text-zinc-400 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPresetOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
              >
                +
              </button>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="mt-6 border-t border-zinc-100 pt-4">
            {/* 排序切换 */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-zinc-500">{t.sortBy}</div>
              <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs shadow-sm transition-all">
                <button
                  type="button"
                  onClick={() => setSortMode('priority')}
                  className={[
                    'rounded-full px-3 py-1.5',
                    sortMode === 'priority' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
                  ].join(' ')}
                >
                  {t.sortByPriority}
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('deadline')}
                  className={[
                    'rounded-full px-3 py-1.5',
                    sortMode === 'deadline' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
                  ].join(' ')}
                >
                  {t.sortByDeadline}
                </button>
              </div>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-zinc-700">{t.noTasks}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedDateStr ? t.noTasksDate(selectedDateStr) : t.noTasksHint}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sortedTasks.map((task) => {
                  const meta = PRIORITY_META[task.priority] || PRIORITY_META[PRIORITY.MEDIUM]
                  const overdue =
                    !task.done && typeof task.dueAt === 'number' && task.dueAt - nowTs < 0
                  const dueSoon =
                    !task.done &&
                    typeof task.dueAt === 'number' &&
                    task.dueAt - nowTs <= 24 * 60 * 60 * 1000 &&
                    task.dueAt - nowTs >= 0
                  const tomorrowSoon =
                    !task.done &&
                    typeof task.dueAt === 'number' &&
                    isTomorrow(task.dueAt, nowTs)
                  return (
                    <li
                      key={task.id}
                      className="group flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm focus-within:ring-4 focus-within:ring-zinc-100"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDone(task.id)}
                        className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-md border border-zinc-300 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-zinc-100"
                      >
                        {task.done ? <span className="text-xs text-zinc-900">✓</span> : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${meta.badge}`}
                          >
                            {task.priority === PRIORITY.HIGH
                              ? '高'
                              : task.priority === PRIORITY.LOW
                              ? '低'
                              : '中'}
                          </span>
                          {task.dueAt ? (
                            <span
                              className={[
                                'ml-1 text-xs',
                                overdue ? 'text-red-700' : dueSoon ? 'text-red-600' : 'text-zinc-500',
                              ].join(' ')}
                            >
                              DDL：{formatDate(task.dueAt)}
                              {overdue ? t.ddlOverdue : dueSoon ? t.ddlSoon : ''}
                            </span>
                          ) : (
                            <span className="ml-1 text-xs text-zinc-400">{t.ddlNone}</span>
                          )}
                        </div>

                        <p
                          className={[
                            'mt-1 break-words text-sm font-medium',
                            task.done ? 'text-zinc-400 line-through' : 'text-zinc-900',
                          ].join(' ')}
                        >
                          {tomorrowSoon && (
                            <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                              !
                            </span>
                          )}
                          {task.title}
                        </p>

                        {task.done && task.completedAt ? (
                          <p className="mt-1 text-xs text-zinc-400">
                            {t.completedAt(formatDateTime(task.completedAt, lang))}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="rounded-xl px-2 py-1 text-sm font-medium text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                      >
                        {t.delete}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* 日历视图 */}
          <div className="mt-6 rounded-3xl border border-zinc-200/70 bg-white/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-zinc-900">{t.calendarTitle}</div>
              <div className="flex items-center gap-2">
                {selectedDateStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDateStr('')}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                  >
                    {t.clearFilter}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  ‹
                </button>
                <div className="min-w-24 text-center text-xs font-medium text-zinc-700">
                  {monthTitle(calendarMonth, lang)}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                  }
                  className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[11px] text-zinc-500">
              {t.weekdays.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-2">
              {calendarDays.map((d, idx) => {
                if (!d) return <div key={idx} className="h-9" />
                const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
                const isSelected = selectedDateStr === dateStr
                const isToday = (() => {
                  const now = new Date()
                  return (
                    now.getFullYear() === d.getFullYear() &&
                    now.getMonth() === d.getMonth() &&
                    now.getDate() === d.getDate()
                  )
                })()
                const hasDue = dayHasDue(dateStr)
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() =>
                      setSelectedDateStr((prev) => (prev === dateStr ? '' : dateStr))
                    }
                    className={[
                      'relative h-9 rounded-2xl border text-sm shadow-sm transition-all',
                      'border-zinc-200 bg-white hover:bg-zinc-50',
                      isSelected ? 'ring-4 ring-zinc-100' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-sm',
                        isToday
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-700',
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </span>
                    {hasDue && (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-700/80" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 text-xs text-zinc-500">{t.calendarHint}</div>
          </div>

          {/* 移动端清理按钮 */}
          <div className="mt-5 flex flex-col gap-2 sm:hidden">
            <button
              type="button"
              onClick={clearCompleted}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
            >
              {t.clearCompleted}
            </button>
          </div>
        </main>

        <footer className="mt-6 text-center text-xs text-zinc-500">{t.footer(STORAGE_TASKS)}</footer>
      </div>

      {/* 用户信息 / 设置 Modal */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProfileOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft-xl backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">{t.profileTitle}</h2>
                <p className="mt-1 text-sm text-zinc-500">{t.profileDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" strokeLinecap="round" />
                  <path d="M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* 顶部头像 + 名字 */}
            <div className="mt-5 flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-200">
                {draftAvatar ? (
                  <img src={draftAvatar} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-500">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
                      <circle cx="12" cy="8" r="4" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={t.nicknamePlaceholder}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickAvatar}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
                  >
                    {t.uploadAvatar}
                  </button>
                  {draftAvatar && (
                    <button
                      type="button"
                      onClick={() => setDraftAvatar('')}
                  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
                    >
                      {t.removeAvatar}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 设置菜单 */}
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white/80">
              <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t.settingsSection}
              </div>
              <div className="mt-2 divide-y divide-zinc-100">
                {/* 应用名称编辑 */}
                <div className="flex flex-col gap-2 px-4 py-3">
                  <label className="text-sm text-zinc-700">{t.appTitleLabel}</label>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder={TEXT[lang].title}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100"
                  />
                </div>

                {/* 背景颜色选择 */}
                <div className="flex flex-col gap-2 px-4 py-3">
                  <label className="text-sm text-zinc-700">{t.themeLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {THEMES.map((themeOption) => (
                      <button
                        key={themeOption.id}
                        type="button"
                        onClick={() => setDraftTheme(themeOption.id)}
                        className={[
                          'relative h-9 w-9 rounded-full border-2 transition-all duration-200',
                          draftTheme === themeOption.id
                            ? 'border-zinc-900 shadow-md scale-110'
                            : 'border-transparent hover:scale-105 shadow-sm',
                        ].join(' ')}
                        style={{ backgroundColor: themeOption.id === 'soft-white' ? '#f4f4f5' : themeOption.id === 'deep-grey' ? '#3f3f46' : themeOption.id === 'sakura-pink' ? '#fda4af' : themeOption.id === 'mint-green' ? '#6ee7b7' : themeOption.id === 'morandi-blue' ? '#7dd3fc' : '#fde68a' }}
                        title={themeOption.name}
                      >
                        {/* 选中时的打勾符号 */}
                        {draftTheme === themeOption.id && (
                          <svg
                            className="absolute inset-0 m-auto h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            style={{ color: themeOption.id === 'deep-grey' ? 'white' : themeOption.id === 'sakura-pink' || themeOption.id === 'morandi-blue' || themeOption.id === 'mint-green' ? '#18181b' : '#18181b' }}
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {THEMES.find(t => t.id === draftTheme)?.name}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zinc-700">{t.language}</span>
                  <select
                    value={draftLang}
                    onChange={(e) => setDraftLang(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 shadow-sm outline-none focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                  >
                    <option value={LANG.ZH}>简体中文</option>
                    <option value={LANG.EN}>English</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(true)}
                  className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-zinc-50"
                >
                  <span className="text-sm font-medium text-red-600">{t.clearData}</span>
                  <span className="mt-0.5 text-xs text-zinc-500">{t.clearDataDesc}</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={saveProfile}
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-200"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加常用预设 Modal */}
      {presetOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPresetOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft-xl backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">{t.presetsModalTitle}</h2>
                <p className="mt-1 text-sm text-zinc-500">{t.presetsModalDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setPresetOpen(false)}
                className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" strokeLinecap="round" />
                  <path d="M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <input
                value={presetDraft}
                onChange={(e) => setPresetDraft(e.target.value)}
                placeholder={t.presetsPlaceholder}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPresetOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={addPreset}
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-200"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义 DDL 日期选择 Modal */}
      {ddlPickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDdlPickerOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
          <div className="relative w-full max-w-xs rounded-3xl border border-zinc-200/70 bg-white/90 p-4 shadow-soft-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">{t.hasDDL}</div>
              <button
                type="button"
                onClick={() => setDdlPickerOpen(false)}
                className="rounded-2xl p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" strokeLinecap="round" />
                  <path d="M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setDdlPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
                className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                ‹
              </button>
              <div className="min-w-24 text-center text-xs font-medium text-zinc-700">
                {monthTitle(ddlPickerMonth, lang)}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDdlPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
                className="rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                ›
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
              {t.weekdays.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {(() => {
                const year = ddlPickerMonth.getFullYear()
                const month = ddlPickerMonth.getMonth()
                const first = new Date(year, month, 1)
                const last = new Date(year, month + 1, 0)
                const startWeekday = first.getDay()
                const mondayIndex = startWeekday === 0 ? 7 : startWeekday
                const leading = mondayIndex - 1
                const cells = []
                for (let i = 0; i < leading; i++) cells.push(null)
                for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
                while (cells.length % 7 !== 0) cells.push(null)
                return cells
              })().map((d, idx) => {
                if (!d) return <div key={idx} className="h-8" />
                const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
                const isToday = dateStr === todayStr()
                const isSelected = dateStr === dueDate
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      setDueDate(dateStr)
                      setDdlPickerOpen(false)
                    }}
                    className={[
                      'flex h-8 items-center justify-center rounded-full text-xs transition-all',
                      isSelected
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : isToday
                        ? 'border border-zinc-300 bg-zinc-50 text-zinc-900'
                        : 'text-zinc-700 hover:bg-zinc-50',
                    ].join(' ')}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 清空数据二次确认 */}
      {clearConfirmOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setClearConfirmOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200/70 bg-white/90 p-5 shadow-soft-xl backdrop-blur sm:p-6">
            <h2 className="text-base font-semibold text-zinc-900">{t.clearConfirmTitle}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t.clearConfirmText}</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                {t.clearConfirmCancel}
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
              >
                {t.clearConfirmOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
