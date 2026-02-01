#!/usr/bin/env node
/* global process */
/**
 * Test search script for RAG v2 persisted Orama DB.
 *
 * - Restores Orama DB from compressed file
 * - Runs vector search using OpenRouter embeddings
 * - Reports topK results and optional expectations
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { gunzip } from 'zlib'
import { promisify } from 'util'
import dotenv from 'dotenv'
import { restore } from '@orama/plugin-data-persistence'
import { search } from '@orama/orama'
import { OpenRouter } from '@openrouter/sdk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

const gunzipAsync = promisify(gunzip)

function resolveConfigPath(argPath) {
  if (!argPath) return null
  return path.isAbsolute(argPath) ? argPath : path.resolve(process.cwd(), argPath)
}

async function loadConfig(configPath) {
  const ext = path.extname(configPath).toLowerCase()
  if (ext === '.js') {
    const mod = await import(new URL(configPath, `file://${process.cwd()}/`).href)
    return mod.default || mod.config || mod
  }
  throw new Error('Config file must be .js')
}

function normalizeConfig(rawConfig) {
  const config = rawConfig || {}
  return {
    outputDir: config.outputDir || './public',
    outputFilename: config.outputFilename || 'iconsRagToolContents.v2.zip',
    testQueries: Array.isArray(config.testQueries) ? config.testQueries : [],
    search: {
      limit: Number(config.search?.limit || 8),
      similarity: Number(config.search?.similarity || 0.85)
    },
    embeddings: {
      modelId: config.modelId || process.env.OPENROUTER_EMBEDDINGS_MODEL || 'openai/text-embedding-3-large'
    }
  }
}

function isLikelyJson(bytes) {
  if (!bytes || !bytes.length) return false
  const first = bytes.find((b) => b !== 0x20 && b !== 0x0a && b !== 0x0d && b !== 0x09)
  return first === 0x7b || first === 0x5b
}

function isLikelyHex(bytes, sampleSize = 4096) {
  const len = Math.min(bytes.length, sampleSize)
  if (!len) return false
  for (let i = 0; i < len; i += 1) {
    const c = bytes[i]
    const isHex = (c >= 48 && c <= 57) || (c >= 97 && c <= 102)
    const isWhitespace = c === 10 || c === 13 || c === 9 || c === 32
    if (!isHex && !isWhitespace) return false
  }
  return true
}

function normalizeTestQueries(rawQueries) {
  if (!Array.isArray(rawQueries)) return []
  return rawQueries
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      query: (item.query || '').toString().trim(),
      check: typeof item.check === 'function' ? item.check : null,
      expectedName: (item.expectedName || '').toString().trim(),
      expectedLibraryId: (item.expectedLibraryId || '').toString().trim(),
      limit: Number(item.limit),
      similarity: Number(item.similarity)
    }))
    .filter(item => item.query)
}

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in .env')
  }
  return new OpenRouter({ apiKey })
}

async function getQueryEmbedding(query, modelId) {
  const client = getOpenRouterClient()
  const response = await client.embeddings.generate({
    model: modelId,
    input: query
  })
  const embedding = response?.data?.[0]?.embedding
  if (!Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from OpenRouter')
  }
  return embedding
}

function printHit(hit, index) {
  const name = hit?.document?.id || hit?.document?.name || ''
  const libraryId = hit?.document?.pageId || hit?.document?.libraryId || ''
  const score = typeof hit?.score === 'number' ? hit.score.toFixed(3) : 'n/a'
  console.log(`   ${index + 1}. ${name} (${libraryId}) score=${score}`)
}

async function main() {
  const configPath = resolveConfigPath(process.argv[2])
  if (!configPath) {
    console.error('❌ Missing config file path.')
    console.error('Usage: node test-search.v2.js <config.json>')
    process.exit(1)
  }

  const rawConfig = await loadConfig(configPath)
  const config = normalizeConfig(rawConfig)
  const TEST_QUERIES = normalizeTestQueries(config.testQueries)

  const persistFilePath = path.join(config.outputDir, config.outputFilename)
  const compressedData = await fs.readFile(persistFilePath)
  const decompressedData = await gunzipAsync(compressedData)
  const decompressedBytes = new Uint8Array(decompressedData)

  let db
  if (isLikelyJson(decompressedBytes)) {
    const jsonText = new TextDecoder().decode(decompressedBytes)
    db = await restore('json', jsonText)
  } else if (isLikelyHex(decompressedBytes)) {
    const hexText = new TextDecoder().decode(decompressedBytes)
    db = await restore('binary', hexText)
  } else {
    try {
      db = await restore('dpack', decompressedBytes)
    } catch (_error) {
      db = await restore('seqproto', decompressedBytes)
    }
  }

  let failures = 0

  for (const test of TEST_QUERIES) {
    console.log(`\n🔎 Query: "${test.query}"`)
    const vector = await getQueryEmbedding(test.query, config.embeddings.modelId)
    const results = await search(db, {
      mode: 'vector',
      vector: {
        value: vector,
        property: 'embedding'
      },
      limit: Number.isFinite(test.limit) ? test.limit : config.search.limit,
      similarity: Number.isFinite(test.similarity) ? test.similarity : config.search.similarity
    })

    if (!results?.hits?.length) {
      console.log('   No results')
      failures++
      continue
    }

    results.hits.forEach((hit, index) => printHit(hit, index))

    if (typeof test.check === 'function') {
      let ok = false
      try {
        ok = Boolean(test.check(results))
      } catch (error) {
        ok = false
        console.warn(`   ⚠️ check() threw error: ${error.message}`)
      }
      if (!ok) {
        failures++
        console.warn('   ⚠️ check() failed for this query.')
      }
      continue
    }

    if (test.expectedName || test.expectedLibraryId) {
      const matched = results.hits.some(hit => {
        const doc = hit.document || {}
        const hitName = (doc.id || doc.name || '').toString()
        const hitLibrary = (doc.pageId || doc.libraryId || '').toString()
        const nameOk = test.expectedName ? hitName.includes(test.expectedName) : true
        const libOk = test.expectedLibraryId ? hitLibrary === test.expectedLibraryId : true
        return nameOk && libOk
      })

      if (!matched) {
        failures++
        console.warn('   ⚠️ Expected match not found in top results.')
      }
    }
  }

  if (failures > 0) {
    console.error(`\n❌ Tests completed with ${failures} failure(s).`)
    process.exit(1)
  }

  console.log('\n✅ Test searches completed successfully.')
}

main().catch((error) => {
  console.error(`❌ ${error.message}`)
  process.exit(1)
})
