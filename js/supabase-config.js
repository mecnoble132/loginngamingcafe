/* ============================================================
   LOGINN GAMING CAFE — js/supabase-config.js
   Supabase + EmailJS configuration
   ⚠️  REPLACE THE PLACEHOLDER VALUES BELOW WITH YOUR OWN PROJECT KEYS
   (Supabase Dashboard → Project Settings → API)
============================================================ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = "https://izbcjbwrchxbqenyozre.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6YmNqYndyY2h4YnFlbnlvenJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTI0MjUsImV4cCI6MjEwNDg2ODQyNX0.Wek6bi8eCYhh6RYCwDmySPwPeGfl1zAJI8dsX6SgHxA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── EMAILJS ───────────────────────────────────────────────
// Unchanged — EmailJS was never tied to Firebase, no migration needed.
export const EMAILJS_PUBLIC_KEY = "EiuZCDmlot1IiZCDh";
export const EMAILJS_SERVICE_ID = "service_zs8s4q7";
export const EMAILJS_CUSTOMER_TMPL = "template_qf8x4wv";
export const EMAILJS_ADMIN_TMPL = "template_liri8hu";
export const ADMIN_NOTIFY_EMAIL = "jijith@loginntvm.in";
