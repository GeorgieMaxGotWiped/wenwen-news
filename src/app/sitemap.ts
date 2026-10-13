import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/about`, lastModified: now },
    { url: `${base}/search`, lastModified: now },
    ...CATEGORIES.map((category) => ({ url: `${base}/sections/${category.slug}`, lastModified: now })),
    ...getAllPosts().map((post) => ({
      url: `${base}/posts/${post.slug}`,
      lastModified: new Date(`${post.date.slice(0, 10)}T00:00:00+08:00`),
    })),
  ];
}
