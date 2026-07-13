import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const isAllSlides =
  typeof window !== "undefined" &&
  window.location.pathname.toLowerCase().endsWith("/allslides");

const ALL_MESSAGES = [
  {
    channel: "email",
    sender: "Sunrise Apparel",
    preview: "Re: PO #4821 — fabric delivery confirmed for...",
    time: "9:41am",
    unread: true,
    tag: "Production",
    draft: "Hi Sunrise, thanks for confirming. Please share the full delivery note and update the production tracker. We'll advance the stage on our end — let us know if anything changes.",
  },
  {
    channel: "whatsapp",
    sender: "Chen Wei (Gold Top)",
    preview: "samples ready, sending photos this afternoon",
    time: "8:20am",
    unread: true,
    tag: "Quote",
    draft: "Great news! Please send the sample photos and confirm the unit price from your last quote. We'd like to finalize before end of week.",
  },
  {
    channel: "email",
    sender: "Pacific Mills",
    preview: "Invoice #2294 attached. Payment due within...",
    time: "Yesterday",
    unread: false,
    tag: "Ex-Factory",
    draft: "Thank you for sending invoice #2294. We are reviewing it and will confirm payment timing within 48 hours.",
  },
  {
    channel: "wechat",
    sender: "ShiningTex",
    preview: "[Image] 发货单已上传",
    time: "Mon",
    unread: false,
    tag: "Production",
    draft: "Thank you for uploading the packing list. We've received it — please confirm the total carton count and gross weight.",
  },
  {
    channel: "sms",
    sender: "+86 139 xxxx 4472",
    preview: "shipment cleared customs, tracking updated",
    time: "Mon",
    unread: false,
    tag: "In Transit",
    draft: "Confirmed — thanks for the update. Please share the latest tracking number so we can monitor arrival.",
  },
];

const CHANNELS = ["All", "Email", "WhatsApp", "WeChat", "SMS"];

const CHANNEL_MAP: Record<string, string> = {
  Email: "email",
  WhatsApp: "whatsapp",
  WeChat: "wechat",
  SMS: "sms",
};

