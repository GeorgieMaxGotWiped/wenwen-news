import { SUPPORTED_PROVIDERS, authResultHtml } from "@/lib/cms-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const allowedDomains = process.env.ALLOWED_DOMAINS;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/);
  const provider = match?.[1] ?? "";
  const csrfToken = match?.[2] ?? "";

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
    });
  }

  if (!code || !state) {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      provider,
      error: "Failed to receive an authorization code. Please try again later.",
      errorCode: "AUTH_CODE_REQUEST_FAILED",
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      provider,
      error: "Potential CSRF attack detected. Authentication flow aborted.",
      errorCode: "CSRF_DETECTED",
    });
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      provider,
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT",
    });
  }

  let payload: { access_token?: string; error?: string };
  try {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
      }),
    });
    payload = (await response.json()) as { access_token?: string; error?: string };
  } catch {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      provider,
      error: "Failed to request an access token. Please try again later.",
      errorCode: "TOKEN_REQUEST_FAILED",
    });
  }

  return authResultHtml({
    origin: url.origin,
    allowedDomains,
    provider,
    token: payload.access_token,
    error: payload.access_token ? undefined : (payload.error ?? "Failed to receive an access token. Please try again later."),
  });
}
