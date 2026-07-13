import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { renderShortcutsGuidePage } from "./routes/shortcuts-guide";
import { resolveBaseUrl } from "./lib/resolveBaseUrl";
import { getAuth } from "@clerk/express";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as Express.Request).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.get("/shortcuts", async (req, res) => {
  const baseUrl = resolveBaseUrl(process.env) || `${req.protocol}://${req.hostname}`;
  let isAuthenticated = false;
  try {
    const auth = getAuth(req);
    isAuthenticated = !!auth?.userId;
  } catch {
    // treat as unauthenticated
  }
  const html = await renderShortcutsGuidePage(baseUrl, isAuthenticated);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

app.use("/api", router);

app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: express.NextFunction,
  ) => {
    req.log?.error({ err }, "Unhandled error");
    if (res.headersSent) return;
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? (err as { status: number }).status
        : typeof (err as { statusCode?: unknown })?.statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : (err as { name?: string })?.name === "ZodError"
            ? 400
            : 500;
    const message =
      (err as { name?: string })?.name === "ZodError"
        ? "Invalid request data"
        : (err as { message?: string })?.message || "Internal server error";
    res.status(status).json({ error: message });
  },
);

export default app;
