import type { Metadata } from "next";
import SearchBox from "@/components/SearchBox";
import { getSearchIndex } from "@/lib/posts";

export const metadata: Metadata = {
  title: "搜索",
};

export default function SearchPage() {
  const items = getSearchIndex();

  return (
    <div className="section-page">
      <h1 className="section-title">搜索</h1>
      <SearchBox items={items} />
    </div>
  );
}
