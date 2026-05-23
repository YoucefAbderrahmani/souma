/** Exit 0 when Neon transfer quota is hit so Vercel deploy can still complete. */
export function isNeonTransferQuotaMessage(message) {
  const text = String(message ?? "").toLowerCase();
  return (
    text.includes("exceeded the data transfer quota") ||
    text.includes("data transfer quota") ||
    text.includes("upgrade your plan to increase limits") ||
    text.includes("transfer limit was reached")
  );
}

export function exitBuildScriptOnError(error, label) {
  const message = error?.message || String(error);
  if (isNeonTransferQuotaMessage(message)) {
    console.warn(`[${label}] Neon data transfer quota exceeded; skipping (deploy continues).`);
    process.exit(0);
  }
  console.error(`[${label}]`, message);
  process.exit(1);
}
