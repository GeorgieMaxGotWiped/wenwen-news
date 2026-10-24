"use client";

import { useEffect, useRef, useState } from "react";

const PLACEHOLDER =
  "支持 Markdown：\n## 小标题\n\n正文段落……\n\n> 引用\n\n- 列表\n\n![图片说明](图片链接)";

export default function MarkdownEditor({
  id,
  name,
  required,
  defaultValue = "",
  rows = 18,
  maxLength,
  placeholder = PLACEHOLDER,
  compact = false,
}: {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [html, setHtml] = useState("");
  const [rendering, setRendering] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const request = latest.current + 1;
    latest.current = request;
    if (!value.trim()) {
      setHtml("");
      setRendering(false);
      return;
    }
    setRendering(true);
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const { renderMarkdown } = await import("@/lib/markdown");
        const output = await renderMarkdown(value);
        if (alive && latest.current === request) {
          setHtml(output);
          setRendering(false);
        }
      } catch {
        if (alive && latest.current === request) setRendering(false);
      }
    }, 160);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className={compact ? "md-editor md-editor-compact" : "md-editor"}>
      <div className="md-editor-pane">
        <div className="md-editor-bar">
          <span>Markdown</span>
        </div>
        <textarea
          id={id}
          name={name}
          className="textarea md-editor-input"
          rows={rows}
          maxLength={maxLength}
          required={required}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div className="md-editor-pane">
        <div className="md-editor-bar">
          <span>预览</span>
          {rendering ? <span className="md-editor-state">渲染中…</span> : null}
        </div>
        {html ? (
          <div className="prose md-editor-preview" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="md-editor-preview">
            <p className="md-editor-empty">尚无内容</p>
          </div>
        )}
      </div>
    </div>
  );
}
