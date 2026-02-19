import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Debug Log: Check console to see if keys loaded
console.log("🔌 Supabase Init:", {
  URL_Loaded: !!supabaseUrl,
  Key_Loaded: !!supabaseKey,
  URL_Value: supabaseUrl // Should start with https://
});

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase Keys Missing! Check frontend/.env and restart server.");
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");