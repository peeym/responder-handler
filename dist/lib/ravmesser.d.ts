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
declare const FIELD: {
    readonly utm_source: 1251;
    readonly utm_medium: 1252;
    readonly utm_campaign: 1253;
    readonly utm_term: 1254;
    readonly utm_content: 1255;
    readonly city: 1257;
    readonly interested_in: 1320;
    readonly ref: 1321;
};
export declare function hasRavMesserCredentials(): boolean;
export interface DirectSubscriber {
    listId: string | number;
    name?: string;
    email?: string;
    phone?: string;
    fields?: Partial<Record<keyof typeof FIELD, string>>;
}
/**
 * Add one person to one list. ok only when Rav Messer accepted the request.
 * rejoin is false on purpose: someone who removed themselves stays removed.
 */
export declare function addSubscriberDirect(p: DirectSubscriber): Promise<{
    ok: boolean;
    reason?: string;
}>;
export {};
//# sourceMappingURL=ravmesser.d.ts.map