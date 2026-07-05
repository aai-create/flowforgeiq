import { Router, type IRouter } from "express";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// bplist-creator is CJS; createRequire lets ESM import it.
const bplistCreator: (obj: unknown) => Buffer = require("bplist-creator");

const router: IRouter = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

// Fixed action UUIDs so WFWorkflowImportQuestions can reference the token Text
// action by a stable key.
const TOKEN_ACTION_UUID = "FF000001-0000-4000-A000-000000000001";
const URL_ACTION_UUID = "FF000002-0000-4000-A000-000000000002";
const SETVARIABLE_UUID = "FF000003-0000-4000-A000-000000000003";
const DOWNLOAD_UUID = "FF000004-0000-4000-A000-000000000004";
const NOTIF_UUID = "FF000005-0000-4000-A000-000000000005";

// Purple (Shortcuts colour picker value for ~#9000FF)
const ICON_COLOR = 4282601983;
// Bolt glyph
const ICON_GLYPH = 59511;

// ─── Helper: Shortcuts text-token string ──────────────────────────────────────
// In the binary plist format Shortcuts uses a special dict for text that can
// embed variable references.  A plain static string can just be the string.
function textToken(str: string): string {
  return str;
}

// Variable reference embedded in text: Shortcuts uses U+FFFC as placeholder
// with an `attachmentsByRange` dict that maps "{offset, 1}" → variable info.
function textWithVariable(
  prefix: string,
  variableName: string,
): {
  Value: {
    string: string;
    attachmentsByRange: Record<string, { OutputName: string; Type: string }>;
  };
  WFSerializationType: string;
} {
  const offset = prefix.length;
  return {
    Value: {
      string: `${prefix}\uFFFC`,
      attachmentsByRange: {
        [`{${offset}, 1}`]: {
          OutputName: variableName,
          Type: "Variable",
        },
      },
    },
    WFSerializationType: "WFTextTokenString",
  };
}

// ─── Shortcut builder ─────────────────────────────────────────────────────────

function buildCaptureShortcut(webhookUrl: string): object {
  return {
    WFWorkflowClientRelease: "2.0",
    WFWorkflowClientVersion: "1268.0.1",
    WFWorkflowMinimumClientVersionString: "900",
    WFWorkflowMinimumClientVersion: 900,

    WFWorkflowIcon: {
      WFWorkflowIconStartColor: ICON_COLOR,
      WFWorkflowIconGlyphNumber: ICON_GLYPH,
    },

    // Accept text from the Share Sheet (e.g. selected text in WhatsApp)
    WFWorkflowInputContentItemClasses: [
      "WFStringContentItem",
      "WFTextContentItem",
    ],
    WFWorkflowTypes: ["ActionExtension"],

    // Prompt for the device token at import time; value is injected into the
    // Text action identified by TOKEN_ACTION_UUID.
    WFWorkflowImportQuestions: [
      {
        Category: "Parameter",
        ParameterKey: TOKEN_ACTION_UUID,
        Text: "Paste your FlowForge device token (Settings → Chat Channels)",
        DefaultValue: "",
      },
    ],

    WFWorkflowActions: [
      // ── 1. Text: device token (pre-filled by ImportQuestion at install) ──
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.gettext",
        WFWorkflowActionParameters: {
          UUID: TOKEN_ACTION_UUID,
          CustomOutputName: "Device Token",
          WFTextActionText: textToken("YOUR_TOKEN_HERE"),
        },
      },

      // ── 2. Save token to a named variable ────────────────────────────────
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.setvariable",
        WFWorkflowActionParameters: {
          UUID: SETVARIABLE_UUID,
          WFVariableName: "DeviceToken",
          WFInput: {
            Value: {
              Type: "ActionOutput",
              OutputName: "Device Token",
              OutputUUID: TOKEN_ACTION_UUID,
            },
            WFSerializationType: "WFTextTokenAttachment",
          },
        },
      },

      // ── 3. Pre-filled webhook URL ─────────────────────────────────────────
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.url",
        WFWorkflowActionParameters: {
          UUID: URL_ACTION_UUID,
          WFURLActionURL: webhookUrl,
        },
      },

      // ── 4. POST to the webhook ────────────────────────────────────────────
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.downloadurl",
        WFWorkflowActionParameters: {
          UUID: DOWNLOAD_UUID,
          WFHTTPMethod: "POST",

          // Reference the URL action output as the target URL
          WFRequestVariable: {
            Value: {
              Type: "ActionOutput",
              OutputName: "URL",
              OutputUUID: URL_ACTION_UUID,
            },
            WFSerializationType: "WFTextTokenAttachment",
          },

          // Headers: Content-Type + Authorization: Bearer {DeviceToken}
          WFHTTPHeaders: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFItemType: 0,
                  WFKey: {
                    Value: { string: "Content-Type" },
                    WFSerializationType: "WFTextTokenString",
                  },
                  WFValue: {
                    Value: { string: "application/json" },
                    WFSerializationType: "WFTextTokenString",
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: {
                    Value: { string: "Authorization" },
                    WFSerializationType: "WFTextTokenString",
                  },
                  WFValue: textWithVariable("Bearer ", "DeviceToken"),
                },
              ],
            },
            WFSerializationType: "WFDictionaryFieldValue",
          },

          // JSON body: senderRaw + messageText (Shortcut Input) + channel
          WFHTTPBodyType: "JSON",
          WFFormValues: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFItemType: 0,
                  WFKey: {
                    Value: { string: "senderRaw" },
                    WFSerializationType: "WFTextTokenString",
                  },
                  WFValue: {
                    Value: { string: "Supplier Name" },
                    WFSerializationType: "WFTextTokenString",
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: {
                    Value: { string: "messageText" },
                    WFSerializationType: "WFTextTokenString",
                  },
                  // Embed the Shortcut Input (share-sheet text) as the value
                  WFValue: {
                    Value: {
                      string: "\uFFFC",
                      attachmentsByRange: {
                        "{0, 1}": {
                          Type: "ExtensionInput",
                        },
                      },
                    },
                    WFSerializationType: "WFTextTokenString",
                  },
                },
                {
                  WFItemType: 0,
                  WFKey: {
                    Value: { string: "channel" },
                    WFSerializationType: "WFTextTokenString",
                  },
                  WFValue: {
                    Value: { string: "whatsapp" },
                    WFSerializationType: "WFTextTokenString",
                  },
                },
              ],
            },
            WFSerializationType: "WFDictionaryFieldValue",
          },
        },
      },

      // ── 5. Show a lock-screen / watch notification ────────────────────────
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.notification",
        WFWorkflowActionParameters: {
          UUID: NOTIF_UUID,
          WFNotificationActionTitle: "Captured!",
          WFNotificationActionBody: "Supplier message sent to FlowForge.",
          WFNotificationActionSound: true,
        },
      },
    ],
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.get("/shortcuts/capture.shortcut", (_req, res) => {
  // Derive the base URL from the request so the webhook URL is always correct
  // for the current deployment (dev vs. production).
  const proto =
    (_req.headers["x-forwarded-proto"] as string | undefined) ?? _req.protocol;
  const host =
    (_req.headers["x-forwarded-host"] as string | undefined) ??
    _req.get("host") ??
    "localhost";
  const baseUrl = `${proto}://${host}`;
  const webhookUrl = `${baseUrl}/api/capture/mobile`;

  const shortcutObj = buildCaptureShortcut(webhookUrl);
  const binary = bplistCreator(shortcutObj);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="FlowForge Capture.shortcut"',
  );
  res.end(binary);
});

export default router;
