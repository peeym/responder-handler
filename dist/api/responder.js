import { resolveList, isRegisteredList } from '../lib/registry.js';
import { addSubscriberDirect, hasRavMesserCredentials } from '../lib/ravmesser.js';
// Simple in-memory rate limit (1 submission / 10s / IP). Resets on cold start — good enough for serverless.
const rateLimitMap = new Map();
function buildCorsOrigin(req, allowed) {
    const origin = req.headers.origin || '';
    if (allowed.includes(origin))
        return origin;
    if (origin.startsWith('http://localhost:'))
        return origin;
    return allowed[0] || '*';
}
/**
 * Layer 1 payload — sent to Make.com which routes to the correct mailing provider
 * by looking at `provider` + `external_list_id`. `list_id` is kept for backward
 * compatibility with the existing icf Make.com scenario until it's updated.
 */
function buildProviderPayload(data, list, page) {
    return {
        provider: list.provider,
        external_list_id: list.external_list_id,
        list_id: list.external_list_id, // backward compat — remove after Make.com scenario reads external_list_id
        name: data.name,
        email: data.email,
        phone: data.phone,
        // `city` and `interested_in` are custom fields on the Rav-Messer lists.
        // This payload is a CLOSED field list: anything not named here is cut here,
        // before Make.com ever sees it. Adding a form field is therefore two steps —
        // the form, and this line.
        city: data.city,
        interested_in: data.interested_in,
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
function buildCrmPayload(data, list, page) {
    // Stuff non-schema fields (city, company, participants) into `message` so nothing is lost.
    const extras = [];
    if (data.city)
        extras.push(`עיר/אזור: ${data.city}`);
    if (data.company)
        extras.push(`ארגון: ${data.company}`);
    if (data.participants)
        extras.push(`משתתפים: ${data.participants}`);
    if (data.message)
        extras.push(data.message);
    // Merge registry-defined tags with any caller-supplied test tags
    // (forms can append `tags=test,foo` for QA without touching the registry).
    const callerTags = (data.tags || '')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
    const tags = Array.from(new Set([...(list.crm_tags || []), ...callerTags]));
    // Caller-supplied form_name / product_slug override the registry default.
    // Used by landing pages that share a list but want CRM to track them as a
    // distinct funnel (e.g. course-cheshek vs counseling — both list 4010).
    const formName = data.form_name || list.form_name;
    const productSlug = data.product_slug || list.product_slug || null;
    return {
        name: data.name || null,
        email: data.email || null,
        phone: data.phone || null,
        source_site: list.source_site,
        form_name: formName,
        product_slug: productSlug,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_content: data.utm_content || null,
        utm_term: data.utm_term || null,
        landing_url: page || null,
        referrer_url: data.ref || null,
        message: extras.length ? extras.join('\n') : null,
        tags: tags.length ? tags : undefined,
    };
}
/** Layer 1 through the shared Make.com webhook. True when Make accepted the payload. */
async function postToMake(list, data, page) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!webhookUrl)
        return false;
    try {
        const r = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildProviderPayload(data, list, page)),
            signal: AbortSignal.timeout(10000),
        });
        return r.ok;
    }
    catch {
        return false;
    }
}
/**
 * Dispatch a lead to the list's mailing provider. Returns true on success.
 *
 * Rav Messer goes DIRECT when the site has the credentials (since 09.10.2026).
 * If the direct call fails, the payload also goes to Make as the backup Elad
 * asked to keep: even with its scenario switched off, Make queues what it
 * receives, so the lead can be replayed later. The backup never counts as
 * success. A 200 from Make is not delivery, which is exactly how six weeks of
 * leads disappeared (inc_1791476692_89b7).
 *
 * A site without the credentials keeps the previous behaviour: Make only.
 */
