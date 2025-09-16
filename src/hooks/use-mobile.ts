"use client"

import { useState, useEffect } from "react"

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Функция для проверки размера экрана и типа устройства
    const checkIfMobile = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Проверяем размер экрана
      const isMobileSize = width < breakpoint
      
      // Дополнительная проверка для мобильных устройств по соотношению сторон
      const isMobileRatio = (width < height && width <= 430) || // Portrait mobile
                           (height < width && height <= 430)   // Landscape mobile
      
      // Проверяем User Agent для дополнительной точности
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Устанавливаем мобильный режим если выполняется любое из условий
      setIsMobile(isMobileSize || isMobileRatio || isMobileUA)
    }

    // Проверяем при первой загрузке
    checkIfMobile()

    // Добавляем слушатели изменения размера окна и ориентации
    window.addEventListener("resize", checkIfMobile)
    window.addEventListener("orientationchange", () => {
      // Небольшая задержка для корректного определения размеров после поворота
      setTimeout(checkIfMobile, 100)
    })

    // Очищаем слушатели при размонтировании
    return () => {
      window.removeEventListener("resize", checkIfMobile)
      window.removeEventListener("orientationchange", checkIfMobile)
    }
  }, [breakpoint])

  return isMobile
}

// Дополнительный хук для определения конкретного устройства
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth
      
      if (width < 768) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    checkDeviceType()
    window.addEventListener("resize", checkDeviceType)
    window.addEventListener("orientationchange", () => {
      setTimeout(checkDeviceType, 100)
    })

    return () => {
      window.removeEventListener("resize", checkDeviceType)
      window.removeEventListener("orientationchange", checkDeviceType)
    }
  }, [])

  return deviceType
}
