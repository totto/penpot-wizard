#!/usr/bin/env node
/* global process */
import fs from 'fs/promises'
import path from 'path'
import { restore } from '@orama/plugin-data-persistence'
import { search } from '@orama/orama'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import '@tensorflow/tfjs-node'

const INPUT_PATH = path.resolve('ragGenerator/optimize/output/quotes.orama.json')

const QUERIES = [
  'Life is like riding a bicycle',
  'Keep your face to the sunshine and you cannot see',
  'Keep your face to the sunshine and you cannot see a shadow'
]

async function restoreDb(persistPath) {
  const raw = await fs.readFile(persistPath, 'utf8')
  const embeddingsPlugin = await pluginEmbeddings({
    embeddings: {
      defaultProperty: 'embeddings',
      onInsert: {
        generate: false,
        properties: ['quote', 'author'],
        verbose: false
      }
    }
  })

  const db = await restore('binary', raw)

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

async function main() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : INPUT_PATH

  try {
    const db = await restoreDb(inputPath)

    const tolerance = Number.parseFloat(process.argv[3] || '0')
    const safeTolerance = Number.isFinite(tolerance) ? tolerance : 0

    for (const term of QUERIES) {
      const results = await search(db, {
        term,
        mode: 'vector',
        property: 'embeddings',
        limit: 3,
        tolerance: safeTolerance,
      })

      console.log(`\n🔎 ${term}`)
      console.log(`\n Found ${results.hits.length} results`)
      for (const hit of results.hits) {
        const doc = hit.document || {}
        console.log(`  - ${doc.quote} — ${doc.author}`)
      }
    }
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

main()
