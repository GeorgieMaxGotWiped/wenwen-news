export type Category = {
  slug: string;
  name: string;
};

export const CATEGORIES: Category[] = [
  { slug: "campus", name: "校园" },
  { slug: "people", name: "人物" },
  { slug: "opinion", name: "评论" },
  { slug: "culture", name: "副刊" },
  { slug: "photo", name: "图集" },
];

export function categoryName(slug: string): string {
  return CATEGORIES.find((category) => category.slug === slug)?.name ?? slug;
}

export function isCategory(slug: string): boolean {
  return CATEGORIES.some((category) => category.slug === slug);
}
