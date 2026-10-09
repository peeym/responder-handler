export { createResponderHandler, dispatchLead } from './api/responder.js';
export { MAILING_LISTS, LISTS, resolveList } from './lib/registry.js';
// The direct Rav Messer client, for sites with a lead path of their own
// (storm-eye's site signup and discovery-workshop registration), so every
// site reaches Rav Messer through one engine. 09.10.2026.
export { addSubscriberDirect, hasRavMesserCredentials } from './lib/ravmesser.js';
//# sourceMappingURL=index.js.map