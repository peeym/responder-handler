/**
 * Central LISTS registry — single source of truth for every Responder list.
 * Every form on every site resolves its behavior from here by `list_id`.
 *
 * Fields:
 *   name         — Hebrew label, for email subject lines + Vercel logs.
 *   source_site  — key in CRM's ORG_MAP (icf | efitzur | stormeye | scenario | differentiation | tourism | wosh).
 *   form_name    — form_name sent to CRM /api/lead-capture (short slug, <= 100 chars).
 *   product_slug — optional. If set, CRM creates/matches a deal against this product.
 *   salesperson  — optional label for ownership audit (not used by CRM directly — org default kicks in).
 *   notify_email — where to send the personal notification email (if notify=true).
 *   notify       — send a Resend email? Usually true for leads, false for newsletter-only.
 *   crm_tags     — tags appended to the CRM contact (not yet wired in /api/lead-capture — future).
 */
export interface ListConfig {
  name: string;
  source_site: 'icf' | 'efitzur' | 'stormeye' | 'scenario' | 'differentiation' | 'tourism' | 'wosh';
  form_name: string;
  product_slug?: string;
  salesperson?: string | null;
  notify_email: string;
  notify: boolean;
  crm_tags: string[];
}

export const LISTS: Record<string, ListConfig> = {
  // --- icf.co.il (live) ---
  '6208':  { name: 'תפוצה פיננסים (ניוזלטר)',      source_site: 'icf', form_name: 'newsletter',       salesperson: null,   notify_email: 'zurelad@gmail.com', notify: false, crm_tags: ['newsletter'] },
  '7255':  { name: 'לידים — למה לריב',              source_site: 'icf', form_name: 'book-lead',        salesperson: 'liat', notify_email: 'tzur@icf.co.il',    notify: true,  crm_tags: ['lead', 'book'] },
  '39877': { name: 'לידים — תכנית כלכלית',          source_site: 'icf', form_name: 'financial-plan',   product_slug: 'financial-plan', salesperson: 'liat', notify_email: 'tzur@icf.co.il', notify: true, crm_tags: ['lead', 'financial-plan'] },
  '56384': { name: 'נרשמים לקורס — בלי לחץ (footer)', source_site: 'icf', form_name: 'no-stress-course', salesperson: null,   notify_email: 'zurelad@gmail.com', notify: false, crm_tags: ['course-leads', 'no-stress'] },
  '94930': { name: 'הרצאות אלעד',                   source_site: 'icf', form_name: 'lecture-inquiry',  salesperson: 'tzur', notify_email: 'tzur@icf.co.il',    notify: true,  crm_tags: ['lecture-inquiry'] },

  // --- Placeholders for new lists (Phase 3) ---
  // Replace the fake numeric keys with real list_ids after opening them in Responder UI.
  //
  // efitzur:
  // 'EFI_NEWS_ID':    { name: 'ניוזלטר אפרת צור',       source_site: 'efitzur',        form_name: 'newsletter',       notify_email: 'efrat@efitzur.co.il', notify: false, crm_tags: ['newsletter', 'efitzur'] },
  // 'EFI_LEADS_ID':   { name: 'לידים אפרת צור',         source_site: 'efitzur',        form_name: 'counseling-lead',  notify_email: 'efrat@efitzur.co.il', notify: true,  crm_tags: ['lead', 'counseling'] },
  // 'EFI_LECT_ID':    { name: 'הרצאות אפרת',             source_site: 'efitzur',        form_name: 'lecture-inquiry',  notify_email: 'efrat@efitzur.co.il', notify: true,  crm_tags: ['lecture-inquiry'] },
  //
  // stormeye:
  // 'SE_LEADS_ID':    { name: 'לידים עין הסערה',         source_site: 'stormeye',       form_name: 'storm-eye-lead',   notify_email: 'tzur@icf.co.il',      notify: true,  crm_tags: ['lead', 'stormeye'] },
  // 'SE_EXPOSURE_ID': { name: 'ערבי חשיפה',              source_site: 'stormeye',       form_name: 'exposure-evening', notify_email: 'tzur@icf.co.il',      notify: true,  crm_tags: ['event-registration', 'exposure'] },
  //
  // scenario:
  // 'SC_NEWS_ID':     { name: 'ניוזלטר תרחיש',           source_site: 'scenario',       form_name: 'newsletter',       notify_email: 'tzur@icf.co.il',      notify: false, crm_tags: ['newsletter', 'scenario'] },
  // 'SC_HAR_ID':      { name: 'לידים הר הביטוח',         source_site: 'scenario',       form_name: 'har-habituach',    product_slug: 'har-habituach', notify_email: 'tzur@icf.co.il', notify: true, crm_tags: ['lead', 'insurance', 'har-habituach'] },
  // 'SC_MASL_ID':     { name: 'לידים מסלקה',             source_site: 'scenario',       form_name: 'maslaka',          product_slug: 'maslaka',       notify_email: 'tzur@icf.co.il', notify: true, crm_tags: ['lead', 'insurance', 'maslaka'] },
  // 'SC_CONT_ID':     { name: 'יצירת קשר תרחיש',         source_site: 'scenario',       form_name: 'scenario-contact', notify_email: 'tzur@icf.co.il',      notify: true,  crm_tags: ['lead', 'contact', 'scenario'] },
  //
  // differentiation:
  // 'DIFF_LEADS_ID':  { name: 'לידים דיפרנציאציה',       source_site: 'differentiation', form_name: 'differentiation-lead', notify_email: 'tzur@icf.co.il',  notify: true,  crm_tags: ['lead', 'differentiation'] },
  // 'DIFF_NEWS_ID':   { name: 'ניוזלטר דיפרנציאציה',     source_site: 'differentiation', form_name: 'newsletter',       notify_email: 'tzur@icf.co.il',      notify: false, crm_tags: ['newsletter', 'differentiation'] },
  //
  // tourism:
  // 'TOUR_LEADS_ID':  { name: 'לידים תיירות',            source_site: 'tourism',        form_name: 'tourism-contact',  notify_email: 'tzur@icf.co.il',      notify: true,  crm_tags: ['lead', 'tourism'] },
};

/** Look up a list config. Returns a safe default for unknown IDs so the handler never crashes. */
export function resolveList(listId: string): ListConfig {
  return LISTS[listId] || {
    name: `רשימה ${listId}`,
    source_site: 'icf',
    form_name: 'unknown',
    notify_email: 'zurelad@gmail.com',
    notify: false,
    crm_tags: [],
  };
}
