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

  // --- efitzur.co.il webinar + course landing pages (2026-08-04) ---
  //
  // Until these existed, every course and webinar page fell back to the ContactForm
  // default and dumped its lead into 4010, so no per-list Rav-Messer sequence ever fired.
  //
  // PROVENANCE of external_list_id: Efrat read each one off the live Rav-Messer account
  // by hand. Two (course-consulting, muvchanut-men) came from PR #1 instead; both are
  // corroborated by the 2026-04-24 account snapshot, which names 2662 "לידים קורס יועצות"
  // and 6391 "לידים מובחנות גברים". Every one of the 21 resolves to a list whose name in
  // that snapshot matches its purpose, and each points at the INTEREST list rather than
  // the purchasers list (84398 "מתעניינים ליבת גברים", not 84399 "ליבת גברים 1").
  //
  // A repeated id is deliberate, not a typo: webinars on one topic share a list and are
  // told apart by form_name (bugs + sleep-angry both feed 2889).
  //
  // notify: paid courses ping Efrat per lead. Webinars and free lead magnets do not,
  // because the volume would bury her. This reverses PR #1, which set notify:false on the
  // paid courses too; that PR is superseded by this one.
  'efitzur-course-cheshek':          { name: 'גילוי החשק', provider: 'responder', external_list_id: '2199', source_site: 'efitzur', form_name: 'course-cheshek', product_slug: 'efitzur-course-cheshek', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-consulting':       { name: 'קורס ליועצות', provider: 'responder', external_list_id: '2662', source_site: 'efitzur', form_name: 'course-consulting', product_slug: 'efitzur-course-consulting', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-education16':      { name: 'אני אדבר איתה', provider: 'responder', external_list_id: '27629', source_site: 'efitzur', form_name: 'course-education16', product_slug: 'efitzur-course-education16', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-kalot':            { name: 'קורס לכלות', provider: 'responder', external_list_id: '2654', source_site: 'efitzur', form_name: 'course-kalot', product_slug: 'efitzur-course-kalot', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-kalot-free':       { name: 'כלות — חינם', provider: 'responder', external_list_id: '2661', source_site: 'efitzur', form_name: 'course-kalot-free', product_slug: 'efitzur-course-kalot-free', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'free'] },
  'efitzur-course-libat-gvarim':     { name: 'ליבת הזוגיות — קבוצת גברים', provider: 'responder', external_list_id: '84398', source_site: 'efitzur', form_name: 'course-libat-gvarim', product_slug: 'efitzur-course-libat-gvarim', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-love-space':       { name: 'מקום לאהבה', provider: 'responder', external_list_id: '39640', source_site: 'efitzur', form_name: 'course-love-space', product_slug: 'efitzur-course-love-space', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-miniut':           { name: 'תשוקה בנישואין', provider: 'responder', external_list_id: '2195', source_site: 'efitzur', form_name: 'course-miniut', product_slug: 'efitzur-course-miniut', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-muvchanut':        { name: 'קורס מובחנות', provider: 'responder', external_list_id: '4817', source_site: 'efitzur', form_name: 'course-muvchanut', product_slug: 'efitzur-course-muvchanut', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-tashuka-free':     { name: 'מחסלי התשוקה', provider: 'responder', external_list_id: '2619', source_site: 'efitzur', form_name: 'course-tashuka-free', product_slug: 'efitzur-course-tashuka-free', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'free'] },
  'efitzur-course-tikshoret':        { name: 'תקשורת זוגית', provider: 'responder', external_list_id: '2196', source_site: 'efitzur', form_name: 'course-tikshoret', product_slug: 'efitzur-course-tikshoret', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-course-tikshoret-free':   { name: 'תקשורת למה לא זורם — חינמי', provider: 'responder', external_list_id: '2660', source_site: 'efitzur', form_name: 'course-tikshoret-free', product_slug: 'efitzur-course-tikshoret-free', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'free'] },
  'efitzur-muvchanut-men':           { name: 'מובחנות לגברים', provider: 'responder', external_list_id: '6391', source_site: 'efitzur', form_name: 'muvchanut-men', product_slug: 'efitzur-muvchanut-men', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: true, crm_tags: ['efitzur', 'course'] },
  'efitzur-webinar-gehalim':         { name: 'וובינר גחלים לוחשות', provider: 'responder', external_list_id: '50610', source_site: 'efitzur', form_name: 'webinar-gehalim', product_slug: 'efitzur-webinar-gehalim', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-kalot':           { name: 'וובינר לכלות', provider: 'responder', external_list_id: '2868', source_site: 'efitzur', form_name: 'webinar-kalot', product_slug: 'efitzur-webinar-kalot', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-merhav-gvarim':   { name: 'וובינר מרחב בטוח — גברים', provider: 'responder', external_list_id: '93655', source_site: 'efitzur', form_name: 'webinar-merhav-gvarim', product_slug: 'efitzur-webinar-merhav-gvarim', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-merhav-nashim':   { name: 'וובינר מרחב בטוח — נשים', provider: 'responder', external_list_id: '2600', source_site: 'efitzur', form_name: 'webinar-merhav-nashim', product_slug: 'efitzur-webinar-merhav-nashim', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-mitbagrot':       { name: 'וובינר מתבגרות 16-18', provider: 'responder', external_list_id: '26866', source_site: 'efitzur', form_name: 'webinar-mitbagrot', product_slug: 'efitzur-webinar-mitbagrot', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-muvchanut':       { name: 'וובינר מובחנות', provider: 'responder', external_list_id: '6618', source_site: 'efitzur', form_name: 'webinar-muvchanut', product_slug: 'efitzur-webinar-muvchanut', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-tikshoret':       { name: 'וובינר תקשורת זוגית', provider: 'responder', external_list_id: '2889', source_site: 'efitzur', form_name: 'webinar-tikshoret', product_slug: 'efitzur-webinar-tikshoret', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },
  'efitzur-webinar-tkiut':           { name: 'וובינר תקיעות בנישואין', provider: 'responder', external_list_id: '2625', source_site: 'efitzur', form_name: 'webinar-tkiut', product_slug: 'efitzur-webinar-tkiut', salesperson: 'efrat', notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['efitzur', 'webinar'] },

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
