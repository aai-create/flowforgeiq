import { aiUsageTable, db } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { speechToText } from "@workspace/integrations-openai-ai-server/audio";

const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_MAX_COMPLETION_TOKENS = 1024;
const MAX_COMPLETION_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

// These are deliberately marked as estimates. The integration is the billing
// authority and does not provide an exact per-request charge in its response.
const ESTIMATED_INPUT_COST_PER_MILLION_USD = 0.25;
const ESTIMATED_OUTPUT_COST_PER_MILLION_USD = 2;

export type AiOutcome =
  | "success"
  | "refusal"
  | "timeout"
  | "provider_error"
  | "validation_failure";

export type AiErrorCategory = Exclude<AiOutcome, "success">;

export interface AiMetadata {
  orgId: number;
  workflow: string;
  event: string;
  conversationId?: string | null;
  correlationId?: string | null;
}

export interface AiRequest {
  metadata: AiMetadata;
  messages: unknown[];
  model?: string;
  maxCompletionTokens?: number;
  temperature?: number;
  responseFormat?: { type: "json_object" };
  output: "text" | "json";
}

export interface AiTranscriptionRequest {
  metadata: AiMetadata;
  audioBuffer: Buffer;
  format: "wav" | "mp3" | "webm";
}

export type AiResult<T = string> =
  | {
      ok: true;
      outcome: "success";
      value: T;
      retryCount: number;
    }
  | {
      ok: false;
      outcome: AiErrorCategory;
      retryCount: number;
    };

export class AiGatewayError extends Error {
  constructor(
    public readonly category: AiErrorCategory,
    public readonly retryCount: number,
  ) {
    super(`AI request failed: ${category}`);
    this.name = "AiGatewayError";
  }
}

type ProviderUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function errorCategory(error: unknown): AiErrorCategory {
  const candidate = error as { name?: string; code?: string; status?: number; message?: string };
  const message = candidate?.message?.toLowerCase() ?? "";
  if (
    candidate?.name === "AbortError" ||
    candidate?.code === "ETIMEDOUT" ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "timeout";
  }
  return "provider_error";
}

function shouldRetry(error: unknown): boolean {
  const candidate = error as { status?: number; code?: string; message?: string };
  const status = candidate?.status;
  return (
    errorCategory(error) === "timeout" ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    candidate?.code === "ECONNRESET" ||
    candidate?.code === "ENOTFOUND"
  );
}

function estimatedCostMicrousd(usage: ProviderUsage | undefined): number | null {
  if (
    typeof usage?.prompt_tokens !== "number" ||
    typeof usage?.completion_tokens !== "number"
  ) {
    return null;
  }

  return Math.round(
    usage.prompt_tokens * ESTIMATED_INPUT_COST_PER_MILLION_USD +
      usage.completion_tokens * ESTIMATED_OUTPUT_COST_PER_MILLION_USD,
  );
}

async function recordUsage(input: {
  metadata: AiMetadata;
  model: string;
  outcome: AiOutcome;
  errorCategory?: AiErrorCategory;
  latencyMs: number;
  retryCount: number;
  usage?: ProviderUsage;
}): Promise<void> {
  const estimate = estimatedCostMicrousd(input.usage);

  try {
    await db.insert(aiUsageTable).values({
      orgId: input.metadata.orgId,
      provider: "openai",
      model: input.model,
      workflow: input.metadata.workflow,
      event: input.metadata.event,
      conversationId: input.metadata.conversationId ?? null,
      correlationId: input.metadata.correlationId ?? null,
      outcome: input.outcome,
      errorCategory: input.errorCategory ?? null,
      latencyMs: input.latencyMs,
      inputTokens: input.usage?.prompt_tokens ?? null,
      outputTokens: input.usage?.completion_tokens ?? null,
      totalTokens: input.usage?.total_tokens ?? null,
      estimatedCostMicrousd: estimate,
      costEstimateStatus: estimate === null ? "unavailable" : "estimated",
      retryCount: input.retryCount,
    });
  } catch {
    // Telemetry is operationally useful but must never block a product flow.
  }
}

function withTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("AI request timed out") as Error & { code: string };
      error.code = "ETIMEDOUT";
      reject(error);
    }, REQUEST_TIMEOUT_MS);

    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * The single AI gateway entry point. Current OpenAI SDK details are kept here
 * so callers receive uniform limits, failure categories, retry behavior, and
 * privacy-safe telemetry without storing prompts or generated content.
 */
export async function runAi<T = string>(request: AiRequest): Promise<AiResult<T>> {
  const model = request.model ?? DEFAULT_MODEL;
  const maxCompletionTokens = Math.min(
    Math.max(1, request.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS),
    MAX_COMPLETION_TOKENS,
  );
  const startedAt = Date.now();
  let retryCount = 0;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await openai.chat.completions.create(
        {
          model,
          messages: request.messages as never,
          max_completion_tokens: maxCompletionTokens,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.responseFormat ? { response_format: request.responseFormat } : {}),
        },
        { timeout: REQUEST_TIMEOUT_MS },
      );

      const message = response.choices[0]?.message;
      const usage = response.usage as ProviderUsage | undefined;
      const latencyMs = Date.now() - startedAt;

      if (message && "refusal" in message && message.refusal) {
        await recordUsage({
          metadata: request.metadata,
          model,
          outcome: "refusal",
          errorCategory: "refusal",
          latencyMs,
          retryCount,
          usage,
        });
        return { ok: false, outcome: "refusal", retryCount };
      }

      const content = message?.content?.trim() ?? "";
      if (request.output === "json") {
        try {
          const value = JSON.parse(content) as T;
          await recordUsage({
            metadata: request.metadata,
            model,
            outcome: "success",
            latencyMs,
            retryCount,
            usage,
          });
          return { ok: true, outcome: "success", value, retryCount };
        } catch {
          await recordUsage({
            metadata: request.metadata,
            model,
            outcome: "validation_failure",
            errorCategory: "validation_failure",
            latencyMs,
            retryCount,
            usage,
          });
          return { ok: false, outcome: "validation_failure", retryCount };
        }
      }

      await recordUsage({
        metadata: request.metadata,
        model,
        outcome: "success",
        latencyMs,
        retryCount,
        usage,
      });
      return { ok: true, outcome: "success", value: content as T, retryCount };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1 && shouldRetry(error)) {
        retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
    }
  }

  const outcome = errorCategory(lastError);
  await recordUsage({
    metadata: request.metadata,
    model,
    outcome,
    errorCategory: outcome,
    latencyMs: Date.now() - startedAt,
    retryCount,
  });
  return { ok: false, outcome, retryCount };
}

/**
 * Audio transcription shares the gateway's retry, timeout, failure-category,
 * and telemetry rules. Audio providers do not currently return token data, so
 * those usage rows are explicitly marked with an unavailable cost estimate.
 */
export async function transcribeWithAi(
  request: AiTranscriptionRequest,
): Promise<AiResult<string>> {
  const model = "gpt-4o-mini-transcribe";
  const startedAt = Date.now();
  let retryCount = 0;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const transcript = await withTimeout(speechToText(request.audioBuffer, request.format));
      await recordUsage({
        metadata: request.metadata,
        model,
        outcome: "success",
        latencyMs: Date.now() - startedAt,
        retryCount,
      });
      return { ok: true, outcome: "success", value: transcript, retryCount };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1 && shouldRetry(error)) {
        retryCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
  }

  const outcome = errorCategory(lastError);
  await recordUsage({
    metadata: request.metadata,
    model,
    outcome,
    errorCategory: outcome,
    latencyMs: Date.now() - startedAt,
    retryCount,
  });
  return { ok: false, outcome, retryCount };
}

export function requireAiResult<T>(result: AiResult<T>): T {
  if (result.ok) return result.value;
  throw new AiGatewayError(result.outcome, result.retryCount);
}