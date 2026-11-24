import { GAMES, settings, saveSettings, setGame, cmPer360 } from './settings'
import { TASKS } from './tasks'
import type { Stat } from './tasks/Task'

export interface UIHooks {
  onPlay: () => void
  onRestart: () => void
  onScenarioChange: () => void // cambia tarea, duración, tamaño...: reinicia la partida
  onFovChange: () => void
}

export interface MenuInfo {
  state: 'idle' | 'running' | 'finished'
  taskName: string
  results?: Stat[]
  scoreText?: string
  bestText?: string
  record?: boolean
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const overlay = $('overlay')
const refreshers: (() => void)[] = []
const refreshAll = () => refreshers.forEach((fn) => fn())

// ---------- Helpers para construir controles ----------
function makeSection(title: string) {
  const section = document.createElement('section')
  const h = document.createElement('h3')
  h.textContent = title
  section.append(h)
  $('menu-body').append(section)
  return section
}

function addRow(section: HTMLElement, label: string, control: HTMLElement) {
  const row = document.createElement('label')
  row.className = 'row'
  const text = document.createElement('span')
  text.textContent = label
  row.append(text, control)
  section.append(row)
}

function addSelect(
  section: HTMLElement, label: string, options: [string, string][],
  get: () => string, set: (v: string) => void
) {
  const select = document.createElement('select')
  select.innerHTML = options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')
  select.addEventListener('change', () => set(select.value))
  refreshers.push(() => { select.value = get() })
  addRow(section, label, select)
}

function addNumber(
  section: HTMLElement, label: string, step: string,
  get: () => number, set: (v: number) => void
) {
  const input = document.createElement('input')
  input.type = 'number'
  input.min = '0'
  input.step = step
  input.addEventListener('input', () => {
    const v = parseFloat(input.value)
    if (v > 0) set(v)
  })
  refreshers.push(() => { input.value = String(get()) })
  addRow(section, label, input)
}

function addRange(
  section: HTMLElement, label: string, min: number, max: number, step: number,
  get: () => number, set: (v: number) => void, fmt: (v: number) => string = String
) {
  const wrap = document.createElement('div')
  wrap.className = 'ctl'
  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  const out = document.createElement('output')
  input.addEventListener('input', () => {
    set(Number(input.value))
    out.textContent = fmt(get())
  })
  refreshers.push(() => {
    input.value = String(get())
    out.textContent = fmt(get())
  })
  wrap.append(input, out)
  addRow(section, label, wrap)
}

function addToggle(section: HTMLElement, label: string, get: () => boolean, set: (v: boolean) => void) {
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.className = 'switch'
  input.addEventListener('change', () => set(input.checked))
  refreshers.push(() => { input.checked = get() })
  addRow(section, label, input)
}

function addColor(section: HTMLElement, label: string, get: () => string, set: (v: string) => void) {
  const input = document.createElement('input')
  input.type = 'color'
  input.addEventListener('input', () => set(input.value))
  refreshers.push(() => { input.value = get() })
  addRow(section, label, input)
}

// ---------- Mira ----------
function applyCrosshair() {
  const c = settings.crosshair
  const el = $('crosshair')
  el.style.setProperty('--ch-color', c.color)
  el.style.setProperty('--ch-size', `${c.size}px`)
  el.style.setProperty('--ch-thick', `${c.thickness}px`)
  el.style.setProperty('--ch-gap', `${c.gap}px`)
  el.classList.toggle('no-dot', !c.dot)
  el.classList.toggle('no-arms', c.size === 0)
}

// ---------- Construcción del menú ----------
export function initUI(hooks: UIHooks) {
  const scenarioChanged = () => { saveSettings(); hooks.onScenarioChange() }
  const crosshairChanged = () => { saveSettings(); applyCrosshair() }

  // Escenario
  const scenario = makeSection('Escenario')
  addSelect(scenario, 'Tarea', TASKS.map((t): [string, string] => [t.id, t.name]),
    () => settings.task, (v) => { settings.task = v; scenarioChanged() })
  addSelect(scenario, 'Duración', [30, 60, 90, 120].map((s): [string, string] => [String(s), `${s} s`]),
    () => String(settings.duration), (v) => { settings.duration = Number(v); scenarioChanged() })
  addRange(scenario, 'Tamaño de target', 50, 200, 10,
    () => settings.targetSize, (v) => { settings.targetSize = v; scenarioChanged() }, (v) => `${v}%`)
  addToggle(scenario, 'Mantener click (tracking)',
    () => settings.holdToTrack, (v) => { settings.holdToTrack = v; scenarioChanged() })

  // Sensibilidad
  const sens = makeSection('Sensibilidad')
  const cm = document.createElement('div')
  cm.className = 'readout'
  const updateCm = () => { cm.textContent = `cm/360: ${cmPer360().toFixed(1)}` }

  addSelect(sens, 'Juego', GAMES.map((g): [string, string] => [g.id, g.name]),
    () => settings.game, (v) => { setGame(v); saveSettings(); refreshAll() })
  addNumber(sens, 'Sensibilidad', 'any',
    () => settings.sens, (v) => { settings.sens = v; saveSettings(); updateCm() })
  addNumber(sens, 'DPI', '50',
    () => settings.dpi, (v) => { settings.dpi = v; saveSettings(); updateCm() })
  sens.append(cm)
  refreshers.push(updateCm)

  // Visión
  const vision = makeSection('Visión')
  addRange(vision, 'FOV horizontal', 70, 140, 1,
    () => settings.fov, (v) => { settings.fov = v; saveSettings(); hooks.onFovChange() }, (v) => `${v}°`)

  // Mira
  const cross = makeSection('Mira')
  addColor(cross, 'Color', () => settings.crosshair.color, (v) => { settings.crosshair.color = v; crosshairChanged() })
  addRange(cross, 'Tamaño', 0, 30, 1,
    () => settings.crosshair.size, (v) => { settings.crosshair.size = v; crosshairChanged() }, (v) => `${v} px`)
  addRange(cross, 'Grosor', 1, 6, 1,
    () => settings.crosshair.thickness, (v) => { settings.crosshair.thickness = v; crosshairChanged() }, (v) => `${v} px`)
  addRange(cross, 'Separación', 0, 20, 1,
    () => settings.crosshair.gap, (v) => { settings.crosshair.gap = v; crosshairChanged() }, (v) => `${v} px`)
  addToggle(cross, 'Punto central',
    () => settings.crosshair.dot, (v) => { settings.crosshair.dot = v; crosshairChanged() })

  // Audio
  const audio = makeSection('Audio')
  addRange(audio, 'Volumen de acierto', 0, 100, 5,
    () => settings.volume, (v) => { settings.volume = v; saveSettings() }, (v) => `${v}%`)

  $('btn-play').addEventListener('click', hooks.onPlay)
  $('btn-restart').addEventListener('click', hooks.onRestart)

  refreshAll()
  applyCrosshair()
}

// ---------- Mostrar / ocultar el menú ----------
const STATE_LABEL = { idle: 'Listo', running: 'Pausa', finished: 'Tiempo terminado' }

export function showMenu(info: MenuInfo) {
  $('menu-status').textContent = `${STATE_LABEL[info.state]} · ${info.taskName}`
  $('btn-play').textContent =
    info.state === 'running' ? 'Continuar' : info.state === 'finished' ? 'Jugar de nuevo' : 'Jugar'
  $('btn-restart').hidden = info.state !== 'running'

  $('results').hidden = info.state !== 'finished'
  if (info.state === 'finished') {
    $('results-score').textContent = info.scoreText ?? ''
    $('results-best').textContent = info.record ? '¡Nuevo récord!' : `Mejor: ${info.bestText ?? '-'}`
    $('results-list').innerHTML = (info.results ?? [])
      .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join('')
  }
  overlay.style.display = 'flex'
}

export function hideMenu() {
  overlay.style.display = 'none'
}