/**
 * Rav Messer (Responder) V2 API, direct. Layer 1 of every site that uses this
 * package, since 09.10.2026.
 *
 * WHY
 * ---
 * Until then every site reached Rav Messer through one shared Make.com
 * webhook. From about 23.8.2026 Make delivered nothing: its scenarios were
 * switched off and its Responder connection pointed at the retired Rav Messer
 * system, while the webhook kept answering 200, so every site reported a
 * successful subscription that never happened (inc_1791476692_89b7, found on
 * icf.co.il, which had its own copy of this code). Elad, 09.10.2026: move every
 * site to the direct API, one site at a time, and keep Make as a backup.
 *
 * HOW A SITE MOVES
 * ----------------
 * A site goes direct the moment its Vercel project has the three credentials
 * below. Without them nothing changes: layer 1 still posts to Make. That is
 * what makes it safe for every site pinned to this repo's main branch to pick
 * up this file on its next build.
 *
 * Credentials (account-wide key, account 1000047, the same three values on
 * every site): RESPONDER_CLIENT_ID, RESPONDER_CLIENT_SECRET,
 * RESPONDER_USER_TOKEN. The OAuth call carries them in the body, every other
 * call a Bearer token in a header. Never in a URL.
 *
 * Personal fields are ACCOUNT-level in this account, so the same ids work on
 * every list (verified 09.10.2026 with GET /personal-fields).
 */
const BASE = 'https://graph.responder.live/v2';
// The API sits behind a firewall that refuses requests with no User-Agent.
const UA = 'peeym-responder-handler';
const FIELD = {
    utm_source: 1251,
    utm_medium: 1252,
    utm_campaign: 1253,
    utm_term: 1254,
    utm_content: 1255,
    city: 1257,
    interested_in: 1320,
    ref: 1321,
};
let cached = null;
export function hasRavMesserCredentials() {
    return Boolean(process.env.RESPONDER_CLIENT_ID && process.env.RESPONDER_CLIENT_SECRET && process.env.RESPONDER_USER_TOKEN);
}
async function token() {
    if (!hasRavMesserCredentials())
        return null;
    // The token's lifetime is not documented; refresh after 30 minutes, and on a 401.
    if (cached && Date.now() - cached.at < 30 * 60_000)
        return cached.token;
    const resp = await fetch(`${BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            scope: '*',
            // Must be a number: a string id is refused.
            client_id: Number(process.env.RESPONDER_CLIENT_ID),
            client_secret: process.env.RESPONDER_CLIENT_SECRET,
            user_token: process.env.RESPONDER_USER_TOKEN,
        }),
        signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) {
        console.warn(`[ravmesser] token failed: ${resp.status}`);
        return null;
    }
    const json = (await resp.json());
    const t = json.token || json.access_token || (json.data && json.data.token);
    if (!t) {
        console.warn('[ravmesser] token missing in response');
        return null;
    }
    cached = { token: String(t), at: Date.now() };
    return cached.token;
}
/**
 * Add one person to one list. ok only when Rav Messer accepted the request.
 * rejoin is false on purpose: someone who removed themselves stays removed.
 */
export async function addSubscriberDirect(p) {
    const listId = Number(p.listId);
    if (!Number.isFinite(listId) || listId <= 0)
        return { ok: false, reason: 'no-numeric-list-id' };
    const [first, ...rest] = (p.name || '').trim().split(/\s+/);
    const personal = {};
    for (const [k, v] of Object.entries(p.fields || {})) {
        if (v && String(v).trim())
            personal[String(FIELD[k])] = String(v).trim().slice(0, 250);
    }
    const body = {
        ...(p.email ? { email: p.email } : {}),
        ...(p.phone ? { phone: p.phone } : {}),
        name: p.name || '',
        first: first || '',
        last: rest.join(' '),
        list_ids: [listId],
        ...(Object.keys(personal).length ? { personal_fields: personal } : {}),
        override: true,
        rejoin: false,
    };
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const t = await token();
            if (!t)
                return { ok: false, reason: 'no-token' };
            const resp = await fetch(`${BASE}/subscribers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA, Authorization: `Bearer ${t}` },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(8000),
            });
            if (resp.status === 401 && attempt === 0) {
                cached = null;
                continue;
            }
            if (!resp.ok)
                return { ok: false, reason: `http-${resp.status}` };
            return { ok: true };
        }
        catch (e) {
            return { ok: false, reason: `exception-${e?.name || 'unknown'}` };
        }
    }
    return { ok: false, reason: 'unauthorized' };
}
//# sourceMappingURL=ravmesser.js.map