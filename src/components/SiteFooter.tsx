import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { getSite } from "@/lib/site";

export default function SiteFooter() {
  const site = getSite();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col footer-col-main">
          <div className="footer-name">文文。新闻</div>
          <p>{site.footerNote}</p>
          <p className="footer-muted">{site.credits}</p>
        </div>
        <nav className="footer-col" aria-label="栏目">
          <div className="footer-kicker">栏目</div>
          {CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/sections/${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </nav>
        <nav className="footer-col" aria-label="本站">
          <div className="footer-kicker">本站</div>
          <Link href="/about">关于本刊</Link>
          <Link href="/search">搜索</Link>
          <a href="/feed.xml">RSS 订阅</a>
          <Link href="/admin/">编辑部入口</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {year} 文文。新闻 · {site.issue} · 学生自办</span>
        <img className="footer-colophon" src="/media/school-stack-light.webp" alt="江苏省泰州中学" />
      </div>
    </footer>
  );
}
