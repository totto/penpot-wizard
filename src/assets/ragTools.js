export const ragTools = [
  {
    id: "penpot-user-guide-rag",
    name: "PenpotUserGuideRagTool",
    ragContentFile: 'penpotRagToolContents.zip',
    embeds: 'orama',
    description: `
      Use this tool to search the Penpot user guide and documentation. This tool can find specific information about Penpot features, components, and usage instructions.

      IMPORTANT: All queries to this tool must be in English.

      QUERY CONSTRUCTION RULES:
      - ALWAYS expand user queries with specific Penpot technical terms
      - Include multiple relevant concepts from the available list below
      - Use the format: "[user intent] + [specific tool] + [method] + [technical terms]"
      - Never use generic queries - always include Penpot-specific terminology

      QUERY TRANSFORMATION EXAMPLES:
      ❌ Bad: "how to draw triangle"
      ✅ Good: "how to draw triangle using path tool bezier curves nodes vector shapes"

      ❌ Bad: "create button"  
      ✅ Good: "how to create button component rectangle styling flex layout"

      ❌ Bad: "center elements"
      ✅ Good: "how to align center distribute layers flex layout grid positioning"

      MANDATORY TECHNICAL TERMS TO INCLUDE:
      - For shapes: "path tool", "bezier", "nodes", "vector shapes", "boolean operations"
      - For design: "components", "layers", "styling", "flex layout", "grid layout"
      - For interactions: "prototyping", "triggers", "actions", "flows", "overlays"

      Available concepts in the Penpot user-guide:

      **Core Objects & Tools:**
      - Boards: Containers for designs, can be resized, clipped, used as screens
      - Rectangles & Ellipses: Basic geometric shapes (shortcuts: R, E)
      - Text: Text layers with typography options, alignment, sizing
      - Paths (Bezier): Vector paths with nodes, curves, editing capabilities (shortcut: P), valid to draw complex shapes like stars, polygons, etc.
      - Curves (Freehand): Freehand drawing tool (shortcut: Shift+C)
      - Images: Import, aspect ratio control, positioning

      **Layer Management:**
      - Pages: Organize layers into separate sections
      - Layers Panel: View, select, hide, lock layers
      - Groups: Combine layers for simultaneous operations
      - Masks: Clipping layers to show only parts of other layers
      - Boolean Operations: Union, difference, intersection, exclusion, flatten
      - Constraints: Control how layers behave when resizing containers

      **Styling & Visual Effects:**
      - Color Fills: Custom colors, gradients (linear/radial), images, opacity
      - Strokes: Color, width, position, style (solid/dotted/dashed), caps/arrows
      - Border Radius: Customize rectangle/image corners
      - Shadows: Drop/inner shadows with position, blur, spread
      - Blur: Apply blur effects to objects
      - Blend Modes: Normal, multiply, screen, overlay, etc.
      - Opacity: Overall layer transparency

      **Layouts & Positioning:**
      - Flex Layout: CSS Flexbox-based flexible layouts
      - Grid Layout: CSS Grid-based 2D layouts with rows/columns
      - Alignment: Align and distribute layers
      - Positioning: Static, absolute positioning
      - Z-index: Layer stacking order

      **Components & Libraries:**
      - Components: Reusable objects with main/copy relationships
      - Component Variants: Group similar components with properties
      - Asset Libraries: Store components, colors, typography
      - Shared Libraries: Publish and connect libraries across files

      **Prototyping & Interactions:**
      - Prototype Mode: Connect boards for interactive prototypes
      - Triggers: On click, mouse enter/leave, after delay
      - Actions: Navigate, open/toggle/close overlays, previous screen, open URL
      - Animations: Dissolve, slide, push transitions
      - Flows: Multiple starting points for different user journeys

      **Advanced Features:**
      - Custom Fonts: Install and use custom typography
      - Design Tokens: Manage consistent design values
      - Exporting: Export designs in various formats
      - Inspect Mode: Get CSS properties and code
      - View Mode: Present and share prototypes
      - Teams: Collaborative features

      REMEMBER: Penpot doesn't have specific tools for every shape. Always search for alternative methods using existing tools like Path tool, Boolean operations, or combining basic shapes.
    `,
  },
  {
    id: "design-styles-rag",
    name: "DesignStylesRagTool",
    ragContentFile: 'designRagToolContents.zip',
    embeds: 'orama',
    description: `
      Use this tool to decide and justify visual styles for design tasks. It searches a curated styles library with definitions, palettes, rules, and fonts. Use it to pick a style direction, compare alternatives, or extract concrete guidance (colors, typography, composition).

      IMPORTANT: All queries to this tool must be in English.

      STYLE FAMILIES (from the index):
      1) Sensory / Tactile / Human:
         - Tactile Maximalism / Squishy‑uishy UI
         - Imperfect by Design / Human Touch
         - Anti‑AI Crafting
      2) Natural / Organic / Warm:
         - Organic Minimalism
      3) Industrial / Tech / Metallic:
         - Ultra‑Clean Industrial
         - Pure Steel
      4) Vintage / Heritage / Editorial:
         - Apothecary Aesthetic
         - Heritage Etch
         - Alt‑History
         - Imprinted
         - Narrative Pop
      5) Excess / Contrast / Expressive:
         - New Maximalism
         - Minimalist Maximalism
         - Neobrutalism
      6) Translucent / Depth / Premium Digital:
         - Glassmorphism
      7) Typography in Motion:
         - Kinetic / Expressive Typography
      8) Systems / Experience / Personalization:
         - Multi‑Device UX / Fluid Continuity
         - AI‑Driven Design / Extreme Personalization
      9) Classic / Timeless / Modernist:
         - Swiss Style (International Typographic Style)
         - Bauhaus
         - Art Deco
         - Classic Minimalism

      QUERY CONSTRUCTION RULES:
      - Always include the style family or exact style name
      - Add the product context and intent (e.g., fintech dashboard, wellness app, brand refresh)
      - Include at least two concrete attributes: palette, typography, layout density, texture/materiality, motion, or tone
      - Use the format: "[style] + [context] + [attributes] + [desired outcome]"

      QUERY EXAMPLES:
      ✅ "Tactile Maximalism for playful commerce app, soft gradients, rounded UI, bouncy motion, warm palette, friendly tone"
      ✅ "Ultra‑Clean Industrial for B2B SaaS dashboard, cool gray palette, tight grid, minimalist type, precision"
      ✅ "Apothecary Aesthetic for wellness brand packaging, botanical motifs, serif typography, muted greens, editorial layout"
    `,
  },
  {
    id: "icons-rag",
    name: "IconsRagTool",
    ragContentFile: 'iconsRagToolContents.zip',
    embeds: 'orama',
    description: `
      Use this tool to search the icon library catalog by library, style, and tags.
      It indexes per-library docs with icon names and tags so you can find icons like "close", "delete", or "settings".

      IMPORTANT: All queries to this tool must be in English.

      QUERY CONSTRUCTION RULES:
      - Always include library name (e.g., heroicons, tabler, lineicons, boxicons, flowbite, circum)
      - Include style (outline, solid, filled, regular, logos) when relevant
      - Include 1-3 semantic tags (close, delete, add, search, settings, user, etc.)
      - Use the format: "[library] + [style] + [tags]"

      QUERY EXAMPLES:
      ✅ "tabler outline close delete"
      ✅ "heroicons solid close cancel"
      ✅ "flowbite outline settings gear"
    `,
  }
];

