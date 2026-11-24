import type * as THREE from 'three'
import type { Task } from './Task'
import { ClickingTask } from './ClickingTask'
import { TrackingTask } from './TrackingTask'

export interface TaskDef {
  id: string
  name: string
  create: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => Task
}

// Para agregar una tarea nueva: crea su clase y añádela aquí
export const TASKS: TaskDef[] = [
  { id: 'clicking', name: 'Clicking', create: (s, c) => new ClickingTask(s, c) },
  { id: 'tracking', name: 'Tracking', create: (s, c) => new TrackingTask(s, c) },
]