#!/usr/bin/env node
/* global process, Buffer */
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'
import { glob } from 'glob'
import { create, insert, search } from '@orama/orama'
import { persist, restore } from '@orama/plugin-data-persistence'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveConfigPath(argPath) {
  if (!argPath) return null
  return path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath)
}

async function loadConfig(configPath) {
  const ext = path.extname(configPath).toLowerCase()
  if (ext === '.json') {
    const raw = await fs.readFile(configPath, 'utf8')
    return JSON.parse(raw)
  }
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
    const mod = await import(pathToFileURL(configPath).href)
    return mod.default || mod.config || mod
  }
  throw new Error('Config file must be .json or .js')
}

function normalizeConfig(rawConfig) {
  const config = rawConfig || {}
  return {
    outputDir: config.outputDir || './public',
    outputFileName: `${config.outputFileName || config.outputFilename || 'orama-persist'}.zip`,
    sourceFolder: config.sourceFolder || '.',
    sourceFiles: config.sourceFiles || '**/*.json',
    schema: config.schema || config.oramaSchema || null,
    testSearches: Array.isArray(config.testSearches) ? config.testSearches : []
  }
}

function normalizePatterns(patterns) {
  if (!patterns) return []
  return Array.isArray(patterns) ? patterns : [patterns]
}

async function loadArrayFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array in ${filePath}`)
  }
  return parsed
}

function normalizeTestSearches(rawTests) {
  if (!Array.isArray(rawTests)) return []
  return rawTests
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      query: (item.query || '').toString().trim(),
      expectedIcons: Array.isArray(item.expectedIcons) ? item.expectedIcons : null,
      expectedCount: Number.isFinite(item.expectedCount) ? item.expectedCount : null,
      limit: Number.isFinite(item.limit) ? item.limit : undefined
    }))
    .filter(item => item.query)
}

function includesAll(haystack, needles) {
  if (!Array.isArray(needles) || !needles.length) return true
  if (!Array.isArray(haystack)) return false
  return needles.every(value => haystack.includes(value))
}

function matchIcon(resultIcon, expectedIcon) {
  if (!expectedIcon) return false
  const nameOk = expectedIcon.name ? resultIcon.name === expectedIcon.name : true
  const libOk = expectedIcon.libraryId ? resultIcon.libraryId === expectedIcon.libraryId : true
  const stylesOk = includesAll(resultIcon.styles, expectedIcon.styles || [])
  return nameOk && libOk && stylesOk
}

async function runTestSearches(zipPath, rawTests) {
  const tests = normalizeTestSearches(rawTests)
  if (!tests.length) {
    console.warn('⚠️  No testSearches configured. Skipping test searches.')
    return
  }

  const compressedData = await fs.readFile(zipPath)
  const decompressedData = await gunzipAsync(compressedData)
  const persistData = JSON.parse(decompressedData.toString('utf8'))
  const db = await restore('binary', persistData)

  let failed = 0
  for (const test of tests) {
    const results = await search(db, {
      mode: 'fulltext',
      term: test.query,
      limit: test.limit ?? 5
    })

    const icons = results.hits.map(hit => ({
      name: hit.document?.name,
      libraryId: hit.document?.libraryId,
      styles: hit.document?.styles
    }))

    let matched = icons.length > 0
    if (test.expectedCount !== null) {
      matched = matched && icons.length >= test.expectedCount
    }
    if (test.expectedIcons && test.expectedIcons.length) {
      matched = matched && test.expectedIcons.every(expected =>
        icons.some(icon => matchIcon(icon, expected))
      )
    }

    if (matched) {
      console.log(`✅ "${test.query}"`)
    } else {
      failed += 1
      const topHits = icons.map(icon => icon.name || 'unknown')
      console.log(`❌ "${test.query}"`)
      if (test.expectedIcons && test.expectedIcons.length) {
        console.log(`   Expected icons: ${JSON.stringify(test.expectedIcons)}`)
      }
      if (test.expectedCount !== null) {
        console.log(`   Expected count >= ${test.expectedCount}`)
      }
      console.log(`   Top hits: ${topHits.join(', ') || 'no results'}`)
    }
  }

  if (failed > 0) {
    process.exitCode = 1
  }
}

async function main() {
  const configPath = resolveConfigPath(process.argv[2])
  if (!configPath) {
    console.error('❌ Missing config file path.')
    console.error('Usage: node ragGenerator/generatePersistence.js <config.json|config.js>')
    process.exit(1)
  }

  let config
  try {
    const rawConfig = await loadConfig(configPath)
    config = normalizeConfig(rawConfig)
  } catch (error) {
    console.error(`❌ Error loading config file: ${error.message}`)
    process.exit(1)
  }

  if (!config.schema || typeof config.schema !== 'object') {
    console.error('❌ Missing schema in config (schema).')
    process.exit(1)
  }

  const projectRoot = path.resolve(__dirname, '..')
  const sourceFolder = path.resolve(projectRoot, config.sourceFolder)
  const outputDir = path.resolve(projectRoot, config.outputDir)
  const outputPath = path.join(outputDir, config.outputFileName)
  const patterns = normalizePatterns(config.sourceFiles)

  if (!patterns.length) {
    console.error('❌ sourceFiles is required in config.')
    process.exit(1)
  }

  let files = []
  try {
    files = await glob(patterns, { cwd: sourceFolder, nodir: true, absolute: true })
  } catch (error) {
    console.error(`❌ Error scanning source files: ${error.message}`)
    process.exit(1)
  }

  if (!files.length) {
    console.error(`❌ No files matched ${patterns.join(', ')} in ${sourceFolder}`)
    process.exit(1)
  }

  console.log(`📦 Loading ${files.length} source files...`)
  const db = await create({ schema: config.schema })
  let insertedCount = 0

  for (const filePath of files) {
    const items = await loadArrayFile(filePath)
    for (const item of items) {
      await insert(db, item)
      insertedCount += 1
    }
  }

  console.log(`✅ Inserted ${insertedCount} records into Orama`)
  console.log('💾 Generating persistence file...')

  const persistedData = await persist(db, 'binary')
  const jsonString = JSON.stringify(persistedData, null, 2)
  const compressedData = await gzipAsync(jsonString)

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(outputPath, compressedData)

  const stats = await fs.stat(outputPath)
  const originalSize = Buffer.byteLength(jsonString, 'utf8')
  const compressionRatio = ((originalSize - stats.size) / originalSize * 100).toFixed(1)

  console.log(`✅ Persisted file saved: ${outputPath}`)
  console.log(`📄 Size: ${stats.size} bytes (compressed)`)
  console.log(`📊 Original: ${originalSize} bytes (${compressionRatio}% saved)`)

  await runTestSearches(outputPath, config.testSearches)
}

main().catch((error) => {
  console.error(`❌ Error: ${error.message}`)
  process.exit(1)
})
