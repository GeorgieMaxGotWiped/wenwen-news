"use client";

import { useActionState } from "react";
import MarkdownEditor from "@/components/MarkdownEditor";
import { submitAction } from "@/lib/actions";
import type { Category } from "@/lib/categories";

type State = { error?: string };

export default function SubmitForm({
  categories,
  defaultAuthor,
}: {
  categories: Category[];
  defaultAuthor: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(submitAction, {});

  return (
    <form action={formAction} className="form">
      {state.error ? <p className="alert alert-error">{state.error}</p> : null}
      <div className="field">
        <label htmlFor="submit-title">标题</label>
        <input
          id="submit-title"
          className="input"
          type="text"
          name="title"
          maxLength={80}
          placeholder="例如：晚自习后的操场"
          required
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="submit-category">栏目</label>
          <select id="submit-category" className="select" name="category" defaultValue="campus">
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="submit-author">署名</label>
          <input
            id="submit-author"
            className="input"
            type="text"
            name="author"
            maxLength={24}
            defaultValue={defaultAuthor}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="submit-slug">URL 标识（可选）</label>
        <input
          id="submit-slug"
          className="input"
          type="text"
          name="slug"
          placeholder="拼音或英文，例如 wan-zixi-hou"
        />
        <span className="hint">留空也可以，编辑部发布时会自动生成。</span>
      </div>
      <div className="field">
        <label htmlFor="submit-excerpt">摘要（可选）</label>
        <textarea id="submit-excerpt" className="textarea textarea-sm" name="excerpt" maxLength={200} />
        <span className="hint">一句话简介，留空会自动截取正文开头。</span>
      </div>
      <div className="field">
        <label htmlFor="submit-cover">题图（可选，不超过 4MB）</label>
        <input id="submit-cover" className="input-file" type="file" name="cover" accept="image/*" />
      </div>
      <div className="field">
        <label htmlFor="submit-content">正文</label>
        <MarkdownEditor id="submit-content" name="content" required />
        <span className="hint">支持 Markdown 语法；投稿会先交给编辑部审核，通过后才会发布。</span>
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "提交中…" : "提交投稿"}
      </button>
    </form>
  );
}
