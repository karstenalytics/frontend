/**
 * Copies index.x.md files from article directories to static/x-articles/<slug>.md
 * so they can be fetched at runtime by the XArticleView component.
 *
 * Run automatically via prestart/prebuild npm scripts.
 */
import {readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const articlesDir = join(root, 'articles');
const outDir = join(root, 'static', 'x-articles');

mkdirSync(outDir, {recursive: true});

let copied = 0;
for (const entry of readdirSync(articlesDir)) {
  const xPath = join(articlesDir, entry, 'index.x.md');
  if (!existsSync(xPath)) continue;

  // Strip date prefix: "2026-02-12-how-flash-trade-fees" -> "how-flash-trade-fees"
  const slug = entry.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  writeFileSync(join(outDir, `${slug}.md`), readFileSync(xPath, 'utf-8'));
  copied++;
}

console.log(`Copied ${copied} x-article(s) to static/x-articles/`);
