/**
 * Generate OG preview images for chart pages.
 *
 * Uses Playwright to visit each built chart page, execute the same export
 * logic as ShareButton.exportChartWithBranding(), and save the resulting
 * PNGs into build/img/og/.
 *
 * Usage:
 *   node scripts/generate-og-images.mjs
 *
 * Prerequisites:
 *   - `npm run build` must have been run first
 *   - Playwright chromium: `npx playwright install chromium`
 */

import { createServer } from 'http';
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, extname, resolve } from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const BUILD_DIR = join(ROOT, 'build');
const OG_DIR = join(BUILD_DIR, 'img', 'og');
const DOCS_DIR = join(ROOT, 'docs', 'analysis');
const PLOTLY_JS = join(ROOT, 'node_modules', 'plotly.js-dist-min', 'plotly.min.js');

/** Parse flat YAML frontmatter from MDX content (no external dependency). */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w[\w_]*)\s*:\s*"?(.+?)"?\s*$/);
    if (m) fm[m[1]] = m[2];
  }
  return fm;
}

/**
 * Auto-discover chart pages by scanning MDX frontmatter.
 * Pages with chart_type in frontmatter are included.
 */
function discoverChartPages() {
  const pages = [];

  function walk(dir, segments) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), [...segments, entry.name]);
      } else if (entry.name.endsWith('.mdx')) {
        const content = readFileSync(join(dir, entry.name), 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm.chart_type) continue;

        const baseName = entry.name.replace('.mdx', '');
        const pathSegments = [...segments, baseName];
        const urlPath = '/analysis/' + pathSegments.join('/');
        const slug = pathSegments.join('-');

        pages.push({
          path: urlPath,
          slug,
          title: fm.title || baseName,
          description: fm.description || '',
        });
      }
    }
  }

  walk(DOCS_DIR, []);
  return pages;
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.gz': 'application/gzip',
};

/** Serve build/ directory on a random port */
function startServer() {
  return new Promise((res) => {
    const server = createServer((req, resp) => {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = join(BUILD_DIR, urlPath);

      // Directory -> index.html
      if (!extname(filePath)) {
        filePath = join(filePath, 'index.html');
      }

      try {
        const data = readFileSync(filePath);
        const ext = extname(filePath);
        resp.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        });
        resp.end(data);
      } catch {
        resp.writeHead(404);
        resp.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      res({ server, port });
    });
  });
}

/**
 * Export a chart using the same logic as ShareButton.exportChartWithBranding().
 * Runs inside page.evaluate() in the browser context.
 */
