import React, {useEffect, useState, useRef, type ReactNode} from 'react';
import styles from './styles.module.css';

/** Minimal markdown-to-HTML converter for X Article preview. */
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let i = 0;

  function closePendingList() {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  }

  function inlineFormat(text: string): string {
    return text
      // links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      // bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // image placeholders
      .replace(/\[IMAGE:\s*(.+?)\]/g, '<span class="' + styles.imagePlaceholder + '">IMAGE: $1</span>');
  }

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      closePendingList();
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      closePendingList();
      const level = headingMatch[1].length;
      const tag = `h${level}`;
      html.push(`<${tag}>${inlineFormat(headingMatch[2])}</${tag}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      closePendingList();
      html.push('<hr/>');
      i++;
      continue;
    }

    // Unordered list item
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closePendingList();
        html.push('<ul>');
        inList = 'ul';
      }
      html.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      i++;
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      if (inList !== 'ol') {
        closePendingList();
        html.push('<ol>');
        inList = 'ol';
      }
      html.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-blank, non-special lines)
    closePendingList();
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !/^\s*[-*]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    html.push(`<p>${inlineFormat(paraLines.join(' '))}</p>`);
    continue;
  }

  closePendingList();
  return html.join('\n');
}

async function copyRichText(el: HTMLElement): Promise<boolean> {
  try {
    const html = el.innerHTML;
    const blob = new Blob([html], {type: 'text/html'});
    const textBlob = new Blob([el.innerText], {type: 'text/plain'});
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      }),
    ]);
    return true;
  } catch {
    // Fallback: select text for manual copy
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return false;
  }
}

interface Props {
  slug: string;
  originalUrl: string;
}

export default function XArticleView({slug, originalUrl}: Props): ReactNode {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/x-articles/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error(`No X Article version found (${r.status})`);
        return r.text();
      })
      .then(setMarkdown)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>
          {error}. <a href={originalUrl}>Back to article</a>
        </p>
      </div>
    );
  }

  if (markdown === null) {
    return (
      <div className={styles.container}>
        <p>Loading X Article version...</p>
      </div>
    );
  }

  const renderedHtml = renderMarkdown(markdown);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <a href={originalUrl} className={styles.backLink}>
          Back to article
        </a>
        <div className={styles.actions}>
          <button
            className={styles.copyBtn}
            onClick={async () => {
              if (contentRef.current) {
                const ok = await copyRichText(contentRef.current);
                setCopied(true);
                if (!ok) return; // text selected for manual copy
                setTimeout(() => setCopied(false), 2000);
              }
            }}>
            {copied ? 'Copied!' : 'Copy rich text'}
          </button>
          <button
            className={styles.copyBtn}
            onClick={async () => {
              await navigator.clipboard.writeText(markdown);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}>
            {copied ? 'Copied!' : 'Copy markdown'}
          </button>
        </div>
      </div>
      <div className={styles.label}>X Article version -- paste into the X Article editor</div>
      <div
        ref={contentRef}
        className={styles.content}
        dangerouslySetInnerHTML={{__html: renderedHtml}}
      />
    </div>
  );
}
