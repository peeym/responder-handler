import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveList, type ListConfig } from '../lib/registry.js';

/**
 * Shared responder handler — used by every site (icf, efitzur, stormeye, scenario, etc).
 *
 * 3 layers, all parallel non-blocking:
 *   1. Make.com webhook → Responder mailing list (by list_id)
 *   2. CRM /api/lead-capture → contact + website_lead row
 *   3. Resend email notification (only if list.notify === true)
 *
 * Env vars (per Vercel project):
 *   MAKE_WEBHOOK_URL    — required; shared across all sites
 *   CRM_LEAD_ENDPOINT   — https://crm.efitzur.co.il/api/lead-capture
 *   CRM_LEAD_TOKEN      — shared secret, sent as x-crm-token header
 *   RESEND_API_KEY      — only on sites that have any list with notify=true
 *   ALLOWED_ORIGINS     — comma-separated; if absent, defaults to production + localhost
 */

export interface ResponderHandlerOptions {
  /** Comma-separated list if caller wants to inject origins programmatically (e.g. from siteData). */
  allowedOrigins?: string[];
  /** Override `from` address on the Resend email. Defaults to site-neutral. */
  emailFrom?: string;
}

// Simple in-memory rate limit (1 submission / 10s / IP). Resets on cold start — good enough for serverless.
const rateLimitMap = new Map<string, number>();

function buildCorsOrigin(req: VercelRequest, allowed: string[]): string {
  const origin = (req.headers.origin as string | undefined) || '';
  if (allowed.includes(origin)) return origin;
  if (origin.startsWith('http://localhost:')) return origin;
  return allowed[0] || '*';
}

function mapLayer1Payload(data: Record<string, string>, listId: string, page: string) {
  return {
    list_id: listId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    participants: data.participants,
    utm_source: data.utm_source,
    utm_medium: data.utm_medium,
    utm_campaign: data.utm_campaign,
    utm_term: data.utm_term,
    utm_content: data.utm_content,
    ref: data.ref,
    page,
  };
}

function mapLayer2Payload(data: Record<string, string>, list: ListConfig, page: string) {
  // Stuff non-schema fields (company, participants) into `message` so nothing is lost.
  const extras: string[] = [];
  if (data.company) extras.push(`ארגון: ${data.company}`);
  if (data.participants) extras.push(`משתתפים: ${data.participants}`);
  if (data.message) extras.push(data.message);

  return {
    name: data.name || null,
    email: data.email || null,
    phone: data.phone || null,
    source_site: list.source_site,
    form_name: list.form_name,
    product_slug: list.product_slug ?? null,
    utm_source: data.utm_source || null,
    utm_medium: data.utm_medium || null,
    utm_campaign: data.utm_campaign || null,
    utm_content: data.utm_content || null,
    utm_term: data.utm_term || null,
    landing_url: page || null,
    referrer_url: data.ref || null,
    message: extras.length ? extras.join('\n') : null,
  };
}

export function createResponderHandler(options: ResponderHandlerOptions = {}) {
  const allowedOrigins = options.allowedOrigins ?? [];

  return async function handler(req: VercelRequest, res: VercelResponse) {
    const corsOrigin = buildCorsOrigin(req, allowedOrigins);
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')    return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const data = (req.body || {}) as Record<string, string>;
    if (!data.list_id) return res.status(400).json({ ok: false, error: 'Missing list_id' });

    const listId = String(data.list_id);
    for (const k of ['name','email','phone','company','participants','utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','message']) {
      data[k] = (data[k] || '').trim();
    }
    const page = (req.headers.referer as string | undefined) || '';

    if (!data.email && !data.phone) {
      return res.json({ ok: false, error: 'חובה להשאיר אימייל או טלפון' });
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return res.json({ ok: false, error: 'כתובת אימייל לא תקינה' });
    }

    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] || 'unknown';
    const last = rateLimitMap.get(ip) || 0;
    if (Date.now() - last < 10000) return res.json({ ok: false, error: 'נסו שוב בעוד כמה שניות' });
    rateLimitMap.set(ip, Date.now());

    const list = resolveList(listId);

    // --- Kick off all 3 layers in parallel, wait for all to settle ---
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    const crmUrl = process.env.CRM_LEAD_ENDPOINT || 'https://crm.efitzur.co.il/api/lead-capture';
    const crmToken = process.env.CRM_LEAD_TOKEN;

    const layer1 = webhookUrl
      ? fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapLayer1Payload(data, listId, page)),
          signal: AbortSignal.timeout(10000),
        }).then(r => r.ok).catch(() => false)
      : Promise.resolve(false);

    const layer2 = fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(crmToken ? { 'x-crm-token': crmToken } : {}),
        // Pass origin so CRM's CORS check sees the site, not the Vercel function.
        'origin': corsOrigin,
      },
      body: JSON.stringify(mapLayer2Payload(data, list, page)),
      signal: AbortSignal.timeout(10000),
    }).then(r => r.ok).catch(() => false);

    const layer3 = list.notify && process.env.RESEND_API_KEY
      ? sendNotifyEmail({
          apiKey: process.env.RESEND_API_KEY,
          from: options.emailFrom || 'Website <noreply@efitzur.co.il>',
          to: list.notify_email,
          list,
          data,
          page,
        })
      : Promise.resolve(false);

    const [responderOk, crmOk, emailOk] = await Promise.all([layer1, layer2, layer3]);

    console.log(`[lead] site=${list.source_site} list=${listId} (${list.name}) email=${data.email || '—'} phone=${data.phone || '—'} responder=${responderOk} crm=${crmOk} email=${emailOk}`);

    // UX = success unless ALL three layers failed.
    const ok = responderOk || crmOk || emailOk;
    return res.json({ ok, responder: responderOk, crm: crmOk, email: emailOk });
  };
}

async function sendNotifyEmail(args: {
  apiKey: string;
  from: string;
  to: string;
  list: ListConfig;
  data: Record<string, string>;
  page: string;
}): Promise<boolean> {
  const { apiKey, from, to, list, data, page } = args;
  const subject = `${list.source_site.toUpperCase()} — פנייה חדשה: ${list.name}`;
  const body = [
    'פנייה חדשה מהאתר',
    '══════════════════',
    '',
    data.name ? `שם: ${data.name}` : '',
    data.email ? `אימייל: ${data.email}` : '',
    data.phone ? `טלפון: ${data.phone}` : '',
    data.company ? `ארגון: ${data.company}` : '',
    data.participants ? `משתתפים: ${data.participants}` : '',
    data.message ? `הודעה: ${data.message}` : '',
    '',
    `אתר: ${list.source_site}`,
    `מקור: ${list.name}`,
    `דף: ${page}`,
    data.utm_source ? `UTM: ${data.utm_source} / ${data.utm_medium} / ${data.utm_campaign}` : '',
    `זמן: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`,
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [to],
        cc: to !== 'tzur@icf.co.il' ? ['tzur@icf.co.il'] : undefined,
        reply_to: data.email || undefined,
        subject,
        text: body,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
