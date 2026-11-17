import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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

async function testInsert() {
  // Test insert without is_featured
  const { data, error } = await sb.from("gallery_items").insert({
    title: "Test",
    image_path: "/test.jpg",
    semester: 1,
    category: "Akademik",
    taken_on: "2024-09-15"
  }).select();

  console.log("Insert result:", { data, error });

  if (data && data[0]) {
    console.log("Available columns in gallery_items:", Object.keys(data[0]));
    // delete test row
    await sb.from("gallery_items").delete().eq("id", data[0].id);
  }
}

testInsert();
