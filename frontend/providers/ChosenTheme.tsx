import React from "react"
import { FC, createContext, Dispatch, SetStateAction } from 'react'
import { useLocalStorage } from '@caldwell619/react-hooks'

export const ChosenTheme = createContext<IChosenTheme>({} as IChosenTheme)

interface Props {
  children: React.ReactNode;
}

export const ChosenThemeProvider: FC<Props> = ({ children }) => {
  const prefersDarkMode =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  const [theme, setTheme] = useLocalStorage<ThemeName>('theme', prefersDarkMode ? 'dark' : 'light', true)

  return <ChosenTheme.Provider value={{ theme, setTheme }}>{children}</ChosenTheme.Provider>
}

type ThemeName = 'dark' | 'light'
interface IChosenTheme {
  theme: ThemeName
  setTheme: Dispatch<SetStateAction<ThemeName>>
}
