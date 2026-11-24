import * as THREE from 'three'
import { settings } from '../settings'
import { TARGET_AREA, TARGET_COLOR, TARGET_ACTIVE_COLOR, type Task, type Stat } from './Task'

const BASE_RADIUS = 0.5
const MIN_SPEED = 2 // unidades por segundo
const MAX_SPEED = 5

export class TrackingTask implements Task {
  readonly id = 'tracking'
  readonly name = 'Tracking'
  readonly duration = settings.duration

  private radius = BASE_RADIUS * (settings.targetSize / 100)
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private raycaster = new THREE.Raycaster()
  private center = new THREE.Vector2(0, 0)
  private material = new THREE.MeshBasicMaterial({ color: TARGET_COLOR })
  private target = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 32, 32), this.material)

  private vel = new THREE.Vector2() // velocidad actual
  private desired = new THREE.Vector2() // velocidad hacia la que se acelera
  private changeIn = 0 // segundos hasta el próximo cambio de dirección
  private onTime = 0
  private totalTime = 0

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.camera = camera
  }

  start() {
    this.onTime = 0
    this.totalTime = 0
    this.vel.set(0, 0)
    this.target.position.set(0, 2.2, TARGET_AREA.z)
    this.pickDirection()
    this.scene.add(this.target)
  }

  stop() {
    this.scene.remove(this.target)
  }

  update(dt: number, mouseHeld: boolean) {
    // 1) movimiento suave con cambios de dirección aleatorios
    this.changeIn -= dt
    if (this.changeIn <= 0) this.pickDirection()
    this.vel.lerp(this.desired, 1 - Math.exp(-dt * 5))

    const p = this.target.position
    p.x += this.vel.x * dt
    p.y += this.vel.y * dt

    if (p.x < TARGET_AREA.xMin) { p.x = TARGET_AREA.xMin; this.bounce('x', 1) }
    if (p.x > TARGET_AREA.xMax) { p.x = TARGET_AREA.xMax; this.bounce('x', -1) }
    if (p.y < TARGET_AREA.yMin) { p.y = TARGET_AREA.yMin; this.bounce('y', 1) }
    if (p.y > TARGET_AREA.yMax) { p.y = TARGET_AREA.yMax; this.bounce('y', -1) }

    // 2) ¿el crosshair está sobre el target?
    this.camera.updateMatrixWorld()
    this.raycaster.setFromCamera(this.center, this.camera)
    const over = this.raycaster.intersectObject(this.target).length > 0
    const tracking = over && (mouseHeld || !settings.holdToTrack)

    this.totalTime += dt
    if (tracking) this.onTime += dt
    this.material.color.setHex(tracking ? TARGET_ACTIVE_COLOR : TARGET_COLOR)
  }

  hudText() {
    return `En objetivo ${Math.round(this.percent())}%`
  }

  results(): Stat[] {
    return [
      ['En objetivo', `${this.percent().toFixed(1)}%`],
      ['Tiempo en objetivo', `${this.onTime.toFixed(1)} s`],
      ['Tiempo total', `${this.totalTime.toFixed(1)} s`],
    ]
  }

  score() {
    return Math.round(this.percent() * 10) / 10
  }

  formatScore(n: number) {
    return `${n.toFixed(1)}%`
  }

  private percent() {
    return this.totalTime ? (this.onTime / this.totalTime) * 100 : 0
  }

  private pickDirection() {
    const angle = Math.random() * Math.PI * 2
    const speed = THREE.MathUtils.randFloat(MIN_SPEED, MAX_SPEED)
    this.desired.set(Math.cos(angle) * speed, Math.sin(angle) * speed)
    this.changeIn = THREE.MathUtils.randFloat(0.4, 1.2)
  }

  // dir: 1 = hacia + / -1 = hacia -
  private bounce(axis: 'x' | 'y', dir: 1 | -1) {
    this.vel[axis] = Math.abs(this.vel[axis]) * dir
    this.desired[axis] = Math.abs(this.desired[axis]) * dir
  }
}