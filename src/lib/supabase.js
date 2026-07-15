import { createClient } from "@supabase/supabase-js";

// Les valeurs viennent de .env (préfixe VITE_ obligatoire pour être exposé au front).
// La clé publishable/anon est PUBLIQUE : sans danger côté navigateur.
// La sécurité réelle vient des règles RLS dans Supabase (voir schema_chambres.sql).
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && key ? createClient(url, key) : null;

export const supabaseReady = Boolean(url && key);
