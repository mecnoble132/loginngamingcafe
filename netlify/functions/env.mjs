// Serves runtime config (Supabase + EmailJS) as a small JS snippet so secrets
// never get hardcoded into the client source — values come from Netlify env vars.
const headers = { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300' };

const KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_SERVICE_ID',
  'EMAILJS_CUSTOMER_TMPL',
  'EMAILJS_ADMIN_TMPL',
  'ADMIN_NOTIFY_EMAIL',
];

export default async function handler() {
  const body = KEYS
    .filter(key => process.env[key])
    .map(key => `window.${key}=${JSON.stringify(process.env[key])};`)
    .join('\n');
  return new Response(body, { status: 200, headers });
}
