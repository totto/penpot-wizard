#!/usr/bin/env node
/**
 * Embeddings Service Module
 * 
 * This module handles all embeddings and database operations:
 * - OpenAI client initialization
 * - Text embedding generation
 * - Orama database operations
 * - Database persistence and test searches
 * - Complete embeddings pipeline orchestration
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { create, insert } from '@orama/orama'
import { persist } from '@orama/plugin-data-persistence'
import { pluginEmbeddings } from '@orama/plugin-embeddings'
import '@tensorflow/tfjs-node'
import { generateChunks } from './penpot_chunks_generator.js'

// Configurar dotenv para cargar desde el directorio correcto
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '.env') })

// -----------------------------
// Configuration
// -----------------------------
const EMBEDDING_MODEL = 'orama'
const VEC_DIM = 512

// -----------------------------
// Database Schema
// -----------------------------
const ORAMA_SCHEMA = {
  id: 'string',
  pageId: 'string',
  url: 'string',
  text: 'string',
  embedding: `vector[${VEC_DIM}]`
}

// -----------------------------
// Database Instance
// -----------------------------
let oramaDB = null

// -----------------------------
// Embeddings Operations
// -----------------------------

/**
 * Generate embeddings for the given text using the configured model
 * @param {string} text - The text to generate embeddings for
 * @returns {Promise<number[]>} The embedding vector
 */
async function getEmbedding(text) {
  const input = text.replace(/\s+/g, ' ').trim()
  if (!input) return new Array(VEC_DIM).fill(0)
  
  // Orama embeddings are handled automatically by the plugin during insertion
  throw new Error('Orama embeddings are handled automatically by the plugin during insertion')
}

/**
 * Check if API key is configured for the current embedding model
 * @returns {boolean} True if API key is available (for OpenAI) or not needed (for Orama)
 */
function isApiKeyConfigured() {
  return true  // Orama doesn't need API key
}

/**
 * Get the vector dimension used by the embeddings model
 * @returns {number} The vector dimension
 */
function getVectorDimension() {
  return VEC_DIM
}

/**
 * Get the embeddings model name
 * @returns {string} The model name
 */
function getEmbeddingsModel() {
  return 'orama'
}

// -----------------------------
// Database Operations
// -----------------------------

/**
 * Initialize the Orama database with the configured schema and plugins
 * @returns {Promise<void>}
 */
async function initializeOramaDB() {
  console.log('🗄️ Initializing Orama database...')
  console.log(`📊 Using ${EMBEDDING_MODEL} embeddings model (${VEC_DIM} dimensions)`)
  
  const plugins = []
  
  console.log('🔌 Configuring Orama embeddings plugin...')
  const embeddingsPlugin = await pluginEmbeddings({
    embeddings: {
      defaultProperty: 'embedding',
      onInsert: {
        generate: true,
        properties: ['text'],
        verbose: true,
      }
    }
  })
  // Wrap hooks to ensure Orama awaits them (compiled functions are not AsyncFunction)
  if (typeof embeddingsPlugin.beforeSearch === 'function') {
    const originalBeforeSearch = embeddingsPlugin.beforeSearch
    embeddingsPlugin.beforeSearch = async (...args) => originalBeforeSearch(...args)
  }
  if (typeof embeddingsPlugin.beforeInsert === 'function') {
    const originalBeforeInsert = embeddingsPlugin.beforeInsert
    embeddingsPlugin.beforeInsert = async (...args) => originalBeforeInsert(...args)
  }
  plugins.push(embeddingsPlugin)
  
  oramaDB = await create({
    schema: ORAMA_SCHEMA,
    plugins: plugins
  })
  
  console.log('✅ Orama database initialized successfully')
}

/**
 * Add a chunk to the Orama database
 * @param {Object} chunk - The chunk data to add
 * @returns {Promise<void>}
 */
async function addChunkToOrama(chunk) {
  if (!oramaDB) {
    throw new Error('Orama database not initialized')
  }
  
  const chunkForOrama = {
    id: chunk.id,
    pageId: chunk.pageId,
    url: chunk.url,
    text: chunk.text
  }
  
  // For Orama embeddings, remove the embedding field so the plugin can generate it
  delete chunkForOrama.embedding
  
  try {
    await insert(oramaDB, chunkForOrama)
    console.log(`📝 Added chunk to Orama: ${chunk.id}`)
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Chunk already exists, skipping: ${chunk.id}`)
    } else {
      throw error
    }
  }
}


/**
 * Generate a JSON representation of the database using Orama's persist function
 * @returns {Promise<Object>} The persisted database data as JSON
 */
async function generatePersistJson() {
  if (!oramaDB) {
    throw new Error('Orama database not initialized')
  }
  
  console.log('💾 Generating persist JSON from Orama database...')
  
  try {
    const persistedData = await persist(oramaDB)
    console.log('✅ Persist JSON generated successfully')
    return persistedData
  } catch (error) {
    console.error('❌ Error generating persist JSON:', error.message)
    throw error
  }
}

/**
 * Complete embeddings pipeline: generate chunks, add to database, and generate persist JSON
 * @param {string} docsRoot - Path to the documentation root directory
 * @param {string} pattern - Glob pattern for files to process
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} The persisted database data
 */
async function runEmbeddingsPipeline(docsRoot, pattern, options) {
  console.log('🚀 Starting complete embeddings pipeline...')
  
  // Initialize database
  await initializeOramaDB()
  
  // Generate chunks
  console.log('📚 Generating chunks from documentation...')
  const { chunks } = await generateChunks(docsRoot, pattern, options)
  
  // Add chunks to database
  console.log('💾 Adding chunks to database...')
  for (const chunk of chunks) {
    await addChunkToOrama(chunk)
  }
  
  // Generate persist JSON
  console.log('💾 Generating persist JSON...')
  const persistData = await generatePersistJson()
  
  // Show persist data statistics
  if (persistData && persistData.data) {
    const dataLength = Object.keys(persistData.data).length
    console.log(`📊 Database statistics:`)
    console.log(`   - Documents in database: ${dataLength}`)
    console.log(`   - Vector dimensions: ${persistData.schema?.embedding?.dimension || 'N/A'}`)
  }
  
  console.log('🎉 Embeddings pipeline completed successfully!')
  
  return persistData
}

// -----------------------------
// Export Functions
// -----------------------------
export {
  getEmbedding,
  isApiKeyConfigured,
  getVectorDimension,
  getEmbeddingsModel,
  initializeOramaDB,
  addChunkToOrama,
  generatePersistJson,
  runEmbeddingsPipeline,
  VEC_DIM,
  EMBEDDING_MODEL,
  ORAMA_SCHEMA
}
