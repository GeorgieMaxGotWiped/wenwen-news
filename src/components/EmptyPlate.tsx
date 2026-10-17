export default function EmptyPlate({
  title = "暂无文章",
  note = "新文章发布后会出现在这里。",
}: {
  title?: string;
  note?: string;
}) {
  return (
    <div className="empty-plate">
      <img className="empty-plate-figure" src="/media/aya-mood-tired.webp" alt="射命丸文" width={96} height={96} />
      <p className="empty-plate-title">{title}</p>
      <p className="empty-plate-note">{note}</p>
    </div>
  );
}
