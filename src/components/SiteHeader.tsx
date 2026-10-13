import Link from "next/link";
import SectionNav from "@/components/SectionNav";
import { getSite } from "@/lib/site";

export default function SiteHeader() {
  const site = getSite();
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
    timeZone: "Asia/Shanghai",
  }).format(now);

  return (
    <header className="masthead">
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-date">
            {dateText} {weekday}
          </span>
          <span className="topbar-sep">·</span>
          <span className="topbar-issue">{site.issue}</span>
          <nav className="topbar-nav" aria-label="站务">
            <Link href="/about">关于</Link>
            <Link href="/search">搜索</Link>
            <a href="/feed.xml">RSS</a>
          </nav>
        </div>
      </div>
      <div className="nameplate">
        <div className="nameplate-side">
          <img src="/media/emblem-sm.png" alt="" width={42} height={42} />
          <span className="nameplate-school">
            江苏省泰州中学
            <br />
            学生自办
          </span>
        </div>
        <Link href="/" className="logo" aria-label="文文。新闻 首页">
          文文<span className="logo-dot">。</span>新闻
        </Link>
        <div className="nameplate-side nameplate-side-right">
          <span className="latin">BUNBUNMARU NEWS</span>
          <span className="nameplate-note">学生编辑部</span>
        </div>
      </div>
      <div className="rule-double" aria-hidden="true" />
      <SectionNav />
    </header>
  );
}
