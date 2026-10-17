/**
 * AERIS Audio Chime Synthesizer
 * Uses Web Audio API to generate discrete, professional control-room tones.
 * Avoids external audio file downloads or network latency.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

export function playAlertChime(type: 'critical' | 'warning' | 'test' = 'critical'): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    if (type === 'critical') {
      // Urgent, dual ascending sine chime (880Hz -> 1320Hz)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now) // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15) // D6

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1320, now + 0.15) // E6
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35) // A6

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.15)
      osc2.start(now + 0.15)
      osc2.stop(now + 0.45)
    } else if (type === 'warning') {
      // Moderate warning tone (660Hz -> 880Hz)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now) // E5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25) // A5

      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.35)
    } else {
      // Test ping (1046.5Hz C6 ping)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046.5, now)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.2)
    }
  } catch (err) {
    console.warn('[AERIS Audio] Unable to play audio chime:', err)
  }
}
