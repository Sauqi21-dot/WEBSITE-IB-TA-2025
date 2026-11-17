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

async function seedInitialGallery() {
  const { data: existing } = await sb.from("gallery_items").select("id");
  if (existing && existing.length > 0) {
    console.log(`Database already has ${existing.length} gallery items.`);
    return;
  }

  const { data: adminUser } = await sb.from("profiles").select("id").eq("role", "super_admin").single();

  const toInsert = INITIAL_GALLERY_ITEMS.map((item) => ({
    title: item.title,
    caption: item.caption,
    image_path: item.image_path,
    semester: item.semester,
    category: item.category,
    taken_on: item.taken_on,
    uploaded_by: adminUser?.id || null,
    archived: false,
  }));

  const { data, error } = await sb.from("gallery_items").insert(toInsert).select();
  if (error) {
    console.error("Error inserting initial gallery items:", error.message);
  } else {
    console.log(`Successfully seeded ${data.length} gallery items to DB!`);
  }
}

seedInitialGallery();
