import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName } from "@/lib/categories";
import { formatDate, getAllPosts, getPost } from "@/lib/posts";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="article">
      <Link className="tag" href={`/sections/${post.category}`}>
        {categoryName(post.category)}
      </Link>
      <h1 className="article-title">{post.title}</h1>
      <p className="article-meta">
        {post.author} · {formatDate(post.date)} · 约 {post.words} 字
        {post.draft ? " · 草稿" : ""}
      </p>
      {post.cover ? (
        <figure className="article-figure">
          <img src={post.cover} alt="" />
        </figure>
      ) : null}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      <div className="end-mark" aria-hidden="true">
        完
      </div>
      <Link className="article-back" href="/">
        ← 返回头版
      </Link>
    </article>
  );
}
