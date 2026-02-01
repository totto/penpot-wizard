import { z } from 'zod';

export const ragToolsV2 = [
  {
    id: 'icons-rag',
    name: 'IconsRagTool',
    ragContentFile: 'iconsRagToolContents.v3.zip',
    getRagContentFile: ({ libraryId }) => `icons.${libraryId}.zip`,
    modelId: 'openai/text-embedding-3-large',
    limit: 8,
    similarity: 0.35,
    inputSchema: z.object({
      query: z.string().min(1).describe('Icon query. Include keywords and optional style.'),
      libraryId: z.enum([
        'boxicons',
        'circum',
        'flowbite',
        'heroicons',
        'iconoir',
        'ionicons',
        'lineicons',
        'lucide',
        'mingcute',
        'phosphor',
        'tabler'
      ]).describe('Library to search (required).')
    }),
    description: `
      Search a specific icon library by keyword and optional style.
      Always provide libraryId. If you need multiple libraries, run multiple queries.

      Available libraries:
      - boxicons
      - circum
      - flowbite
      - heroicons
      - iconoir
      - ionicons
      - lineicons
      - lucide
      - mingcute
      - phosphor
      - tabler

      Query format: "<keyword> [style]"
      Examples:
      - query: "calendar solid", libraryId: "boxicons"
      - query: "log out solid", libraryId: "boxicons"
    `
  },
  {
    id: 'design-styles-rag',
    name: 'DesignStylesRagTool',
    ragContentFile: 'designRagToolContents.v2.zip',
    modelId: 'openai/text-embedding-3-large',
    limit: 6,
    similarity: 0.3,
    description: `
      Use this tool to browse the design styles catalog or request
      specific guidance for a single style.

      CATALOG QUERY:
      - Use when the agent needs a list of all styles.
      - Example: "what design styles are available"

      STYLE-SPECIFIC QUERIES:
      - Format: "<style name> + <chunk name>"
      - Chunk names and content:
        - intent: definition + intentAndUse + keywords
        - palettes: color palettes and example colors
        - rules: design rules/principles
        - typography: font families and type guidance
        - layout: layout and component structure
        - accessibility: accessibility considerations
        - icon-libraries: recommended icon sets (ids from iconsRAGv3)
        - imagery: illustration and imagery guidance

      Examples:
      - "ai-driven design intent"
      - "art-deco design palettes"
      - "glassmorphism design icon-libraries"
    `
  }
];
