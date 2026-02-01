#!/usr/bin/env node
/**
 * Icons RAG v3 Chunks Generator
 *
 * - Reads JSON icon catalogs from iconsRAGv3
 * - Generates one chunk per icon for maximum precision
 * - Adds compact metadata fields into the chunk text
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

const MAX_CHARS_PER_CHUNK = 100

function buildLibraryStyleText({ libraryId, style, icons, part, totalParts }) {
  const lines = [
    `library: ${libraryId}`,
    `style: ${style}`,
    totalParts > 1 ? `part: ${part}/${totalParts}` : '',
    icons.length ? `icons: ${icons.join(', ')}` : ''
  ].filter(Boolean)

  return normalizeWhitespace(lines.join(' | '))
}

function normalizeIconRecord(raw, fallbackLibraryId) {
  if (!raw || typeof raw !== 'object') return null
  return {
    name: raw.name || raw.icon || raw.id || '',
    libraryId: fallbackLibraryId || '',
    styles: Array.isArray(raw.styles) ? raw.styles : [],
    tags: Array.isArray(raw.tags) ? raw.tags : []
  }
}

async function loadIconsFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return { icons: parsed, metadata: {} }
  }
  if (Array.isArray(parsed.icons)) {
    return {
      icons: parsed.icons,
      metadata: parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {}
    }
  }
  if (Array.isArray(parsed.data)) {
    return { icons: parsed.data, metadata: {} }
  }
  return { icons: [], metadata: {} }
}

/**
 * Generate chunks from iconsRAGv3 JSON files
 * @param {string} docsRoot - Path to the iconsRAGv3 root
 * @param {string} pattern - Glob pattern for files to process
 * @param {Object} options - Configuration options
 * @param {string|null} options.baseUrl - Base URL for generated links
 * @returns {Promise<{pages: Array, chunks: Array}>}
 */
async function generateChunks(docsRoot = '../MATERIAL/iconsRAGv3', pattern = '**/*.json') {
  let files = await glob(pattern, { cwd: docsRoot, nodir: true })
  files = files.sort()

  const chunks = []

  for (const rel of files) {
    const full = path.join(docsRoot, rel)
    const defaultLibraryId = path.basename(rel, path.extname(rel))

    const { icons: rawIcons, metadata } = await loadIconsFromFile(full)
    const libraryId = metadata.libraryId || defaultLibraryId
    const normalizedIcons = rawIcons
      .map(icon => normalizeIconRecord(icon, libraryId))
      .filter(icon => icon && icon.name)

    const iconsByStyle = new Map()
    for (const icon of normalizedIcons) {
      const styles = Array.isArray(icon.styles) && icon.styles.length
        ? icon.styles
        : ['default']
      for (const style of styles) {
        if (!iconsByStyle.has(style)) iconsByStyle.set(style, [])
        iconsByStyle.get(style).push(icon.name)
      }
    }

    for (const [style, names] of iconsByStyle.entries()) {
      const groups = []
      let current = []
      let currentLen = 0

      for (const name of names) {
        const nextLen = name.length + (current.length ? 2 : 0)
        if (currentLen + nextLen > MAX_CHARS_PER_CHUNK) {
          if (current.length) groups.push(current)
          current = [name]
          currentLen = name.length
        } else {
          current.push(name)
          currentLen += nextLen
        }
      }
      if (current.length) groups.push(current)

      const totalParts = groups.length
      groups.forEach((icons, index) => {
        const part = index + 1
        const id = totalParts > 1
          ? `${libraryId}:${style}:${part}`
          : `${libraryId}:${style}`
        chunks.push({
          id,
          text: buildLibraryStyleText({
            libraryId,
            style,
            icons,
            part,
            totalParts
          })
        })
      })
    }
  }

  return { pages: [], chunks }
}

export { generateChunks }
