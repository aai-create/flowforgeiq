import { motion } from "framer-motion";
import ChapterNav from "@/components/ChapterNav";
import Hotspot from "@/components/Hotspot";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const Anim = isAllSlides
  ? ({ children, delay: _delay }: { children: React.ReactNode; delay?: number }) => <>{children}</>
  : ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    );

export default function Slide20MobileDocuments() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0B0F1A" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(124,58,237,0.07) 1px, transparent 0)",
          backgroundSize: "2.8vw 2.8vw",
        }}
      />

      <Anim delay={0}>
        <div
          style={{
            position: "absolute",
            top: "8vh",
            left: "7vw",
          }}
        >
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: "1.1vw",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "1vh",
            }}
          >
            Chapter 05 — Mobile
          </div>
          <div
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: "3.5vw",
              color: "#F1F5F9",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: "1.5vh",
            }}
          >
            Documents on mobile
          </div>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.4vw",
              maxWidth: "28vw",
              lineHeight: 1.6,
            }}
          >
            Attach, view, and share shipment documents — proformas, invoices, and inspection reports — directly from the mobile app.
          </div>
        </div>
      </Anim>

      <Anim delay={0.15}>
        <div
          style={{
            position: "absolute",
            left: "7vw",
            right: "7vw",
            top: "28vh",
            bottom: "12vh",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <DocumentsMock />

            <Hotspot
              top="18%"
              left="6%"
              label="Shipment filter"
              description="Filter documents by shipment, supplier, or document type from the top bar."
            />
            <Hotspot
              top="45%"
              left="35%"
              label="Document preview"
              description="Tap any row to preview the PDF in-app without downloading — no extra apps needed."
            />
            <Hotspot
              top="72%"
              left="80%"
              label="Share button"
              description="Share documents directly to WhatsApp, email, or copy link to send to suppliers."
            />
            <Hotspot
              top="30%"
              left="92%"
              label="Upload"
              description="Upload a photo of a physical document or pick a PDF from your files — it attaches to the shipment automatically."
            />
          </div>
        </div>
      </Anim>

      <ChapterNav />
    </div>
  );
}

function DocumentsMock() {
  return (
    <div
      style={{
        background: "#131929",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: "1vw",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "#0B0F1A",
          padding: "1.2vh 1.5vw",
          borderBottom: "1px solid rgba(124,58,237,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "1vw",
        }}
      >
        <div
          style={{
            color: "#F1F5F9",
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: "1.4vw",
          }}
        >
          Documents
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            background: "#7C3AED",
            color: "#F1F5F9",
            borderRadius: "0.4vw",
            padding: "0.3vh 0.8vw",
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontSize: "1vw",
            fontWeight: 500,
          }}
        >
          + Upload
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1.2fr 1fr 0.8fr 0.6fr",
          padding: "0.6vh 1.5vw",
          borderBottom: "1px solid rgba(124,58,237,0.1)",
        }}
      >
        <DocColHeader>Document</DocColHeader>
        <DocColHeader>Shipment</DocColHeader>
        <DocColHeader>Type</DocColHeader>
        <DocColHeader>Date</DocColHeader>
        <DocColHeader>Action</DocColHeader>
      </div>

      <div style={{ flex: 1, overflowY: "hidden" }}>
        <DocRow name="Proforma Invoice — GT-2026-0339.pdf" shipment="Gold Top" type="Proforma" date="May 14" />
        <DocRow name="Bill of Lading — SA-2026-4821.pdf" shipment="Sunrise Apparel" type="B/L" date="May 12" />
        <DocRow name="Inspection Report — May 2026.pdf" shipment="Pacific Mills" type="QC" date="May 10" />
        <DocRow name="Commercial Invoice — PM-1152.pdf" shipment="Pacific Mills" type="Invoice" date="May 8" />
        <DocRow name="Packing List — ST-0071.pdf" shipment="ShiningTex" type="Packing" date="May 6" />
      </div>
    </div>
  );
}

function DocColHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "#4B5563",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: "0.9vw",
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </div>
  );
}

function DocRow({
  name,
  shipment,
  type,
  date,
}: {
  name: string;
  shipment: string;
  type: string;
  date: string;
}) {
  const typeColors: Record<string, string> = {
    Proforma: "#A78BFA",
    "B/L": "#22C55E",
    QC: "#F59E0B",
    Invoice: "#3B82F6",
    Packing: "#94A3B8",
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.8fr 1.2fr 1fr 0.8fr 0.6fr",
        padding: "1vh 1.5vw",
        borderBottom: "1px solid rgba(124,58,237,0.08)",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "#F1F5F9",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "1.05vw",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
      <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>
        {shipment}
      </div>
      <div>
        <span
          style={{
            background: `${typeColors[type] || "#94A3B8"}22`,
            color: typeColors[type] || "#94A3B8",
            borderRadius: "999px",
            padding: "0.2vh 0.7vw",
            fontSize: "0.9vw",
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          {type}
        </span>
      </div>
      <div style={{ color: "#94A3B8", fontFamily: '"DM Sans", system-ui, sans-serif', fontSize: "1vw" }}>
        {date}
      </div>
      <div
        style={{
          color: "#A78BFA",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "0.95vw",
          cursor: "default",
        }}
      >
        Share
      </div>
    </div>
  );
}
