import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Avis clients. Insertion publique ; le public ne lit que les
//  avis approuvés (RLS) ; l'admin lit tout et modère.
//  Voir schema_avis.sql.
// ------------------------------------------------------------

export function rowToAvis(r) {
  return {
    id: r.id,
    chambreId: r.chambre_id || null,
    nom: r.nom || "Client",
    note: r.note || 5,
    commentaire: r.commentaire || "",
    approuve: !!r.approuve,
    date: r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "",
  };
}

// Avis d'une chambre (public = approuvés ; admin = tous).
export async function fetchAvis(chambreId) {
  if (!supabaseReady) return [];
  let q = supabase.from("avis").select("*").order("created_at", { ascending: false });
  if (chambreId) q = q.eq("chambre_id", chambreId);
  const { data, error } = await q;
  if (error) { console.warn("fetchAvis:", error.message); return []; }
  return data.map(rowToAvis);
}

// Tous les avis (admin).
export async function fetchAllAvis() {
  if (!supabaseReady) return [];
  const { data, error } = await supabase.from("avis").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("fetchAllAvis:", error.message); return []; }
  return data.map(rowToAvis);
}

// Laisser un avis (client).
export async function createAvis(a) {
  if (!supabaseReady) throw new Error("Supabase non configuré");
  const { error } = await supabase.from("avis").insert({
    chambre_id: a.chambreId, nom: a.nom, note: a.note, commentaire: a.commentaire,
  });
  if (error) throw error;
}

// Publier / supprimer (admin).
export async function approveAvis(id) {
  const { error } = await supabase.from("avis").update({ approuve: true }).eq("id", id);
  if (error) throw error;
}
export async function removeAvis(id) {
  const { error } = await supabase.from("avis").delete().eq("id", id);
  if (error) throw error;
}
