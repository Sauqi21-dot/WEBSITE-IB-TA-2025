import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { INITIAL_GALLERY_ITEMS } from "./gallery-and-history-data";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > -1) {
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAndSeedGallery() {
  const { data, error } = await sb.from("gallery_items").select("*");
  console.log("Current gallery count in DB:", data?.length);

  if (!data || data.length === 0) {
    console.log("Seeding initial gallery items to DB...");
    // Ambil user id pengurus (misal M. Zidal atau admin) untuk uploaded_by
    const { data: adminUser } = await sb.from("profiles").select("id").eq("role", "super_admin").single();
    
    const itemsToInsert = INITIAL_GALLERY_ITEMS.map((item) => ({
      title: item.title,
      caption: item.caption,
      image_path: item.image_path,
      semester: item.semester,
      category: item.category,
      taken_on: item.taken_on,
      uploaded_by: adminUser?.id || null,
      is_featured: false,
      archived: false,
    }));

    const { data: inserted, error: insErr } = await sb.from("gallery_items").insert(itemsToInsert).select();
    if (insErr) {
      console.error("Gagal seed gallery:", insErr.message);
    } else {
      console.log(`Berhasil seed ${inserted.length} item galeri ke database!`);
    }
  } else {
    console.log("Gallery items in DB:", data.map((d: any) => ({ id: d.id, title: d.title, image_path: d.image_path })));
  }
}

checkAndSeedGallery();
