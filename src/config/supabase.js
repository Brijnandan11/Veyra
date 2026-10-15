import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

// Use secret key for server-side operations (bypasses RLS)
// Fall back to publishable key for backwards compatibility
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseKey) {
    throw new Error("Missing Supabase key: set SUPABASE_SECRET_KEY (preferred) or SUPABASE_PUBLISHABLE_KEY")
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    supabaseKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
)

export default supabase