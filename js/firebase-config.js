/* ============================================================
   LOGINN GAMING CAFE — js/firebase-config.js
   Firebase + EmailJS configuration
   ⚠️  REPLACE ALL PLACEHOLDER VALUES BELOW WITH YOUR OWN KEYS
============================================================ */

// ── FIREBASE ──────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDRUsFPSnSgVcQ4IfW5oBskoTAHKbYA38k",
  authDomain:        "loginncafe.firebaseapp.com",
  projectId:         "loginncafe",
  storageBucket:     "loginncafe.firebasestorage.app",
  messagingSenderId: "150781709516",
  appId:             "1:150781709516:web:068b8be122c005a9e28669"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// ── EMAILJS ───────────────────────────────────────────────
// Sign up at emailjs.com → create a service → create two templates
// Template variables used:
//   Customer template : to_name, to_email, ref_id, station, units_label,
//                       date, time, duration, total_price, notes
//   Admin template    : ref_id, name, phone, email, station, units_label,
//                       date, time, duration, total_price, notes
export const EMAILJS_PUBLIC_KEY      = "EiuZCDmlot1IiZCDh";
export const EMAILJS_SERVICE_ID      = "service_zs8s4q7";
export const EMAILJS_CUSTOMER_TMPL   = "template_qf8x4wv";
export const EMAILJS_ADMIN_TMPL      = "template_liri8hu";
export const ADMIN_NOTIFY_EMAIL      = "jijith@loginntvm.in";