import { NextResponse } from "next/server";
import { isValidPostSlug, listComments } from "@/lib/comments";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!isValidPostSlug(slug)) {
    return NextResponse.json({ error: "文章标识不正确。" }, { status: 400 });
  }

  const [comments, users] = await Promise.all([listComments(slug), listUsers()]);
  const byId = new Map(users.map((user) => [user.id, user]));

  return NextResponse.json({
    comments: comments.map((comment) => ({
      id: comment.id,
      name: byId.get(comment.authorId)?.name ?? comment.authorName,
      avatar: byId.get(comment.authorId)?.avatar ?? null,
      body: comment.body,
      createdAt: comment.createdAt,
    })),
  });
}
