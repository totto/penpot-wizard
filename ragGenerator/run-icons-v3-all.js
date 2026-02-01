#!/usr/bin/env node
/* global process */
/**
 * Run icons RAG v3 generation for every JSON file in iconsRAGv3.
 *
 * Creates a temp config per file that:
 * - reuses the base config
 * - sets docsPattern to the file
 * - sets outputFilename to icons.<filename>.zip
 *
 * Usage:
 *   node run-icons-v3-all.js --config ./config/config.iconsRAGv3.js --pattern <glob> --parallel 2
 */

import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { fileURLToPath, pathToFileURL } from 'url'
import { spawn } from 'child_process'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_CONFIG = path.join(__dirname, 'config', 'config.iconsRAGv3.js')
const DEFAULT_PATTERN = '**/*.json'
const DEFAULT_PARALLEL = 1
const GENERATOR_PATH = path.join(__dirname, 'generate-embeddings.v2.js')
const TMP_DIR = path.join(__dirname, '.tmp')

function parseArgs(argv) {
  const options = {
    configPath: DEFAULT_CONFIG,
    pattern: DEFAULT_PATTERN,
    parallel: DEFAULT_PARALLEL
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--config') {
      options.configPath = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--pattern') {
      options.pattern = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--parallel') {
      options.parallel = Number.parseInt(argv[i + 1], 10)
      i += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true
      break
    }
  }

  if (!Number.isInteger(options.parallel) || options.parallel < 1) {
    options.parallel = DEFAULT_PARALLEL
  }

  return options
}

async function loadConfig(configPath) {
  const resolved = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath)
  const mod = await import(pathToFileURL(resolved).href)
  return { config: mod.default || mod.config || mod, resolvedPath: resolved }
}

function resolveDocsRoot(docsPath) {
  if (!docsPath) return ''
  return path.isAbsolute(docsPath)
    ? docsPath
    : path.resolve(process.cwd(), docsPath)
}

function toSafeOutputName(relPath, used) {
  const base = path.basename(relPath, path.extname(relPath))
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  const fallback = relPath
    .replace(/\\/g, '/')
    .replace(/\.[^/.]+$/, '')
    .replace(/\//g, '_')
  used.add(fallback)
  return fallback
}

async function writeTempConfig(tmpPath, baseConfigPath, docsPattern, outputFilename) {
  const relativeImport = path.relative(path.dirname(tmpPath), baseConfigPath)
  const importPath = relativeImport.startsWith('.') ? relativeImport : `./${relativeImport}`

  const content = [
    `import baseConfig from ${JSON.stringify(importPath)}`,
    '',
    'export default {',
    '  ...baseConfig,',
    `  docsPattern: ${JSON.stringify(docsPattern)},`,
    `  outputFilename: ${JSON.stringify(outputFilename)}`,
    '}',
    ''
  ].join('\n')

  await fs.writeFile(tmpPath, content, 'utf8')
}

function runGenerator(configPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [GENERATOR_PATH, configPath], {
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      resolve(code ?? 1)
    })
  })
}

async function runJobs(jobs, parallel) {
  const results = []
  let index = 0

  async function worker() {
    while (index < jobs.length) {
      const jobIndex = index
      index += 1
      const job = jobs[jobIndex]
      const code = await job()
      results.push(code)
    }
  }

  const workers = Array.from({ length: Math.min(parallel, jobs.length) }, () => worker())
  await Promise.all(workers)
  return results
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log('Usage: node run-icons-v3-all.js [--config path] [--pattern "**/*.json"] [--parallel N]')
    process.exit(0)
  }

  const { config: baseConfig, resolvedPath } = await loadConfig(options.configPath)
  const docsRoot = resolveDocsRoot(baseConfig.docsPath)
  if (!docsRoot) {
    throw new Error('Config must include docsPath')
  }

  const files = await glob(options.pattern, { cwd: docsRoot, nodir: true })
  if (!files.length) {
    console.error('❌ No files matched pattern.')
    process.exit(1)
  }

  await fs.mkdir(TMP_DIR, { recursive: true })

  const usedNames = new Set()
  const jobs = files.sort().map((relPath) => {
    const safeName = toSafeOutputName(relPath, usedNames)
    const outputFilename = `icons.${safeName}.zip`
    const tempConfigName = `icons-v3-${safeName}-${Date.now()}-${Math.random().toString(36).slice(2)}.js`
    const tempConfigPath = path.join(TMP_DIR, tempConfigName)

    return async () => {
      await writeTempConfig(tempConfigPath, resolvedPath, relPath, outputFilename)
      console.log(`\n🧩 Processing: ${relPath}`)
      console.log(`📦 Output: ${outputFilename}`)
      try {
        return await runGenerator(tempConfigPath)
      } finally {
        await fs.unlink(tempConfigPath).catch(() => {})
      }
    }
  })

  const parallel = options.parallel || DEFAULT_PARALLEL
  console.log(`\n🚀 Files: ${files.length}`)
  console.log(`🧵 Parallel workers: ${parallel}`)
  if (parallel > os.cpus().length) {
    console.log(`⚠️ parallel > CPU cores (${os.cpus().length})`)
  }

  const results = await runJobs(jobs, parallel)
  const failures = results.filter((code) => code !== 0).length

  if (failures > 0) {
    console.error(`\n❌ Completed with ${failures} failure(s).`)
    process.exit(1)
  }

  console.log('\n✅ All files processed successfully.')
}

main().catch((error) => {
  console.error(`❌ ${error.message}`)
  process.exit(1)
})
