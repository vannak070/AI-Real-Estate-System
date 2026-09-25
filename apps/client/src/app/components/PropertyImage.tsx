import { ImageWithFallback } from "./figma/ImageWithFallback";
import eraLogo from "figma:asset/04fbd52ef60da91b44edcb17b864e7abb90acda5.png";

// A listing with no photos gets an ERA-branded placeholder — never a stock photo
// that a visitor would take for the property itself.
export function PropertyImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (src) return <ImageWithFallback src={src} alt={alt} className={className} />;
  return (
    <div
      role="img"
      aria-label={`${alt} — photos coming soon`}
      className={`flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] text-white ${className ?? ''}`}
    >
      <img src={eraLogo} alt="" className="h-12 w-auto opacity-90" />
      <span className="text-sm font-medium text-white/80">Photos coming soon</span>
    </div>
  );
}
