// Pomodoro Timer Component - Advanced Version
// Features: Custom intervals, Dual timer modes, Task dropdown, Focus logs

import { useEffect, useMemo, useRef, useState } from 'react'

// Default durations in minutes
const DEFAULT_WORK = 25
const DEFAULT_SHORT_BREAK = 5
const DEFAULT_LONG_BREAK = 15

// SVG Circle constants
const CIRCLE_RADIUS = 120
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

const PRIORITY_META = {
  high: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 ring-red-200' },
  medium: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
  low: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
}

export default function PomodoroTimer({
  tasks,
  projects,
  selectedTaskId,
  selectedTaskType,
  onSelectTask,
  onSessionComplete,
  onRequestRating,
  lang,
  t,
  theme,
}) {
  // Timer settings
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK)
  const [shortBreakDuration, setShortBreakDuration] = useState(DEFAULT_SHORT_BREAK)
  const [longBreakDuration, setLongBreakDuration] = useState(DEFAULT_LONG_BREAK)
  const [timerMode, setTimerMode] = useState('countdown') // 'countdown' | 'countup'
  const [showSettings, setShowSettings] = useState(false)

  // Timer state
  const [mode, setMode] = useState('work') // 'work' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK * 60) // in seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0) // for countup mode
  const [isRunning, setIsRunning] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  
  // Focus Guard state - for countup mode safety check
  const [showFocusGuard, setShowFocusGuard] = useState(false)
  const focusGuardRef = useRef(null)
  
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  // Get duration based on mode
  const duration = mode === 'work' ? workDuration :
                  mode === 'shortBreak' ? shortBreakDuration :
                  longBreakDuration

  // Calculate progress
  const progress = useMemo(() => {
    if (timerMode === 'countup') {
      const totalSeconds = duration * 60
      return Math.min((elapsedSeconds / totalSeconds) * 100, 100)
    }
    const totalSeconds = duration * 60
    return ((totalSeconds - timeLeft) / totalSeconds) * 100
  }, [timeLeft, elapsedSeconds, duration, timerMode])

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Get selected task/project info
  const selectedItem = useMemo(() => {
    if (!selectedTaskId) return null
    if (selectedTaskType === 'daily') {
      return tasks.find(task => task.id === selectedTaskId)
    } else {
      return projects.find(p => p.id === selectedTaskId)
    }
  }, [tasks, projects, selectedTaskId, selectedTaskType])

  // Filter tasks and projects for dropdown - grouped
  const filteredGroups = useMemo(() => {
    const dailyTasks = tasks.filter(t => !t.done).map(t => ({ ...t, type: 'daily', displayTitle: t.title }))
    const projectsList = projects.map(p => ({ ...p, type: 'project', displayTitle: p.title }))
    
    let filteredDaily = dailyTasks
    let filteredProjects = projectsList
    
    if (searchQuery) {
      filteredDaily = dailyTasks.filter(item => 
        item.displayTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
      filteredProjects = projectsList.filter(item => 
        item.displayTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    return {
      daily: filteredDaily,
      projects: filteredProjects,
    }
  }, [tasks, projects, searchQuery])

  const hasItems = filteredGroups.daily.length > 0 || filteredGroups.projects.length > 0

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      if (timerMode === 'countdown') {
        intervalRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleTimerComplete()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        // Countup mode
        intervalRef.current = setInterval(() => {
          setElapsedSeconds(prev => prev + 1)
        }, 1000)
      }
    }
    
    return () => clearInterval(intervalRef.current)
  }, [isRunning, timerMode])

  const handleTimerComplete = () => {
    setIsRunning(false)
    setShowComplete(true)
    setShowFocusGuard(false)
    
    // Play completion sound
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
    
    // Record focus session - for project tasks, trigger rating
    if (selectedTaskId && mode === 'work') {
      const actualDuration = timerMode === 'countup' 
        ? Math.round(elapsedSeconds / 60) 
        : duration
      
      if (selectedTaskType === 'project' && onRequestRating) {
        // For projects, request rating
        onRequestRating({
          taskId: selectedTaskId,
          duration: actualDuration,
          taskType: selectedTaskType,
        })
      } else {
        // For daily tasks, record directly
        onSessionComplete(selectedTaskId, actualDuration, selectedTaskType || 'daily')
      }
    }
    
    // Auto-switch to break after work
    if (mode === 'work') {
      setMode('shortBreak')
      setTimeLeft(shortBreakDuration * 60)
      setElapsedSeconds(0)
    }
  }

  // Focus Guard: Check if countup timer has been running for 60+ minutes without user interaction
  useEffect(() => {
    if (timerMode === 'countup' && isRunning && mode === 'work') {
      // Clear any existing timeout
      if (focusGuardRef.current) {
        clearTimeout(focusGuardRef.current)
      }
      
      // Set a 60-minute (60 * 60 * 1000 ms) timeout to show the reminder
      focusGuardRef.current = setTimeout(() => {
        // Check if still running after 60 minutes
        if (isRunning && elapsedSeconds >= 60 * 60) {
          setShowFocusGuard(true)
        }
      }, 60 * 60 * 1000) // 60 minutes
    } else {
      // Clear the focus guard when timer stops or changes
      if (focusGuardRef.current) {
        clearTimeout(focusGuardRef.current)
        focusGuardRef.current = null
      }
      setShowFocusGuard(false)
    }
    
    return () => {
      if (focusGuardRef.current) {
        clearTimeout(focusGuardRef.current)
      }
    }
  }, [isRunning, timerMode, mode])

  // Reset timer when mode changes
  useEffect(() => {
    setIsRunning(false)
    setTimeLeft(duration * 60)
    setElapsedSeconds(0)
    setShowComplete(false)
    setSessionStartTime(null)
  }, [mode, duration])

  const handleStart = () => {
    if (!sessionStartTime) {
      setSessionStartTime(Date.now())
    }
    setIsRunning(true)
  }
  
  const handlePause = () => setIsRunning(false)
  
  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(duration * 60)
    setElapsedSeconds(0)
    setShowComplete(false)
    setSessionStartTime(null)
  }

  const handleStop = () => {
    // Stop and record the session
    if (sessionStartTime && selectedTaskId && mode === 'work') {
      const actualDuration = timerMode === 'countup'
        ? Math.round(elapsedSeconds / 60)
        : Math.round((duration * 60 - timeLeft) / 60)
      if (actualDuration > 0) {
        if (selectedTaskType === 'project' && onRequestRating) {
          onRequestRating({
            taskId: selectedTaskId,
            duration: actualDuration,
            taskType: selectedTaskType,
          })
        } else {
          onSessionComplete(selectedTaskId, actualDuration, selectedTaskType || 'daily')
        }
      }
    }
    handleReset()
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
  }

  // Calculate stroke dash offset
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE - (progress / 100) * CIRCLE_CIRCUMFERENCE

  // Get mode color
  const getModeColor = () => {
    if (mode === 'work') return 'var(--theme-primary)'
    return '#10b981'
  }

  const currentTime = timerMode === 'countdown' ? timeLeft : elapsedSeconds

  return (
    <div className="space-y-4">
      {/* Audio element */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleV0mAADi0o7TqIRtIQAA6dKQw6R8aQkA8u7Mm9SneF8AANzPo7+xaB4AANvNnaBodSAAANjNmpdodSAAANbNmpZneCAAANbNmZRmeCAAANbMmZJkeCAAANbLmZFlmR8AANbLmZBlmR4AANbLmZBlmR0AANbLmZBllx0AANbLmZBllxwAANbLmZBllxsAANbLmZBllxoAANbLmZBllxkAANbLmZBllxgAANbLmZBllxcAANbLmZBllxcAANbLmZBllxcAANbLmZBllxcAANbLmZBllxcAANbLmZBllxcAANbLmZBllxcAANbLmZBllxc=" type="audio/wav" />
      </audio>

      {/* Mode Selection Tabs */}
      <div 
        className="rounded-2xl border p-3 shadow-sm backdrop-blur"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('work')}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                mode === 'work' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: mode === 'work' ? 'var(--theme-primary)' : 'transparent',
                color: mode === 'work' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.pomodoroWork}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('shortBreak')}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                mode === 'shortBreak' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: mode === 'shortBreak' ? '#10b981' : 'transparent',
                color: mode === 'shortBreak' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.pomodoroShortBreak}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('longBreak')}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                mode === 'longBreak' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: mode === 'longBreak' ? '#10b981' : 'transparent',
                color: mode === 'longBreak' ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              {t.pomodoroLongBreak}
            </button>
          </div>
          
          {/* Settings & Mode Toggle */}
          <div className="flex items-center gap-2">
            {/* Timer Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setTimerMode(prev => prev === 'countdown' ? 'countup' : 'countdown')
                handleReset()
              }}
              className="rounded-xl border px-3 py-2 text-xs font-medium shadow-sm transition-all"
              style={{
                backgroundColor: 'white',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text-secondary)',
              }}
            >
              {timerMode === 'countdown' ? t.countdownMode : t.countupMode}
            </button>
            
            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-xl border p-2 shadow-sm transition-all"
              style={{
                backgroundColor: showSettings ? 'var(--theme-primary)' : 'white',
                borderColor: 'var(--theme-border)',
                color: showSettings ? 'white' : 'var(--theme-text-secondary)',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: 'var(--theme-border)' }}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500">{t.focusDuration}</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.shortBreakDuration}</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">{t.longBreakDuration}</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Math.max(1, Math.min(60, parseInt(e.target.value) || 15)))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Selection Dropdown - Glassmorphism Style */}
      <div 
        className="rounded-2xl border shadow-lg backdrop-blur-xl transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          borderColor: 'var(--theme-card-border)',
        }}
      >
        {/* Selected Task Display */}
        <div 
          className="m-2 cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md"
          style={{
            backgroundColor: selectedItem ? 'var(--theme-primary)' : 'rgba(255, 255, 255, 0.9)',
            borderColor: 'rgba(0, 0, 0, 0.05)',
          }}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {selectedItem ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg">
                {selectedItem.type === 'project' ? '📁' : '📝'}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold block" style={{ color: 'white' }}>
                  {selectedItem.displayTitle || selectedItem.title}
                </span>
                <span className="text-xs opacity-70" style={{ color: 'white' }}>
                  {selectedItem.type === 'project' ? t.longTermProjects : t.dailyTodos}
                </span>
              </div>
              <svg className="h-5 w-5 transition-transform" style={{ color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDropdown ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                <svg className="h-4 w-4" style={{ color: 'var(--theme-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="flex-1 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                {t.selectTaskPlaceholder}
              </span>
              <svg className="h-5 w-5 transition-transform" style={{ color: 'var(--theme-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDropdown ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </div>
          )}
        </div>

        {/* Dropdown Content with smooth animation */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-out ${
            showDropdown ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-2 pt-0 space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTasks}
              className="w-full rounded-xl border border-zinc-200/50 bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100 transition-all"
              autoFocus={showDropdown}
            />
            
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {hasItems ? (
                <>
                  {/* Daily Tasks Group */}
                  {filteredGroups.daily.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                        <span>📝</span> {t.dailyTasks || '每日任务'}
                      </div>
                      {filteredGroups.daily.map((item) => {
                        const isSelected = selectedTaskId === item.id
                        const meta = PRIORITY_META[item.priority] || PRIORITY_META.medium
                        
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectTask(item.id, item.type)
                              setShowDropdown(false)
                              setSearchQuery('')
                            }}
                            className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                              isSelected ? 'ring-2 ring-offset-1' : ''
                            }`}
                            style={{
                              backgroundColor: isSelected ? 'var(--theme-primary)' : 'rgba(255, 255, 255, 0.9)',
                              borderColor: isSelected ? 'var(--theme-primary)' : 'rgba(0, 0, 0, 0.05)',
                              ringColor: 'var(--theme-primary)',
                            }}
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : meta.dot.replace('bg-', '') }} />
                            <span className="flex-1 text-sm font-medium truncate" style={{ color: isSelected ? 'white' : 'var(--theme-text-primary)' }}>
                              {item.displayTitle || item.title}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Long-term Projects Group */}
                  {filteredGroups.projects.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                        <span>📁</span> {t.longTermProjects}
                      </div>
                      {filteredGroups.projects.map((item) => {
                        const isSelected = selectedTaskId === item.id
                        
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectTask(item.id, item.type)
                              setShowDropdown(false)
                              setSearchQuery('')
                            }}
                            className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                              isSelected ? 'ring-2 ring-offset-1' : ''
                            }`}
                            style={{
                              backgroundColor: isSelected ? 'var(--theme-primary)' : 'rgba(255, 255, 255, 0.9)',
                              borderColor: isSelected ? 'var(--theme-primary)' : 'rgba(0, 0, 0, 0.05)',
                              ringColor: 'var(--theme-primary)',
                            }}
                          >
                            <span className="text-lg">📁</span>
                            <span className="flex-1 text-sm font-medium truncate" style={{ color: isSelected ? 'white' : 'var(--theme-text-primary)' }}>
                              {item.displayTitle || item.title}
                            </span>
                            {item.focusMinutes > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-zinc-100" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--theme-text-secondary)' }}>
                                {Math.round(item.focusMinutes)} {t.minutes}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-sm text-zinc-400">
                  {t.noTasks}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      <div 
        className={`rounded-3xl border p-6 shadow-sm backdrop-blur transition-all duration-500 ${
          isRunning ? 'animate-pulse-slow' : ''
        }`}
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          borderColor: 'var(--theme-card-border)',
        }}
      >
        <div className="flex flex-col items-center">
          {/* Circular Timer */}
          <div className="relative">
            <svg width="280" height="280" className="transform -rotate-90">
              <circle
                cx="140"
                cy="140"
                r={CIRCLE_RADIUS}
                fill="none"
                stroke="var(--theme-border)"
                strokeWidth="8"
              />
              <circle
                cx="140"
                cy="140"
                r={CIRCLE_RADIUS}
                fill="none"
                stroke={getModeColor()}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            {/* Time Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="text-5xl font-bold tracking-wider"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {formatTime(currentTime)}
              </span>
              <span 
                className="mt-2 text-sm font-medium truncate max-w-[200px]"
                style={{ color: 'var(--theme-text-secondary)' }}
                title={selectedItem ? selectedItem.displayTitle || selectedItem.title : ''}
              >
                {selectedItem && mode === 'work' 
                  ? (selectedItem.displayTitle || selectedItem.title)
                  : mode === 'work' 
                    ? t.pomodoroWork 
                    : mode === 'shortBreak' 
                      ? t.pomodoroShortBreak 
                      : t.pomodoroLongBreak}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="mt-6 flex items-center gap-3">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStart}
                className="rounded-2xl px-8 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: getModeColor(),
                  color: 'white',
                }}
              >
                {t.pomodoroStart}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: 'var(--theme-text-secondary)',
                  color: 'white',
                }}
              >
                {t.pause || 'Pause'}
              </button>
            )}
            
            {/* Show Stop button when timer is active or paused (has session time) */}
            {((isRunning && timerMode === 'countup') || (sessionStartTime && (elapsedSeconds > 0 || timeLeft < duration * 60))) && (
              <button
                type="button"
                onClick={handleStop}
                className="rounded-2xl px-6 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 bg-red-500 text-white"
              >
                {t.stop || 'Stop'}
              </button>
            )}
            
            {/* Show Reset button only when not running and no active session */}
            {!isRunning && !sessionStartTime && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50"
              >
                {t.pomodoroReset}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {showComplete && (
        <div 
          className="rounded-2xl border p-4 shadow-lg backdrop-blur-md animate-bounce"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderColor: '#10b981',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700">
              {t.pomodoroComplete}
            </p>
          </div>
        </div>
      )}

      {/* Focus Guard Reminder - for countup mode */}
      {showFocusGuard && (
        <div 
          className="rounded-2xl border p-4 shadow-lg backdrop-blur-md animate-pulse"
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            borderColor: '#fbbf24',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                {t.focusGuardTitle || 'Still focusing?'}
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {t.focusGuardMessage || 'Click to continue your session'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowFocusGuard(false)
                // Reset the focus guard timer by resetting elapsed time tracking
                setElapsedSeconds(0)
              }}
              className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-yellow-600 transition-all"
            >
              {t.focusGuardContinue || 'Continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
