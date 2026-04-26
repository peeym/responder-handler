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

export const MAILING_LISTS: Record<string, MailingListConfig> = {
  // --- icf.co.il (live on Responder) ---
  '6208':  { name: 'תפוצה פיננסים (ניוזלטר)',      provider: 'responder', external_list_id: '6208',  source_site: 'icf', form_name: 'newsletter',       salesperson: null,   notify_email: 'zurelad@gmail.com', notify: false, crm_tags: ['newsletter'] },
  '7255':  { name: 'לידים — למה לריב',              provider: 'responder', external_list_id: '7255',  source_site: 'icf', form_name: 'book-lead',        salesperson: 'liat', notify_email: 'tzur@icf.co.il',    notify: true,  crm_tags: ['lead', 'book'] },
  '39877': { name: 'לידים — תכנית כלכלית',          provider: 'responder', external_list_id: '39877', source_site: 'icf', form_name: 'financial-plan',   product_slug: 'financial-plan', salesperson: 'liat', notify_email: 'tzur@icf.co.il', notify: true, crm_tags: ['lead', 'financial-plan'] },
  '56384': { name: 'נרשמים לקורס — בלי לחץ (footer)', provider: 'responder', external_list_id: '56384', source_site: 'icf', form_name: 'no-stress-course', salesperson: null,   notify_email: 'zurelad@gmail.com', notify: false, crm_tags: ['course-leads', 'no-stress'] },
  '94930': { name: 'הרצאות אלעד',                   provider: 'responder', external_list_id: '94930', source_site: 'icf', form_name: 'lecture-inquiry',  salesperson: 'tzur', notify_email: 'tzur@icf.co.il',    notify: true,  crm_tags: ['lecture-inquiry'] },

  // --- efitzur.co.il (Phase 3) ---
  'efitzur-newsletter':     { name: 'ניוזלטר אפרת צור (תפוצה כללית אפרת)', provider: 'responder', external_list_id: '2154',  source_site: 'efitzur',        form_name: 'newsletter',       salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['newsletter', 'efitzur'] },
  'efitzur-counseling':     { name: 'לידים לייעוץ אפרת',                   provider: 'responder', external_list_id: '4010',  source_site: 'efitzur',        form_name: 'counseling-lead',  product_slug: 'efitzur-counseling', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true,  crm_tags: ['lead', 'counseling', 'efitzur'] },
  'efitzur-lectures':       { name: 'הרצאות אפרת',                          provider: 'responder', external_list_id: '98479', source_site: 'efitzur',        form_name: 'lecture-inquiry',  product_slug: 'efitzur-lectures',   salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true,  crm_tags: ['lecture-inquiry', 'efitzur'] },

  // --- storm-eye.co.il (Phase 3) ---
  'stormeye-general':       { name: 'לידים עין הסערה (רשימה ארצית)',       provider: 'responder', external_list_id: '79220', source_site: 'stormeye',       form_name: 'storm-eye-lead',   product_slug: 'storm-eye-workshop',         salesperson: 'tzur', notify_email: 'tzur@icf.co.il', notify: true, crm_tags: ['lead', 'stormeye'] },
  'stormeye-exposure':      { name: 'ערבי חשיפה עין הסערה',                provider: 'responder', external_list_id: '87346', source_site: 'stormeye',       form_name: 'exposure-evening', product_slug: 'storm-eye-exposure-evening', salesperson: 'tzur', notify_email: 'tzur@icf.co.il', notify: true, crm_tags: ['event-registration', 'exposure', 'stormeye'] },

  // --- scenario-insurance.co.il (Phase 3) ---
  // NOTE: All 4 forms route to external_list_id 6208 (תפוצה פיננסים, shared with ICF).
  // CRM-side tagging keeps them distinguishable. Will split when migrating to Smoove.
  'scenario-newsletter':    { name: 'ניוזלטר תרחיש',                       provider: 'responder', external_list_id: '6208',  source_site: 'scenario',       form_name: 'newsletter',       salesperson: 'tzur',  notify_email: 'tzur@icf.co.il',      notify: false, crm_tags: ['newsletter', 'scenario'] },
  'scenario-har-habituach': { name: 'לידים הר הביטוח (תרחיש)',             provider: 'responder', external_list_id: '6208',  source_site: 'scenario',       form_name: 'har-habituach',    product_slug: 'har-habituach', salesperson: 'tzur', notify_email: 'tzur@icf.co.il', notify: true,  crm_tags: ['lead', 'scenario', 'har-habituach'] },
  'scenario-maslaka':       { name: 'לידים מסלקה (תרחיש)',                 provider: 'responder', external_list_id: '6208',  source_site: 'scenario',       form_name: 'maslaka',          product_slug: 'maslaka',       salesperson: 'tzur', notify_email: 'tzur@icf.co.il', notify: true,  crm_tags: ['lead', 'scenario', 'maslaka'] },
  'scenario-contact':       { name: 'יצירת קשר תרחיש',                     provider: 'responder', external_list_id: '6208',  source_site: 'scenario',       form_name: 'scenario-contact', salesperson: 'tzur',  notify_email: 'tzur@icf.co.il',      notify: true,  crm_tags: ['lead', 'scenario', 'contact'] },

  // --- differentiation.co.il (Phase 3) ---
  // NOTE: Both forms route to external_list_id 98480 (מובחנות).
  'differentiation-leads':      { name: 'לידים דיפרנציאציה',               provider: 'responder', external_list_id: '98480', source_site: 'differentiation', form_name: 'differentiation-lead', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true,  crm_tags: ['lead', 'differentiation'] },
  'differentiation-newsletter': { name: 'ניוזלטר דיפרנציאציה',             provider: 'responder', external_list_id: '98480', source_site: 'differentiation', form_name: 'newsletter',           salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['newsletter', 'differentiation'] },

  // --- tourism (Phase 3) ---
  'tourism-contact':        { name: 'לידים תיירות — Israel Tour (EN)',     provider: 'responder', external_list_id: '98481', source_site: 'tourism',        form_name: 'tourism-contact',  product_slug: 'israel-tour', salesperson: 'tzur',  notify_email: 'tzur@icf.co.il',      notify: true,  crm_tags: ['lead', 'tourism'] },
};

/**
 * @deprecated Use `MAILING_LISTS`. Kept as alias for backward compat
 * with sites/code that imported `LISTS` before the v0.2 rename.
 */
export const LISTS = MAILING_LISTS;

/** Look up a mailing-list config. Returns a safe default for unknown IDs so the handler never crashes. */
export function resolveList(listId: string): MailingListConfig {
  return MAILING_LISTS[listId] || {
    name: `רשימה ${listId}`,
    provider: 'responder',
    external_list_id: listId,
    source_site: 'icf',
    form_name: 'unknown',
    notify_email: 'zurelad@gmail.com',
    notify: false,
    crm_tags: [],
  };
}
