import Link from "next/link";
import { categoryName } from "@/lib/categories";
import { formatDateShort, type PostMeta } from "@/lib/posts";

export default function PostRow({ post, withExcerpt = false }: { post: PostMeta; withExcerpt?: boolean }) {
  return (
    <li className="post-row">
      <Link className="post-row-link" href={`/posts/${post.slug}`}>
        <time className="post-row-date" dateTime={post.date}>
          {formatDateShort(post.date)}
        </time>
        <span className="post-row-body">
          <span className="post-row-title">
            {post.title}
            {post.draft ? <em className="draft-mark">草稿</em> : null}
          </span>
          {withExcerpt && post.excerpt ? <span className="post-row-excerpt">{post.excerpt}</span> : null}
        </span>
        <span className="post-row-cat">{categoryName(post.category)}</span>
      </Link>
    </li>
  );
}
