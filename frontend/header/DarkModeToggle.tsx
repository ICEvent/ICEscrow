import React from 'react'
import { FC, useContext } from 'react'

import { ChosenTheme } from '../providers'

const DarkModeToggle: FC = () => {
  const { theme, setTheme } = useContext(ChosenTheme)
  const isChecked = theme === 'dark'

  return (
    <div>
      <input
        type='checkbox'
        id='dark-mode-toggle'
        className='sr-only'
        checked={isChecked}
        onChange={({ target: { checked } }) => {
          const themeToSet = checked ? 'dark' : 'light'
          setTheme(themeToSet)
        }}
      />
      <label
        htmlFor='dark-mode-toggle'
        className='relative flex h-8 w-14 cursor-pointer items-center justify-between rounded-full bg-slate-800 px-2 text-xs'
      >
        <span className='text-amber-300'>☀</span>
        <span className='text-indigo-200'>☾</span>
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
            isChecked ? 'left-7' : 'left-1'
          }`}
        />
      </label>
    </div>
  )
}

export default DarkModeToggle
