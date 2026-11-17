import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { INITIAL_COURSES, INITIAL_SCHEDULES } from "./courses-and-schedules-data";

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

async function checkAndSeedSchedules() {
  const { data: cData } = await sb.from("courses").select("id, name");
  const { data: sData } = await sb.from("schedules").select("id");

  console.log(`Current DB count: ${cData?.length || 0} courses, ${sData?.length || 0} schedules.`);

  if (!sData || sData.length === 0) {
    console.log("Seeding initial courses and schedules to DB...");
    // 1. Insert courses
    const courseMap: Record<string, string> = {}; // course_name -> course_id

    for (const c of INITIAL_COURSES) {
      const { data: insertedCourse } = await sb
        .from("courses")
        .insert({
          name: c.name,
          semester: c.semester,
          lecturer_name: c.lecturer_name,
        })
        .select()
        .single();

      if (insertedCourse) {
        courseMap[c.name] = insertedCourse.id;
      }
    }

    // 2. Insert schedules
    const schedulesToInsert = INITIAL_SCHEDULES.map((s) => ({
      course_id: courseMap[s.course_name] || null,
      semester: s.semester,
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room,
      notes: s.notes,
      archived: false,
    })).filter((s) => s.course_id !== null);

    const { data: insertedSchedules, error: sErr } = await sb
      .from("schedules")
      .insert(schedulesToInsert)
      .select();

    if (sErr) {
      console.error("Error inserting schedules:", sErr.message);
    } else {
      console.log(`Successfully seeded ${insertedSchedules?.length} schedules to DB!`);
    }
  }
}

checkAndSeedSchedules();
