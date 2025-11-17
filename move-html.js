import { readdirSync, renameSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
const srcPages = resolve(dist, 'src', 'pages')

try {
  const files = readdirSync(srcPages).filter(f => f.endsWith('.html'))
  for (const f of files) {
    renameSync(resolve(srcPages, f), resolve(dist, f))
    console.log(`Movido ${f}`)
  }
  rmSync(resolve(dist, 'src'), { recursive: true, force: true })
  console.log('¡LISTO! Todos los HTML están en la raíz de dist')
} catch (e) {
  console.log('Ya estaban en la raíz o no hay src/pages → todo bien')
}
