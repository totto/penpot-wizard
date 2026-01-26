#!/usr/bin/env node
/* global process */
import fs from 'fs/promises'
import path from 'path'
import { gunzip } from 'zlib'
import { promisify } from 'util'
import { restore } from '@orama/plugin-data-persistence'
import { search } from '@orama/orama'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import { pathToFileURL } from 'url'

const gunzipAsync = promisify(gunzip)
let tfNodeReady = false

async function ensureTensorflowNode() {
  if (tfNodeReady) return
  const originalLog = console.log
  const originalWarn = console.warn
  console.log = () => {}
  console.warn = () => {}
  try {
    await import('@tensorflow/tfjs-node')
    tfNodeReady = true
  } finally {
    console.log = originalLog
    console.warn = originalWarn
  }
}

function usage() {
  console.log(`
Usage:
  node ragGenerator/optimize/validate-rag-zip.js <zipPath> <queries.json>

queries.json format:
  [
    { "query": "flowbite solid address book", "expectedPath": "flowbite#solid__1" }
  ]
`)
}

function normalizeExpected(value) {
  return (value || '').toString().replace(/\.(md|html?)$/i, '')
}

function normalizeQueries(rawQueries) {
  if (!Array.isArray(rawQueries)) {
    throw new Error('queries must be an array')
  }
  return rawQueries
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      query: (item.query || '').toString().trim(),
      expectedPath: (item.expectedPath || '').toString().trim()
    }))
    .filter(item => item.query && item.expectedPath)
}

async function loadQueries(queriesPath) {
  const raw = await fs.readFile(queriesPath, 'utf8')
  const parsed = JSON.parse(raw)
  return normalizeQueries(parsed)
}

async function restoreDb(zipPath) {
  await ensureTensorflowNode()
  const compressedData = await fs.readFile(zipPath)
  const decompressedData = await gunzipAsync(compressedData)
  const persistData = JSON.parse(decompressedData.toString('utf8'))
  const db = await restore('binary', persistData)

  const embeddingsPlugin = await pluginEmbeddings({
    embeddings: {
      defaultProperty: 'embedding',
      onInsert: {
        generate: false,
        properties: ['text'],
        verbose: false,
      }
    }
  })

  if (typeof embeddingsPlugin.beforeSearch === 'function') {
    const originalBeforeSearch = embeddingsPlugin.beforeSearch
    db.beforeSearch.push(async (...args) => originalBeforeSearch(...args))
  }
  if (typeof embeddingsPlugin.beforeInsert === 'function') {
    const originalBeforeInsert = embeddingsPlugin.beforeInsert
    db.beforeInsert.push(async (...args) => originalBeforeInsert(...args))
  }

  return db
}

async function runSearches(db, tests, searchOverrides = {}) {
  let failed = 0

  for (const test of tests) {
    console.log(`\n🔎 ${test.query}`)
    const mode = searchOverrides.mode || 'hybrid'
    const searchParams = {
      mode,
      term: test.query,
      limit: searchOverrides.limit ?? 5
    }

    if (mode === 'vector') {
      searchParams.property = searchOverrides.property || 'embedding'
      searchParams.tolerance = searchOverrides.tolerance ?? 0.4
    } else if (mode === 'hybrid') {
      searchParams.similarity = searchOverrides.similarity ?? 0.85
    }

    const originalLog = console.log
    console.log = (...args) => {
      const first = args[0]
      if (first && typeof first === 'object' && Array.isArray(first.vector)) {
        return
      }
      originalLog(...args)
    }
    const results = await search(db, searchParams)
    console.log = originalLog
    const expected = test.expectedPath
    const normalizedExpected = normalizeExpected(expected)
    const matched = results.hits.some(hit => {
      const doc = hit.document || {}
      const url = doc.url || ''
      const pageId = doc.pageId || ''
      const docId = doc.id || ''
      const hitId = hit.id || ''
      return (
        url === expected ||
        url.includes(expected) ||
        pageId === expected ||
        pageId === normalizedExpected ||
        url.includes(normalizedExpected) ||
        docId === expected ||
        docId === normalizedExpected ||
        hitId === expected ||
        hitId === normalizedExpected
      )
    })

    const topPaths = results.hits.map(hit =>
      hit.document?.id ||
      hit.id ||
      hit.document?.url ||
      hit.document?.pageId
    )
    if (!results.hits.length) {
        console.log('   No results')
        if (mode === 'vector') {
          console.log(`   Hint: try lowering tolerance (current ${searchParams.tolerance})`)
        }
    } else {
      results.hits.forEach((hit, index) => {
        const label = hit.document?.id || hit.id || hit.document?.url || hit.document?.pageId || 'unknown'
        const score = Number.isFinite(hit.score) ? hit.score.toFixed(3) : 'n/a'
        const preview = (hit.document?.text || '').slice(0, 120).replace(/\s+/g, ' ')
        console.log(`   ${index + 1}. ${label} (${score})`)
        console.log(`      ${preview}${preview.length === 120 ? '...' : ''}`)
      })
    }

    if (matched) {
      console.log(`✅ Expected: ${expected}`)
    } else {
      failed += 1
      console.log(`❌ Expected: ${expected}`)
      console.log(`   Top paths: ${topPaths.join(', ') || 'no results'}`)
    }
  }

  if (failed > 0) {
    process.exitCode = 1
  }
}

export async function validateRagZip({ zipPath, queries, search: searchOverrides }) {
  if (!zipPath) {
    throw new Error('zipPath is required')
  }
  const tests = normalizeQueries(queries || [])
  if (!tests.length) {
    throw new Error('queries must include at least one item')
  }
  const db = await restoreDb(zipPath)
  await runSearches(db, tests, searchOverrides)
}

async function main() {
  const [, , zipPathArg, queriesPathArg] = process.argv
  if (!zipPathArg || !queriesPathArg) {
    usage()
    process.exit(1)
  }

  const zipPath = path.resolve(zipPathArg)
  const queriesPath = path.resolve(queriesPathArg)

  try {
    const tests = await loadQueries(queriesPath)
    const db = await restoreDb(zipPath)
    await runSearches(db, tests)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

const isDirectRun = () => {
  const entry = process.argv[1]
  if (!entry) return false
  return pathToFileURL(path.resolve(entry)).href === import.meta.url
}

if (isDirectRun()) {
  main()
}
