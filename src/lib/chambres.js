import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Couche d'accès aux chambres (Supabase)
//  Fait le pont entre les colonnes DB (snake_case) et l'objet
//  utilisé par la maquette (camelCase).
// ------------------------------------------------------------

// Ligne DB  ->  objet app
export function rowToChambre(r) {
  return {
    id: r.id,
    nom: r.nom,
    quartier: r.quartier,
    type: r.type || "Chambre",
    cap: r.cap ?? 1,
    note: r.note != null ? Number(r.note) : 4.8,
    avis: r.avis ?? 0,
    prixNuit: r.prix_nuit ?? 0,
    prixJour: r.prix_jour ?? 0,
    prixSoiree: r.prix_soiree ?? 0,
    feats: r.feats || [],
    actif: r.actif !== false,
    photos: r.photos || [],
    videoUrl: r.video_url || null,
    video: !!r.video_url || !!r.video,
    clim: r.clim || "non",
    supplementClim: r.supplement_clim ?? 0,
    description: r.description || "",
  };
}

// Objet app  ->  colonnes DB (pour insert / update)
export function chambreToRow(c) {
  return {
    nom: c.nom,
    quartier: c.quartier,
    ville: "Dakar",
    type: c.type || "Chambre",
    cap: c.cap ?? 1,
    note: c.note ?? 4.8,
    avis: c.avis ?? 0,
    prix_nuit: c.prixNuit ?? 0,
    prix_jour: c.prixJour ?? 0,
    prix_soiree: c.prixSoiree ?? 0,
    feats: c.feats || [],
    actif: c.actif !== false,
    photos: c.photos || [],
    video_url: c.videoUrl || null,
    video: !!c.video || !!c.videoUrl,
    clim: c.clim || "non",
    supplement_clim: c.supplementClim ?? 0,
    description: c.description || null,
  };
}

// Lecture. Renvoie un tableau, ou null si Supabase indisponible
// (le composant garde alors les données de démo).
// - Public (anon) : seules les chambres actives (RLS).
// - Admin connecté : toutes (actives + inactives).
export async function fetchChambres() {
  if (!supabaseReady) return null;
  const { data, error } = await supabase
    .from("chambres")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("fetchChambres:", error.message);
    return null;
  }
  return data.map(rowToChambre);
}

// Création (nécessite une session admin — RLS).
export async function createChambre(c) {
  const { data, error } = await supabase
    .from("chambres")
    .insert(chambreToRow(c))
    .select()
    .single();
  if (error) throw error;
  return rowToChambre(data);
}

// Modification (nécessite une session admin — RLS).
export async function updateChambre(id, c) {
  const { data, error } = await supabase
    .from("chambres")
    .update(chambreToRow(c))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToChambre(data);
}

// Suppression (nécessite une session admin — RLS).
export async function removeChambre(id) {
  const { error } = await supabase.from("chambres").delete().eq("id", id);
  if (error) throw error;
}
