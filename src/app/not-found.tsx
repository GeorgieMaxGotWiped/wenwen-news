import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notfound">
      <div className="notfound-text">
        <p className="notfound-code">404</p>
        <h1 className="notfound-title">此版空缺</h1>
        <p className="notfound-note">你要找的页面不存在，或者已经被撤下。</p>
        <Link className="notfound-back" href="/">
          ← 返回头版
        </Link>
      </div>
      <img className="notfound-figure" src="/media/aya-standing.webp" alt="射命丸文" width={220} height={247} />
    </div>
  );
}
