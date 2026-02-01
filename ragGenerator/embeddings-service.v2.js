#!/usr/bin/env node
/* global process */
/**
 * Embeddings Service Module v2
 *
 * - Uses OpenRouter embeddings via @openrouter/sdk
 * - Stores embeddings directly in Orama (no plugin)
 * - Keeps a compatible API with v1 generator scripts
 */

import dotenv from 'dotenv'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import { create, insert } from '@orama/orama'
import { persist } from '@orama/plugin-data-persistence'
import { OpenRouter } from '@openrouter/sdk'
import { generateChunks as generatePenpotChunks } from './chunks_generator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from ragGenerator directory
dotenv.config({ path: path.join(__dirname, '.env') })

// -----------------------------
// Configuration
// -----------------------------
const DEFAULT_MODEL_ID = process.env.OPENROUTER_EMBEDDINGS_MODEL || 'openai/text-embedding-3-large'
// Default vector size for openai/text-embedding-3-large; override via env or options
const DEFAULT_VEC_DIM = Number(process.env.OPENROUTER_EMBEDDINGS_DIM || 3072)
const DEFAULT_BATCH_SIZE = Number(process.env.OPENROUTER_EMBEDDINGS_BATCH || 64)

// -----------------------------
// Database Schema
// -----------------------------
const baseSchema = (vectorDimensions) => ({
  id: 'string',
  pageId: 'string',
  url: 'string',
  text: 'string',
  embedding: `vector[${vectorDimensions}]`
})

// -----------------------------
// Database Instance
// -----------------------------
let oramaDB = null
let currentVectorDimensions = DEFAULT_VEC_DIM

// -----------------------------
// OpenRouter Client
// -----------------------------
function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY in .env')
  }
  return new OpenRouter({ apiKey })
}

function normalizeEmbeddingVector(vector, expectedLength) {
  if (!Array.isArray(vector)) {
    throw new Error('Embedding response is not an array')
  }
  if (expectedLength && vector.length !== expectedLength) {
    throw new Error(`Embedding dimension mismatch: expected ${expectedLength}, got ${vector.length}`)
  }
  return vector
}

async function getEmbeddingsBatch(inputs, modelId, expectedLength) {
  if (!inputs.length) return []
  const client = getOpenRouterClient()
  const response = await client.embeddings.generate({
    model: modelId,
    input: inputs
  })
  if (!response?.data?.length) {
    throw new Error('OpenRouter embeddings response is empty')
  }
  return response.data.map((item) => normalizeEmbeddingVector(item.embedding, expectedLength))
}

// -----------------------------
// Chunker loader
// -----------------------------
async function loadChunkGenerator(chunkGenerator) {
  if (!chunkGenerator) return generatePenpotChunks
  const resolvedPath = path.isAbsolute(chunkGenerator)
    ? chunkGenerator
    : path.resolve(__dirname, chunkGenerator)
  const mod = await import(pathToFileURL(resolvedPath).href)
  return mod.generateChunks || mod.default || mod
}

// -----------------------------
// Config loader (.js only)
// -----------------------------
async function loadConfig(configPath) {
  const ext = path.extname(configPath).toLowerCase()
  if (ext !== '.js') {
    throw new Error('Config file must be .js')
  }
  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.resolve(process.cwd(), configPath)
  const mod = await import(pathToFileURL(resolvedPath).href)
  return mod.default || mod.config || mod
}

// -----------------------------
// Public API
// -----------------------------
async function initializeOramaDB(vectorDimensions = DEFAULT_VEC_DIM) {
  currentVectorDimensions = vectorDimensions
  console.log(`🧠 Initializing Orama DB with vector dimension: ${vectorDimensions}`)
  oramaDB = await create({
    schema: baseSchema(vectorDimensions)
  })
}

async function addChunkToOrama(chunk) {
  if (!oramaDB) {
    throw new Error('Orama database not initialized')
  }
  await insert(oramaDB, chunk)
}

async function generatePersistJson(format = 'dpack') {
  if (!oramaDB) {
    throw new Error('Orama database not initialized')
  }
  return persist(oramaDB, format)
}

async function runEmbeddingsPipeline(docsRoot, pattern, options = {}) {
  const modelId = options.modelId || DEFAULT_MODEL_ID
  const vectorDimensions = Number(options.vectorDimensions || DEFAULT_VEC_DIM)
  const batchSize = Number(options.batchSize || DEFAULT_BATCH_SIZE)
  const persistFormat = options.persistFormat || 'dpack'

  console.log('🚀 Starting embeddings pipeline v2')
  console.log(`📚 Docs root: ${docsRoot}`)
  console.log(`🔍 Pattern: ${pattern}`)
  console.log(`🧩 Chunk generator: ${options.chunkGenerator || 'default'}`)
  console.log(`🤖 Model: ${modelId}`)
  console.log(`📐 Vector dimensions: ${vectorDimensions}`)
  console.log(`📦 Batch size: ${batchSize}`)
  console.log(`💾 Persist format: ${persistFormat}`)

  await initializeOramaDB(vectorDimensions)

  const chunker = await loadChunkGenerator(options.chunkGenerator)
  const { chunks } = await chunker(docsRoot, pattern, options)
  console.log(`🧱 Chunks generated: ${chunks.length}`)

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const texts = batch.map((chunk) => chunk.text)
    console.log(`🔗 Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)`)
    const embeddings = await getEmbeddingsBatch(texts, modelId, vectorDimensions)
    for (let j = 0; j < batch.length; j++) {
      await addChunkToOrama({
        ...batch[j],
        embedding: embeddings[j]
      })
    }
  }

  console.log('✅ Embeddings generation complete. Persisting DB...')
  return generatePersistJson(persistFormat)
}

async function runEmbeddingsPipelineFromConfig(configPath) {
  const config = await loadConfig(configPath)
  if (!config?.docsPath || !config?.docsPattern) {
    throw new Error('Config must include docsPath and docsPattern')
  }
  return runEmbeddingsPipeline(
    config.docsPath,
    config.docsPattern,
    config
  )
}

function getVectorDimension() {
  return currentVectorDimensions
}

function getEmbeddingsModel() {
  return DEFAULT_MODEL_ID
}

function isApiKeyConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

export {
  initializeOramaDB,
  addChunkToOrama,
  generatePersistJson,
  runEmbeddingsPipeline,
  runEmbeddingsPipelineFromConfig,
  getVectorDimension,
  getEmbeddingsModel,
  isApiKeyConfigured,
  DEFAULT_VEC_DIM as VEC_DIM,
  DEFAULT_MODEL_ID as EMBEDDING_MODEL,
  baseSchema as ORAMA_SCHEMA
}
