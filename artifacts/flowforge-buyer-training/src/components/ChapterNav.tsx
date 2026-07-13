import { useLocation } from "wouter";

const chapters = [
  { label: "Welcome", slide: 1 },
  { label: "Inbox", slide: 5 },
  { label: "Orders", slide: 9 },
  { label: "Quotes", slide: 13 },
  { label: "Mobile", slide: 17 },
  { label: "AI", slide: 21 },
];

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

export default function ChapterNav() {
  const [location, navigate] = useLocation();

  if (isAllSlides) return null;

  const currentSlide = parseInt(location.replace("/slide", "") || "1", 10);

  function activeChapter() {
    let active = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (currentSlide >= chapters[i].slide) active = i;
    }
    return active;
  }

  const active = activeChapter();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2.5vh",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        display: "flex",
        gap: "0.5vw",
        background: "rgba(11,15,26,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: "999px",
        padding: "0.8vh 1.5vw",
      }}
    >
      {chapters.map((ch, i) => (
        <button
          key={ch.label}
          onClick={() => navigate(`/slide${ch.slide}`)}
          style={{
            background: i === active ? "#7C3AED" : "transparent",
            color: i === active ? "#F1F5F9" : "#94A3B8",
            border: "none",
            borderRadius: "999px",
            padding: "0.5vh 1.1vw",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: i === active ? 700 : 400,
            fontSize: "1.3vw",
            cursor: "pointer",
            transition: "all 0.2s",
            letterSpacing: "-0.01em",
          }}
        >
          {ch.label}
        </button>
      ))}
    </div>
  );
}
