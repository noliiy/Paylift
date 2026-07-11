import * as crypto from "crypto";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function splitCentsEqually(totalCents: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents % parts;
  return Array.from(
    { length: parts },
    (_, i) => base + (i < remainder ? 1 : 0),
  );
}

export function isLockExpired(lockExpiresAt: Date | null | undefined): boolean {
  if (!lockExpiresAt) return true;
  return lockExpiresAt.getTime() <= Date.now();
}

export function itemTotalCents(
  unitPriceCents: number,
  quantity: number,
  modifierDelta = 0,
): number {
  return unitPriceCents * quantity + modifierDelta;
}
