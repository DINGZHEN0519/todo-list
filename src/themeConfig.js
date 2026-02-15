// Theme configuration for the Todo List application
// Updated with 3 new Macaron/Morandi color palettes using linear-gradient backgrounds

export const THEMES = [
  // Original themes (kept)
  { id: 'soft-white', name: 'Soft White', nameZh: '纯净白', bgClass: 'from-zinc-50 to-white', textClass: 'text-zinc-900', primary: '#18181b', accent: '#3f3f46', border: '#e4e4e7' },
  { id: 'sakura-pink', name: 'Sakura Pink', nameZh: '樱花粉', bgClass: 'from-rose-50 to-white', textClass: 'text-zinc-900', primary: '#be123c', accent: '#f43f5e', border: '#ffe4e6' },
  { id: 'mint-green', name: 'Mint Green', nameZh: '薄荷绿', bgClass: 'from-emerald-50 to-white', textClass: 'text-zinc-900', primary: '#047857', accent: '#10b981', border: '#d1fae5' },
  { id: 'morandi-blue', name: 'Morandi Blue', nameZh: '莫兰迪蓝', bgClass: 'from-sky-50 to-white', textClass: 'text-zinc-900', primary: '#0369a1', accent: '#0ea5e9', border: '#e0f2fe' },
  { id: 'creamy-yellow', name: 'Creamy Yellow', nameZh: '奶油黄', bgClass: 'from-amber-50 to-white', textClass: 'text-zinc-900', primary: '#b45309', accent: '#f59e0b', border: '#fef3c7' },

  // New Macaron/Morandi color palettes (Low saturation, elegant tones)
  // Soft Lavender - 淡紫薰衣草
  { id: 'soft-lavender', name: 'Soft Lavender', nameZh: '淡紫薰衣草', bgClass: 'from-[#e8e0f0] to-[#f5f0fa]', textClass: 'text-violet-900', primary: '#7c3aed', accent: '#a78bfa', border: '#ddd6fe' },

  // Muted Sage Green - 鼠尾草绿
  { id: 'muted-sage', name: 'Muted Sage', nameZh: '鼠尾草绿', bgClass: 'from-[#d4e5d7] to-[#f0f5f1]', textClass: 'text-stone-800', primary: '#5d8a6b', accent: '#84a98c', border: '#c3d7c5' },

  // Warm Sandstone - 暖色砂岩
  { id: 'warm-sandstone', name: 'Warm Sandstone', nameZh: '暖色砂岩', bgClass: 'from-[#e8dcc8] to-[#f5f0e8]', textClass: 'text-stone-800', primary: '#a67c52', accent: '#c9a87c', border: '#dccfb8' },
]

// Get theme by ID
export function getTheme(themeId) {
  return THEMES.find(t => t.id === themeId) || THEMES[0]
}

// Get theme name based on language
export function getThemeName(themeId, isZh = true) {
  const theme = getTheme(themeId)
  return isZh ? (theme.nameZh || theme.name) : theme.name
}

// Get CSS variables for a theme
export function getThemeCSSVars(themeId) {
  const theme = getTheme(themeId)
  return {
    '--theme-primary': theme.primary,
    '--theme-accent': theme.accent,
    '--theme-border': theme.border,
    '--theme-bg-from': getBgFrom(themeId),
    '--theme-bg-to': getBgTo(themeId),
  }
}

// Helper to get gradient colors for linear-gradient backgrounds
function getBgFrom(themeId) {
  const map = {
    'soft-white': '#f4f4f5',
    'sakura-pink': '#fff1f2',
    'mint-green': '#ecfdf5',
    'morandi-blue': '#f0f9ff',
    'creamy-yellow': '#fffbeb',
    'soft-lavender': '#e8e0f0',
    'muted-sage': '#d4e5d7',
    'warm-sandstone': '#e8dcc8',
  }
  return map[themeId] || '#f4f4f5'
}

function getBgTo(themeId) {
  const map = {
    'soft-white': '#ffffff',
    'sakura-pink': '#ffffff',
    'mint-green': '#ffffff',
    'morandi-blue': '#ffffff',
    'creamy-yellow': '#ffffff',
    'soft-lavender': '#f5f0fa',
    'muted-sage': '#f0f5f1',
    'warm-sandstone': '#f5f0e8',
  }
  return map[themeId] || '#ffffff'
}

export default THEMES