async function exportChartInBrowser(page, chartTitle, pagePath) {
  return page.evaluate(
    async ({ chartTitle, pagePath }) => {
      const plotlyDiv = document.querySelector('.js-plotly-plot');
      if (!plotlyDiv) return null;

      // Plotly is available globally in the built page
      const Plotly = window.Plotly;
      if (!Plotly) return null;

      const gd = plotlyDiv;
      const fl = gd._fullLayout || {};

      // Snapshot original layout
      const orig = {
        'margin.t': fl.margin?.t ?? null,
        'margin.b': fl.margin?.b ?? null,
        'margin.r': fl.margin?.r ?? null,
        'legend.orientation': fl.legend?.orientation ?? null,
        'legend.x': fl.legend?.x ?? null,
        'legend.xanchor': fl.legend?.xanchor ?? null,
        'legend.y': fl.legend?.y ?? null,
        'legend.yanchor': fl.legend?.yanchor ?? null,
        'legend.font.size': fl.legend?.font?.size ?? null,
      };

      // Hide legendonly traces
      const hiddenIndices = [];
      (gd.data || []).forEach((trace, i) => {
        if (trace.visible === 'legendonly') hiddenIndices.push(i);
      });
      if (hiddenIndices.length > 0) {
        await Plotly.restyle(plotlyDiv, {
          visible: Array(hiddenIndices.length).fill(false),
        }, hiddenIndices);
      }

      // Force export layout
      const titleHeight = 36;
      await Plotly.relayout(plotlyDiv, {
        'margin.t': titleHeight,
        'margin.b': 80,
        'margin.r': 24,
        'legend.orientation': 'h',
        'legend.x': 0.5,
        'legend.xanchor': 'center',
        'legend.y': -0.15,
        'legend.yanchor': 'top',
        'legend.font.size': 10,
      });

      const imgData = await Plotly.toImage(plotlyDiv, {
        format: 'png',
        width: 1200,
        height: 675 - titleHeight,
      });

      // Restore layout
      if (hiddenIndices.length > 0) {
        await Plotly.restyle(plotlyDiv, {
          visible: Array(hiddenIndices.length).fill('legendonly'),
        }, hiddenIndices);
      }
      await Plotly.relayout(plotlyDiv, orig);

      // Canvas compositing (light mode for social previews)
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // White background (light mode)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 675);

      // Draw chart
      const chartImg = new Image();
      await new Promise((resolve, reject) => {
        chartImg.onload = resolve;
        chartImg.onerror = reject;
        chartImg.src = imgData;
      });
      ctx.drawImage(chartImg, 0, titleHeight);

      // Watermark
      try {
        const logo = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('logo load failed'));
          img.src = '/img/logo.png';
        });
        const targetWidth = 1000;
        const aspect = logo.naturalHeight / logo.naturalWidth;
        const targetHeight = targetWidth * aspect;
        ctx.globalAlpha = 0.08;
        ctx.drawImage(
          logo,
          (1200 - targetWidth) / 2,
          (675 - targetHeight) / 2,
          targetWidth,
          targetHeight,
        );
        ctx.globalAlpha = 1.0;
      } catch {
        // Continue without logo
      }

      // Title with protocol prefix
      const protocol = pagePath.includes('/flash-trade/') ? 'Flash.Trade'
        : pagePath.includes('/defituna/') ? 'DefiTuna'
        : pagePath.includes('/solstice/') ? 'Solstice'
        : '';
      const exportTitle = protocol ? `${protocol}: ${chartTitle}` : chartTitle;
      ctx.fillStyle = '#1b1b1d';
      ctx.font = 'bold 20px Inter, Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(exportTitle, 16, 28);

      // Return base64 PNG
      return canvas.toDataURL('image/png').split(',')[1];
    },
    { chartTitle, pagePath },
  );
}

async function main() {
  if (!existsSync(BUILD_DIR)) {
    console.error('Error: build/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const pages = discoverChartPages();
  console.log(`Generating OG images for ${pages.length} chart pages...`);

  mkdirSync(OG_DIR, { recursive: true });

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Static server running at ${baseUrl}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  let success = 0;
  let skipped = 0;

  for (const entry of pages) {
    const { path: pagePath, slug, title } = entry;
    const url = `${baseUrl}${pagePath}`;
    const outFile = join(OG_DIR, `${slug}.png`);

    process.stdout.write(`  ${slug}... `);

    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForSelector('.js-plotly-plot', { timeout: 15000 });

      // Inject Plotly UMD bundle so window.Plotly is available in page.evaluate
      await page.addScriptTag({ path: PLOTLY_JS });
      await page.waitForFunction(() => window.Plotly, { timeout: 5000 });

      // Small delay for chart data to fully render
      await page.waitForTimeout(1000);

      const base64Png = await exportChartInBrowser(page, title, pagePath);
      if (base64Png) {
        writeFileSync(outFile, Buffer.from(base64Png, 'base64'));
        console.log('OK');
        success++;
      } else {
        console.log('SKIP (no chart found)');
        skipped++;
      }
    } catch (err) {
      console.log(`SKIP (${err.message.slice(0, 60)})`);
      skipped++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\nDone: ${success} generated, ${skipped} skipped`);
  if (skipped > 0) {
    console.log('Skipped pages will fall back to the default og-preview.png');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
