export type ChainId = string;

export type X402Version = 2;

export type ResourceInfo = {
  url: string;
  description?: string;
  mimeType?: string;
};

export type PaymentRequirements = {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
};

export type PaymentRequired = {
  x402Version: X402Version;
  error?: string;
  resource?: ResourceInfo;
  accepts: PaymentRequirements[];
  extensions?: Record<string, unknown>;
};

export type PaymentPayload = {
  x402Version: X402Version;
  resource?: ResourceInfo;
  accepted: PaymentRequirements;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

export type VerifyResponse = {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
};

export type SettleResponse = {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: string;
};

export type PaymentTerms = {
  requestId: string;
  amountUsd: number;
  currency: "USDC";
  chainId: ChainId;
  recipient: string;
  expiresAt: string;
  resource: string;
  paymentUrl?: string;
  facilitatorHints?: Record<string, string>;
};

export type VerifyOkResult = {
  ok: true;
  txHash: string;
  payer: string;
  amountUsd: number;
  currency: "USDC";
  timestamp: string;
  raw?: unknown;
};

export type VerifyFailResult = {
  ok: false;
  error: string;
};

export type VerifyResult = VerifyOkResult | VerifyFailResult;

export type LocalDemoProof = {
  kind: "local_demo_hmac_v1";
  requestId: string;
  payer: string;
  amountUsd: number;
  currency: "USDC";
  issuedAt: string;
  sig: string;
};

export type AgentDecision = {
  decision: "PAY" | "ABSTAIN";
  reason: string;
  maxAcceptablePriceUsd: number;
  constraints?: string[];
  model?: string;
  rawText?: string;
  source: "gemini" | "fallback";
};

export type AgentRunRequest = {
  goal: "get_signal" | "compute";
  maxSpendUsd: number;
  confidenceMin: number;
  prompt?: string;
};

export type AgentLogEvent = {
  id: string;
  runId: string;
  ts: string;
  type:
    | "RUN_STARTED"
    | "FETCH_1"
    | "RECEIVED_402"
    | "DECISION"
    | "PAYMENT_CREATED"
    | "FETCH_2"
    | "RECEIVED_200"
    | "ABSTAINED"
    | "ERROR";
  data?: Record<string, unknown>;
};

export type AgentRunResponse = {
  runId: string;
  decisionLog: AgentLogEvent[];
  spentUsd: number;
  result?: unknown;
  receipt?: {
    requestId: string;
    txHash: string;
    payer: string;
    amountUsd: number;
    currency: "USDC";
    verifiedAt: string;
    rawProofJson: unknown;
  };
};
