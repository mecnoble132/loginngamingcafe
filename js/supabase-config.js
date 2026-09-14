/* ============================================================
   LOGINN GAMING CAFE — js/supabase-config.js
   Supabase + EmailJS configuration
   ⚠️  REPLACE THE PLACEHOLDER VALUES BELOW WITH YOUR OWN PROJECT KEYS
   (Supabase Dashboard → Project Settings → API)
============================================================ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.SUPABASE_URL || window.ENV?.SUPABASE_URL || "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── EMAILJS ───────────────────────────────────────────────
export const EMAILJS_PUBLIC_KEY = window.EMAILJS_PUBLIC_KEY || window.ENV?.EMAILJS_PUBLIC_KEY || "YOUR_EMAILJS_PUBLIC_KEY";
export const EMAILJS_SERVICE_ID = window.EMAILJS_SERVICE_ID || window.ENV?.EMAILJS_SERVICE_ID || "YOUR_EMAILJS_SERVICE_ID";
export const EMAILJS_CUSTOMER_TMPL = window.EMAILJS_CUSTOMER_TMPL || window.ENV?.EMAILJS_CUSTOMER_TMPL || "YOUR_EMAILJS_CUSTOMER_TMPL";
export const EMAILJS_ADMIN_TMPL = window.EMAILJS_ADMIN_TMPL || window.ENV?.EMAILJS_ADMIN_TMPL || "YOUR_EMAILJS_ADMIN_TMPL";
export const ADMIN_NOTIFY_EMAIL = window.ADMIN_NOTIFY_EMAIL || window.ENV?.ADMIN_NOTIFY_EMAIL || "admin@example.com";

