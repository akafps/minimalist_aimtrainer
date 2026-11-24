import * as THREE from 'three'
import { settings } from '../settings'
import { playHit } from '../audio'
import { TARGET_AREA, TARGET_COLOR, type Task, type Stat } from './Task'

const TARGET_COUNT = 3
const BASE_RADIUS = 0.4

export class ClickingTask implements Task {
  readonly id = 'clicking'
  readonly name = 'Clicking'
  readonly duration = settings.duration

  private radius = BASE_RADIUS * (settings.targetSize / 100)
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private raycaster = new THREE.Raycaster()
  private center = new THREE.Vector2(0, 0)
  private geometry = new THREE.SphereGeometry(this.radius, 32, 32)
  private material = new THREE.MeshBasicMaterial({ color: TARGET_COLOR })
  private targets: THREE.Mesh[] = []
  private hits = 0
  private misses = 0
  private reactionSum = 0

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene
    this.camera = camera
  }

  start() {
    this.hits = 0
    this.misses = 0
    this.reactionSum = 0
    for (let i = 0; i < TARGET_COUNT; i++) this.spawn()
  }

  stop() {
    this.targets.forEach((t) => this.scene.remove(t))
    this.targets.length = 0
  }

  update() {}

  onClick() {
    this.camera.updateMatrixWorld() // asegura que el rayo use la cámara actual
    this.raycaster.setFromCamera(this.center, this.camera)
    const hit = this.raycaster.intersectObjects(this.targets)[0]

    if (hit) {
      const mesh = hit.object as THREE.Mesh
      this.hits++
      this.reactionSum += performance.now() - mesh.userData.spawnTime
      playHit(settings.volume / 100)
      this.remove(mesh)
      this.spawn()
    } else {
      this.misses++
    }
  }

  hudText() {
    return `Aciertos ${this.hits} · Precisión ${this.accuracy()}%`
  }

  results(): Stat[] {
    const avg = this.hits ? Math.round(this.reactionSum / this.hits) : 0
    return [
      ['Aciertos', String(this.hits)],
      ['Fallos', String(this.misses)],
      ['Precisión', `${this.accuracy()}%`],
      ['Reacción media', `${avg} ms`],
    ]
  }

  score() {
    return this.hits
  }

  formatScore(n: number) {
    return `${n} aciertos`
  }

  private accuracy() {
    const shots = this.hits + this.misses
    return shots ? Math.round((this.hits / shots) * 100) : 0
  }

  private randomPosition(): THREE.Vector3 {
    for (let i = 0; i < 20; i++) {
      const p = new THREE.Vector3(
        THREE.MathUtils.randFloat(TARGET_AREA.xMin, TARGET_AREA.xMax),
        THREE.MathUtils.randFloat(TARGET_AREA.yMin, TARGET_AREA.yMax),
        TARGET_AREA.z
      )
      if (this.targets.every((t) => t.position.distanceTo(p) > this.radius * 3)) return p
    }
    return new THREE.Vector3(0, 2, TARGET_AREA.z)
  }

  private spawn() {
    const mesh = new THREE.Mesh(this.geometry, this.material)
    mesh.position.copy(this.randomPosition())
    mesh.userData.spawnTime = performance.now()
    this.scene.add(mesh)
    this.targets.push(mesh)
  }

  private remove(mesh: THREE.Mesh) {
    this.scene.remove(mesh)
    this.targets.splice(this.targets.indexOf(mesh), 1)
  }
}