export default function InboxMock() {
  const [activeChannel, setActiveChannel] = useState("All");

  const filtered =
    activeChannel === "All"
      ? ALL_MESSAGES
      : ALL_MESSAGES.filter((m) => m.channel === CHANNEL_MAP[activeChannel]);

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
          Inbox
        </div>
        <div
          style={{
            background: "#7C3AED",
            color: "#F1F5F9",
            borderRadius: "999px",
            padding: "0.2vh 0.7vw",
            fontSize: "1vw",
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          {ALL_MESSAGES.filter((m) => m.unread).length}
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            background: "rgba(124,58,237,0.15)",
            borderRadius: "0.4vw",
            padding: "0.3vh 0.8vw",
          }}
        >
          <span style={{ color: "#A78BFA", fontSize: "1vw", fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Filter
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(124,58,237,0.15)",
          overflowX: "hidden",
        }}
      >
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={isAllSlides ? undefined : () => setActiveChannel(ch)}
            style={{
              padding: "0.8vh 1.2vw",
              color: activeChannel === ch ? "#A78BFA" : "#4B5563",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.05vw",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottom: activeChannel === ch ? "2px solid #7C3AED" : "2px solid transparent",
              background: "transparent",
              cursor: isAllSlides ? "default" : "pointer",
              transition: "color 0.15s",
            }}
          >
            {ch}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "hidden" }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: "3vh 1.5vw",
              color: "#4B5563",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.1vw",
              textAlign: "center",
            }}
          >
            No messages in this channel
          </div>
        )}
        {filtered.map((msg, i) => (
          <MessageRow key={i} {...msg} />
        ))}
      </div>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    email: "#3B82F6",
    whatsapp: "#22C55E",
    wechat: "#F59E0B",
    sms: "#6B7280",
  };
  const labels: Record<string, string> = {
    email: "Email",
    whatsapp: "WA",
    wechat: "WC",
    sms: "SMS",
  };
  return (
    <div
      style={{
        background: colors[channel] || "#6B7280",
        color: "#fff",
        borderRadius: "0.3vw",
        padding: "0.15vh 0.4vw",
        fontSize: "0.8vw",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {labels[channel] || channel}
    </div>
  );
}

function MessageRow({
  channel,
  sender,
  preview,
  time,
  unread,
  tag,
  draft,
}: {
  channel: string;
  sender: string;
  preview: string;
  time: string;
  unread?: boolean;
  tag: string;
  draft: string;
}) {
  const [showDraft, setShowDraft] = useState(false);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(124,58,237,0.1)",
        background: unread ? "rgba(124,58,237,0.05)" : "transparent",
      }}
    >
      <div
        style={{
          padding: "1.2vh 1.5vw",
          display: "flex",
          flexDirection: "column",
          gap: "0.4vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6vw" }}>
          <ChannelBadge channel={channel} />
          <span
            style={{
              color: unread ? "#F1F5F9" : "#94A3B8",
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontWeight: unread ? 700 : 400,
              fontSize: "1.15vw",
              flex: 1,
            }}
          >
            {sender}
          </span>
          <span
            style={{
              color: "#4B5563",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1vw",
            }}
          >
            {time}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6vw" }}>
          <span
            style={{
              color: "#94A3B8",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              fontSize: "1.05vw",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {preview}
          </span>
          <div
            style={{
              background: "rgba(124,58,237,0.15)",
              color: "#A78BFA",
              borderRadius: "999px",
              padding: "0.1vh 0.6vw",
              fontSize: "0.9vw",
              fontFamily: '"DM Sans", system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            {tag}
          </div>
          {!isAllSlides && (
            <button
              onClick={() => setShowDraft((v) => !v)}
              style={{
                background: showDraft ? "#7C3AED" : "rgba(124,58,237,0.12)",
                color: showDraft ? "#F1F5F9" : "#A78BFA",
                border: "1px solid rgba(124,58,237,0.35)",
                borderRadius: "0.35vw",
                padding: "0.15vh 0.6vw",
                fontFamily: '"DM Sans", system-ui, sans-serif',
                fontSize: "0.85vw",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              Draft with AI
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDraft && !isAllSlides && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                margin: "0 1.5vw 1.2vh",
                background: "#0d1220",
                border: "1px solid rgba(124,58,237,0.3)",
                borderRadius: "0.6vw",
                padding: "1vh 1.2vw",
              }}
            >
              <div
                style={{
                  color: "#A78BFA",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: "0.85vw",
                  fontWeight: 500,
                  marginBottom: "0.5vh",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4vw",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "0.6vw",
                    height: "0.6vw",
                    borderRadius: "50%",
                    background: "#7C3AED",
                  }}
                />
                AI draft
              </div>
              <div
                style={{
                  color: "#CBD5E1",
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  fontSize: "1.05vw",
                  lineHeight: 1.55,
                  marginBottom: "0.8vh",
                }}
              >
                {draft}
              </div>
              <div style={{ display: "flex", gap: "0.6vw" }}>
                <button
                  style={{
                    background: "#7C3AED",
                    color: "#F1F5F9",
                    border: "none",
                    borderRadius: "0.35vw",
                    padding: "0.4vh 1.1vw",
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: "0.95vw",
                    cursor: "default",
                  }}
                >
                  Send
                </button>
                <button
                  style={{
                    background: "transparent",
                    color: "#94A3B8",
                    border: "1px solid rgba(124,58,237,0.2)",
                    borderRadius: "0.35vw",
                    padding: "0.4vh 1.1vw",
                    fontFamily: '"DM Sans", system-ui, sans-serif',
                    fontSize: "0.95vw",
                    cursor: "default",
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
