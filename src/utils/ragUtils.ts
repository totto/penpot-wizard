import { restore } from '@orama/plugin-data-persistence';
import { AnyOrama, search } from '@orama/orama';
import { $openaiApiKey, $selectedEmbeddingModel } from '@/stores/settingsStore';
import OpenAI from 'openai';

// Configuración de embeddings
const VEC_DIM = 1536;

/**
 * Genera embeddings para una consulta usando OpenAI
 */
async function getEmbedding(text: string): Promise<number[]> {
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
async function decompressGzip(compressedData: ArrayBuffer): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  // Escribir datos comprimidos
  writer.write(new Uint8Array(compressedData));
  writer.close();
  
  // Leer datos descomprimidos
  const chunks: Uint8Array[] = [];
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
export async function initializeDataBase(dbFile: string): Promise<AnyOrama> {
  try {
    console.log(`🔄 Initializing RAG database from ${dbFile}...`);
    
    // Cargar el archivo ZIP comprimido desde la carpeta public
    const response = await fetch(`/${dbFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load embeddings file: ${response.status}`);
    }
    
    const compressedData = await response.arrayBuffer();
    
    // Descomprimir los datos
    const decompressedData = await decompressGzip(compressedData);
    const persistData = JSON.parse(decompressedData);
    
    // Restaurar la base de datos Orama
    const dbInstance = await restore('binary', persistData);
    
    console.log(`✅ RAG database initialized successfully from ${dbFile}`);
    return dbInstance;
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw new Error(`Failed to initialize database from ${dbFile}`);
  }
}

/**
 * Realiza una búsqueda vectorial en la base de datos
 */
export async function searchDataBase(query: string, limit: number = 10, dbInstance: any): Promise<any[]> {
  try {
    if (!dbInstance) {
      throw new Error('Database instance not initialized');
    }
    
    // Generar embedding para la consulta
    const queryEmbedding = await getEmbedding(query);
    
    // Realizar búsqueda vectorial
    const results = await search(dbInstance, {
      mode: 'vector',
      vector: {
        value: queryEmbedding,
        property: 'embedding'
      },
      term: query,
      limit
    });

    console.log('Results:', results);
    return results.hits.map(hit => ({
      id: hit.document.id,
      heading: hit.document.heading,
      summary: hit.document.summary,
      text: hit.document.text,
      url: hit.document.url,
      sourcePath: hit.document.sourcePath,
      breadcrumbs: JSON.parse(hit.document.breadcrumbs || '[]'),
      score: hit.score,
      hasCode: hit.document.hasCode,
      codeLangs: JSON.parse(hit.document.codeLangs || '[]')
    }));
    
  } catch (error) {
    console.error('Error searching database:', error);
    throw new Error('Failed to search database');
  }
}
