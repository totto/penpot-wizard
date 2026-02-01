import { restore } from '@orama/plugin-data-persistence';
import { search } from '@orama/orama';

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const dbCacheV2 = new Map();
const dbPromiseV2 = new Map();

async function decompressGzip(compressedData) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  writer.write(new Uint8Array(compressedData));
  writer.close();

  const chunks = [];
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      chunks.push(value);
    }
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function isLikelyJson(bytes) {
  if (!bytes || !bytes.length) return false;
  const first = bytes.find((b) => b !== 0x20 && b !== 0x0a && b !== 0x0d && b !== 0x09);
  return first === 0x7b || first === 0x5b;
}

function isLikelyHex(bytes, sampleSize = 4096) {
  const len = Math.min(bytes.length, sampleSize);
  if (!len) return false;
  for (let i = 0; i < len; i += 1) {
    const c = bytes[i];
    const isHex = (c >= 48 && c <= 57) || (c >= 97 && c <= 102);
    const isWhitespace = c === 10 || c === 13 || c === 9 || c === 32;
    if (!isHex && !isWhitespace) return false;
  }
  return true;
}

export async function initializeDataBaseV2(dbFile) {
  if (dbCacheV2.has(dbFile)) return dbCacheV2.get(dbFile);
  if (dbPromiseV2.has(dbFile)) return dbPromiseV2.get(dbFile);

  const promise = (async () => {
    try {
      const response = await fetch(`/${dbFile}`);

      if (!response.ok) {
        throw new Error(`Failed to load embeddings file: ${response.status}`);
      }

      const compressedData = await response.arrayBuffer();
      const decompressedBytes = await decompressGzip(compressedData);

      let dbInstance;
      if (isLikelyJson(decompressedBytes)) {
        const jsonText = new TextDecoder().decode(decompressedBytes);
        dbInstance = await restore('json', jsonText);
      } else if (isLikelyHex(decompressedBytes)) {
        const hexText = new TextDecoder().decode(decompressedBytes);
        dbInstance = await restore('binary', hexText);
      } else {
        try {
          dbInstance = await restore('dpack', decompressedBytes);
        } catch (_error) {
          dbInstance = await restore('seqproto', decompressedBytes);
        }
      }

      console.log('🔍 Database initialized successfully', dbFile);
      dbCacheV2.set(dbFile, dbInstance);
      dbPromiseV2.delete(dbFile);
      return dbInstance;
    } catch (error) {
      dbPromiseV2.delete(dbFile);
      console.error('❌ Error initializing database:', error);
      throw new Error(`Failed to initialize database from ${dbFile}`);
    }
  })();

  dbPromiseV2.set(dbFile, promise);
  return promise;
}

async function getQueryEmbedding(query, apiKey, modelId) {
  if (!apiKey) {
    throw new Error('Missing OpenRouter API key');
  }

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      input: query
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter embeddings error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('Invalid embedding response from OpenRouter');
  }
  return embedding;
}

export async function searchDataBaseV2(query, options) {
  const {
    limit = 8,
    similarity = 0.35,
    dbInstance,
    apiKey,
    modelId
  } = options || {};

  if (!dbInstance) {
    throw new Error('Database instance not initialized');
  }

  const vector = await getQueryEmbedding(query, apiKey, modelId);
  const results = await search(dbInstance, {
    mode: 'vector',
    vector: {
      value: vector,
      property: 'embedding'
    },
    limit,
    similarity
  });

  return results.hits.map(hit => ({
    id: hit.document.id,
    text: hit.document.text,
    url: hit.document.url,
    score: hit.score
  }));
}
