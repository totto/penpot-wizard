const config = {
  docsPath: '../MATERIAL/stylesRAGv3',
  docsPattern: '**/*.json',
  outputDir: './public',
  outputFilename: 'designRagToolContents.v2.zip',
  baseUrl: null,
  chunkGenerator: './styles_chunks_generator.v2.js',
  modelId: 'openai/text-embedding-3-large',
  vectorDimensions: 3072,
  batchSize: 64,
  persistFormat: 'json',
  search: {
    limit: 6,
    similarity: 0.3
  },
  testQueries: [
    {
      query: 'ai-driven design adaptive personalization dynamic layout',
      limit: 6,
      similarity: 0.3,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.pageId === 'ai-driven-design'
        })
      }
    },
    {
      query: 'icon libraries for ai-driven design',
      limit: 6,
      similarity: 0.5,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.pageId === 'ai-driven-design'
        })
      }
    },
    {
      query: 'fonts and color palettes for ai-driven design',
      limit: 6,
      similarity: 0.3,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.pageId === 'ai-driven-design'
        })
      }
    },
    {
      query: 'design styles suitable for a pizza delivery app',
      limit: 6,
      similarity: 0.3
    },
    {
      query: 'what design styles are available',
      limit: 10,
      similarity: 0.3
    }
  ]
}

export default config
