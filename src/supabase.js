import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://metmvipqsgjohkwohijc.supabase.co"
const supabaseKey = "sb_publishable_sxbEt_LuX3o94CEG3ZCioA_clFC1tVC"

export const supabase = createClient(supabaseUrl, supabaseKey)  