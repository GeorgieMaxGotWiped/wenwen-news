"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  authConfigured,
  clearSessionCookie,
  getSessionUser,
  isAdminEmail,
  setSessionCookie,
} from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { createComment } from "@/lib/comments";
import { verifyPassword } from "@/lib/password";
import { publishSubmission, slugify } from "@/lib/publish";
import { createSubmission, getSubmission, updateSubmission } from "@/lib/submissions";
import { storePut } from "@/lib/store";
import { createUser, findUserByEmail, findUserById, saveUser } from "@/lib/users";

const asString = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

const safeNext = (value: string) => (value.startsWith("/") && !value.startsWith("//") ? value : "/my");

export async function registerAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  if (!authConfigured()) {
    return { error: "服务器还没有配置 AUTH_SECRET，暂时无法注册。" };
  }
  const name = asString(formData.get("name")).trim();
  const email = asString(formData.get("email")).trim().toLowerCase();
  const password = asString(formData.get("password"));
  const confirm = asString(formData.get("password2"));

  if (name.length < 1 || name.length > 24) return { error: "昵称需要 1 到 24 个字符。" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return { error: "请输入有效的邮箱地址。" };
  }
  if (password.length < 8) return { error: "密码至少 8 位。" };
  if (password.length > 72) return { error: "密码太长了，请控制在 72 位以内。" };
  if (password !== confirm) return { error: "两次输入的密码不一致。" };
  if (await findUserByEmail(email)) return { error: "这个邮箱已经注册过，可以直接登录。" };

  const user = await createUser({ email, name, password });
  const ok = await setSessionCookie({ id: user.id, email: user.email, name: user.name });
  if (!ok) return { error: "服务器还没有配置 AUTH_SECRET，暂时无法注册。" };
  redirect("/my");
}

export async function loginAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  if (!authConfigured()) {
    return { error: "服务器还没有配置 AUTH_SECRET，暂时无法登录。" };
  }
  const email = asString(formData.get("email")).trim().toLowerCase();
  const password = asString(formData.get("password"));
  const next = safeNext(asString(formData.get("next")) || "/my");

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return { error: "邮箱或密码不正确。" };
  }
  const ok = await setSessionCookie({ id: user.id, email: user.email, name: user.name });
  if (!ok) return { error: "服务器还没有配置 AUTH_SECRET，暂时无法登录。" };
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

export async function submitAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "登录状态已失效，请重新登录后再投稿。" };

  const title = asString(formData.get("title")).trim();
  const category = asString(formData.get("category"));
  const author = asString(formData.get("author")).trim() || user.name;
  const slugInput = asString(formData.get("slug")).trim();
  const excerpt = asString(formData.get("excerpt")).trim();
  const content = asString(formData.get("content"));

  if (title.length < 2 || title.length > 80) return { error: "标题需要 2 到 80 个字符。" };
  if (!isCategory(category)) return { error: "请选择栏目。" };
  if (author.length > 24) return { error: "署名请不要超过 24 个字符。" };
  if (excerpt.length > 200) return { error: "摘要请不要超过 200 字。" };
  if (content.trim().length < 50) return { error: "正文有点短，至少写满 50 个字再提交。" };
  if (content.length > 60000) return { error: "正文太长了（超过 6 万字），请删减后再试。" };

  let coverUrl: string | undefined;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    if (!cover.type.startsWith("image/")) return { error: "题图需要是图片文件。" };
    if (cover.size > 4 * 1024 * 1024) return { error: "题图不能超过 4MB。" };
    const ext = (cover.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
    const stored = await storePut(
      `uploads/${randomUUID()}.${ext}`,
      Buffer.from(await cover.arrayBuffer()),
      cover.type,
    );
    coverUrl = stored.url;
  }

  await createSubmission({
    title,
    slug: slugInput ? slugify(slugInput, "") : "",
    category,
    excerpt,
    contentMd: content.trim(),
    coverUrl,
    authorId: user.id,
    authorName: author,
    authorEmail: user.email,
  });
  redirect("/my?ok=1");
}

export async function approveAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const id = asString(formData.get("id"));
  const submission = id ? await getSubmission(id) : null;
  if (!submission || submission.status !== "pending") redirect("/review?msg=missing");

  const result = await publishSubmission(submission);
  if (!result.ok) redirect(`/review?msg=error&detail=${encodeURIComponent(result.error)}`);

  const publishedSlug = result.filePath.split("/").pop()?.replace(/\.md$/, "") ?? "";
  await updateSubmission(submission.id, {
    status: "approved",
    reviewedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    publishedSlug,
  });
  revalidatePath("/review");
  redirect(`/review?msg=published&slug=${encodeURIComponent(publishedSlug)}`);
}

export async function rejectAction(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const id = asString(formData.get("id"));
  const note = asString(formData.get("note")).trim().slice(0, 200);
  const submission = id ? await getSubmission(id) : null;
  if (!submission || submission.status !== "pending") redirect("/review?msg=missing");

  await updateSubmission(submission.id, {
    status: "rejected",
    reviewNote: note || undefined,
    reviewedAt: new Date().toISOString(),
  });
  revalidatePath("/review");
  redirect("/review?msg=rejected");
}

export async function commentAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "请先登录再发表评论。" };

  const postSlug = asString(formData.get("postSlug")).trim();
  const body = asString(formData.get("body")).trim();
  if (!body) return { error: "评论内容不能为空。" };
  if (body.length > 800) return { error: "评论请控制在 800 字以内。" };

  const created = await createComment({
    postSlug,
    authorId: user.id,
    authorName: user.name,
    body,
  });
  if (!created) return { error: "文章不存在或已下线。" };
  return { ok: true };
}

export async function updateProfileAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSessionUser();
  if (!session) return { error: "登录状态已失效，请重新登录。" };

  const name = asString(formData.get("name")).trim();
  const bio = asString(formData.get("bio")).trim();
  if (name.length < 1 || name.length > 24) return { error: "昵称需要 1 到 24 个字符。" };
  if (bio.length > 120) return { error: "简介请控制在 120 字以内。" };

  const record = await findUserById(session.id);
  if (!record) return { error: "账号不存在，请重新注册或登录。" };

  let avatarUrl = record.avatar;
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "头像需要是图片文件。" };
    if (file.size > 2 * 1024 * 1024) return { error: "头像不能超过 2MB。" };
    const ext =
      file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : file.type === "image/webp" ? "webp" : "jpg";
    const stored = await storePut(
      `avatars/${session.id}-${Date.now()}.${ext}`,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    avatarUrl = stored.url;
  } else if (formData.get("removeAvatar") === "on") {
    avatarUrl = undefined;
  }

  await saveUser({ ...record, name, bio, avatar: avatarUrl });

  const ok = await setSessionCookie({ id: session.id, email: session.email, name });
  if (!ok) return { error: "资料已保存，但登录状态刷新失败，请重新登录。" };

  revalidatePath("/profile");
  revalidatePath("/my");
  return { ok: true };
}
