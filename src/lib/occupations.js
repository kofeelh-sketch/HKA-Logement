import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Disponibilités : occupations (chambre + date + créneau).
//  creneau = 'jour' (12h-20h) ou 'nuit' (20h-12h).
//  Lecture publique ; écriture réservée admin (RLS).
//  Voir schema_disponibilites.sql.
// ------------------------------------------------------------

// Occupations d'une chambre (ou toutes si chambreId omis).
export async function fetchOccupations(chambreId) {
  if (!supabaseReady) return [];
  let q = supabase.from("occupations").select("*");
  if (chambreId) q = q.eq("chambre_id", chambreId);
  const { data, error } = await q;
  if (error) {
    console.warn("fetchOccupations:", error.message);
    return [];
  }
  return data;
}

// Bloque un créneau (admin).
export async function addBlock(chambreId, date, creneau) {
  const { data, error } = await supabase
    .from("occupations")
    .insert({ chambre_id: chambreId, date, creneau, motif: "blocage" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Débloque un créneau (admin).
export async function removeBlock(id) {
  const { error } = await supabase.from("occupations").delete().eq("id", id);
  if (error) throw error;
}

// Bloque plusieurs créneaux d'un coup (utilisé à la confirmation d'une réservation).
// Ignore les créneaux déjà bloqués (pas d'erreur de doublon).
export async function blockOccupations(rows) {
  if (!supabaseReady || !rows || !rows.length) return;
  const { error } = await supabase
    .from("occupations")
    .upsert(rows.map(r => ({ ...r, motif: "reservation" })), { onConflict: "chambre_id,date,creneau", ignoreDuplicates: true });
  if (error) throw error;
}
