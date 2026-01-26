#!/usr/bin/env node
/* global process */
import fs from 'fs/promises'
import path from 'path'
import { create, insert, search } from '@orama/orama'
import { persist } from '@orama/plugin-data-persistence'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import '@tensorflow/tfjs-node'

const OUTPUT_PATH = path.resolve('ragGenerator/optimize/output/quotes.orama.json')

const SCHEMA = {
  id: 'string',
  quote: 'string',
  author: 'string',
  embeddings: 'vector[512]'
}

const QUOTES = [
  {
    id: 'einstein-1',
    quote: 'Life is like riding a bicycle. To keep your balance you must keep moving.',
    author: 'Albert Einstein'
  },
  {
    id: 'curie-1',
    quote: 'Nothing in life is to be feared, it is only to be understood.',
    author: 'Marie Curie'
  },
  {
    id: 'angelou-1',
    quote: 'If you do not like something, change it. If you cannot change it, change your attitude.',
    author: 'Maya Angelou'
  },
  {
    id: 'lovelace-1',
    quote: 'That brain of mine is something more than merely mortal; as time will show.',
    author: 'Ada Lovelace'
  },
  {
    id: 'keller-1',
    quote: 'Keep your face to the sunshine and you cannot see a shadow.',
    author: 'Helen Keller'
  }
]

async function main() {
  try {
    const embeddingsPlugin = await pluginEmbeddings({
      embeddings: {
        defaultProperty: 'embeddings',
        onInsert: {
          generate: true,
          properties: ['quote', 'author'],
          verbose: true
        }
      }
    })

    if (typeof embeddingsPlugin.beforeSearch === 'function') {
      const originalBeforeSearch = embeddingsPlugin.beforeSearch
      embeddingsPlugin.beforeSearch = async (...args) => originalBeforeSearch(...args)
    }
    if (typeof embeddingsPlugin.beforeInsert === 'function') {
      const originalBeforeInsert = embeddingsPlugin.beforeInsert
      embeddingsPlugin.beforeInsert = async (...args) => originalBeforeInsert(...args)
    }

    const db = await create({
      schema: SCHEMA,
      plugins: [embeddingsPlugin]
    })

    for (const quote of QUOTES) {
      await insert(db, quote)
    }

    const results = await search(db, {
      term: 'Keep your face to the sunshine and you cannot see',
      mode: 'vector',
      property: 'embeddings',
      limit: 3,
      tolerance: 0
    })

    console.log('results:', results)

    const persisted = await persist(db, 'binary')
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
    await fs.writeFile(OUTPUT_PATH, persisted, 'utf8')

    console.log(`✅ Persisted quotes DB to ${OUTPUT_PATH}`)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

main()
