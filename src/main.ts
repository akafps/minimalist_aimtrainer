import './style.css'
import * as THREE from 'three'
import { settings, loadSettings, degPerCount, verticalFov, recordScore } from './settings'
import { TASKS } from './tasks'
import type { Task, Stat } from './tasks/Task'
import { initUI, showMenu, hideMenu } from './ui'
import { initAudio } from './audio'

loadSettings()
if (!TASKS.some((t) => t.id === settings.task)) settings.task = TASKS[0].id

// --- Escena, cámara, renderer ---
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050507)

const camera = new THREE.PerspectiveCamera(verticalFov(), window.innerWidth / window.innerHeight, 0.1, 100)
camera.rotation.order = 'YXZ'
camera.position.set(0, 1.6, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.prepend(renderer.domElement)
const canvas = renderer.domElement

function applyFov() {
  camera.fov = verticalFov()
  camera.updateProjectionMatrix()
}

// --- Entorno ---
// Para fondo totalmente vacío, borra la línea del GridHelper
scene.add(new THREE.GridHelper(40, 40, 0x2e1a5c, 0x140e26))

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 20),
  new THREE.MeshBasicMaterial({ color: 0x0a0810 })
)
wall.position.set(0, 10, -15)
scene.add(wall)

// --- Estado del juego ---
type State = 'idle' | 'running' | 'finished'
let state: State = 'idle'
let task: Task | null = null
let timeLeft = 0
let runDuration = 1
let mouseHeld = false
let lastRun: { results: Stat[]; scoreText: string; bestText: string; record: boolean } | null = null

function currentTaskDef() {
  return TASKS.find((t) => t.id === settings.task) ?? TASKS[0]
}

function startGame() {
  task?.stop()
  task = currentTaskDef().create(scene, camera)
  task.start()
  runDuration = task.duration
  timeLeft = task.duration
  mouseHeld = false
  state = 'running'
}

function endGame() {
  state = 'finished'
  mouseHeld = false
  if (task) {
    task.stop()
    const score = task.score()
    const key = `${task.id}:${task.duration}:${settings.targetSize}`
    const { best, record } = recordScore(key, score)
    lastRun = {
      results: task.results(),
      scoreText: task.formatScore(score),
      bestText: task.formatScore(best),
      record,
    }
  }
  document.exitPointerLock() // dispara pointerlockchange -> muestra el menú con resultados
}

// cambiar tarea, duración o tamaño descarta la partida actual
function resetRun() {
  if (state !== 'idle') {
    task?.stop()
    state = 'idle'
  }
  renderMenu()
}

function renderMenu() {
  showMenu({
    state,
    taskName: currentTaskDef().name,
    results: lastRun?.results,
    scoreText: lastRun?.scoreText,
    bestText: lastRun?.bestText,
    record: lastRun?.record,
  })
}

// --- Pointer lock ---
async function requestLock() {
  try {
    await canvas.requestPointerLock({ unadjustedMovement: true })
  } catch {
    canvas.requestPointerLock()
  }
}

document.getElementById('overlay')!.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('#menu')) return // clicks dentro del panel no inician el juego
  requestLock()
})

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    hideMenu()
    if (state !== 'running') startGame() // si estaba en pausa, continúa
  } else {
    mouseHeld = false
    renderMenu()
  }
})

// --- Teclado ---
document.addEventListener('keydown', (e) => {
  if (e.repeat) return
  const locked = document.pointerLockElement === canvas

  if (e.code === 'KeyR' && locked) {
    startGame() // reinicio instantáneo
    return
  }
  if (e.code === 'Space' && !locked) {
    e.preventDefault()
    ;(document.activeElement as HTMLElement | null)?.blur()
    requestLock()
  }
})

// --- Mouse: disparo y mantener click ---
document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (state !== 'running' || document.pointerLockElement !== canvas) return
  mouseHeld = true
  task?.onClick?.()
})

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseHeld = false
})

// --- Mouse -> cámara ---
let yaw = 0
let pitch = 0
const MAX_PITCH = Math.PI / 2 - 0.01

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return
  const radPerCount = THREE.MathUtils.degToRad(degPerCount())
  yaw -= e.movementX * radPerCount
  pitch -= e.movementY * radPerCount
  pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch))
  camera.rotation.set(pitch, yaw, 0)
})

// --- HUD ---
const hudInfo = document.getElementById('hud-info') as HTMLElement
const hudTime = document.getElementById('hud-time') as HTMLElement
const hudBar = document.getElementById('hud-bar') as HTMLElement

function updateHud() {
  const running = state === 'running' && task
  hudInfo.textContent = running ? task!.hudText() : ''
  hudTime.textContent = String(Math.ceil(timeLeft))
  hudBar.style.transform = `scaleX(${state === 'running' ? timeLeft / runDuration : 0})`
}

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// --- Game loop ---
let last = performance.now()

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dt = Math.min((now - last) / 1000, 0.1) // limita saltos si cambias de pestaña
  last = now

  if (state === 'running' && task && document.pointerLockElement === canvas) {
    task.update(dt, mouseHeld)
    timeLeft -= dt
    if (timeLeft <= 0) {
      timeLeft = 0
      endGame()
    }
  }

  updateHud()
  renderer.render(scene, camera)
}

// --- Arranque ---
initUI({
  onPlay: requestLock,
  onRestart: () => {
    task?.stop()
    state = 'idle' // al capturar el mouse se inicia una partida nueva
    requestLock()
  },
  onScenarioChange: resetRun,
  onFovChange: applyFov,
})
initAudio()
renderMenu()
animate()