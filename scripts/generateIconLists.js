/**
 * Generates .txt icon lists from iconsRAGv3 JSON files.
 * Each file: {libraryId}-{styleId}.txt with comma-separated icon names (no spaces).
 * Output: public/icon-lists/
 *
 * Run from penpot-wizard: node scripts/generateIconLists.js
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_RAG_PATH = join(__dirname, '../../MATERIAL/iconsRAGv3');
const OUTPUT_PATH = join(__dirname, '../public/icon-lists');

async function generateIconLists() {
  const files = await readdir(ICONS_RAG_PATH);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  await mkdir(OUTPUT_PATH, { recursive: true });

  let totalFiles = 0;
  for (const file of jsonFiles) {
    const libraryId = file.replace(/\.json$/, '');
    const filePath = join(ICONS_RAG_PATH, file);
    const content = JSON.parse(await readFile(filePath, 'utf-8'));
    const icons = content.icons || [];

    // Group icon names by styleId
    const byStyle = new Map();
    for (const icon of icons) {
      const styles = icon.styles || [];
      for (const styleId of styles) {
        if (!byStyle.has(styleId)) {
          byStyle.set(styleId, []);
        }
        byStyle.get(styleId).push(icon.name);
      }
    }

    for (const [styleId, names] of byStyle) {
      const filename = `${libraryId}-${styleId}.txt`;
      const content = names.sort().join(',');
      const outPath = join(OUTPUT_PATH, filename);
      await writeFile(outPath, content, 'utf-8');
      console.log(`  ${filename} (${names.length} icons)`);
      totalFiles++;
    }
  }

  console.log(`\nGenerated ${totalFiles} files in public/icon-lists/`);
}

generateIconLists().catch((err) => {
  console.error(err);
  process.exit(1);
});
