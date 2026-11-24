export type Stat = [string, string] // [etiqueta, valor]

export interface Task {
  readonly id: string
  readonly name: string
  readonly duration: number // segundos
  start(): void
  stop(): void
  update(dt: number, mouseHeld: boolean): void
  onClick?(): void
  hudText(): string
  results(): Stat[]
  score(): number // número que se compara para el récord
  formatScore(n: number): string
}

// zona frente a ti donde aparecen / se mueven los targets
export const TARGET_AREA = { xMin: -4, xMax: 4, yMin: 0.8, yMax: 4, z: -10 }
export const TARGET_COLOR = 0xf4f0ff // círculos
export const TARGET_ACTIVE_COLOR = 0xa970ff // tracking: cuando estás en objetivo