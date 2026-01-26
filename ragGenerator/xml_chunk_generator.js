#!/usr/bin/env node
/**
 * XML Chunks Generator
 *
 * Generates chunks from XML docs by top-level tags.
 * Chunk title is derived from filename + tag name.
 */

import fs from 'fs/promises'
import path from 'path'
import { load } from 'cheerio'
import { glob } from 'glob'
import slugify from 'slugify'
import { VEC_DIM } from './embeddings-service.js'

const MAX_TOKENS_PER_CHUNK = 360
const OVERLAP_TOKENS = 60
const CONCURRENCY = 2

function estimateTokens(s) {
  if (!s) return 0
  return Math.ceil(s.length / 4)
}

function splitIntoSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z¡¿\d[(])/)
    .filter(Boolean)
}

function chunkByTokens(text, maxTokens = MAX_TOKENS_PER_CHUNK, overlapTokens = OVERLAP_TOKENS) {
  const sentences = splitIntoSentences(text)
  const chunks = []
  let buffer = []
  let tokens = 0

  const flush = () => {
    if (!buffer.length) return
    chunks.push(buffer.join(' ').trim())
    buffer = []
    tokens = 0
  }

  for (const s of sentences) {
    const t = estimateTokens(s)
    if (tokens + t > maxTokens) {
      flush()
      let backTokens = 0
      if (chunks.length) {
        const prev = chunks[chunks.length - 1]
        const prevSentences = splitIntoSentences(prev)
        const overlap = []
        for (let j = prevSentences.length - 1; j >= 0; j--) {
          const st = prevSentences[j]
          const tt = estimateTokens(st)
          if (backTokens + tt > overlapTokens) break
          overlap.unshift(st)
          backTokens += tt
        }
        if (overlap.length) {
          buffer.push(overlap.join(' '))
          tokens = estimateTokens(buffer.join(' '))
        }
      }
    }
    buffer.push(s)
    tokens += t
  }
  flush()
  return chunks
}

function normalizeWhitespace(text) {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toSlug(str) {
  return slugify(str || '', {
    lower: true,
    strict: true
  })
}

function makeUrl(baseUrl, pagePathRel, sectionId) {
  if (!baseUrl) return ''
  const noExt = pagePathRel.replace(/\.(xml)$/i, '')
  const parts = noExt.split(/[/]+/).filter(Boolean)
  const filename = parts.pop() || ''
  const dir = parts.join('/')
  const pagePath = filename.toLowerCase() === 'index'
    ? (dir ? `${dir}/` : '')
    : (dir ? `${dir}/${filename}/` : `${filename}/`)
  const base = baseUrl.replace(/\/?$/, '/') + pagePath
  return sectionId ? `${base}#${sectionId}` : base
}

function getTopLevelSections($) {
  const root = $.root()
  const sections = []
  root.children().each((_, el) => {
    if (el.type !== 'tag') return
    const tagName = (el.name || '').trim()
    if (!tagName) return
    const $el = $(el)
    const raw = $el.toString()
    const text = normalizeWhitespace(raw)
    if (!text) return
    sections.push({
      id: tagName,
      text
    })
  })
  return sections
}

async function generateChunks(docsRoot, pattern, options = {}) {
  const { baseUrl = '' } = options

  let files = await glob(pattern, { cwd: docsRoot, nodir: true })

  console.log(`📁 Found ${files.length} files to process`)
  console.log(`📂 Source: ${docsRoot}`)
  console.log(`🔧 Concurrency: ${CONCURRENCY}`)
  console.log(`🎯 Max tokens per chunk: ${MAX_TOKENS_PER_CHUNK}`)
  console.log(`🗄️ Using Orama database for storage`)
  console.log('📚 Starting document processing...\n')

  const pages = []
  const chunks = []

  for (let i = 0; i < files.length; i++) {
    const rel = files[i]
    const progress = `[${i + 1}/${files.length}]`
    console.log(`${progress} 📄 Processing: ${rel}`)
    const full = path.join(docsRoot, rel)
    const raw = await fs.readFile(full, 'utf8')
    const $ = load(raw, { xmlMode: true })

    const baseName = path.basename(rel, path.extname(rel))
    const pageId = toSlug(baseName || rel)
    const pageUrl = makeUrl(baseUrl, rel, '')

    const sections = getTopLevelSections($)
    const sectionIds = sections.map(section => section.id)

    console.log(`  📝 Title: ${baseName}`)
    console.log(`  🏷️  Sections: ${sectionIds.length}`)

    const pageDoc = {
      id: pageId,
      path: rel,
      url: pageUrl,
      title: baseName,
      description: undefined,
      sectionCount: 0,
      headings: sectionIds,
      keywords: undefined,
      updatedAt: undefined
    }

    console.log(`  🔄 Processing ${sectionIds.length} sections...`)

    let chunkCount = 0
    for (const section of sections) {
      const sectionId = section.id
      const text = normalizeWhitespace(section.text)
      if (!text) continue

      const baseChunk = {
        pageId,
        url: makeUrl(baseUrl, rel, sectionId)
      }

      const tokenCount = estimateTokens(text)
      if (tokenCount <= MAX_TOKENS_PER_CHUNK) {
        chunks.push({
          id: `${pageId}#${sectionId}`,
          ...baseChunk,
          text
        })
        chunkCount++
      } else {
        const parts = chunkByTokens(text)
        for (let idx = 0; idx < parts.length; idx++) {
          const pText = parts[idx]
          chunks.push({
            id: `${pageId}#${sectionId}__${idx + 1}`,
            ...baseChunk,
            text: pText
          })
          chunkCount++
        }
      }
    }

    pageDoc.sectionCount = chunks.filter(c => c.pageId === pageId).length
    pages.push(pageDoc)

    console.log(`  ✅ Completed: ${baseName} → ${chunkCount} chunks generated\n`)
  }

  console.log('\n🎉 Document processing completed successfully!')
  console.log(`📄 Pages processed: ${pages.length}`)
  console.log(`🧩 Chunks created: ${chunks.length}`)
  console.log(`🔢 Vector dimensions: ${VEC_DIM}`)
  console.log(`📊 Average chunks per page: ${Math.round(chunks.length / Math.max(pages.length, 1))}`)

  return { pages, chunks }
}

export { generateChunks }
