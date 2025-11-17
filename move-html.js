import { readdir, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
const src = resolve(dist, 'src/pages')

const files = await readdir(src)
const htmls = files.filter(f => f.endsWith('.html'))

for (const f of htmls) {
  await rename(resolve(src, f), resolve(dist, f))
  console.log(`✓ ${f} → raíz`)
}

await rm(resolve(dist, 'src'), { recursive: true, force: true })
console.log('¡TERMINADO! Todo listo para Vercel')
