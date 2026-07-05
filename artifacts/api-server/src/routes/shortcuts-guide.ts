import QRCode from "qrcode";

export async function renderShortcutsGuidePage(baseUrl: string): Promise<string> {
  const webhookUrl = `${baseUrl}/api/capture/mobile`;
  const guideUrl = `${baseUrl}/shortcuts`;

  const svgQr = await QRCode.toString(webhookUrl, {
    type: "svg",
    margin: 1,
    color: { dark: "#212833", light: "#ffffff" },
  });

  const openInShortcutsUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(guideUrl)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FlowForge iOS Shortcut Setup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
      background: #FAFBFC;
      color: #212833;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 16px 60px;
    }
    .card {
      background: #fff;
      border: 1px solid #E5EAF0;
      border-radius: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
      padding: 32px;
      max-width: 540px;
      width: 100%;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .logo-icon {
      width: 36px; height: 36px;
      background: linear-gradient(135deg, #9000FF 0%, #6600BB 100%);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 18px; font-weight: 800;
    }
    .logo-text { font-size: 18px; font-weight: 800; color: #212833; }
    .logo-text span { color: #9000FF; }
    h1 { font-size: 22px; font-weight: 800; color: #212833; margin-bottom: 6px; }
    .subtitle { font-size: 13px; color: #5E687B; margin-bottom: 28px; line-height: 1.5; }

    .steps { list-style: none; counter-reset: steps; display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
    .step {
      display: flex; gap: 12px; align-items: flex-start;
      background: #F7F9FA; border: 1px solid #E5EAF0;
      border-radius: 12px; padding: 14px 16px;
    }
    .step-num {
      width: 26px; height: 26px; border-radius: 50%;
      background: #9000FF; color: #fff;
      font-size: 11px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px;
    }
    .step-body { flex: 1; min-width: 0; }
    .step-title { font-size: 13px; font-weight: 700; color: #212833; margin-bottom: 4px; }
    .step-desc { font-size: 12px; color: #5E687B; line-height: 1.55; }
    .step-desc code {
      font-family: "SF Mono", "Fira Mono", "Consolas", monospace;
      font-size: 11px; background: #E8ECF0; color: #212833;
      padding: 1px 5px; border-radius: 4px;
    }
    .step-desc pre {
      font-family: "SF Mono", "Fira Mono", "Consolas", monospace;
      font-size: 11px; background: #1A1D23; color: #A8D8A8;
      padding: 10px 12px; border-radius: 8px; margin-top: 8px;
      overflow-x: auto; white-space: pre; line-height: 1.6;
    }

    .webhook-box {
      background: #F7F9FA; border: 1px solid #E5EAF0;
      border-radius: 12px; padding: 14px 16px;
      margin-bottom: 28px;
    }
    .webhook-label {
      font-size: 10px; font-weight: 700; color: #9E9FAE;
      text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px;
    }
    .webhook-row { display: flex; align-items: center; gap: 8px; }
    .webhook-url {
      flex: 1; font-family: "SF Mono", "Fira Mono", "Consolas", monospace;
      font-size: 12px; font-weight: 600; color: #212833;
      background: #fff; border: 1px solid #E5EAF0;
      border-radius: 8px; padding: 8px 12px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px;
      font-size: 12px; font-weight: 700;
      cursor: pointer; border: none; text-decoration: none;
      transition: background .15s, opacity .15s;
    }
    .btn-primary { background: #9000FF; color: #fff; }
    .btn-primary:hover { background: #7A00D9; }
    .btn-outline { background: #fff; color: #5E687B; border: 1px solid #E5EAF0; }
    .btn-outline:hover { background: #F0F4F8; }
    .btn-copy { white-space: nowrap; flex-shrink: 0; }
    #copy-feedback {
      font-size: 11px; color: #16A34A; font-weight: 600;
      opacity: 0; transition: opacity .3s;
      margin-top: 6px; display: block;
    }

    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 32px; }

    .open-note {
      font-size: 11px; color: #9E9FAE; margin-top: 8px; line-height: 1.5;
      background: #FFF8E6; border: 1px solid #F5E0A0;
      border-radius: 8px; padding: 8px 12px;
    }
    .open-note strong { color: #92680A; }

    .qr-section { text-align: center; }
    .qr-label {
      font-size: 11px; font-weight: 700; color: #9E9FAE;
      text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px;
    }
    .qr-wrap {
      display: inline-block;
      background: #fff; border: 1px solid #E5EAF0;
      border-radius: 12px; padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .qr-wrap svg { width: 140px; height: 140px; display: block; }
    .qr-caption { font-size: 11px; color: #9E9FAE; margin-top: 8px; }

    .divider {
      border: none; border-top: 1px solid #E5EAF0;
      margin: 28px 0;
    }
  </style>
</head>
<body>
<div class="card">

  <div class="logo-row">
    <div class="logo-icon">F</div>
    <span class="logo-text">Flow<span>Forge</span></span>
  </div>

  <h1>iOS Shortcuts Setup</h1>
  <p class="subtitle">
    Build a one-tap Shortcut on your iPhone to forward supplier messages to FlowForge in seconds —
    no app-switching, no copy-paste.
  </p>

  <!-- Webhook URL -->
  <div class="webhook-box">
    <div class="webhook-label">Webhook URL</div>
    <div class="webhook-row">
      <div class="webhook-url" id="webhookUrl">${webhookUrl}</div>
      <button class="btn btn-outline btn-copy" onclick="copyWebhook()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
    </div>
    <span id="copy-feedback">✓ Copied to clipboard</span>
  </div>

  <!-- Action buttons -->
  <div class="actions">
    <a href="${openInShortcutsUrl}" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      Open in Shortcuts
    </a>
  </div>
  <div class="open-note">
    <strong>Note:</strong> The "Open in Shortcuts" button uses a <code>shortcuts://import-shortcut?url=…</code>
    deep link. iOS requires a binary <code>.shortcut</code> file at that URL to auto-import.
    A pre-built shortcut file is not yet available — use the five-step guide below to build it manually (takes ~2 minutes).
  </div>

  <hr class="divider" />

  <!-- Step-by-step guide -->
  <ol class="steps">
    <li class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <div class="step-title">Add a URL action</div>
        <div class="step-desc">
          In the Shortcuts app tap <strong>+</strong> to create a new shortcut, then tap
          <strong>Add Action</strong> and search for <strong>URL</strong>.
          Paste in the webhook URL above.
        </div>
      </div>
    </li>
    <li class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <div class="step-title">Add a "Get Contents of URL" action (POST)</div>
        <div class="step-desc">
          Search for and add the <strong>Get Contents of URL</strong> action.
          Expand it and set <strong>Method</strong> to <code>POST</code>.
        </div>
      </div>
    </li>
    <li class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <div class="step-title">Add request headers</div>
        <div class="step-desc">
          Inside "Get Contents of URL" tap <strong>Headers</strong> → <strong>Add new header</strong>.<br />
          Add two headers:
          <pre>Content-Type: application/json
Authorization: Bearer &lt;your-device-token&gt;</pre>
          Copy your device token from FlowForge → Settings → Chat Channels.
        </div>
      </div>
    </li>
    <li class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <div class="step-title">Set the JSON body</div>
        <div class="step-desc">
          Set <strong>Request Body</strong> to <code>JSON</code> and add these keys:
          <pre>{
  "senderRaw": "Supplier Name",
  "messageText": "Shortcut Input",
  "channel": "whatsapp"
}</pre>
          For <code>messageText</code> insert the <strong>Shortcut Input</strong> magic variable
          (tap the field, then the magic variable icon ✦) so the shortcut captures whatever text
          you share into it.
        </div>
      </div>
    </li>
    <li class="step">
      <div class="step-num">5</div>
      <div class="step-body">
        <div class="step-title">Add an If / notification action</div>
        <div class="step-desc">
          Optionally add an <strong>If</strong> action checking that the result is not empty,
          then a <strong>Show Notification</strong> action with title <code>Captured!</code>
          so you get confirmation on your wrist or lock screen.
        </div>
      </div>
    </li>
  </ol>

  <hr class="divider" />

  <!-- QR code -->
  <div class="qr-section">
    <div class="qr-label">Scan from a Mac to copy the webhook URL</div>
    <div class="qr-wrap">
      ${svgQr}
    </div>
    <div class="qr-caption">Points to: <code style="font-size:10px;">${webhookUrl}</code></div>
  </div>

</div>

<script>
  function copyWebhook() {
    var url = document.getElementById('webhookUrl').textContent.trim();
    var feedback = document.getElementById('copy-feedback');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() { showFeedback(feedback); }).catch(function() { fallbackCopy(url, feedback); });
    } else {
      fallbackCopy(url, feedback);
    }
  }
  function fallbackCopy(text, feedback) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); showFeedback(feedback); } catch(e) { window.prompt('Copy this URL:', text); }
    document.body.removeChild(ta);
  }
  function showFeedback(el) {
    el.style.opacity = '1';
    setTimeout(function() { el.style.opacity = '0'; }, 2000);
  }
</script>
</body>
</html>`;
}
