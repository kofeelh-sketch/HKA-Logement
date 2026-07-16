import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Statistiques simples : on enregistre des "événements"
//  (visite, clic WhatsApp...). Insertion publique, lecture admin.
//  Voir schema_events.sql.
// ------------------------------------------------------------

// Enregistre un événement (silencieux, ne bloque jamais l'app).
export async function logEvent(type, detail) {
  if (!supabaseReady) return;
  try {
    await supabase.from("events").insert({ type, detail: detail || null });
  } catch (e) { /* silencieux */ }
}

// Agrège les événements pour le tableau de bord (admin).
export async function fetchStats() {
  if (!supabaseReady) return null;
  const { data, error } = await supabase.from("events").select("type,created_at");
  if (error) { console.warn("fetchStats:", error.message); return null; }
  const today = new Date().toISOString().slice(0, 10);
  const s = { visites: 0, visitesJour: 0, whatsapp: 0 };
  data.forEach(e => {
    if (e.type === "visite") { s.visites++; if ((e.created_at || "").slice(0, 10) === today) s.visitesJour++; }
    else if (e.type === "whatsapp") s.whatsapp++;
  });
  return s;
}
