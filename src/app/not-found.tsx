import Link from "next/link";
import PageArt from "@/components/PageArt";

export default function NotFound() {
  return (
    <div className="notfound">
      <PageArt mood="angry" />
      <div className="notfound-text">
        <p className="notfound-code">404</p>
        <h1 className="notfound-title">此版空缺</h1>
        <p className="notfound-note">你要找的页面不存在，或者已经被撤下。</p>
        <Link className="notfound-back" href="/">
          ← 返回头版
        </Link>
      </div>
    </div>
  );
}
