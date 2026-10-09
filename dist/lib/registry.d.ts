/**
 * Central mailing-list registry — single source of truth for every list across every site.
 * Every form on every site resolves its behavior from here by `list_id` (the registry key).
 *
 * ─────────────────────────────────────────────────────────────────
 * PROVIDER-AGNOSTIC BY DESIGN
 * ─────────────────────────────────────────────────────────────────
 * Responder (Rav Mesar) is the *initial* mailing provider.
 * Swapping to Smoove / ActiveTrail / MailerLite / anything else is a
 * one-field change on the affected entries — no site code touched.
 *
 * To migrate a list to a new provider:
 *   1. Open the list in the new provider's UI, grab its ID.
 *   2. Change the entry's `provider` + `external_list_id` here.
 *   3. Add a matching route in Make.com's scenario (by `provider`).
 *   4. Commit, push. Next deploy picks it up everywhere.
 *
 * Registry keys: today they happen to match Responder's numeric list IDs
 * (backward compat with existing forms that carry `data-list-id="6208"`).
 * New entries may use logical slugs — the registry key is a local handle,
 * the real provider-side ID lives in `external_list_id`.
 *
 * Fields:
 *   name              — Hebrew label, for email subject lines + Vercel logs.
 *   provider          — which mailing service hosts this list.
 *   external_list_id  — the ID the provider expects (Responder numeric id, Smoove uuid, etc).
 *   source_site       — key in CRM's ORG_MAP (icf | efitzur | stormeye | scenario | differentiation | tourism | wosh).
 *   form_name         — form_name sent to CRM /api/lead-capture (short slug, <= 100 chars).
 *   product_slug      — optional. If set, CRM creates/matches a deal against this product.
 *   salesperson       — optional label for ownership audit (not used by CRM directly — org default kicks in).
 *   notify_email      — where to send the personal notification email (if notify=true).
 *   notify            — send a Resend email? Usually true for leads, false for newsletter-only.
 *   crm_tags          — tags appended to the CRM contact (not yet wired in /api/lead-capture — future).
 */
/** Supported mailing providers. Extend here when onboarding a new one. */
export type MailingProvider = 'responder' | 'smoove' | 'activetrail' | 'mailerlite';
export interface MailingListConfig {
    name: string;
    provider: MailingProvider;
    external_list_id: string;
    source_site: 'icf' | 'efitzur' | 'stormeye' | 'scenario' | 'differentiation' | 'tourism' | 'wosh';
    form_name: string;
    product_slug?: string;
    salesperson?: string | null;
    notify_email: string;
    notify: boolean;
    crm_tags: string[];
}
/**
 * @deprecated Use `MailingListConfig`. Kept as alias for backward compat
 * with sites/code that imported `ListConfig` before the v0.2 rename.
 */
export type ListConfig = MailingListConfig;
export declare const MAILING_LISTS: Record<string, MailingListConfig>;
/**
 * @deprecated Use `MAILING_LISTS`. Kept as alias for backward compat
 * with sites/code that imported `LISTS` before the v0.2 rename.
 */
export declare const LISTS: Record<string, MailingListConfig>;
/** Look up a mailing-list config. Returns a safe default for unknown IDs so the handler never crashes. */
/**
 * True when this list's provider id belongs to a list in the registry. The
 * direct Rav Messer path uses an account-wide key that can write to EVERY list
 * in the account, so it only ever writes to lists named here; anything else a
 * caller types (a purchasers list, an internal list) is not subscribed
 * directly (Codex review, 09.10.2026).
 */
export declare function isRegisteredList(list: MailingListConfig): boolean;
export declare function resolveList(listId: string): MailingListConfig;
//# sourceMappingURL=registry.d.ts.map