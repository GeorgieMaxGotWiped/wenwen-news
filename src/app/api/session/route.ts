import { NextResponse } from "next/server";
import { getSessionUser, isAdminEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({
    user: user
      ? {
          name: user.name,
          email: user.email,
          isAdmin: isAdminEmail(user.email),
        }
      : null,
  });
}
