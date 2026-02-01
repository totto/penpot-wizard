#!/usr/bin/env node
/* global process, Buffer */
/**
 * Script wrapper to generate embeddings and create Orama persistence files (v2).
 * - Loads config (.js only)
 * - Runs OpenRouter embeddings pipeline
 * - Writes compressed ZIP to outputDir/outputFilename
 */

import fs from 'fs/promises'
import path from 'path'
import { gzip } from 'zlib'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import { runEmbeddingsPipelineFromConfig } from './embeddings-service.v2.js'
import { spawn } from 'child_process'

const gzipAsync = promisify(gzip)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveConfigPath(argPath) {
  if (!argPath) return null
  return path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath)
}

async function loadConfig(configPath) {
  const ext = path.extname(configPath).toLowerCase()
  if (ext !== '.js') {
    throw new Error('Config file must be .js')
  }
  const mod = await import(new URL(configPath, `file://${process.cwd()}/`).href)
  return mod.default || mod.config || mod
}

async function main() {
  const configPath = resolveConfigPath(process.argv[2])
  if (!configPath) {
    console.error('❌ Missing config file path.')
    console.error('Usage: node generate-embeddings.v2.js <config.js>')
    process.exit(1)
  }

  const config = await loadConfig(configPath)
  const outputDir = config.outputDir || './public'
  const outputFilename = config.outputFilename || 'ragToolContents.v2.zip'
  const outputFile = path.join(outputDir, outputFilename)

  console.log(`📦 Output: ${outputFile}`)
  console.log('🧩 Generating embeddings...')
  await fs.mkdir(outputDir, { recursive: true })

  const persistData = await runEmbeddingsPipelineFromConfig(configPath)
  console.log('💾 Compressing persisted data...')
  const isBinary = persistData instanceof Uint8Array
    || Buffer.isBuffer(persistData)
    || persistData instanceof ArrayBuffer
    || ArrayBuffer.isView(persistData)
  const isString = typeof persistData === 'string'
  const payload = isBinary
    ? (persistData instanceof ArrayBuffer ? new Uint8Array(persistData) : new Uint8Array(persistData))
    : (isString ? persistData : JSON.stringify(persistData, null, 2))
  const compressedData = await gzipAsync(payload)
  await fs.writeFile(outputFile, compressedData)

  const stats = await fs.stat(outputFile)
  const originalSize = isBinary
    ? payload.byteLength
    : Buffer.byteLength(payload, 'utf8')
  const compressionRatio = ((originalSize - stats.size) / originalSize * 100).toFixed(1)
  console.log(`✅ File written: ${outputFile}`)
  console.log(`📊 Original size: ${originalSize} bytes`)
  console.log(`📊 Compressed size: ${stats.size} bytes`)
  console.log(`📊 Compression ratio: ${compressionRatio}%`)

  console.log('🧪 Running test-search.v2...')
  const testScript = path.join(__dirname, 'test-search.v2.js')
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [testScript, configPath], {
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`test-search.v2 failed with code ${code}`))
      }
    })
  })
}

main().catch((error) => {
  console.error(`❌ ${error.message}`)
  process.exit(1)
})
