#!/usr/bin/env node
/* global process */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline/promises'
import { validateRagZip } from './validate-rag-zip.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const configDir = path.join(__dirname, 'config')

async function loadConfigs() {
  const entries = await fs.readdir(configDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(json|js|mjs|cjs)$/i.test(name))
    .sort()
}

async function promptConfigName(configs) {
  if (!configs.length) {
    throw new Error('No config files found in ragGenerator/optimize/config')
  }

  console.log('\nAvailable configs:')
  configs.forEach((name, index) => {
    console.log(`  ${index + 1}) ${name}`)
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  try {
    const answer = await rl.question('\nSelect a config number: ')
    const index = Number.parseInt(answer, 10)
    if (!Number.isInteger(index) || index < 1 || index > configs.length) {
      throw new Error('Invalid selection.')
    }
    return configs[index - 1]
  } finally {
    rl.close()
  }
}

async function run() {
  try {
    const configs = await loadConfigs()
    const selectedName = await promptConfigName(configs)
    const configPath = path.join(configDir, selectedName)
    const repoRoot = path.resolve(__dirname, '..', '..')

    const raw = await fs.readFile(configPath, 'utf8')
    const config = JSON.parse(raw)
    const zipPath = config?.zipPath
      ? (path.isAbsolute(config.zipPath)
        ? config.zipPath
        : path.resolve(repoRoot, config.zipPath))
      : null
    const queries = config?.queries || []
    const searchOverrides = config?.search || null

    await validateRagZip({ zipPath, queries, search: searchOverrides })
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

run()
