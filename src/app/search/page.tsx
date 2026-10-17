import type { Metadata } from "next";
import PageArt from "@/components/PageArt";
import SearchBox from "@/components/SearchBox";
import { getSearchIndex } from "@/lib/posts";

export const metadata: Metadata = {
  title: "搜索",
};

export default function SearchPage() {
  const items = getSearchIndex();

  return (
    <div className="section-page">
      <PageArt mood="tired" />
      <h1 className="section-title">搜索</h1>
      <SearchBox items={items} />
    </div>
  );
}
