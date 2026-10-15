import Link from "next/link";
import AccountNav from "@/components/AccountNav";
import SectionNav from "@/components/SectionNav";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="文文。新闻 首页">
          <img src="/media/emblem-sm.png" alt="" width={30} height={30} />
          <span className="brand-name">
            文文<span className="brand-dot">。</span>新闻
          </span>
        </Link>
        <SectionNav />
        <nav className="header-utils" aria-label="站务">
          <Link href="/about">关于</Link>
          <Link href="/search">搜索</Link>
          <a href="/feed.xml">RSS</a>
        </nav>
        <AccountNav />
      </div>
    </header>
  );
}
