export const playBuzzerSound = (isSuccess = true) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    
    if (isSuccess) {
      // Success: Double premium high-pitched beep (880Hz)
      const playBeep = (delay, freq, duration) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
        
        // Smooth volume ramp to avoid clicking noises
        gain.gain.setValueAtTime(0.08, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + duration)
      }
      // First beep
      playBeep(0, 880, 0.08)
      // Second beep shortly after
      playBeep(0.12, 880, 0.12)
    } else {
      // Error: Harsh low-pitched buzzer sound (140Hz sawtooth wave)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(140, ctx.currentTime)
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
    }
  } catch (e) {
    console.warn("Web Audio API not supported or blocked by browser policies", e)
  }
}
