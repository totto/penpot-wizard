#!/usr/bin/env node
/**
 * Icons RAG v3 simple chunks generator
 *
 * - Reads a single iconsRAGv3 JSON file
 * - Emits one chunk per icon
 * - Chunk text is a minimal JSON string: { name, styles }
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

function normalizeIconRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    name: raw.name || raw.icon || raw.id || '',
    styles: Array.isArray(raw.styles) ? raw.styles : []
  }
}

async function loadIconsFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return { icons: parsed }
  }
  if (Array.isArray(parsed.icons)) {
    return { icons: parsed.icons }
  }
  if (Array.isArray(parsed.data)) {
    return { icons: parsed.data }
  }
  return { icons: [] }
}

/**
 * Generate chunks from iconsRAGv3 JSON files
 * @param {string} docsRoot - Path to the iconsRAGv3 root
 * @param {string} pattern - Glob pattern for files to process
 * @returns {Promise<{pages: Array, chunks: Array}>}
 */
async function generateChunks(docsRoot = '../MATERIAL/iconsRAGv3', pattern = '**/*.json') {
  let files = await glob(pattern, { cwd: docsRoot, nodir: true })
  files = files.sort()

  const chunks = []

  for (const rel of files) {
    const full = path.join(docsRoot, rel)
    const { icons: rawIcons } = await loadIconsFromFile(full)
    const normalizedIcons = rawIcons
      .map(icon => normalizeIconRecord(icon))
      .filter(icon => icon && icon.name)

    const byName = new Map()
    for (const icon of normalizedIcons) {
      const current = byName.get(icon.name) || new Set()
      for (const style of icon.styles) current.add(style)
      byName.set(icon.name, current)
    }

    for (const [name, stylesSet] of byName.entries()) {
      const styles = Array.from(stylesSet)
      const id = name
      chunks.push({
        id,
        text: JSON.stringify({
          name,
          styles
        })
      })
    }
  }

  return { pages: [], chunks }
}

export { generateChunks }
