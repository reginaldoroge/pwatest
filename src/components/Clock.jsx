import { useState, useEffect } from 'react'

export default function Clock() {
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      
      // Format time
      const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      setCurrentTime(now.toLocaleTimeString('pt-BR', timeOptions))

      // Format date
      const dateOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
      const formattedDate = now.toLocaleDateString('pt-BR', dateOptions)
      // Capitalize first letter
      setCurrentDate(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="clock-container">
      <div className="clock-time">{currentTime}</div>
      <div className="clock-date">{currentDate}</div>
    </div>
  )
}
