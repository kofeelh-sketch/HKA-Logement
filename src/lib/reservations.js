import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Réservations (demandes clients) enregistrées dans Supabase.
//  Insertion publique (un client crée sa demande) ; lecture et
//  gestion réservées à l'admin (RLS). Voir schema_reservations.sql.
// ------------------------------------------------------------

export function rowToResa(r) {
  return {
    id: r.id,
    nom: r.client_nom || "",
    tel: r.client_tel || "",
    chambre: r.chambre_nom || "",
    quartier: r.quartier || "",
    mode: r.mode || "sejour",
    resume: r.resume || "",
    total: r.total ?? 0,
    pay: r.moyen_paiement || "",
    garanti: !!r.garanti,
    statut: r.statut || "À confirmer",
    date: r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR") : "",
  };
}

// Crée la réservation. Renvoie l'objet (avec id réel si Supabase, sinon local).
export async function createReservation(r) {
  if (!supabaseReady) return { ...r, id: r.id || Date.now() };
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      chambre_nom: r.chambre, quartier: r.quartier,
      client_nom: r.nom, client_tel: r.tel,
      mode: r.mode, resume: r.resume, total: r.total ?? 0,
      moyen_paiement: r.pay, garanti: !!r.garanti, statut: r.statut,
    })
    .select()
    .single();
  if (error) { console.warn("createReservation:", error.message); return { ...r, id: r.id || Date.now() }; }
  return rowToResa(data);
}

// Liste (admin).
export async function fetchReservations() {
  if (!supabaseReady) return [];
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.warn("fetchReservations:", error.message); return []; }
  return data.map(rowToResa);
}

// Changer le statut (admin).
export async function updateReservationStatut(id, statut, garanti) {
  if (!supabaseReady) return;
  const { error } = await supabase
    .from("reservations")
    .update({ statut, garanti })
    .eq("id", id);
  if (error) throw error;
}
