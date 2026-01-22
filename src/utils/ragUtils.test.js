import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { search } from '@orama/orama'
import { ReadableStream, WritableStream } from 'node:stream/web'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'
import { initializeDataBase } from './ragUtils'

function createDecompressionStream() {
  let controller
  const chunks = []
  const readable = new ReadableStream({
    start(c) {
      controller = c
    }
  })
  const writable = new WritableStream({
    write(chunk) {
      chunks.push(Buffer.from(chunk))
    },
    close() {
      const compressed = Buffer.concat(chunks)
      const decompressed = gunzipSync(compressed)
      controller.enqueue(new Uint8Array(decompressed))
      controller.close()
    }
  })

  return { readable, writable }
}

class MockDecompressionStream {
  constructor(format) {
    if (format !== 'gzip') {
      throw new Error(`Unsupported compression format: ${format}`)
    }
    const { readable, writable } = createDecompressionStream()
    this.readable = readable
    this.writable = writable
  }
}

describe('initializeDataBase', () => {
  beforeAll(() => {
    if (!globalThis.DecompressionStream) {
      globalThis.DecompressionStream = MockDecompressionStream
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores Orama database from generated file', async () => {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const dbFilePath = path.resolve(__dirname, '..', '..', 'public', 'penpotRagToolContents.zip')
    const fileBuffer = await fs.readFile(dbFilePath)

    global.fetch = vi.fn(async () => new Response(fileBuffer, { status: 200 }))

    const db = await initializeDataBase('penpotRagToolContents.zip')
    expect(db).toBeTruthy()

    const results = await search(db, { term: 'Penpot', limit: 1 })
    expect(results.count).toBeGreaterThan(0)
  })
})
