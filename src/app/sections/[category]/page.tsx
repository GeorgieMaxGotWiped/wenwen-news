import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EmptyPlate from "@/components/EmptyPlate";
import PostRow from "@/components/PostRow";
import { CATEGORIES, categoryName, isCategory } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

type Props = {
  params: Promise<{ category: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  return { title: categoryName(category) };
}

export default async function SectionPage({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const posts = getPostsByCategory(category);

  return (
    <div className="section-page">
      <h1 className="section-title">{categoryName(category)}</h1>
      {posts.length > 0 ? (
        <ol className="post-rows">
          {posts.map((post) => (
            <PostRow key={post.slug} post={post} withExcerpt />
          ))}
        </ol>
      ) : (
        <EmptyPlate title="本栏目暂无文章" />
      )}
    </div>
  );
}
