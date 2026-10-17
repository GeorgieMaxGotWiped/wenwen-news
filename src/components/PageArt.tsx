export type PageArtMood = "cheer" | "calm" | "angry" | "tired";

export default function PageArt({ mood }: { mood: PageArtMood }) {
  return <div className={`page-art page-art-${mood}`} aria-hidden="true" />;
}
