import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  speechToText: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  aiUsageTable: { name: "ai_usage" },
  db: { insert: mocks.insert },
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: { create: mocks.create },
    },
  },
}));

vi.mock("@workspace/integrations-openai-ai-server/audio", () => ({
  speechToText: mocks.speechToText,
}));

import { runAi } from "../ai-gateway";

const metadata = {
  orgId: 42,
  workflow: "test_workflow",
  event: "test_event",
  conversationId: "conversation-42",
  correlationId: "correlation-42",
};

function completion(content: string, usage?: Record<string, number>) {
  return {
    choices: [{ message: { content } }],
    usage,
  };
}

describe("AI gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.values.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: mocks.values });
  });

  it("records only metadata and measurements for a successful structured request", async () => {
    mocks.create.mockResolvedValueOnce(completion('{"matched":true}', {
      prompt_tokens: 40,
      completion_tokens: 5,
      total_tokens: 45,
    }));

    const prompt = "Highly confidential supplier message: never persist this.";
    const result = await runAi<{ matched: boolean }>({
      metadata,
      messages: [{ role: "user", content: prompt }],
      maxCompletionTokens: 500,
      responseFormat: { type: "json_object" },
      output: "json",
    });

    expect(result).toEqual({ ok: true, outcome: "success", value: { matched: true }, retryCount: 0 });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 42,
      workflow: "test_workflow",
      event: "test_event",
      conversationId: "conversation-42",
      correlationId: "correlation-42",
      inputTokens: 40,
      outputTokens: 5,
      totalTokens: 45,
      estimatedCostMicrousd: 20,
      costEstimateStatus: "estimated",
      outcome: "success",
    }));
    expect(JSON.stringify(mocks.values.mock.calls[0][0])).not.toContain(prompt);
  });

  it("marks an estimate unavailable when the provider omits token data", async () => {
    mocks.create.mockResolvedValueOnce(completion("ready"));

    await runAi({
      metadata,
      messages: [{ role: "user", content: "private prompt" }],
      output: "text",
    });

    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostMicrousd: null,
      costEstimateStatus: "unavailable",
    }));
  });

  it("retries a transient provider failure once and records the retry count", async () => {
    mocks.create
      .mockRejectedValueOnce({ status: 429, message: "rate limited" })
      .mockResolvedValueOnce(completion("recovered"));

    const result = await runAi({
      metadata,
      messages: [{ role: "user", content: "retry" }],
      output: "text",
    });

    expect(result).toEqual({ ok: true, outcome: "success", value: "recovered", retryCount: 1 });
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ retryCount: 1 }));
  });

  it.each([
    ["invalid JSON", completion("not json"), "validation_failure"],
    ["refusal", { choices: [{ message: { content: null, refusal: "Cannot help" } }] }, "refusal"],
    ["timeout", { code: "ETIMEDOUT", message: "request timed out" }, "timeout"],
    ["provider error", { status: 400, message: "bad request" }, "provider_error"],
  ])("categorizes %s without storing provider error details", async (_name, response, outcome) => {
    if (outcome === "validation_failure" || outcome === "refusal") {
      mocks.create.mockResolvedValueOnce(response);
    } else {
      mocks.create.mockRejectedValue(response);
    }

    const result = await runAi({
      metadata,
      messages: [{ role: "user", content: "do not store this message" }],
      output: outcome === "validation_failure" ? "json" : "text",
    });

    expect(result).toMatchObject({ ok: false, outcome });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      outcome,
      errorCategory: outcome,
    }));
    expect(JSON.stringify(mocks.values.mock.calls.at(-1)?.[0])).not.toContain("do not store this message");
  });
});