// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const ENV_URL  = import.meta.env.VITE_SUPABASE_URL;
const ENV_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Dev-фолбэк: используем хардкоды ТОЛЬКО в режиме разработки.
// В продакшне обязателен .env/Vercel ENV.
const DEV_URL  = "https://sqirjcfgqoybskqdiltw.supabase.co";
const DEV_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxaXJqY2ZncW95YnNrcWRpbHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTQyOTEsImV4cCI6MjA3Nzg3MDI5MX0.BDSS-gH341YGWb0usM34EoUxJEloFKVursoJtolkesA";

const url  = ENV_URL  ?? (import.meta.env.DEV ? DEV_URL  : undefined);
const anon = ENV_ANON ?? (import.meta.env.DEV ? DEV_ANON : undefined);

if (!url || !anon) {
  // Не роняем билд, но даём понятный сигнал в консоли.
  console.error(
    "[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY не заданы. " +
    "Задай переменные окружения (Vercel Project → Settings → Environment Variables)."
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    flowType: "pkce",          // корректный обмен кода на сессию (лучше для HashRouter)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,  // ловим код/ошибку из URL после редиректа
    // storageKey: "rexant-auth", // при желании — свой ключ в localStorage
  },
});
