export { createResponderHandler, dispatchLead } from './api/responder.js';
export type {
  ResponderHandlerOptions,
  DispatchLeadInput,
  DispatchLeadOptions,
  DispatchLeadResult,
} from './api/responder.js';

export { MAILING_LISTS, LISTS, resolveList } from './lib/registry.js';
export type { MailingProvider, MailingListConfig, ListConfig } from './lib/registry.js';
