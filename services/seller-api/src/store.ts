import fs from "node:fs/promises";
import path from "node:path";

export type ReceiptRow = {
  id: string;
  createdAt: string;
  requestId: string;
  payer: string;
  amountUsd: number;
  txHash: string;
  rawSettlement: unknown;
  clientId?: string;
};

export type SellerState = {
  priceRaiseMode: boolean;
  lastUpdatedAt: string;
};

type DbShape = {
  receipts: ReceiptRow[];
  state: SellerState;
  termsByRequestId: Record<string, string>;
};

export function defaultDbShape(): DbShape {
  const envDefault = (process.env.SELLER_PRICE_RAISE_MODE || "false").toLowerCase() === "true";
  return {
    receipts: [],
    state: { priceRaiseMode: envDefault, lastUpdatedAt: new Date().toISOString() },
    termsByRequestId: {}
  };
}

async function ensureParent(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function loadDb(filePath: string): Promise<DbShape> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as DbShape;
  } catch {
    return defaultDbShape();
  }
}

export async function saveDb(filePath: string, db: DbShape): Promise<void> {
  await ensureParent(filePath);
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}

export async function putTerms(params: {
  dbPath: string;
  requestId: string;
  termsB64: string;
}): Promise<void> {
  const db = await loadDb(params.dbPath);
  db.termsByRequestId[params.requestId] = params.termsB64;
  await saveDb(params.dbPath, db);
}

export async function getTerms(params: {
  dbPath: string;
  requestId: string;
}): Promise<string | undefined> {
  const db = await loadDb(params.dbPath);
  return db.termsByRequestId[params.requestId];
}

export async function addReceipt(params: {
  dbPath: string;
  row: ReceiptRow;
}): Promise<void> {
  const db = await loadDb(params.dbPath);
  db.receipts.unshift(params.row);
  await saveDb(params.dbPath, db);
}

export async function listReceipts(params: { dbPath: string }): Promise<ReceiptRow[]> {
  const db = await loadDb(params.dbPath);
  return db.receipts;
}

export async function getState(params: { dbPath: string }): Promise<SellerState> {
  const db = await loadDb(params.dbPath);
  return db.state;
}

export async function setPriceRaiseMode(params: {
  dbPath: string;
  enabled: boolean;
}): Promise<SellerState> {
  const db = await loadDb(params.dbPath);
  db.state.priceRaiseMode = params.enabled;
  db.state.lastUpdatedAt = new Date().toISOString();
  await saveDb(params.dbPath, db);
  return db.state;
}
