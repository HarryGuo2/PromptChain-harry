'use client'

import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <select
      className="btn"
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      aria-label="Theme mode"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  )
}
