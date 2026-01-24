import { restore } from '@orama/plugin-data-persistence';
import { search } from '@orama/orama';
import { pluginEmbeddings } from '@orama/plugin-embeddings';
import '@tensorflow/tfjs-backend-webgl';
import { $openaiApiKey, $selectedEmbeddingModel } from '@/stores/settingsStore';
import OpenAI from 'openai';

// Configuración de embeddings
const VEC_DIM = 1536;

/**
 * Genera embeddings para una consulta usando OpenAI
 */
async function getEmbedding(text) {
  const input = text.replace(/\s+/g, ' ').trim();
  if (!input) return new Array(VEC_DIM).fill(0);
  
  try {
    const openai = new OpenAI({ apiKey: $openaiApiKey.get(), dangerouslyAllowBrowser: true });
    const response = await openai.embeddings.create({
      model: $selectedEmbeddingModel.get(),
      encoding_format: "float",
      input
    });
    
    const embedding = response.data[0].embedding;
    if (!embedding) throw new Error('No embedding returned');
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding for query');
  }
}

/**
 * Descomprime datos gzip
 */
async function decompressGzip(compressedData) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  // Escribir datos comprimidos
  writer.write(new Uint8Array(compressedData));
  writer.close();
  
  // Leer datos descomprimidos
  const chunks = [];
  let done = false;
  
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      chunks.push(value);
    }
  }
  
  // Combinar chunks y convertir a string
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new TextDecoder().decode(result);
}

/**
 * Inicializa la base de datos Orama desde el archivo ZIP comprimido
 */
export async function initializeDataBase(dbFile, embeds = 'openai') {
  try {    
    const response = await fetch(`/${dbFile}`);

    if (!response.ok) {
      throw new Error(`Failed to load embeddings file: ${response.status}`);
    }
    
    const compressedData = await response.arrayBuffer();
    const decompressedData = await decompressGzip(compressedData);
    const persistData = JSON.parse(decompressedData);
    
    const dbInstance = await restore('binary', persistData);
    
    if (embeds === 'orama') {
      const embeddingsPlugin = await pluginEmbeddings({
        embeddings: {
          defaultProperty: 'embedding',
          onInsert: {
            generate: false,
            properties: ['text'],
            verbose: false,
          }
        }
      });

      // Wrap hooks so Orama always awaits them (some builds strip AsyncFunction)
      if (typeof embeddingsPlugin.beforeSearch === 'function') {
        dbInstance.beforeSearch.push(async (...args) => embeddingsPlugin.beforeSearch(...args));
      }
      if (typeof embeddingsPlugin.beforeInsert === 'function') {
        dbInstance.beforeInsert.push(async (...args) => embeddingsPlugin.beforeInsert(...args));
      }
    }
    
    console.log('🔍 Database initialized successfully', dbFile);
    return dbInstance;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw new Error(`Failed to initialize database from ${dbFile}`);
  }
}

/**
 * Realiza una búsqueda vectorial en la base de datos
 */
export async function searchDataBase(query, limit = 10, dbInstance, embeds = 'openai') {
  try {
    if (!dbInstance) {
      throw new Error('Database instance not initialized');
    }
    
    let results;

    if (embeds === 'orama') {
      results = await search(dbInstance, {
        mode: 'hybrid',
        term: query,
        limit,
        similarity: 0.85
      });
    } else {
      // Generar embedding para la consulta
      const queryEmbedding = await getEmbedding(query);
      
      // Realizar búsqueda vectorial
      results = await search(dbInstance, {
        mode: 'vector',
        vector: {
          value: queryEmbedding,
          property: 'embedding'
        },
        term: query,
        limit
      });
    }

    return results.hits.map(hit => ({
      id: hit.document.id,
      text: hit.document.text,
      url: hit.document.url,
      score: hit.score,
    }));
    
  } catch (error) {
    console.error('Error searching database:', error);
    throw new Error('Failed to search database');
  }
}

