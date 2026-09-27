/**
 * Product URLs. BASE points at production so the standalone landing works;
 * inside the main app set BASE to "" and the same paths become relative.
 */
const BASE = "https://traderscare.io";

export const links = {
  register: `${BASE}/register`,
  login: `${BASE}/login`,
  propFirms: `${BASE}/uk/prop-firms`,
  propMatch: `${BASE}/uk/prop-firms/match`,
  tools: `${BASE}/uk/tools`,
  faq: `${BASE}/uk/faq`,
  terms: `${BASE}/uk/legal/terms`,
  offer: `${BASE}/uk/legal/offer`,
} as const;
