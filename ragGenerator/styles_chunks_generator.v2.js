#!/usr/bin/env node
/**
 * Styles RAG v3 Chunks Generator
 *
 * - Reads JSON style docs from stylesRAGv3
 * - Generates compact, section-based chunks
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeList(list = []) {
  return Array.from(
    new Set(
      list
        .filter(Boolean)
        .map(item => item.toString().trim())
        .filter(item => item.length)
    )
  )
}

function slugify(input = '') {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildChunkText(baseParts, sectionParts) {
  const parts = [...baseParts, ...sectionParts].filter(Boolean)
  return normalizeWhitespace(parts.join(' | '))
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function safeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function safeObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function normalizeStyleRecord(raw = {}, fallbackStyleId = '') {
  const styleId = safeString(raw.styleId) || fallbackStyleId
  return {
    styleId,
    name: safeString(raw.name),
    family: safeString(raw.family),
    definition: safeString(raw.definition),
    intentAndUse: normalizeList(raw.intentAndUse),
    palettes: safeArray(raw.palettes).map(palette => ({
      name: safeString(palette?.name),
      colors: normalizeList(palette?.colors)
    })).filter(palette => palette.name || palette.colors.length),
    rules: normalizeList(raw.rules),
    typography: {
      families: normalizeList(raw.typography?.families),
      tokensDesktop: normalizeList(raw.typography?.tokensDesktop),
      tokensMobile: normalizeList(raw.typography?.tokensMobile)
    },
    iconLibraries: normalizeList(raw.iconLibraries),
    layout: normalizeList(raw.layout),
    imagery: normalizeList(raw.imagery),
    accessibility: normalizeList(raw.accessibility),
    keywords: normalizeList(raw.keywords)
  }
}

async function loadStyleFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) return parsed
  return [parsed]
}

/**
 * Generate chunks from stylesRAGv3 JSON files
 * @param {string} docsRoot - Path to stylesRAGv3 root
 * @param {string} pattern - Glob pattern for files to process
 * @param {Object} options - Configuration options
 * @param {string|null} options.baseUrl - Base URL for generated links
 * @returns {Promise<{pages: Array, chunks: Array}>}
 */
async function generateChunks(docsRoot = '../MATERIAL/stylesRAGv3', pattern = '**/*.json', options = {}) {
  const { baseUrl = null } = options
  let files = await glob(pattern, { cwd: docsRoot, nodir: true })
  files = files.sort()

  const pages = []
  const chunks = []
  const catalogItems = []

  for (const rel of files) {
    const full = path.join(docsRoot, rel)
    const fallbackStyleId = path.basename(rel, path.extname(rel))
    const rawStyles = await loadStyleFromFile(full)

    for (const raw of rawStyles) {
      const style = normalizeStyleRecord(raw, fallbackStyleId)
      if (!style.styleId) continue

      const pageId = style.styleId
      pages.push({
        id: pageId,
        path: rel,
        url: baseUrl ? `${baseUrl.replace(/\/$/, '')}/${pageId}` : '',
        title: style.name || pageId,
        description: style.definition || undefined,
        sectionCount: 0,
        headings: [],
        keywords: style.keywords.length ? style.keywords : undefined,
        updatedAt: undefined
      })

      const baseParts = [
        `style: ${style.styleId}`,
        style.name ? `name: ${style.name}` : '',
        style.family ? `family: ${style.family}` : ''
      ]

      let sectionCount = 0
      const pushChunk = (section, sectionParts, suffix = '') => {
        const text = buildChunkText(baseParts, [`section: ${section}`, ...sectionParts])
        if (!text) return
        const id = `${style.styleId}:${section}${suffix ? `:${suffix}` : ''}`
        chunks.push({
          id,
          pageId,
          url: '',
          text
        })
        sectionCount += 1
      }

      if (style.intentAndUse.length || style.definition || style.keywords.length) {
        pushChunk('intent', [
          style.definition ? `definition: ${style.definition}` : '',
          style.intentAndUse.length ? `intentAndUse: ${style.intentAndUse.join('; ')}` : '',
          style.keywords.length ? `keywords: ${style.keywords.join(', ')}` : ''
        ])
      }

      if (style.palettes.length) {
        style.palettes.forEach((palette, index) => {
          const paletteName = palette.name || `palette-${index + 1}`
          const suffix = slugify(paletteName) || `palette-${index + 1}`
          pushChunk('palette', [
            `palette: ${paletteName}`,
            palette.colors.length ? `colors: ${palette.colors.join(', ')}` : ''
          ], suffix)
        })
      }

      if (style.rules.length) {
        pushChunk('rules', [`rules: ${style.rules.join('; ')}`])
      }

      if (style.typography.families.length) {
        pushChunk('typography', [`families: ${style.typography.families.join(', ')}`])
      }

      if (style.iconLibraries.length) {
        pushChunk('icon-libraries', [`iconLibraries: ${style.iconLibraries.join(', ')}`])
      }

      if (style.layout.length) {
        pushChunk('layout', [`layout: ${style.layout.join('; ')}`])
      }

      if (style.imagery.length) {
        pushChunk('imagery', [`imagery: ${style.imagery.join('; ')}`])
      }

      if (style.accessibility.length) {
        pushChunk('accessibility', [`accessibility: ${style.accessibility.join('; ')}`])
      }

      pages[pages.length - 1].sectionCount = sectionCount
      catalogItems.push({
        styleId: style.styleId,
        name: style.name || style.styleId,
        description: style.definition,
        intentAndUse: style.intentAndUse,
        keywords: style.keywords
      })
    }
  }

  if (catalogItems.length) {
    const catalogText = catalogItems
      .map((item) => {
        const descriptionText = item.description ? ` description: ${item.description}` : ''
        const intentText = item.intentAndUse.length ? ` intentAndUse: ${item.intentAndUse.join('; ')}` : ''
        const keywordText = item.keywords.length ? ` keywords: ${item.keywords.join(', ')}` : ''
        return `${item.styleId} - ${item.name}${descriptionText}${intentText}${keywordText}`
      })
      .join(' || ')

    pages.push({
      id: 'styles-index',
      path: '__catalog__',
      url: '',
      title: 'Styles Catalog',
      description: 'Aggregated list of available design styles.',
      sectionCount: 1,
      headings: [],
      keywords: undefined,
      updatedAt: undefined
    })

    chunks.push({
      id: 'styles-index:catalog',
      pageId: 'styles-index',
      url: '',
      text: normalizeWhitespace(`styles catalog: ${catalogText}`)
    })
  }

  return { pages, chunks }
}

export { generateChunks }
