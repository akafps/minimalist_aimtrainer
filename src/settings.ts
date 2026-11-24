export interface Game {
  id: string
  name: string
  yaw: number // grados que gira la cámara por cada "count" del mouse con sensibilidad 1
  defaultSens: number
}

// Si algún valor no te cuadra, cámbialo aquí y todo se recalcula solo.
export const GAMES: Game[] = [
  { id: 'valorant', name: 'VALORANT', yaw: 0.07, defaultSens: 0.4 },
  { id: 'cs2', name: 'CS2', yaw: 0.022, defaultSens: 1.0 },
  { id: 'overwatch', name: 'Overwatch 2', yaw: 0.0066, defaultSens: 5 },
  { id: 'apex', name: 'Apex Legends', yaw: 0.022, defaultSens: 1.5 },
  // PUBG: equivale a Valorant x 57.308573 (aproximado, su slider no es 100% lineal)
  { id: 'pubg', name: 'PUBG', yaw: 0.07 / 57.308573, defaultSens: 30 },
  // ARC Raiders: hipfire con FOV 70, sensibilidad 1-100
  { id: 'arc', name: 'ARC Raiders', yaw: 0.001360975, defaultSens: 50 },
]

const STORAGE_KEY = 'aimtrainer-settings'
const BEST_KEY = 'aimtrainer-best'

export const settings = {
  // sensibilidad
  game: 'valorant',
  sens: 0.4,
  dpi: 800,
  // escenario
  task: 'clicking',
  duration: 60,
  targetSize: 100, // porcentaje del tamaño base
  holdToTrack: true,
  // visión y audio
  fov: 103, // horizontal, referencia 16:9
  volume: 40, // 0-100
  crosshair: { color: '#5eead4', size: 8, thickness: 2, gap: 4, dot: false },
}

export function getGame(): Game {
  return GAMES.find((g) => g.id === settings.game) ?? GAMES[0]
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)

    // los ajustes viejos no tenían juego: usaban la escala de CS2
    settings.game = GAMES.some((g) => g.id === saved.game) ? saved.game : 'cs2'

    const target = settings as Record<string, unknown>
    for (const key of Object.keys(settings)) {
      if (key === 'game' || key === 'crosshair') continue
      if (typeof saved[key] === typeof target[key]) target[key] = saved[key]
    }
    if (saved.crosshair && typeof saved.crosshair === 'object') {
      settings.crosshair = { ...settings.crosshair, ...saved.crosshair }
    }
  } catch {}
}

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}

// Cambia de juego conservando tu cm/360: el número de sensibilidad se convierte
export function setGame(id: string) {
  const next = GAMES.find((g) => g.id === id)
  if (!next) return
  const prev = getGame()
  settings.sens = Number(((settings.sens * prev.yaw) / next.yaw).toPrecision(4))
  settings.game = next.id
}

export function degPerCount(): number {
  return getGame().yaw * settings.sens
}

// distancia que recorres con el mouse para dar una vuelta completa
export function cmPer360(): number {
  return 914.4 / (settings.dpi * degPerCount()) // 914.4 = 360 * 2.54
}

// FOV vertical que usa Three.js, derivado del FOV horizontal en pantalla 16:9
export function verticalFov(): number {
  const h = (settings.fov * Math.PI) / 180
  return ((2 * Math.atan(Math.tan(h / 2) / (16 / 9))) * 180) / Math.PI
}

// Récords personales por escenario (tarea + duración + tamaño de target)
export function recordScore(key: string, score: number): { best: number; record: boolean } {
  let all: Record<string, number> = {}
  try {
    all = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}')
  } catch {}
  const prev = all[key]
  const record = prev === undefined || score > prev
  if (record) {
    all[key] = score
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(all))
    } catch {}
  }
  return { best: record ? score : prev, record }
}