async function dispatchToMailingProvider(list, data, page) {
    if (list.provider === 'responder' && hasRavMesserCredentials() && isRegisteredList(list)) {
        const direct = await addSubscriberDirect({
            listId: list.external_list_id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            fields: {
                city: data.city, interested_in: data.interested_in,
                utm_source: data.utm_source, utm_medium: data.utm_medium, utm_campaign: data.utm_campaign,
                utm_term: data.utm_term, utm_content: data.utm_content, ref: data.ref,
            },
        });
        if (direct.ok)
            return true;
        const queued = await postToMake(list, data, page);
        console.error(`[lead] RAV MESSER DIRECT FAILED site=${list.source_site} list=${list.external_list_id} reason=${direct.reason} make_backup=${queued ? 'queued' : 'unavailable'}`);
        return false;
    }
    switch (list.provider) {
        case 'responder':
        case 'smoove':
        case 'activetrail':
        case 'mailerlite':
            // Route via Make.com — the scenario branches on `provider`.
            return postToMake(list, data, page);
        default: {
            // Exhaustiveness guard — lights up if a new provider is added to the union but not handled here.
            const _exhaustive = list.provider;
            void _exhaustive;
            return false;
        }
    }
}
export async function dispatchLead(input, options = {}) {
    if (!input.list_id) {
        return { ok: false, mailing: false, crm: false, email: false, validationError: 'Missing list_id' };
    }
    if (!input.email && !input.phone) {
        return { ok: false, mailing: false, crm: false, email: false, validationError: 'חובה להשאיר אימייל או טלפון' };
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        return { ok: false, mailing: false, crm: false, email: false, validationError: 'כתובת אימייל לא תקינה' };
    }
    // Trim every string field — registry/CRM expect clean data.
    const data = {};
    for (const [k, v] of Object.entries(input)) {
        if (typeof v === 'string')
            data[k] = v.trim();
    }
    const page = data.page || '';
    const list = resolveList(String(input.list_id));
    const crmUrl = process.env.CRM_LEAD_ENDPOINT || 'https://crm.efitzur.co.il/api/lead-capture';
    const crmToken = process.env.CRM_LEAD_TOKEN;
    const corsOrigin = options.originForCrm || page;
    const layer1 = dispatchToMailingProvider(list, data, page);
    const layer2 = fetch(crmUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(crmToken ? { 'x-crm-token': crmToken } : {}),
            ...(corsOrigin ? { origin: corsOrigin } : {}),
        },
        body: JSON.stringify(buildCrmPayload(data, list, page)),
        signal: AbortSignal.timeout(10000),
    }).then((r) => r.ok).catch(() => false);
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
    const [mailingOk, crmOk, emailOk] = await Promise.all([layer1, layer2, layer3]);
    console.log(`[lead] site=${list.source_site} list=${input.list_id} provider=${list.provider} external_id=${list.external_list_id} (${list.name}) email=${data.email || '—'} phone=${data.phone || '—'} mailing=${mailingOk} crm=${crmOk} email=${emailOk}`);
    return {
        ok: mailingOk || crmOk || emailOk,
        mailing: mailingOk,
        crm: crmOk,
        email: emailOk,
    };
}
export function createResponderHandler(options = {}) {
    const allowedOrigins = options.allowedOrigins ?? [];
    return async function handler(req, res) {
        const corsOrigin = buildCorsOrigin(req, allowedOrigins);
        res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS')
            return res.status(204).end();
        if (req.method !== 'POST')
            return res.status(405).json({ ok: false, error: 'Method not allowed' });
        const data = (req.body || {});
        if (!data.list_id)
            return res.status(400).json({ ok: false, error: 'Missing list_id' });
        const listId = String(data.list_id);
        for (const k of ['name', 'email', 'phone', 'city', 'interested_in', 'company', 'participants', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'message', 'tags', 'form_name', 'product_slug']) {
            data[k] = (data[k] || '').trim();
        }
        const page = req.headers.referer || '';
        if (!data.email && !data.phone) {
            return res.json({ ok: false, error: 'חובה להשאיר אימייל או טלפון' });
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            return res.json({ ok: false, error: 'כתובת אימייל לא תקינה' });
        }
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
        const last = rateLimitMap.get(ip) || 0;
        if (Date.now() - last < 10000)
            return res.json({ ok: false, error: 'נסו שוב בעוד כמה שניות' });
        rateLimitMap.set(ip, Date.now());
        const list = resolveList(listId);
        // --- Kick off all 3 layers in parallel, wait for all to settle ---
        const crmUrl = process.env.CRM_LEAD_ENDPOINT || 'https://crm.efitzur.co.il/api/lead-capture';
        const crmToken = process.env.CRM_LEAD_TOKEN;
        const layer1 = dispatchToMailingProvider(list, data, page);
        const layer2 = fetch(crmUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(crmToken ? { 'x-crm-token': crmToken } : {}),
                // Pass origin so CRM's CORS check sees the site, not the Vercel function.
                'origin': corsOrigin,
            },
            body: JSON.stringify(buildCrmPayload(data, list, page)),
            signal: AbortSignal.timeout(10000),
        }).then((r) => r.ok).catch(() => false);
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
        const [mailingOk, crmOk, emailOk] = await Promise.all([layer1, layer2, layer3]);
        console.log(`[lead] site=${list.source_site} list=${listId} provider=${list.provider} external_id=${list.external_list_id} (${list.name}) email=${data.email || '—'} phone=${data.phone || '—'} mailing=${mailingOk} crm=${crmOk} email=${emailOk}`);
        // UX = success unless ALL three layers failed.
        const ok = mailingOk || crmOk || emailOk;
        // Response keeps `responder` key as alias for `mailing` to avoid breaking existing client code.
        return res.json({ ok, mailing: mailingOk, responder: mailingOk, crm: crmOk, email: emailOk });
    };
}
async function sendNotifyEmail(args) {
    const { apiKey, from, to, list, data, page } = args;
    const subject = `${list.source_site.toUpperCase()} — פנייה חדשה: ${list.name}`;
    const body = [
        'פנייה חדשה מהאתר',
        '══════════════════',
        '',
        data.name ? `שם: ${data.name}` : '',
        data.email ? `אימייל: ${data.email}` : '',
        data.phone ? `טלפון: ${data.phone}` : '',
        data.city ? `עיר/אזור: ${data.city}` : '',
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
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=responder.js.map