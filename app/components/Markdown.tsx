"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./CopyButton";

/**
 * react-markdown does not render raw HTML by default, so model/retrieved text
 * cannot inject markup. Links are forced to open safely.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children }) {
            const text = String(children).replace(/\n$/, "");
            const match = /language-([\w-]+)/.exec(className || "");
            if (!match && !text.includes("\n")) return <code className="inline-code">{children}</code>;
            return (
              <div className="code-block">
                <div className="code-block-header">
                  <span>{match?.[1] ?? "text"}</span>
                  <CopyButton text={text} label="Copy code" />
                </div>
                <pre tabIndex={0}>
                  <code>{text}</code>
                </pre>
              </div>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="table-wrap">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
