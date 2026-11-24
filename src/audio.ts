let ctx: AudioContext | null = null
let sample: AudioBuffer | null = null

const CANDIDATES = ['/hitsound.wav', '/hitsound.ogg', '/hitsound.mp3']

// Se llama una vez al arrancar: crea el audio y carga hitsound.* si existe
export async function initAudio() {
  ctx ??= new AudioContext()
  for (const url of CANDIDATES) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      // si el archivo no existe, Vite devuelve HTML y decodeAudioData falla: pasa al siguiente
      sample = await ctx.decodeAudioData(await res.arrayBuffer())
      return
    } catch {}
  }
}

// Sonido de acierto. volume va de 0 a 1.
export function playHit(volume: number) {
  if (volume <= 0) return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()

  if (sample) {
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    src.buffer = sample
    gain.gain.value = volume
    src.connect(gain).connect(ctx.destination)
    src.start()
  } else {
    synth(ctx, volume)
  }
}

// Aproximación a un "tock" suave: cuerpo grave corto + click agudo
function synth(c: AudioContext, volume: number) {
  const t = c.currentTime

  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(260, t)
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.07)
  g.gain.setValueAtTime(volume * 0.8, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.1)

  const len = Math.floor(c.sampleRate * 0.03)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const noise = c.createBufferSource()
  const hp = c.createBiquadFilter()
  const ng = c.createGain()
  noise.buffer = buf
  hp.type = 'highpass'
  hp.frequency.value = 1800
  ng.gain.value = volume * 0.35
  noise.connect(hp).connect(ng).connect(c.destination)
  noise.start(t)
}