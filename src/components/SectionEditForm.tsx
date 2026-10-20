"use client";

import { useFormStatus } from "react-dom";
import { updatePostCategoryAction } from "@/lib/actions";
import type { Category } from "@/lib/categories";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
      {pending ? "保存中…" : "保存分区"}
    </button>
  );
}

export default function SectionEditForm({
  slug,
  title,
  category,
  categories,
}: {
  slug: string;
  title: string;
  category: string;
  categories: Category[];
}) {
  return (
    <form action={updatePostCategoryAction} className="section-edit-form">
      <input type="hidden" name="slug" value={slug} />
      <select className="select" name="category" defaultValue={category} aria-label={`修改《${title}》的分区`}>
        {categories.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>
      <SaveButton />
    </form>
  );
}
