import type { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * Shared form handler — used by every site (icf, efitzur, stormeye, scenario, etc).
 *
 * 3 layers, all parallel non-blocking:
 *   1. Mailing provider → Rav Messer directly (V2 API) when the site has the
 *      RESPONDER_* credentials, with Make.com as the backup; otherwise Make.com
 *      as before. See src/lib/ravmesser.ts.
 *   2. CRM /api/lead-capture → contact + website_lead row
 *   3. Resend email notification (only if the list has notify === true)
 *
 * ──────────────────────────────────────────────────────────────
 * PROVIDER-AGNOSTIC BY DESIGN — Responder is the initial provider.
 * Layer 1 dispatches based on `list.provider`. When migrating a list to a
 * different mailing service, change `provider` + `external_list_id` in the
 * registry and add a matching route in Make.com — no site code touched.
 * ──────────────────────────────────────────────────────────────
 *
 * Env vars (per Vercel project):
 *   RESPONDER_CLIENT_ID, RESPONDER_CLIENT_SECRET, RESPONDER_USER_TOKEN
 *                       — Rav Messer V2 credentials; with them, layer 1 goes direct
 *   MAKE_WEBHOOK_URL    — the backup (and the only path for a site without the credentials)
 *   CRM_LEAD_ENDPOINT   — https://crm.efitzur.co.il/api/lead-capture
 *   CRM_LEAD_TOKEN      — shared secret, sent as x-crm-token header
 *   RESEND_API_KEY      — only on sites that have any list with notify=true
 */
export interface ResponderHandlerOptions {
    /** Comma-separated list if caller wants to inject origins programmatically (e.g. from siteData). */
    allowedOrigins?: string[];
    /** Override `from` address on the Resend email. Defaults to site-neutral. */
    emailFrom?: string;
}
/**
 * Framework-agnostic lead dispatcher.
 *
 * Use this when calling from Astro APIRoute, Cloudflare Worker, Edge Function,
 * or any context where Vercel's req/res signatures don't apply. Returns plain
 * data; you build the HTTP response in the consumer.
 *
 * The Vercel-specific `createResponderHandler` wraps this internally.
 */
export interface DispatchLeadInput {
    list_id: string;
    name?: string;
    email?: string;
    phone?: string;
    /** City / region. Custom field on the Rav-Messer lists; also appended to the CRM message. */
    city?: string;
    /** What the lead asked about. Custom field on the Rav-Messer lists. */
    interested_in?: string;
    company?: string;
    participants?: string;
    message?: string;
    tags?: string;
    /** Override registry form_name for CRM source tracking. */
    form_name?: string;
    /** Override registry product_slug for CRM deal attribution. */
    product_slug?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    ref?: string;
    /** Caller's referer header (the page URL where the form was submitted). */
    page?: string;
}
export interface DispatchLeadOptions {
    /** Override the From: address on the Resend notification email. */
    emailFrom?: string;
    /** Origin to forward to the CRM (so its CORS gate sees the real site). */
    originForCrm?: string;
}
export interface DispatchLeadResult {
    ok: boolean;
    mailing: boolean;
    crm: boolean;
    email: boolean;
    /** Hebrew error string for known input-validation failures. */
    validationError?: string;
}
export declare function dispatchLead(input: DispatchLeadInput, options?: DispatchLeadOptions): Promise<DispatchLeadResult>;
export declare function createResponderHandler(options?: ResponderHandlerOptions): (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse>;
//# sourceMappingURL=responder.d.ts.map