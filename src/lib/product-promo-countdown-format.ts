/** Countdown string for promo timers (shared by image pills and price-row line). */
export function formatPromoCountdownRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) {
    return `${days}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
