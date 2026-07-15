import { supabase, supabaseReady } from "./supabase.js";

// ------------------------------------------------------------
//  Upload des médias (photos / vidéo) vers Supabase Storage.
//  Bucket "media" (public en lecture, écriture réservée admin par RLS).
//  Voir schema_storage.sql pour la création du bucket + policies.
// ------------------------------------------------------------

const BUCKET = "media";

// Envoie un fichier et renvoie son URL publique.
export async function uploadMedia(file, prefix = "chambres") {
  if (!supabaseReady) throw new Error("Supabase non configuré");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
