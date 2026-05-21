import { DEFAULT_ALERT_RULE_SETTINGS, settingsToAlertRules } from "@/server/conception/alert-rule-settings";

/** Static defaults for docs/tests; live UI uses DB-backed settings via buildConceptionOverview. */
export const CONCEPTION_ALERT_RULES = settingsToAlertRules(DEFAULT_ALERT_RULE_SETTINGS);
