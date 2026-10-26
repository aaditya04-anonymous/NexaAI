import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";

interface MarkdownContentProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export function MarkdownContent({ content, className = "", isUser = false }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate safe parsed HTML with marked
  const parsedHtml = useMemo(() => {
    if (!content) return "";

    const renderer = new marked.Renderer();

    // Custom code block renderer with copy button & header
    renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
      const language = lang?.trim() || "code";
      const encodedCode = encodeURIComponent(text);
      const codeId = "code-" + Math.random().toString(36).substring(2, 9);

      return `
        <div class="nexa-code-container" data-block-id="${codeId}">
          <div class="nexa-code-header">
            <span class="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#9AA0A6]">
              <span class="inline-block w-2 h-2 rounded-full bg-[#383E44]"></span>
              ${language}
            </span>
            <button
              type="button"
              class="nexa-code-copy-btn"
              data-copy-code="${encodedCode}"
              data-code-id="${codeId}"
              title="Copy snippet"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <pre class="nexa-code-pre"><code class="language-${language}">${escapeHtml(text)}</code></pre>
        </div>
      `;
    };

    // Ensure links open safely in a new tab
    renderer.link = function ({ href, title, text }: { href: string; title?: string | null; text: string }) {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
    };

    try {
      return marked.parse(content, {
        renderer,
        breaks: true,
        gfm: true,
      }) as string;
    } catch {
      return escapeHtml(content);
    }
  }, [content]);

  // Handle delegated click for code copy buttons
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-copy-code]") as HTMLElement | null;
      if (!target) return;

      const code = target.getAttribute("data-copy-code");
      if (code) {
        navigator.clipboard.writeText(decodeURIComponent(code)).then(() => {
          const span = target.querySelector("span");
          if (span) span.textContent = "Copied!";
          setTimeout(() => {
            if (span) span.textContent = "Copy";
          }, 2000);
        });
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [parsedHtml]);

  if (isUser) {
    return (
      <div className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-white ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`nexa-markdown break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: parsedHtml }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
