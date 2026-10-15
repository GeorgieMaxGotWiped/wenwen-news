import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export const SITE_NAME = "文文。新闻";
export const SITE_NAME_EN = "Bunbunmaru News";
export const SITE_DESCRIPTION = "江苏省泰州中学学生自办的校园刊物。";

export type SiteSettings = {
  issue: string;
  footerNote: string;
  credits: string;
};

const DEFAULTS: SiteSettings = {
  issue: "第 001 期",
  footerNote: "学生自办刊物，不代表学校官方立场",
  credits: "站内素材均已征得作者同意使用",
};

function readString(data: Record<string, unknown>, key: string, fallback: string): string {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function getSite(): SiteSettings {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "content/settings/site.yml"), "utf8");
    const data = (parse(raw) ?? {}) as Record<string, unknown>;
    return {
      issue: readString(data, "issue", DEFAULTS.issue),
      footerNote: readString(data, "footer_note", DEFAULTS.footerNote),
      credits: readString(data, "credits", DEFAULTS.credits),
    };
  } catch {
    return DEFAULTS;
  }
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
