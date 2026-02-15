// Calendar Component - Extracted from App.jsx
// Displays a monthly calendar view with Daily Task List section

import { useMemo } from 'react'

// Helper to pad single digit numbers
function pad2(n) {
  return String(n).padStart(2, '0')
}

// Get month title in localized format
function monthTitle(d, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'long',
    }).format(d)
  } catch {
    return `${d.getFullYear()}-${d.getMonth() + 1}`
  }
}

// Get today's date string
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const PRIORITY_META = {
  high: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-200' },
  medium: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
  low: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
}

export default function CalendarView({
  tasks,
  selectedCalendarDate,
  onSelectCalendarDate,
  calendarMonth,
  onChangeMonth,
  lang,
  t,
  theme,
}) {
  // Generate calendar days
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

  // Check if a date has tasks with due dates
  const dayHasDue = (dateStr) => {
    return tasks.some((task) => task.dueAt && (() => {
      const d = new Date(task.dueAt)
      const s = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      return s === dateStr
    })())
  }

  // Get tasks for selected date - uses selectedCalendarDate (independent from task list)
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedCalendarDate) return []
    return tasks.filter((task) => {
      if (!task.dueAt) return false
      const d = new Date(task.dueAt)
      const s = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      return s === selectedCalendarDate
    }).sort((a, b) => {
      // Sort by priority (high > medium > low)
      const priorityRank = { high: 3, medium: 2, low: 1 }
      return priorityRank[b.priority] - priorityRank[a.priority]
    })
  }, [tasks, selectedCalendarDate])

  const today = todayStr()

  // Format date for display
  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Section */}
      <div 
        className="rounded-3xl border p-4 shadow-sm backdrop-blur transition-all duration-300"
        style={{ 
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {t.calendarTitle}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-all hover:opacity-80"
              style={{ 
                backgroundColor: 'white', 
                borderColor: 'var(--theme-border)', 
                color: 'var(--theme-text-secondary)' 
              }}
            >
              ‹
            </button>
            <div 
              className="min-w-28 text-center text-sm font-medium"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              {monthTitle(calendarMonth, lang)}
            </div>
            <button
              type="button"
              onClick={() => onChangeMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-all hover:opacity-80"
              style={{ 
                backgroundColor: 'white', 
                borderColor: 'var(--theme-border)', 
                color: 'var(--theme-text-secondary)' 
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div 
          className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs"
          style={{ color: 'var(--theme-text-secondary)' }}
        >
          {t.weekdays.map((w) => (
            <div key={w} className="py-2 font-medium">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {calendarDays.map((d, idx) => {
            if (!d) return <div key={idx} className="h-11" />
            
            const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
            const isSelected = selectedCalendarDate === dateStr
            const isToday = dateStr === today
            const hasDue = dayHasDue(dateStr)

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectCalendarDate((prev) => (prev === dateStr ? '' : dateStr))}
                className={[
                  'relative h-11 rounded-2xl border text-sm font-medium shadow-sm transition-all flex flex-col items-center justify-center',
                ].join(' ')}
                style={{ 
                  backgroundColor: isSelected ? 'var(--theme-primary)' : 'white', 
                  borderColor: isSelected ? 'var(--theme-primary)' : 'transparent',
                }}
              >
                {/* Date number - Apple Style: Selected = white text on solid, Today = bold primary color */}
                <span
                  className="text-sm"
                  style={{ 
                    color: isSelected ? 'white' : (isToday ? 'var(--theme-primary)' : 'var(--theme-text-primary)'),
                    fontWeight: isToday ? '700' : '400',
                  }}
                >
                  {d.getDate()}
                </span>
                
                {/* DDL indicator dot - only show for dates with tasks */}
                {hasDue && !isSelected && (
                  <span 
                    className="absolute bottom-1 h-1 w-1 rounded-full"
                    style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.7 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Daily Task List Section */}
      <div 
        className="rounded-3xl border p-4 shadow-sm backdrop-blur transition-all duration-300"
        style={{ 
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            {selectedCalendarDate ? formatSelectedDate(selectedCalendarDate) : (lang === 'zh-CN' ? '选择日期查看任务' : 'Select a date to view tasks')}
          </div>
          {selectedCalendarDate && (
            <button
              type="button"
              onClick={() => onSelectCalendarDate('')}
              className="rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:opacity-80"
              style={{ 
                backgroundColor: 'white', 
                borderColor: 'var(--theme-border)', 
                color: 'var(--theme-text-secondary)' 
              }}
            >
              {t.clearFilter}
            </button>
          )}
        </div>

        {/* Task List or Empty State */}
        {selectedCalendarDate ? (
          tasksForSelectedDate.length > 0 ? (
            <ul className="space-y-2">
              {tasksForSelectedDate.map((task) => {
                const meta = PRIORITY_META[task.priority] || PRIORITY_META.medium
                const timeDisplay = task.dueTime || '23:59'
                
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white/80 px-4 py-3 shadow-sm"
                  >
                    {/* Priority dot */}
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    
                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${meta.badge}`}
                        >
                          {task.priority === 'high' ? '高' : task.priority === 'low' ? '低' : '中'}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                          {timeDisplay}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm font-medium ${task.done ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                        {task.title}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                {t.noTasksDate(selectedCalendarDate)}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-secondary)', opacity: 0.7 }}>
                {lang === 'zh-CN' ? '点击其他日期查看该日任务' : 'Click another date to view tasks'}
              </p>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-8 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
              {lang === 'zh-CN' ? '点击日历上的日期查看当日任务' : 'Click a date on the calendar to view tasks'}
            </p>
          </div>
        )}
      </div>

      {/* Hint */}
      <div 
        className="text-center text-xs px-2"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        {t.calendarHint}
      </div>
    </div>
  )
}
