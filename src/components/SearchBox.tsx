"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchIndexItem } from "@/lib/posts";

export default function SearchBox({ items }: { items: SearchIndexItem[] }) {
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!keyword) return [];
    return items
      .filter((item) =>
        `${item.title} ${item.author} ${item.categoryName} ${item.excerpt} ${item.text}`
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 50);
  }, [items, keyword]);

  return (
    <div className="search">
      <input
        className="search-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索标题、作者或正文"
        aria-label="搜索文章"
      />
      {keyword === "" ? (
        <p className="search-hint">输入关键词搜索站内文章。</p>
      ) : results.length === 0 ? (
        <p className="search-hint">没有找到相关内容。</p>
      ) : (
        <ol className="post-rows">
          {results.map((item) => (
            <li className="post-row" key={item.slug}>
              <Link className="post-row-link" href={`/posts/${item.slug}`}>
                <time className="post-row-date">{item.dateText}</time>
                <span className="post-row-body">
                  <span className="post-row-title">{item.title}</span>
                  <span className="post-row-excerpt">{item.excerpt}</span>
                </span>
                <span className="post-row-cat">{item.categoryName}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
