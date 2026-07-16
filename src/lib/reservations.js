import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Réservations (demandes clients) enregistrées dans Supabase.
//  Insertion publique ; lecture et gestion réservées à l'admin.
//  Porte aussi chambre_id + dates + créneaux pour le blocage auto.
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
    chambreId: r.chambre_id || null,
    dateDebut: r.date_debut || null,
    dateFin: r.date_fin || null,
    creneaux: r.creneaux || [],
  };
}

export async function createReservation(r) {
  if (!supabaseReady) return { ...r, id: r.id || Date.now() };
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      chambre_nom: r.chambre, quartier: r.quartier,
      client_nom: r.nom, client_tel: r.tel,
      mode: r.mode, resume: r.resume, total: r.total ?? 0,
      moyen_paiement: r.pay, garanti: !!r.garanti, statut: r.statut,
      chambre_id: r.chambreId || null,
      date_debut: r.dateDebut || null,
      date_fin: r.dateFin || null,
      creneaux: r.creneaux || null,
    })
    .select()
    .single();
  if (error) { console.warn("createReservation:", error.message); return { ...r, id: r.id || Date.now() }; }
  return rowToResa(data);
}

export async function fetchReservations() {
  if (!supabaseReady) return [];
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.warn("fetchReservations:", error.message); return []; }
  return data.map(rowToResa);
}

export async function updateReservationStatut(id, statut, garanti) {
  if (!supabaseReady) return;
  const { error } = await supabase
    .from("reservations")
    .update({ statut, garanti })
    .eq("id", id);
  if (error) throw error;
}
