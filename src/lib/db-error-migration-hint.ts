/**
 * Map Postgres "relation does not exist" errors to actionable migration hints.
 * Avoid matching generic "does not exist" — that hides the real missing object.
 */
export function migrationHintFromDbMessage(message: string): string | null {
  const m = message.toLowerCase();
  if (/relation\s+"sales_micro_event"\s+does not exist/i.test(message)) {
    return 'Missing table "sales_micro_event". In Neon: run drizzle/0003_sales_micro_event.sql, or the full bundle drizzle/apply_all_0001_through_0008.sql.';
  }
  if (/relation\s+"conception_alert"\s+does not exist/i.test(message)) {
    return 'Missing table "conception_alert". Run drizzle/0007_conception_intel.sql, or drizzle/apply_all_0001_through_0008.sql.';
  }
  if (/relation\s+"conception_recommendation"\s+does not exist/i.test(message)) {
    return 'Missing table "conception_recommendation". Run drizzle/0007_conception_intel.sql, or drizzle/apply_all_0001_through_0008.sql.';
  }
  if (/relation\s+"product_analytics_tracking_config"\s+does not exist/i.test(message)) {
    return 'Missing table "product_analytics_tracking_config". Run drizzle/0008_product_analytics_tracking_config.sql, or drizzle/apply_all_0001_through_0008.sql.';
  }
  if (/relation "verification"/i.test(message)) {
    return 'Missing table "verification" (Better Auth). Run drizzle/0000_user_session_account_verification.sql or drizzle/apply_all_0001_through_0008.sql.';
  }
  if (/relation "session"/i.test(message)) {
    return 'Missing table "session". Run drizzle/0000_user_session_account_verification.sql or drizzle/apply_all_0001_through_0008.sql.';
  }
  if (/relation "user"/i.test(message)) {
    return 'Missing table "user". Run drizzle/0000_user_session_account_verification.sql or drizzle/apply_all_0001_through_0008.sql.';
  }
  return null;
}
