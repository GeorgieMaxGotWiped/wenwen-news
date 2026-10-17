import { NextResponse } from "next/server";
import { getSessionUser, isAdminEmail } from "@/lib/auth";
import { findUserById } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  const record = await findUserById(user.id);
  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      isAdmin: isAdminEmail(user.email),
      avatar: record?.avatar ?? null,
    },
  });
}
