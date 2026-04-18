# @peeym/responder-handler

Shared form handler for every Tzur Hadrachot site. One pattern, three layers, many sources.

**Layer 1 →** Make.com webhook → Responder mailing list (by `list_id`)
**Layer 2 →** CRM `/api/lead-capture` (crm.efitzur.co.il) → contact + website_lead row
**Layer 3 →** Resend email notification (only if the list has `notify: true`)

All three layers fire in parallel, non-blocking. If any layer fails, the others still succeed.

## Consumers

| Site | Status |
|------|--------|
| icf-astro | will migrate from local responder.ts |
| efitzur-website | Phase 3 |
| storm-eye-site | Phase 3 |
| scenario insurance | Phase 3 |
| differentiation-site | Phase 3 |
| tourism-astro | Phase 3 |
| wosh | frozen — low priority |

## Install

Each consumer site pulls this module directly from GitHub:

```bash
npm install git+ssh://git@github.com:peeym/responder-handler.git
```

Or pin to a commit:
```bash
npm install git+ssh://git@github.com:peeym/responder-handler.git#<sha>
```

## Use — serverless handler

`api/responder.ts` in each site:

```ts
import { createResponderHandler } from '@peeym/responder-handler';

export default createResponderHandler({
  allowedOrigins: [
    'https://icf.co.il',
    'https://www.icf.co.il',
    'http://localhost:4321',
  ],
  emailFrom: 'ICF Website <noreply@icf.co.il>',
});
```

## Use — browser client

Copy `src/lib/client.js` to `public/js/responder.js` and add a script tag in the layout:

```html
<script src="/js/responder.js" defer></script>
```

Every `<form data-responder data-list-id="NNN">` in the site is then live.

Optional attrs:
- `data-redirect="/thank-you/"` — redirect after success.

## Env vars (per Vercel project)

| Var | Required | Purpose |
|-----|----------|---------|
| `MAKE_WEBHOOK_URL` | ✅ | Shared Make.com webhook (all sites) |
| `CRM_LEAD_ENDPOINT` | ⬜ | Defaults to `https://crm.efitzur.co.il/api/lead-capture` |
| `CRM_LEAD_TOKEN` | ✅ | Shared secret — sent as `x-crm-token` header |
| `RESEND_API_KEY` | Only if any list has `notify:true` | Email notification |

## Registry

`src/lib/registry.ts` — single source of truth for every Responder list.
Adding a new list:
1. Open the list in Responder, grab the numeric ID.
2. Add an entry to `LISTS`:
   ```ts
   'NEW_ID': { name: '...', source_site: 'stormeye', form_name: 'slug', notify_email: '...', notify: true, crm_tags: ['lead'] },
   ```
3. Commit, push. Next deploy of any consumer site picks it up.

## Collaboration

`peeym/responder-handler` private repo. `efitzur` is a collaborator. SSH remote.
Any change here cascades to all 7 sites on next install. Tag releases for stability.
