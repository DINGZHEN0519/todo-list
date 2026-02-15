// Stats Dashboard Component
// Features: Monthly Focus View, Calendar Grid, Day Details, Monthly Stats

import { useMemo, useState } from 'react'

// Helper to pad single digit numbers
function pad2(n) {
  return String(n).padStart(2, '0')
}

// Get date string for a given timestamp
function tsToDateStr(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// Get day of week label
function getDayLabel(dateStr, lang, t) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekdays = t.weekdays || ['日', '一', '二', '三', '四', '五', '六']
  return weekdays[date.getDay()]
}

// Get month name
function getMonthName(month, lang) {
  const months = lang === 'zh-CN'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[month]
}

export default function StatsDashboard({
  tasks,
  projects,
  focusSessions,
  focusLogs,
  lang,
  t,
  theme,
}) {
  // Current date for default month
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // State: Selected month
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedDay, setSelectedDay] = useState(null)

  // Theme color mapping - map theme primary to Tailwind color name and hex values
  const getThemeColorName = (theme) => {
    const primary = theme?.primary?.toLowerCase() || ''
    if (primary.includes('be123c') || primary.includes('f43f5e')) return 'rose'
    if (primary.includes('047857') || primary.includes('10b981')) return 'emerald'
    if (primary.includes('0369a1') || primary.includes('0ea5e9')) return 'sky'
    if (primary.includes('b45309') || primary.includes('f59e0b')) return 'amber'
    if (primary.includes('7c3aed') || primary.includes('a78bfa')) return 'violet'
    if (primary.includes('5d8a6b') || primary.includes('84a98c')) return 'stone'
    if (primary.includes('a67c52') || primary.includes('c9a87c')) return 'stone'
    if (primary.includes('18181b') || primary.includes('3f3f46')) return 'zinc'
    return 'emerald'
  }

  // Get theme color hex values for legend
  const getThemeColorLevels = (themeColorName, themePrimary) => {
    const colorMap = {
      rose:    { light: '#ffe4e6', mediumLight: '#fda4af', medium: '#f43f5e', mediumDark: '#e11d48', dark: '#be123c' },
      emerald: { light: '#d1fae5', mediumLight: '#6ee7b7', medium: '#10b981', mediumDark: '#059669', dark: '#047857' },
      sky:     { light: '#e0f2fe', mediumLight: '#7dd3fc', medium: '#0ea5e9', mediumDark: '#0284c7', dark: '#0369a1' },
      amber:   { light: '#fef3c7', mediumLight: '#fcd34d', medium: '#f59e0b', mediumDark: '#d97706', dark: '#b45309' },
      violet:  { light: '#ede9fe', mediumLight: '#a78bfa', medium: '#8b5cf6', mediumDark: '#7c3aed', dark: '#6d28d9' },
      stone:   { light: '#d4e5d7', mediumLight: '#84a98c', medium: '#6b8f71', mediumDark: '#5d8a6b', dark: '#4a6f56' },
      zinc:    { light: '#f4f4f5', mediumLight: '#a1a1aa', medium: '#71717a', mediumDark: '#52525b', dark: '#3f3f46' },
    }
    const colors = colorMap[themeColorName] || colorMap.emerald
    if (themePrimary) {
      colors.dark = themePrimary
    }
    return colors
  }

  // Get theme object
  const themeObj = typeof theme === 'string' ? { primary: '#047857', accent: '#10b981' } : (theme || { primary: '#047857', accent: '#10b981' })
  const themeColorName = getThemeColorName(themeObj)
  const themeColorLevels = getThemeColorLevels(themeColorName, themeObj.primary)

  // Month navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
    setSelectedDay(null)
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
    setSelectedDay(null)
  }

  // Get days in selected month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
    const days = []

    // Build calendar grid (7 columns x 5-6 rows)
    // Fill in empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, isEmpty: true })
    }

    // Fill in days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${pad2(selectedMonth + 1)}-${pad2(day)}`
      const dayStart = new Date(selectedYear, selectedMonth, day).getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      // Get focus sessions for this day
      const daySessions = focusSessions.filter(s =>
        s.completedAt >= dayStart && s.completedAt < dayEnd
      )
      const dayMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

      days.push({
        day,
        dateStr,
        minutes: dayMinutes,
        isEmpty: false,
        isToday: selectedYear === currentYear && selectedMonth === currentMonth && day === now.getDate(),
      })
    }

    return days
  }, [selectedYear, selectedMonth, focusSessions])

  // Get max minutes for color scaling
  const maxMonthlyMinutes = useMemo(() => {
    const max = Math.max(...monthlyData.filter(d => !d.isEmpty).map(d => d.minutes), 1)
    return max
  }, [monthlyData])

  // Get color for day cell
  const getDayColor = (dayData) => {
    if (dayData.isEmpty) return 'bg-transparent'
    if (dayData.minutes === 0) return 'bg-zinc-100'

    const intensity = dayData.minutes / maxMonthlyMinutes
    if (intensity < 0.2) return `bg-[${themeColorLevels.light}]`
    if (intensity < 0.4) return `bg-[${themeColorLevels.mediumLight}]`
    if (intensity < 0.6) return `bg-[${themeColorLevels.medium}]`
    if (intensity < 0.8) return `bg-[${themeColorLevels.mediumDark}]`
    return `bg-[${themeColorLevels.dark}]`
  }

  // Get detailed sessions for selected day
  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return []

    const dateStr = `${selectedYear}-${pad2(selectedMonth + 1)}-${pad2(selectedDay)}`
    const dayStart = new Date(selectedYear, selectedMonth, selectedDay).getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000

    // Get sessions for this day from focusLogs
    const dayLogs = focusLogs.filter(log =>
      log.endedAt >= dayStart && log.endedAt < dayEnd
    )

    // Group by task
    const taskMap = new Map()

    dayLogs.forEach(log => {
      const key = `${log.taskType}-${log.taskId}`
      if (!taskMap.has(key)) {
        const task = log.taskType === 'project'
          ? projects.find(p => p.id === log.taskId)
          : tasks.find(t => t.id === log.taskId)

        taskMap.set(key, {
          taskId: log.taskId,
          taskType: log.taskType,
          taskTitle: task?.title || (log.taskType === 'project' ? 'Project' : 'Task'),
          totalMinutes: 0,
          ratings: [],
          sessions: [],
        })
      }

      const taskData = taskMap.get(key)
      taskData.totalMinutes += log.durationMinutes || 0
      if (log.userRating !== null && log.userRating !== undefined) {
        taskData.ratings.push(log.userRating)
      }
      taskData.sessions.push(log)
    })

    return Array.from(taskMap.values()).map(task => ({
      ...task,
      averageRating: task.ratings.length > 0
        ? Math.round(task.ratings.reduce((a, b) => a + b, 0) / task.ratings.length)
        : null,
    }))
  }, [selectedDay, selectedYear, selectedMonth, focusLogs, projects, tasks])

  // Monthly summary stats
  const monthlyStats = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
    const monthStart = new Date(selectedYear, selectedMonth, 1).getTime()
    const monthEnd = new Date(selectedYear, selectedMonth, daysInMonth).getTime() + 24 * 60 * 60 * 1000

    // Total focus minutes for the month
    const monthSessions = focusSessions.filter(s =>
      s.completedAt >= monthStart && s.completedAt < monthEnd
    )
    const totalMinutes = monthSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10

    // Most focused project
    const projectMinutes = {}
    monthSessions.forEach(s => {
      if (s.projectId) {
        projectMinutes[s.projectId] = (projectMinutes[s.projectId] || 0) + (s.durationMinutes || 0)
      }
    })

    let mostFocusedProject = null
    let maxProjectMinutes = 0
    Object.entries(projectMinutes).forEach(([projectId, minutes]) => {
      if (minutes > maxProjectMinutes) {
        maxProjectMinutes = minutes
        const project = projects.find(p => p.id === projectId)
        mostFocusedProject = project?.title || 'Project'
      }
    })

    // Average daily rating for the month
    const monthLogs = focusLogs.filter(log =>
      log.endedAt >= monthStart && log.endedAt < monthEnd
    )
    const ratings = monthLogs
      .filter(log => log.userRating !== null && log.userRating !== undefined)
      .map(log => log.userRating)

    const averageRating = ratings.length > 0
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length)
      : null

    return {
      totalHours,
      totalMinutes,
      mostFocusedProject,
      maxProjectMinutes,
      averageRating,
      daysWithFocus: monthSessions.length > 0 ? new Set(monthSessions.map(s => new Date(s.completedAt).getDate())).size : 0,
    }
  }, [selectedYear, selectedMonth, focusSessions, focusLogs, projects])

  // Calculate task statistics
  const taskStats = useMemo(() => {
    const nowTs = Date.now()
    const sevenDaysAgo = nowTs - 7 * 24 * 60 * 60 * 1000

    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.done).length
    const weeklyCompleted = tasks.filter(t =>
      t.done && t.completedAt && t.completedAt >= sevenDaysAgo
    ).length

    const efficiencyScore = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

    return {
      totalTasks,
      completedTasks,
      weeklyCompleted,
      efficiencyScore,
    }
  }, [tasks])

  // Calculate focus time statistics (today/this week)
  const focusStats = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartTs = todayStart.getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const todaySessions = focusSessions.filter(s => s.completedAt >= todayStartTs)
    const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

    const weekSessions = focusSessions.filter(s => s.completedAt >= sevenDaysAgo)
    const weekFocusMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)

    const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
    const totalFocusHours = Math.round(totalFocusMinutes / 60 * 10) / 10

    return {
      todayFocusMinutes,
      weekFocusMinutes,
      totalSessions: focusSessions.length,
      totalFocusMinutes,
      totalFocusHours,
    }
  }, [focusSessions])

  // Day labels
  const dayLabels = lang === 'zh-CN'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
        {t.productivityStats}
      </div>

      {/* Month Selector & Summary */}
      <div
        className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          borderColor: 'var(--theme-border)',
        }}
      >
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg hover:bg-zinc-100/50 transition-colors"
          >
            <svg className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-lg font-semibold" style={{ color: 'var(--theme-primary)' }}>
            {lang === 'zh-CN'
              ? `${selectedYear}年${getMonthName(selectedMonth, lang)}`
              : `${getMonthName(selectedMonth, lang)} ${selectedYear}`}
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-zinc-100/50 transition-colors"
            disabled={selectedYear === currentYear && selectedMonth === currentMonth}
          >
            <svg
              className="w-5 h-5"
              style={{ color: selectedYear === currentYear && selectedMonth === currentMonth ? '#d1d5db' : 'var(--theme-primary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Monthly Summary KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-white/30">
            <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {lang === 'zh-CN' ? '本月累计' : 'Total'}
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>
              {monthlyStats.totalHours}h
            </div>
          </div>

          <div className="text-center p-2 rounded-lg bg-white/30">
            <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {lang === 'zh-CN' ? '核心投入' : 'Top Project'}
            </div>
            <div className="text-sm font-bold truncate" style={{ color: 'var(--theme-primary)' }}>
              {monthlyStats.mostFocusedProject || (lang === 'zh-CN' ? '暂无' : 'None')}
            </div>
          </div>

          <div className="text-center p-2 rounded-lg bg-white/30">
            <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {lang === 'zh-CN' ? '平均状态' : 'Avg Rating'}
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>
              {monthlyStats.averageRating !== null ? `${monthlyStats.averageRating}${lang === 'zh-CN' ? '分' : ''}` : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div
        className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="text-[10px] font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
          {t.focusIntensityMap || '专注强度图'}
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((label, idx) => (
            <div key={idx} className="text-center text-xs text-zinc-400 py-1">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {monthlyData.map((dayData, idx) => (
            <button
              key={idx}
              onClick={() => !dayData.isEmpty && setSelectedDay(dayData.day)}
              disabled={dayData.isEmpty}
              className={`
                aspect-square rounded-xl transition-all duration-200
                ${dayData.isEmpty ? 'cursor-default' : 'cursor-pointer hover:scale-105 hover:z-10'}
                ${selectedDay === dayData.day ? 'ring-2 ring-offset-2' : ''}
              `}
              style={{
                backgroundColor: dayData.isEmpty
                  ? 'transparent'
                  : dayData.minutes === 0
                    ? '#f4f4f5'
                    : dayData.minutes < maxMonthlyMinutes * 0.2
                      ? themeColorLevels.light
                      : dayData.minutes < maxMonthlyMinutes * 0.4
                        ? themeColorLevels.mediumLight
                        : dayData.minutes < maxMonthlyMinutes * 0.6
                          ? themeColorLevels.medium
                          : dayData.minutes < maxMonthlyMinutes * 0.8
                            ? themeColorLevels.mediumDark
                            : themeColorLevels.dark,
                ringColor: selectedDay === dayData.day ? 'var(--theme-primary)' : 'transparent',
              }}
              title={!dayData.isEmpty ? `${dayData.dateStr}: ${dayData.minutes >= 60 ? (dayData.minutes / 60).toFixed(1) + 'h' : dayData.minutes + 'm'}` : ''}
            >
              {!dayData.isEmpty && (
                <span className={`text-xs font-medium ${dayData.minutes > maxMonthlyMinutes * 0.5 ? 'text-white' : 'text-zinc-700'}`}>
                  {dayData.day}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-4">
          <span className="text-xs text-zinc-400 mr-2">
            {lang === 'zh-CN' ? '少' : 'Less'}
          </span>
          <div className="w-4 h-4 rounded-md bg-zinc-100" />
          <div className="w-4 h-4 rounded-md" style={{ backgroundColor: themeColorLevels.light }} />
          <div className="w-4 h-4 rounded-md" style={{ backgroundColor: themeColorLevels.mediumLight }} />
          <div className="w-4 h-4 rounded-md" style={{ backgroundColor: themeColorLevels.medium }} />
          <div className="w-4 h-4 rounded-md" style={{ backgroundColor: themeColorLevels.mediumDark }} />
          <div className="w-4 h-4 rounded-md" style={{ backgroundColor: themeColorLevels.dark }} />
          <span className="text-xs text-zinc-400 ml-1">
            {lang === 'zh-CN' ? '多' : 'More'}
          </span>
        </div>
      </div>

      {/* Day Detail Card */}
      {selectedDay && (
        <div
          className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300 animate-fade-in"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>
              {lang === 'zh-CN'
                ? `${selectedYear}年${selectedMonth + 1}月${selectedDay}日`
                : `${getMonthName(selectedMonth, lang)} ${selectedDay}, ${selectedYear}`}
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-zinc-100/50"
            >
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedDaySessions.length > 0 ? (
            <div className="space-y-2">
              {selectedDaySessions.map((session, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {session.taskType === 'project' ? '📁' : '📝'}
                    </span>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                        {session.taskTitle}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                        {session.totalMinutes >= 60
                          ? `${(session.totalMinutes / 60).toFixed(1)}${lang === 'zh-CN' ? '小时' : 'h'}`
                          : `${session.totalMinutes}${lang === 'zh-CN' ? '分钟' : 'min'}`}
                      </div>
                    </div>
                  </div>

                  {session.averageRating !== null && (
                    <div
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: session.averageRating >= 80 ? '#d1fae5' : session.averageRating >= 60 ? '#fef3c7' : '#fee2e2',
                        color: session.averageRating >= 80 ? '#047857' : session.averageRating >= 60 ? '#b45309' : '#be123c',
                      }}
                    >
                      {session.averageRating}{lang === 'zh-CN' ? '分' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-zinc-400 text-sm">
              {lang === 'zh-CN' ? '当日无专注记录' : 'No focus sessions'}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats - Today's Focus */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.pomodoroTodayFocus}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>
              {focusStats.todayFocusMinutes}
            </span>
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {t.pomodoroMinutes}
            </span>
          </div>
        </div>

        <div
          className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.pomodoroWeekFocus}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color: 'var(--theme-primary)' }}>
              {focusStats.weekFocusMinutes}
            </span>
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {t.pomodoroMinutes}
            </span>
          </div>
        </div>
      </div>

      {/* Total Focus Hours */}
      <div
        className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.totalFocusHours}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
              {focusStats.totalFocusHours}
            </span>
            <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
              {t.hours}
            </span>
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-2xl border p-3 shadow-sm backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.weeklyAchievement}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
              {taskStats.weeklyCompleted}
            </span>
            <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
              {t.tasksCompleted}
            </span>
          </div>
        </div>

        <div
          className="rounded-2xl border p-3 shadow-sm backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.efficiencyScore}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
              {taskStats.efficiencyScore}
            </span>
            <span className="text-lg font-bold" style={{ color: 'var(--theme-primary)' }}>%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${taskStats.efficiencyScore}%`,
                backgroundColor: 'var(--theme-accent)',
              }}
            />
          </div>
        </div>

        <div
          className="rounded-2xl border p-3 shadow-sm backdrop-blur-md transition-all duration-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            borderColor: 'var(--theme-border)',
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>
            {t.totalTasks}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--theme-primary)' }}>
              {taskStats.totalTasks}
            </span>
          </div>
        </div>
      </div>

      {/* Priority Distribution */}
      <div
        className="rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div className="text-[10px] font-medium uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
          {t.taskDistribution}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {t.highPriority}
              </span>
              <span className="font-medium text-zinc-700">{taskStats.priorityDistribution?.high || 0}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-500"
                style={{
                  width: taskStats.totalTasks > 0 ? `${(taskStats.priorityDistribution?.high || 0) / taskStats.totalTasks * 100}%` : '0%',
                }}
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                {t.mediumPriority}
              </span>
              <span className="font-medium text-zinc-700">{taskStats.priorityDistribution?.medium || 0}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
                style={{
                  width: taskStats.totalTasks > 0 ? `${(taskStats.priorityDistribution?.medium || 0) / taskStats.totalTasks * 100}%` : '0%',
                }}
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {t.lowPriority}
              </span>
              <span className="font-medium text-zinc-700">{taskStats.priorityDistribution?.low || 0}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: taskStats.totalTasks > 0 ? `${(taskStats.priorityDistribution?.low || 0) / taskStats.totalTasks * 100}%` : '0%',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
