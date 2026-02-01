const config = {
  docsPath: '../MATERIAL/iconsRAGv3',
  docsPattern: '**/tabler.json',
  outputDir: './public',
  outputFilename: 'icons.tabler.zip',
  baseUrl: null,
  chunkGenerator: './icons_chunks_generator.v3.js',
  modelId: 'openai/text-embedding-3-large',
  vectorDimensions: 3072,
  batchSize: 64,
  persistFormat: 'binary',
  search: {
    limit: 8,
    similarity: 0.2
  },
  testQueries: [
    {
      query: 'close icon solid',
      limit: 8,
      similarity: 0.2,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.text.includes('bxs-log-out') && doc.text.includes('solid')
        })
      }
    },
    {
      query: 'calendar regular',
      limit: 8,
      similarity: 0.2,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.text.includes('calendar') && doc.text.includes('regular')
        })
      }
    },
    {
      query: 'twitter logo',
      limit: 8,
      similarity: 0.2,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.text.includes('twitter')
        })
      }
    },
    {
      query: 'almanac solid',
      limit: 8,
      similarity: 0.2,
      check: (results) => {
        const hits = results?.hits || []
        return hits.some((hit) => {
          const doc = hit.document || {}
          return doc.text.includes('calendar') && doc.text.includes('solid')
        })
      }
    },
  ]
}

export default config
