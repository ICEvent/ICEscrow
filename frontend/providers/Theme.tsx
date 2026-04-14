import React from "react"
import { FC, useContext, useEffect } from 'react'

import { ChosenTheme } from './ChosenTheme'
interface Props {
  children: React.ReactNode;
}

export const ThemeProvider: FC<Props> = ({ children }) => {
  const { theme } = useContext(ChosenTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.body.classList.toggle('dark-theme', theme === 'dark')
  }, [theme])

  return (
    <>{children}</>
  )
}
