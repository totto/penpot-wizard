#!/usr/bin/env node
/* global process */
/**
 * Transform stylesRAGv2 markdown into stylesRAGv3 JSON.
 *
 * - Parses semi-structured sections
 * - Normalizes tokens and lists
 * - Writes one JSON file per style
 */

import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

const DEFAULT_INPUT_DIR = path.resolve(process.cwd(), '../MATERIAL/stylesRAGv2')
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), '../MATERIAL/stylesRAGv3')

const ICON_LIBRARY_MAP = new Map([
  ['flowbite', 'flowbite'],
  ['flowbite icons', 'flowbite'],
  ['boxicons', 'boxicons'],
  ['iconoir', 'iconoir'],
  ['iconoir icons', 'iconoir'],
  ['heroicons', 'heroicons'],
  ['heroicons icons', 'heroicons'],
  ['tabler', 'tabler'],
  ['tabler icons', 'tabler'],
  ['lucide', 'lucide'],
  ['lucide icons', 'lucide'],
  ['phosphor', 'phosphor'],
  ['phosphor icons', 'phosphor'],
  ['mingcute', 'mingcute'],
  ['mingcute icons', 'mingcute'],
  ['ionicons', 'ionicons'],
  ['lineicons', 'lineicons'],
  ['lineicons icons', 'lineicons'],
  ['circum', 'circum'],
  ['circum icons', 'circum']
])

const ICON_LIBRARY_IGNORE_PREFIXES = [
  'best for',
  'use ',
  'works well',
  'doodle',
  'streamline',
  'iconsax',
  'iconpark',
  'solar icons',
  'isocons',
  'basicons',
  'iconsans',
  'glow ui icons'
]

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

function stripQuotes(input) {
  return input.replace(/^["“”']|["“”']$/g, '')
}

function parseTitle(rawLines) {
  const titleLine = rawLines.find(line => line.startsWith('# '))
  return titleLine ? titleLine.replace(/^#\s+/, '').trim() : ''
}

function parseSections(rawLines) {
  const sections = new Map()
  let current = null

  rawLines.forEach((line) => {
    if (line.startsWith('## ')) {
      current = line.replace(/^##\s+/, '').trim()
      if (!sections.has(current)) sections.set(current, [])
      return
    }
    if (!current) return
    sections.get(current).push(line)
  })

  return sections
}

function parseListItems(lines) {
  return normalizeList(
    lines
      .map(line => line.trim())
      .filter(line => line.startsWith('- '))
      .map(line => line.replace(/^-+\s*/, '').trim())
  )
}

function parseDefinition(lines) {
  const content = lines.filter(Boolean).join(' ')
  return normalizeWhitespace(content)
}

function parseIntent(lines) {
  return parseListItems(lines)
}

function parseUseCases(intentItems) {
  const useCases = []
  intentItems.forEach((item) => {
    const match = item.match(/(?:ideal|best|great|suited|good)\s+for\s+(.+)/i)
    if (!match || !match[1]) return
    const cleaned = match[1]
      .replace(/[.]+$/g, '')
      .replace(/^\s+|\s+$/g, '')
    cleaned
      .split(/\s*,\s*|\s+and\s+/i)
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => useCases.push(part))
  })
  return normalizeList(useCases)
}

function parsePalettes(lines) {
  const palettes = []
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('- ')) return
    const nameMatch = trimmed.match(/\*\*(.+?)\*\*/)
    const name = nameMatch ? nameMatch[1].trim() : ''
    const colorMatches = trimmed.match(/#(?:[0-9a-fA-F]{6})/g) || []
    const colors = normalizeList(colorMatches)
    if (name || colors.length) {
      palettes.push({ name, colors })
    }
  })
  return palettes
}

function parseTypographyFamilies(lines) {
  const families = []
  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('- ')) return
    const value = trimmed.replace(/^-+\s*/, '')
    const parts = value.split(':')
    const maybeFonts = parts.length > 1 ? parts.slice(1).join(':') : parts[0]
    const fonts = maybeFonts
      .split(',')
      .map(item => stripQuotes(item.trim()))
      .filter(item => item.length)
    families.push(...fonts)
  })
  return normalizeList(families)
}

