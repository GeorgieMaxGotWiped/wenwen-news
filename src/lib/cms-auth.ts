type ProviderConfig = {
  defaultScope: string;
  separator: string;
  allowedScopes: string[];
};

const PROVIDERS: Record<string, ProviderConfig> = {
  github: {
    defaultScope: "repo,user",
    separator: ",",
    allowedScopes: ["repo", "public_repo", "user", "read:user", "user:email"],
  },
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS);

export function resolveScope(provider: string, requested?: string | null): string {
  const config = PROVIDERS[provider];
  const scopes = (requested ?? "").split(/[\s,]+/).filter(Boolean);
  if (scopes.length === 0) return config.defaultScope;
  if (scopes.every((scope) => config.allowedScopes.includes(scope))) {
    return scopes.join(config.separator);
  }
  return config.defaultScope;
}

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function getDomainPatterns(allowedDomains: string | undefined, fallbackOrigin: string): string[] {
  const list = (allowedDomains ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (list.length > 0) {
    return list.map((host) => `^${escapeRegExp(host).replaceAll("\\*", ".+")}$`);
  }
  const { hostname } = new URL(fallbackOrigin);
  return [`^${escapeRegExp(hostname)}$`];
}

const serialize = (value: unknown) => JSON.stringify(value ?? null).replaceAll("<", "\\u003c");

type AuthResultOptions = {
  origin: string;
  allowedDomains?: string;
  provider?: string;
  token?: string;
  error?: string;
  errorCode?: string;
};

/**
 * 与 Sveltia CMS Authenticator 协议一致的弹窗回传页面：
 * 等待 opener 的 authorizing 消息，把令牌/错误以 postMessage 发回其来源。
 */
export function authResultHtml(options: AuthResultOptions): Response {
  const provider = options.provider ?? "unknown";
  const state = options.error ? "error" : "success";
  const content = options.error
    ? { provider, error: options.error, errorCode: options.errorCode }
    : { provider, token: options.token };
  const message = `authorization:${provider}:${state}:${JSON.stringify(content)}`;
  const patterns = getDomainPatterns(options.allowedDomains, options.origin);
  const hasToken = Boolean(options.token);

  const html = `<!doctype html><html lang="zh-CN"><body><script>
(() => {
  const trustedPatterns = ${serialize(patterns)};
  const hasToken = ${hasToken ? "true" : "false"};
  const message = ${serialize(message)};
  const isTrusted = (origin) => {
    try {
      const { hostname } = new URL(origin);
      return trustedPatterns.some((pattern) => new RegExp(pattern).test(hostname));
    } catch {
      return false;
    }
  };
  window.addEventListener("message", ({ data, origin }) => {
    if (data !== "authorizing:${provider}") return;
    if (hasToken && trustedPatterns.length > 0 && !isTrusted(origin)) return;
    window.opener?.postMessage(message, origin);
  });
  window.opener?.postMessage("authorizing:${provider}", "*");
})();
</script></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Set-Cookie": "csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure",
    },
  });
}
