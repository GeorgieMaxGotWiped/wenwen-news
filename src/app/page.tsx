import Link from "next/link";
import EmptyPlate from "@/components/EmptyPlate";
import PostRow from "@/components/PostRow";
import { CATEGORIES, categoryName } from "@/lib/categories";
import { formatDate, getAllPosts } from "@/lib/posts";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function HomePage() {
  const posts = getAllPosts();
  const [lead, ...rest] = posts;

  return (
    <div className="home">
      <h1 className="sr-only">{SITE_DESCRIPTION}</h1>
      <div className="home-grid">
        <section className="home-main" aria-label="头版">
          {lead ? (
            <article className="lead">
              <Link href={`/posts/${lead.slug}`} className="lead-link">
                {lead.cover ? (
                  <span className="lead-figure">
                    <img src={lead.cover} alt="" />
                  </span>
                ) : null}
                <span className="tag">{categoryName(lead.category)}</span>
                <span className="lead-title">{lead.title}</span>
                <span className="lead-excerpt">{lead.excerpt}</span>
                <span className="meta">
                  {lead.author} · {formatDate(lead.date)} · 约 {lead.words} 字
                </span>
              </Link>
            </article>
          ) : (
            <EmptyPlate />
          )}
          {rest.length > 0 ? (
            <>
              <h2 className="kicker">最新</h2>
              <ol className="post-rows">
                {rest.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </ol>
            </>
          ) : null}
        </section>
        <aside className="rail">
          <section>
            <h2 className="kicker">栏目</h2>
            <ul className="cat-list">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link href={`/sections/${category.slug}`}>{category.name}</Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="kicker">文文的表情</h2>
            <ul className="mood-list">
              <li>
                <img src="/media/aya-mood-cheer.webp" alt="射命丸文（嬉）" width={200} height={200} />
                <span aria-hidden="true">嬉</span>
              </li>
              <li>
                <img src="/media/aya-mood-calm.webp" alt="射命丸文（余）" width={200} height={200} />
                <span aria-hidden="true">余</span>
              </li>
              <li>
                <img src="/media/aya-mood-angry.webp" alt="射命丸文（怒）" width={200} height={200} />
                <span aria-hidden="true">怒</span>
              </li>
              <li>
                <img src="/media/aya-mood-tired.webp" alt="射命丸文（負）" width={200} height={200} />
                <span aria-hidden="true">負</span>
              </li>
            </ul>
          </section>
          <section>
            <h2 className="kicker">关于本刊</h2>
            <p className="rail-note">{SITE_DESCRIPTION}</p>
            <Link className="rail-more" href="/about">
              了解更多 →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
