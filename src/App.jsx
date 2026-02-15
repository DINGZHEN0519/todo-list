import { useEffect, useMemo, useRef, useState } from 'react'
import { THEMES, getTheme, getThemeName } from './themeConfig'
import CalendarView from './CalendarView'
import StatsDashboard from './StatsDashboard'
import PomodoroTimer from './PomodoroTimer'

// =============================================================================
// STORAGE KEYS
// =============================================================================
const STORAGE_TASKS = 'todo.tasks.v1'
const STORAGE_PROFILE = 'todo.profile.v1'
const STORAGE_PRESETS = 'todo.presets.v1'
const STORAGE_FOCUS_SESSIONS = 'todo.focusSessions.v1'
const STORAGE_PROJECTS = 'todo.projects.v1'
const STORAGE_FOCUS_LOGS = 'todo.focusLogs.v1'

// =============================================================================
// CONSTANTS & CONFIG
// =============================================================================
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
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

// Parse date string and optional time to timestamp
function parseDueAt(dateStr, timeStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  
  let hours = 23, minutes = 59
  if (timeStr) {
    const [h, min] = timeStr.split(':').map(Number)
    if (!isNaN(h) && !isNaN(min)) {
      hours = h
      minutes = min
    }
  }
  
  const dt = new Date(y, m - 1, d, hours, minutes, 59, 999)
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
        dueTime: typeof t.dueTime === 'string' ? t.dueTime : null,
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

function loadFocusSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_FOCUS_SESSIONS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(s => s && typeof s === 'object' && typeof s.taskId === 'string' && typeof s.completedAt === 'number')
      .map(s => ({
        ...s,
        userRating: typeof s.userRating === 'number' ? s.userRating : null,
      }))
  } catch {
    return []
  }
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(p => p && typeof p === 'object' && typeof p.id === 'string')
      .map(p => ({
        id: p.id,
        title: typeof p.title === 'string' ? p.title : '',
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        focusMinutes: typeof p.focusMinutes === 'number' ? p.focusMinutes : 0,
        completed: Boolean(p.completed),
        completedAt: typeof p.completedAt === 'number' ? p.completedAt : null,
        averageRating: typeof p.averageRating === 'number' ? p.averageRating : null,
      }))
      .filter(p => p.title.trim().length > 0)
  } catch {
    return []
  }
}

function loadFocusLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_FOCUS_LOGS)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(l => l && typeof l === 'object' && typeof l.id === 'string')
  } catch {
    return []
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

// =============================================================================
// STATISTICS HELPER
// =============================================================================
function calculateStats(tasks) {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

  // Total tasks
  const totalTasks = tasks.length

  // Completed tasks
  const completedTasks = tasks.filter(t => t.done).length

  // Weekly completed (last 7 days)
  const weeklyCompleted = tasks.filter(t =>
    t.done && t.completedAt && t.completedAt >= sevenDaysAgo
  ).length

  // Priority distribution
  const priorityDistribution = {
    high: tasks.filter(t => t.priority === PRIORITY.HIGH).length,
    medium: tasks.filter(t => t.priority === PRIORITY.MEDIUM).length,
    low: tasks.filter(t => t.priority === PRIORITY.LOW).length,
  }

  // Efficiency score (percentage of completed tasks)
  const efficiencyScore = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  return {
    totalTasks,
    completedTasks,
    weeklyCompleted,
    priorityDistribution,
    efficiencyScore,
  }
}

// =============================================================================
// TEXT / I18N
// =============================================================================
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
    advancedSettings: '高级设置',
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
    taskList: '任务列表',
    calendar: '日历',
    focus: '专注',
    stats: '统计',
    projects: '项目',
    dueTime: '截止时间',
    selectTime: '选择时间',
    clearTime: '清除时间',
    noTimeSet: '未设置时间',
    // New: Filter tabs
    filterAll: '全部',
    filterActive: '进行中',
    filterCompleted: '已完成',
    // New: Stats
    productivityStats: '生产力统计',
    weeklyAchievement: '本周成就',
    taskDistribution: '任务分布',
    efficiencyScore: '任务完成率',
    weeklyCompleted: '本周已完成',
    tasksCompleted: '项任务完成',
    totalTasks: '总任务数',
    highPriority: '高优先',
    mediumPriority: '中优先',
    lowPriority: '低优先',
    // Pomodoro translations
    pomodoroWork: '工作',
    pomodoroShortBreak: '短休息',
    pomodoroLongBreak: '长休息',
    pomodoroStart: '开始',
    pomodoroPause: '暂停',
    pomodoroReset: '重置',
    pomodoroComplete: '专注完成！休息一下吧',
    pomodoroSelectTask: '选择一个任务开始专注',
    pomodoroFocusTime: '专注时长',
    pomodoroTodayFocus: '今日专注',
    pomodoroWeekFocus: '本周专注',
    pomodoroMinutes: '分钟',
    pomodoroSessions: '次',
    dailyFocusHeatmap: '每日专注热力',
    // Task focus
    taskFocusSessions: '专注次数',
    // Long-term projects
    longTermProjects: '长期项目',
    addProject: '添加项目',
    projectName: '项目名称',
    noProjects: '暂无长期项目',
    deleteProject: '删除项目',
    // Timer settings
    timerSettings: '计时器设置',
    focusDuration: '专注时长',
    shortBreakDuration: '短休息时长',
    longBreakDuration: '长休息时长',
    timerMode: '计时模式',
    countdownMode: '倒计时',
    countupMode: '正计时',
    minutes: '分钟',
    // Time allocation
    timeAllocation: '时间分配',
    totalFocusHours: '总专注时长',
    hours: '小时',
    dailyTodos: '每日待办',
    dailyTasks: '每日任务',
    // Select task
    selectTaskPlaceholder: '选择任务或项目...',
    searchTasks: '搜索任务...',
    // Focus Guard
    focusGuardTitle: '还在专注吗？',
    focusGuardMessage: '您已连续专注超过60分钟，点击继续',
    focusGuardContinue: '继续',
    // Heatmap
    focusIntensityMap: '专注强度图',
    longTermProjectProgress: '长期项目进度',
    // Project Center
    projectCenter: '项目中心',
    addNewProject: '添加新项目',
    markComplete: '标记完成',
    projectCompleted: '已完成',
    totalTimeInvested: '总投入时间',
    sessionHistory: '专注记录',
    noSessions: '暂无专注记录',
    projectInsights: '项目深度分析',
    averageScore: '平均得分',
    rateSession: '为这次专注评分',
    submitRating: '提交评分',
    skip: '跳过',
    focusComplete: '专注完成！',
    greatJob: '太棒了！',
    // Focus
    pause: '暂停',
    stop: '停止',
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
    advancedSettings: 'Advanced',
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
    taskList: 'Tasks',
    calendar: 'Calendar',
    focus: 'Focus',
    stats: 'Stats',
    projects: 'Projects',
    dueTime: 'Due Time',
    selectTime: 'Select Time',
    clearTime: 'Clear Time',
    noTimeSet: 'No time set',
    // New: Filter tabs
    filterAll: 'All',
    filterActive: 'Active',
    filterCompleted: 'Done',
    // New: Stats
    productivityStats: 'Productivity Stats',
    weeklyAchievement: 'Weekly Achievement',
    taskDistribution: 'Task Distribution',
    efficiencyScore: 'Task Completion',
    weeklyCompleted: 'This Week',
    tasksCompleted: 'tasks completed',
    totalTasks: 'Total Tasks',
    highPriority: 'High',
    mediumPriority: 'Medium',
    lowPriority: 'Low',
    // Pomodoro translations
    pomodoroWork: 'Work',
    pomodoroShortBreak: 'Short Break',
    pomodoroLongBreak: 'Long Break',
    pomodoroStart: 'Start',
    pomodoroPause: 'Pause',
    pomodoroReset: 'Reset',
    pomodoroComplete: 'Concentration complete! Take a break.',
    pomodoroSelectTask: 'Select a task to start focusing',
    pomodoroFocusTime: 'Focus Time',
    pomodoroTodayFocus: 'Today',
    pomodoroWeekFocus: 'This Week',
    pomodoroMinutes: 'min',
    pomodoroSessions: 'sessions',
    dailyFocusHeatmap: 'Daily Focus Heatmap',
    // Task focus
    taskFocusSessions: 'Focus Sessions',
    // Long-term projects
    longTermProjects: 'Long-term Projects',
    addProject: 'Add Project',
    projectName: 'Project Name',
    noProjects: 'No long-term projects',
    deleteProject: 'Delete Project',
    // Timer settings
    timerSettings: 'Timer Settings',
    focusDuration: 'Focus Duration',
    shortBreakDuration: 'Short Break',
    longBreakDuration: 'Long Break',
    timerMode: 'Timer Mode',
    countdownMode: 'Countdown',
    countupMode: 'Stopwatch',
    minutes: 'min',
    // Time allocation
    timeAllocation: 'Time Allocation',
    totalFocusHours: 'Total Focus Hours',
    hours: 'hours',
    dailyTodos: 'Daily Todos',
    dailyTasks: 'Daily Tasks',
    // Select task
    selectTaskPlaceholder: 'Select task or project...',
    searchTasks: 'Search tasks...',
    // Focus Guard
    focusGuardTitle: 'Still focusing?',
    focusGuardMessage: 'You have been focusing for over 60 minutes. Click to continue.',
    focusGuardContinue: 'Continue',
    // Heatmap
    focusIntensityMap: 'Focus Intensity Map',
    longTermProjectProgress: 'Long-term Project Progress',
    // Project Center
    projectCenter: 'Project Center',
    addNewProject: 'Add New Project',
    markComplete: 'Mark Complete',
    projectCompleted: 'Completed',
    totalTimeInvested: 'Total Time Invested',
    sessionHistory: 'Focus History',
    noSessions: 'No focus sessions yet',
    projectInsights: 'Project Insights',
    averageScore: 'Average Score',
    rateSession: 'Rate this session',
    submitRating: 'Submit',
    skip: 'Skip',
    focusComplete: 'Focus Complete!',
    greatJob: 'Great job!',
    // Focus
    pause: 'Pause',
    stop: 'Stop',
  },
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function App() {
  // --- State: Data ---
  const [tasks, setTasks] = useState(() => loadTasks())
  const [profile, setProfile] = useState(() => loadProfile())
  const [presets, setPresets] = useState(() => loadPresets())
  const [focusSessions, setFocusSessions] = useState(() => loadFocusSessions())
  const [projects, setProjects] = useState(() => loadProjects())
  const [focusLogs, setFocusLogs] = useState(() => loadFocusLogs())

  // --- State: Page Navigation ---
  const [currentView, setCurrentView] = useState('tasks') // 'tasks' | 'calendar' | 'focus' | 'stats' | 'projects'

  // --- State: Pomodoro ---
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [selectedTaskType, setSelectedTaskType] = useState('daily') // 'daily' or 'project'

  // --- State: Add Task Form ---
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(PRIORITY.MEDIUM)
  const [hasDDL, setHasDDL] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('') // New: time component
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // --- State: Time ---
  const [nowTs, setNowTs] = useState(() => Date.now())

  // --- State: Profile Modal ---
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

  // --- State: Presets ---
  const [presetOpen, setPresetOpen] = useState(false)
  const [presetDraft, setPresetDraft] = useState('')

  // --- State: Projects ---
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [projectDraft, setProjectDraft] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [projectDetailOpen, setProjectDetailOpen] = useState(false)
  
  // --- State: Rating Modal ---
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [pendingSession, setPendingSession] = useState(null)

  // --- State: Task List Filter (independent from calendar) ---
  const [taskFilter, setTaskFilter] = useState('all') // 'all' | 'active' | 'completed'

  // --- State: Calendar View Date (independent from task list) ---
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('')

  const inputRef = useRef(null)
  const [sortMode, setSortMode] = useState('priority') // 'priority' | 'deadline'
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // --- State: Clear Confirm ---
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  // --- State: DDL Picker ---
  const [ddlPickerOpen, setDdlPickerOpen] = useState(false)
  const [ddlPickerMonth, setDdlPickerMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  // --- State: DDL Memory ---
  const [lastHasDDL, setLastHasDDL] = useState(false)

  // --- Derived ---
  const lang = profile.lang
  const t = TEXT[lang] || TEXT[LANG.ZH]
  const currentTheme = getTheme(profile.theme)

  // --- Effects ---
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
    try {
      localStorage.setItem(STORAGE_FOCUS_SESSIONS, JSON.stringify(focusSessions))
    } catch {
      // ignore
    }
  }, [focusSessions])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(projects))
    } catch {
      // ignore
    }
  }, [projects])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FOCUS_LOGS, JSON.stringify(focusLogs))
    } catch {
      // ignore
    }
  }, [focusLogs])

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

  // --- Apply theme to document ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile.theme)
  }, [profile.theme])

  // --- Helpers ---
  function toDateStr(ts) {
    const d = new Date(ts)
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }

  // --- Sorted Tasks ---
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

    // First, filter by task status (All/Active/Completed)
    let filteredByStatus = tasks
    if (taskFilter === 'active') {
      filteredByStatus = tasks.filter(t => !t.done)
    } else if (taskFilter === 'completed') {
      filteredByStatus = tasks.filter(t => t.done)
    }

    const unfinished = filteredByStatus.filter((t) => !t.done).sort(compareWithinGroup)
    const finished = filteredByStatus.filter((t) => t.done).sort(compareWithinGroup)
    const all = [...unfinished, ...finished]

    // Note: Task List view NO LONGER uses selectedDateStr for filtering
    // It always shows the full task list (filtered by status only)
    return all
  }, [tasks, sortMode, taskFilter])

  const remaining = tasks.filter((t) => !t.done).length

  // Calculate filtered task count for display
  const filteredCount = useMemo(() => {
    if (taskFilter === 'active') {
      return tasks.filter(t => !t.done).length
    } else if (taskFilter === 'completed') {
      return tasks.filter(t => t.done).length
    }
    return tasks.length
  }, [tasks, taskFilter])

  // --- Handlers ---
  function handleAddTask(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    if (hasDDL && !dueDate) return
    
    const now = Date.now()
    const dueAt = hasDDL ? parseDueAt(dueDate, dueTime) : null
    
    const next = {
      id: uid(),
      title: trimmed,
      priority,
      done: false,
      createdAt: now,
      dueAt,
      dueTime: hasDDL ? dueTime : null,
      completedAt: null,
    }
    setTasks((prev) => [next, ...prev])
    setTitle('')
    setPriority(PRIORITY.MEDIUM)
    setLastHasDDL(hasDDL)
    setHasDDL(hasDDL ? true : lastHasDDL)
    if (!hasDDL) {
      setDueDate('')
      setDueTime('')
    }
    setShowAdvancedSettings(false)
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

  // --- Focus Session Handler ---
  function recordFocusSession(taskId, durationMinutes, taskType = 'daily', userRating = null) {
    const now = Date.now()
    const session = {
      taskId,
      completedAt: now,
      durationMinutes,
      userRating,
    }
    setFocusSessions(prev => [...prev, session])

    // Record detailed focus log
    const focusLog = {
      id: uid(),
      taskId,
      taskType, // 'daily' or 'project'
      startedAt: now - durationMinutes * 60 * 1000,
      endedAt: now,
      durationMinutes,
      userRating,
    }
    setFocusLogs(prev => [...prev, focusLog])

    // Also update the task's/project's focus sessions count and average rating
    if (taskType === 'daily') {
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, focusSessions: (t.focusSessions || 0) + 1, focusMinutes: (t.focusMinutes || 0) + durationMinutes }
          : t
      ))
    } else {
      // Update project - recalculate average rating
      setProjects(prev => {
        const updated = prev.map(p => {
          if (p.id !== taskId) return p
          
          const newFocusMinutes = (p.focusMinutes || 0) + durationMinutes
          
          // Recalculate average rating
          const projectSessions = focusLogs.filter(l => l.taskId === taskId && l.taskType === 'project')
          const ratings = [...projectSessions, focusLog].filter(s => s.userRating !== null && s.userRating !== undefined).map(s => s.userRating)
          
          let newAverageRating = null
          if (ratings.length > 0) {
            newAverageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
          }
          
          return {
            ...p,
            focusMinutes: newFocusMinutes,
            averageRating: newAverageRating,
          }
        })
        return updated
      })
    }
  }

  // Project handlers
  function addProject(title) {
    const trimmed = title.trim()
    if (!trimmed) return
    const newProject = {
      id: uid(),
      title: trimmed,
      createdAt: Date.now(),
      focusMinutes: 0,
    }
    setProjects(prev => [newProject, ...prev])
  }

  function deleteProject(projectId) {
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  function completeProject(projectId) {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, completed: true, completedAt: Date.now() }
        : p
    ))
  }

  function openProjectDetail(projectId) {
    setSelectedProjectId(projectId)
    setProjectDetailOpen(true)
  }

  function submitSessionRating(rating) {
    if (pendingSession) {
      const { taskId, duration, taskType } = pendingSession
      recordFocusSession(taskId, duration, taskType, rating)
      setPendingSession(null)
      setRatingModalOpen(false)
    }
  }

  function skipRating() {
    if (pendingSession) {
      const { taskId, duration, taskType } = pendingSession
      recordFocusSession(taskId, duration, taskType, null)
      setPendingSession(null)
      setRatingModalOpen(false)
    }
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

  // Instant theme apply - apply immediately on click
  function applyTheme(themeId) {
    setDraftTheme(themeId)
    setProfile(prev => ({ ...prev, theme: themeId }))
    document.documentElement.setAttribute('data-theme', themeId)
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
    setSelectedCalendarDate('')
    setTaskFilter('all')
    setTitle('')
    setPriority(PRIORITY.MEDIUM)
    setHasDDL(false)
    setDueDate('')
    setDueTime('')
    setLastHasDDL(false)
    setProfileOpen(false)
    setClearConfirmOpen(false)
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div
      className={[
        'min-h-screen bg-gradient-to-b transition-colors duration-500',
        currentTheme.bgClass,
      ].join(' ')}
      style={{
        '--theme-primary': currentTheme.primary,
        '--theme-accent': currentTheme.accent,
        '--theme-border': currentTheme.border,
      }}
    >
      {/* ========================================================================== */}
      {/* NAVIGATION BAR - Top Left - Minimalist Sliding Pill Toggle */}
      {/* ========================================================================== */}
      <div className="fixed left-2 right-2 top-2 z-20 flex items-center justify-between md:left-4 md:top-4 md:justify-normal md:gap-3">
        {/* Minimalist Navigation Toggle - Sliding Pill Style - 5 tabs */}
        <div
          className="relative flex flex-1 rounded-full border shadow-sm backdrop-blur transition-all duration-300 md:flex-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderColor: 'var(--theme-border)',
          }}
        >
          {/* Sliding pill background */}
          <div
            className="absolute top-0.5 bottom-0.5 rounded-full shadow-sm transition-all duration-300 ease-out"
            style={{
              backgroundColor: 'var(--theme-primary)',
              width: '20%',
              left: currentView === 'tasks' ? '0%' :
                     currentView === 'calendar' ? '20%' :
                     currentView === 'focus' ? '40%' :
                     currentView === 'stats' ? '60%' :
                     '80%',
            }}
          />

          {/* Tab Buttons */}
          <div className="relative z-10 flex w-full">
            <button
              type="button"
              onClick={() => setCurrentView('tasks')}
              className="flex-1 px-1 py-2 text-[10px] font-medium transition-all duration-300 sm:px-2 sm:py-1.5 sm:text-xs"
              style={{
                color: currentView === 'tasks' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.taskList}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('calendar')}
              className="flex-1 px-1 py-2 text-[10px] font-medium transition-all duration-300 sm:px-2 sm:py-1.5 sm:text-xs"
              style={{
                color: currentView === 'calendar' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.calendar}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('focus')}
              className="flex-1 px-1 py-2 text-[10px] font-medium transition-all duration-300 sm:px-2 sm:py-1.5 sm:text-xs"
              style={{
                color: currentView === 'focus' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.focus}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('stats')}
              className="flex-1 px-1 py-2 text-[10px] font-medium transition-all duration-300 sm:px-2 sm:py-1.5 sm:text-xs"
              style={{
                color: currentView === 'stats' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.stats}
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('projects')}
              className="flex-1 px-1 py-2 text-[10px] font-medium transition-all duration-300 sm:px-2 sm:py-1.5 sm:text-xs"
              style={{
                color: currentView === 'projects' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.projects}
            </button>
          </div>
        </div>

        {/* Profile Button - Minimalist */}
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="group flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm backdrop-blur transition-all duration-300 hover:opacity-90"
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="h-7 w-7 overflow-hidden rounded-full bg-zinc-100 shadow-sm">
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* ========================================================================== */}
      {/* MAIN CONTENT */}
      {/* ========================================================================== */}
      <div className="mx-auto max-w-3xl px-4 pt-20 sm:pt-14 pb-8">
        <header className="mb-5 sm:mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 
                className="text-2xl font-semibold tracking-tight sm:text-3xl"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {profile.title || t.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-500 sm:text-sm hidden sm:block">
                {taskFilter === 'all' ? t.remaining(remaining) :
                  taskFilter === 'active' ? t.remaining(filteredCount) :
                  `${filteredCount} ${t.filterCompleted}`}
                <span className="mx-2 text-zinc-300">·</span>
                {t.subtitle}
              </p>
              {/* Mobile: show remaining count only */}
              <p className="mt-2 text-sm sm:hidden" style={{ color: 'var(--theme-text-secondary)' }}>
                {taskFilter === 'all' ? t.remaining(remaining) :
                  taskFilter === 'active' ? t.remaining(filteredCount) :
                  `${filteredCount} ${t.filterCompleted}`}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
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

        <main 
          className="rounded-3xl border p-4 shadow-soft-xl backdrop-blur sm:p-6 transition-all duration-300"
          style={{ 
            backgroundColor: 'var(--theme-card-bg)',
            borderColor: 'var(--theme-card-border)',
          }}
        >
          {/* ======================================================================= */}
          {/* TASK LIST VIEW */}
          {/* ======================================================================= */}
          <div className={currentView === 'tasks' ? 'view-enter-right' : 'hidden'}>
            <>
              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="flex flex-col gap-3">
                <input
                  ref={inputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.addPlaceholder}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition-all focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {/* DDL Toggle */}
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDDL}
                      onChange={(e) => {
                        const next = e.target.checked
                        setHasDDL(next)
                        if (!next) {
                          setDueDate('')
                          setDueTime('')
                          setShowAdvancedSettings(false)
                        }
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-200"
                    />
                    <span>{t.hasDDL}</span>
                  </label>

                  {/* Date Picker */}
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

                  {/* Advanced Settings Button */}
                  {hasDDL && (
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className={[
                        'flex items-center gap-1 rounded-xl border px-3 py-2 text-xs shadow-sm transition-all',
                        showAdvancedSettings
                          ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                      ].join(' ')}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                      {t.advancedSettings}
                    </button>
                  )}

                  {/* Priority Buttons */}
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

                  {/* Add Button */}
                  <button
                    type="submit"
                    className="ml-auto inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-200"
                  >
                    {t.add}
                  </button>
                </div>

                {/* Advanced Settings Panel - Time Picker */}
                {showAdvancedSettings && hasDDL && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-white/50 p-3 shadow-sm">
                    <span className="text-xs font-medium text-zinc-700">{t.dueTime}:</span>
                    <div className="flex items-center gap-1">
                      <select
                        value={dueTime ? dueTime.split(':')[0] : ''}
                        onChange={(e) => {
                          const hour = e.target.value
                          const min = dueTime ? dueTime.split(':')[1] || '00' : '00'
                          setDueTime(hour ? `${hour}:${min}` : '')
                        }}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm outline-none focus:border-zinc-300"
                      >
                        <option value="">--</option>
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={pad2(i)}>{pad2(i)}</option>
                        ))}
                      </select>
                      <span className="text-xs text-zinc-500">:</span>
                      <select
                        value={dueTime ? dueTime.split(':')[1] : ''}
                        onChange={(e) => {
                          const min = e.target.value
                          const hour = dueTime ? dueTime.split(':')[0] || '23' : '23'
                          setDueTime(hour && min ? `${hour}:${min}` : '')
                        }}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 shadow-sm outline-none focus:border-zinc-300"
                      >
                        <option value="">--</option>
                        {Array.from({ length: 60 }, (_, i) => (
                          <option key={i} value={pad2(i)}>{pad2(i)}</option>
                        ))}
                      </select>
                    </div>
                    {dueTime && (
                      <button
                        type="button"
                        onClick={() => setDueTime('')}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-500 shadow-sm hover:bg-zinc-50"
                      >
                        {t.clearTime}
                      </button>
                    )}
                    <span className="text-xs text-zinc-500">
                      {dueTime ? `${t.selectTime}: ${dueTime}` : t.noTimeSet}
                    </span>
                  </div>
                )}
              </form>

              {/* Presets Bar */}
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

              {/* Task List */}
              <div className="mt-4 border-t border-zinc-100 pt-4">
                {/* Filter Tabs - All/Active/Completed */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-zinc-500">{t.sortBy}</div>
                  <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs shadow-sm transition-all">
                    <button
                      type="button"
                      onClick={() => setTaskFilter('all')}
                      className={[
                        'rounded-full px-3 py-1.5',
                        taskFilter === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
                      ].join(' ')}
                    >
                      {t.filterAll}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter('active')}
                      className={[
                        'rounded-full px-3 py-1.5',
                        taskFilter === 'active' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
                      ].join(' ')}
                    >
                      {t.filterActive}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskFilter('completed')}
                      className={[
                        'rounded-full px-3 py-1.5',
                        taskFilter === 'completed' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
                      ].join(' ')}
                    >
                      {t.filterCompleted}
                    </button>
                  </div>
                </div>

                {/* Sort Toggle */}
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
                      {taskFilter !== 'all' ? `${taskFilter === 'active' ? t.filterActive : t.filterCompleted} - ` : ''}{t.noTasksHint}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {sortedTasks.map((task) => {
                      const meta = PRIORITY_META[task.priority] || PRIORITY_META[PRIORITY.MEDIUM]
                      // Overdue logic - considers time if set
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
                      
                      // Format time display - only show if time is set
                      const timeDisplay = task.dueTime || null
                      
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
                                  {timeDisplay && !overdue && !dueSoon && ` ${timeDisplay}`}
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

                          {/* Focus Button - Only for incomplete tasks */}
                          {!task.done && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTaskId(task.id)
                                setCurrentView('focus')
                              }}
                              className="rounded-xl px-2 py-1 text-sm font-medium text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                              title={t.focus}
                            >
                              🎯
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Mobile Clear Button */}
              <div className="mt-5 flex flex-col gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
                >
                  {t.clearCompleted}
                </button>
              </div>
            </>
          </div>

          {/* ======================================================================= */}
          {/* CALENDAR VIEW */}
          {/* ======================================================================= */}
          <div className={currentView === 'calendar' ? 'view-enter-left' : 'hidden'}>
            <CalendarView
              tasks={tasks}
              selectedCalendarDate={selectedCalendarDate}
              onSelectCalendarDate={setSelectedCalendarDate}
              calendarMonth={calendarMonth}
              onChangeMonth={setCalendarMonth}
              lang={lang}
              t={t}
              theme={currentTheme}
            />
          </div>

          {/* ======================================================================= */}
          {/* FOCUS VIEW (Pomodoro Timer) */}
          {/* ======================================================================= */}
          <div className={currentView === 'focus' ? 'view-enter-left' : 'hidden'}>
            <PomodoroTimer
              tasks={tasks}
              projects={projects}
              selectedTaskId={selectedTaskId}
              selectedTaskType={selectedTaskType}
              onSelectTask={(id, type) => {
                setSelectedTaskId(id)
                setSelectedTaskType(type)
              }}
              focusSessions={focusSessions}
              onSessionComplete={recordFocusSession}
              onRequestRating={(sessionData) => {
                setPendingSession(sessionData)
                setRatingModalOpen(true)
              }}
              lang={lang}
              t={t}
              theme={currentTheme}
            />
          </div>

          {/* ======================================================================= */}
          {/* STATS VIEW (Independent Statistics Dashboard) */}
          {/* ======================================================================= */}
          <div className={currentView === 'stats' ? 'view-enter-left' : 'hidden'}>
            <StatsDashboard
              tasks={tasks}
              projects={projects}
              focusSessions={focusSessions}
              focusLogs={focusLogs}
              lang={lang}
              t={t}
              theme={currentTheme}
              onOpenProjectDetail={openProjectDetail}
            />
          </div>

          {/* ======================================================================= */}
          {/* PROJECTS VIEW (Project Center) */}
          {/* ======================================================================= */}
          <div className={currentView === 'projects' ? 'view-enter-left' : 'hidden'}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {t.projectCenter}
              </h2>
              <button
                type="button"
                onClick={() => setProjectModalOpen(true)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                + {t.addNewProject}
              </button>
            </div>

            {/* Projects List */}
            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-lg">
                        {project.completed ? '✅' : '📁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                            {project.title}
                          </h3>
                          {project.completed && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              {t.projectCompleted}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {Math.round(project.focusMinutes)} {t.pomodoroMinutes}
                          </span>
                          {project.averageRating && (
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-500">⭐</span>
                              {project.averageRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!project.completed && (
                          <button
                            type="button"
                            onClick={() => completeProject(project.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                          >
                            {t.markComplete}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openProjectDetail(project.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
                        >
                          {t.projectInsights}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProject(project.id)}
                          className="rounded-lg p-1 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center">
                <div className="mb-2 text-3xl">📁</div>
                <p className="text-sm font-medium text-zinc-700">{t.noProjects}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {t.addNewProject}
                </p>
              </div>
            )}
          </div>
        </main>

        <footer className="mt-6 text-center text-xs text-zinc-500">{t.footer(STORAGE_TASKS)}</footer>
      </div>

      {/* ========================================================================== */}
      {/* PROFILE MODAL */}
      {/* ========================================================================== */}
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

            {/* Avatar + Name */}
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

            {/* Settings */}
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white/80">
              <div className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t.settingsSection}
              </div>
              <div className="mt-2 divide-y divide-zinc-100">
                {/* App Title */}
                <div className="flex flex-col gap-2 px-4 py-3">
                  <label className="text-sm text-zinc-700">{t.appTitleLabel}</label>
                  <input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder={TEXT[lang].title}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100"
                  />
                </div>

                {/* Theme Picker - Instant Apply */}
                <div className="flex flex-col gap-2 px-4 py-3">
                  <label className="text-sm text-zinc-700">{t.themeLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {THEMES.map((themeOption) => (
                      <button
                        key={themeOption.id}
                        type="button"
                        onClick={() => applyTheme(themeOption.id)}
                        className={[
                          'relative h-9 w-9 rounded-full border-2 transition-all duration-200',
                          draftTheme === themeOption.id
                            ? 'border-zinc-900 shadow-md scale-110'
                            : 'border-transparent hover:scale-105 shadow-sm',
                        ].join(' ')}
                        style={{ 
                          backgroundColor: themeOption.id === 'soft-white' ? '#f4f4f5' : 
                            themeOption.id === 'sakura-pink' ? '#fda4af' : 
                            themeOption.id === 'mint-green' ? '#6ee7b7' : 
                            themeOption.id === 'morandi-blue' ? '#7dd3fc' : 
                            themeOption.id === 'creamy-yellow' ? '#fde68a' :
                            themeOption.id === 'soft-lavender' ? '#c4b5fd' : 
                            themeOption.id === 'muted-sage' ? '#a8d5a2' :
                            themeOption.id === 'warm-sandstone' ? '#e8d4b8' : '#f4f4f5'
                        }}
                        title={getThemeName(themeOption.id, lang === LANG.ZH)}
                      >
                        {draftTheme === themeOption.id && (
                          <svg
                            className="absolute inset-0 m-auto h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            style={{ color: themeOption.id === 'soft-white' || themeOption.id === 'creamy-yellow' || themeOption.id === 'soft-lavender' || themeOption.id === 'muted-sage' || themeOption.id === 'warm-sandstone' ? '#18181b' : '#ffffff' }}
                          >
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {getThemeName(draftTheme, lang === LANG.ZH)}
                  </div>
                </div>

                {/* Language */}
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
                
                {/* Clear Data */}
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

      {/* ========================================================================== */}
      {/* PRESET MODAL */}
      {/* ========================================================================== */}
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

      {/* ========================================================================== */}
      {/* PROJECT MODAL - Add Long-term Project */}
      {/* ========================================================================== */}
      {projectModalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProjectModalOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft-xl backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">{t.addProject}</h2>
                <p className="mt-1 text-sm text-zinc-500">{t.longTermProjects}</p>
              </div>
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
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
                value={projectDraft}
                onChange={(e) => setProjectDraft(e.target.value)}
                placeholder={t.projectName}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-100"
                autoFocus
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  addProject(projectDraft)
                  setProjectDraft('')
                  setProjectModalOpen(false)
                }}
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-200"
              >
                {t.add}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* DDL DATE PICKER MODAL - Elegant Glassmorphism Style */}
      {/* ========================================================================== */}
      {ddlPickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDdlPickerOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
          <div 
            className="relative w-full max-w-sm rounded-3xl border p-5 shadow-soft-xl backdrop-blur-xl transition-all duration-300"
            style={{ 
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-card-border)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {t.hasDDL}
              </div>
              <button
                type="button"
                onClick={() => setDdlPickerOpen(false)}
                className="rounded-xl p-2 transition-all hover:opacity-70"
                style={{ color: 'var(--theme-text-secondary)', backgroundColor: 'rgba(255,255,255,0.5)' }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" strokeLinecap="round" />
                  <path d="M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                type="button"
                onClick={() =>
                  setDdlPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
                className="rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:opacity-80 min-w-[48px]"
                style={{ 
                  backgroundColor: 'white', 
                  borderColor: 'var(--theme-border)', 
                  color: 'var(--theme-text-secondary)' 
                }}
              >
                ‹
              </button>
              <div className="min-w-28 text-center text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                {new Intl.DateTimeFormat(lang === LANG.EN ? 'en-US' : 'zh-CN', {
                  year: 'numeric',
                  month: 'long',
                }).format(ddlPickerMonth)}
              </div>
              <button
                type="button"
                onClick={() =>
                  setDdlPickerMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
                className="rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:opacity-80 min-w-[48px]"
                style={{ 
                  backgroundColor: 'white', 
                  borderColor: 'var(--theme-border)', 
                  color: 'var(--theme-text-secondary)' 
                }}
              >
                ›
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
              {t.weekdays.map((w) => (
                <div key={w} className="py-2 font-medium">
                  {w}
                </div>
              ))}
            </div>

            {/* Calendar Grid - Larger touch targets */}
            <div className="grid grid-cols-7 gap-1.5">
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
                if (!d) return <div key={idx} className="h-10" />
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
                      'flex h-10 items-center justify-center rounded-2xl text-sm font-medium transition-all',
                    ].join(' ')}
                    style={{ 
                      backgroundColor: isSelected ? 'var(--theme-primary)' : (isToday ? 'rgba(255,255,255,0.7)' : 'transparent'),
                      color: isSelected ? 'white' : 'var(--theme-text-primary)',
                      border: isToday && !isSelected ? `2px solid var(--theme-accent)` : 'none',
                    }}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--theme-border)' }}>
              <button
                type="button"
                onClick={() => {
                  setDueDate('')
                  setDueTime('')
                  setDdlPickerOpen(false)
                }}
                className="rounded-xl px-4 py-2 text-xs font-medium transition-all hover:opacity-80"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                {t.ddlNone}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDueDate(todayStr())
                  setDdlPickerOpen(false)
                }}
                className="rounded-xl border px-4 py-2 text-xs font-medium shadow-sm transition-all hover:opacity-80"
                style={{ 
                  backgroundColor: 'var(--theme-accent)', 
                  borderColor: 'var(--theme-accent)', 
                  color: 'white' 
                }}
              >
                {lang === LANG.ZH ? '今天' : 'Today'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* RATING MODAL - Post Focus Session */}
      {/* ========================================================================== */}
      {ratingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-3xl border border-yellow-200/70 bg-white/95 p-6 shadow-soft-xl backdrop-blur">
            <div className="text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 mx-auto">
                <span className="text-3xl">⭐</span>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">{t.focusComplete}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t.greatJob}</p>
            </div>
            
            <div className="mt-6">
              <p className="text-center text-sm font-medium text-zinc-700 mb-3">{t.rateSession}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => submitSessionRating(star)}
                    className="group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-200 bg-yellow-50 text-2xl transition-all hover:scale-110 hover:border-yellow-400"
                  >
                    ⭐
                    <span className="absolute -bottom-6 text-xs font-medium text-yellow-600 opacity-0 transition-opacity group-hover:opacity-100">
                      {star}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center">
              <button
                type="button"
                onClick={skipRating}
                className="text-sm text-zinc-400 hover:text-zinc-600"
              >
                {t.skip}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* PROJECT DETAIL MODAL */}
      {/* ========================================================================== */}
      {projectDetailOpen && selectedProjectId && (
        (() => {
          const project = projects.find(p => p.id === selectedProjectId)
          if (!project) return null
          const projectSessions = focusLogs.filter(l => l.taskId === selectedProjectId && l.taskType === 'project')
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setProjectDetailOpen(false)
              }}
            >
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
              <div className="relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/95 p-5 shadow-soft-xl backdrop-blur sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-2xl">
                      {project.completed ? '✅' : '📁'}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900">{project.title}</h2>
                      {project.completed && (
                        <span className="text-xs text-green-600">{t.projectCompleted}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProjectDetailOpen(false)}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">{t.totalTimeInvested}</div>
                    <div className="mt-1 text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                      {Math.round(project.focusMinutes)} <span className="text-sm font-normal">{t.pomodoroMinutes}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">{t.averageScore}</div>
                    <div className="mt-1 text-xl font-bold" style={{ color: 'var(--theme-primary)' }}>
                      {project.averageRating ? project.averageRating.toFixed(1) : '-'}
                      {project.averageRating && <span className="text-sm font-normal"> ⭐</span>}
                    </div>
                  </div>
                </div>

                {/* Session History */}
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                    {t.sessionHistory}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {projectSessions.length > 0 ? (
                      projectSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">🕐</span>
                            <span className="text-zinc-600">
                              {new Date(session.endedAt).toLocaleDateString(lang === LANG.ZH ? 'zh-CN' : 'en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-700">{session.durationMinutes} {t.pomodoroMinutes}</span>
                            {session.userRating && (
                              <span className="text-yellow-500">⭐{session.userRating}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-zinc-400">
                        {t.noSessions}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!project.completed && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        completeProject(selectedProjectId)
                        setProjectDetailOpen(false)
                      }}
                      className="flex-1 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600"
                    >
                      {t.markComplete}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })()
      )}

      {/* ========================================================================== */}
      {/* CLEAR CONFIRM MODAL */}
      {/* ========================================================================== */}
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