function parseTypographyTokens(lines) {
  const tokensDesktop = []
  const tokensMobile = []
  let mode = null

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('- **Desktop web tokens**')) {
      mode = 'desktop'
      return
    }
    if (trimmed.startsWith('- **Mobile app tokens**')) {
      mode = 'mobile'
      return
    }
    if (!mode) return
    const tokenMatch = trimmed.match(/`([^`]+)`/)
    if (tokenMatch) {
      if (mode === 'desktop') tokensDesktop.push(tokenMatch[1].trim())
      if (mode === 'mobile') tokensMobile.push(tokenMatch[1].trim())
    }
  })

  return {
    tokensDesktop: normalizeList(tokensDesktop),
    tokensMobile: normalizeList(tokensMobile)
  }
}

function normalizeIconCandidates(item) {
  const normalized = item
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/[.]+$/g, '')
    .trim()

  const lower = normalized.toLowerCase()
  if (ICON_LIBRARY_IGNORE_PREFIXES.some(prefix => lower.startsWith(prefix))) {
    return []
  }

  return normalized
    .split(/\s+or\s+|\/|,/)
    .map(part => part.trim())
    .filter(Boolean)
}

function parseIconLibraries(lines) {
  const libraries = []
  parseListItems(lines).forEach((item) => {
    const candidates = normalizeIconCandidates(item)
    candidates.forEach((candidate) => {
      const key = candidate.toLowerCase().trim()
      const mapped = ICON_LIBRARY_MAP.get(key)
      if (mapped) {
        libraries.push(mapped)
        return
      }
      const normalized = key.replace(/\s+icons?$/, '').trim()
      const fallback = ICON_LIBRARY_MAP.get(normalized)
      if (fallback) {
        libraries.push(fallback)
      }
    })
  })
  return normalizeList(libraries)
}

function parseKeywords(lines) {
  const text = lines.join(' ')
  if (!text) return []
  const afterLabel = text.replace(/^agent keywords\s*/i, '')
  return normalizeList(afterLabel.split(',').map(item => item.trim()))
}

function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

async function loadExistingStyleIds(outputDir) {
  const files = await glob('**/*.json', { cwd: outputDir, nodir: true })
  const styleIdMap = new Map()
  for (const rel of files) {
    const full = path.join(outputDir, rel)
    try {
      const raw = await fs.readFile(full, 'utf8')
      const parsed = JSON.parse(raw)
      const styleId = parsed?.styleId ? parsed.styleId.toString() : ''
      if (styleId) styleIdMap.set(styleId, rel)
    } catch (error) {
      console.warn(`⚠️ Could not read existing JSON: ${rel}`)
    }
  }
  return styleIdMap
}

async function main() {
  const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT_DIR
  const outputDir = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_DIR

  await fs.mkdir(outputDir, { recursive: true })
  const existingStyleIds = await loadExistingStyleIds(outputDir)

  const files = await glob('**/*.md', { cwd: inputDir, nodir: true })
  const filtered = files.filter(file => !file.toLowerCase().includes('index.md'))

  let created = 0
  let updated = 0

  for (const rel of filtered) {
    const full = path.join(inputDir, rel)
    const raw = await fs.readFile(full, 'utf8')
    const rawLines = raw.split('\n').map(line => line.trimEnd())

    const title = parseTitle(rawLines)
    const styleId = path.basename(rel, path.extname(rel))
    const existingRel = existingStyleIds.get(styleId)

    const sections = parseSections(rawLines)
    const definition = parseDefinition(sections.get('Definition') || [])
    const intentAndUse = parseIntent(sections.get('Intent and use') || [])
    const useCases = parseUseCases(intentAndUse)
    const palettes = parsePalettes(sections.get('Color palettes (examples)') || [])
    const rules = parseListItems(sections.get('Design rules') || [])
    const typographyFamilies = parseTypographyFamilies(sections.get('Typography (fonts available in Penpot)') || [])
    const typographyTokens = parseTypographyTokens(
      sections.get('Expanded typography tokens (system: Industrial / SaaS / Tech clean)') || []
    )
    const iconLibraries = parseIconLibraries(sections.get('Icon guidance (free sets)') || [])
    const layout = parseListItems(sections.get('Layout and components') || [])
    const imagery = parseListItems(sections.get('Illustration and imagery') || [])
    const accessibility = parseListItems(sections.get('Accessibility') || [])
    const keywords = parseKeywords(sections.get('Agent keywords') || [])

    const payload = {
      styleId,
      name: title || titleCaseFromSlug(styleId),
      definition,
      intentAndUse,
      useCases,
      palettes,
      rules,
      typography: {
        families: typographyFamilies,
        tokensDesktop: typographyTokens.tokensDesktop,
        tokensMobile: typographyTokens.tokensMobile
      },
      iconLibraries,
      layout,
      imagery,
      accessibility,
      keywords
    }

    const outputFile = existingRel
      ? path.join(outputDir, existingRel)
      : path.join(outputDir, `${styleId}.json`)
    await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`)
    if (existingRel) {
      updated += 1
    } else {
      created += 1
    }
  }

  console.log(`✅ Styles transformed. Created: ${created}, Updated: ${updated}`)
}

main().catch((error) => {
  console.error(`❌ ${error.message}`)
  process.exit(1)
})
