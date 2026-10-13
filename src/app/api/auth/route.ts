import { SUPPORTED_PROVIDERS, authResultHtml, getDomainPatterns, resolveScope } from "@/lib/cms-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "";
  const siteDomain = url.searchParams.get("site_id") ?? "";
  const allowedDomains = process.env.ALLOWED_DOMAINS;

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      error: "Your Git backend is not supported by the authenticator.",
      errorCode: "UNSUPPORTED_BACKEND",
    });
  }

  if (allowedDomains) {
    const patterns = getDomainPatterns(allowedDomains, url.origin);
    if (!patterns.some((pattern) => new RegExp(pattern).test(siteDomain))) {
      return authResultHtml({
        origin: url.origin,
        allowedDomains,
        provider,
        error: "Your domain is not allowed to use the authenticator.",
        errorCode: "UNSUPPORTED_DOMAIN",
      });
    }
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return authResultHtml({
      origin: url.origin,
      allowedDomains,
      provider,
      error: "OAuth app client ID or secret is not configured.",
      errorCode: "MISCONFIGURED_CLIENT",
    });
  }

  const scope = resolveScope(provider, url.searchParams.get("scope"));
  const csrfToken = crypto.randomUUID().replaceAll("-", "");
  const authorizeParams = new URLSearchParams({
    client_id: clientId,
    scope,
    state: csrfToken,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${authorizeParams.toString()}`,
      "Set-Cookie": `csrf-token=${provider}_${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  });
}
