"use client"

import { useState, useEffect } from "react"

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Функция для проверки размера экрана
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Проверяем при первой загрузке
    checkIfMobile()

    // Добавляем слушатель изменения размера окна
    window.addEventListener("resize", checkIfMobile)

    // Очищаем слушатель при размонтировании
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [breakpoint])

  return isMobile
}
