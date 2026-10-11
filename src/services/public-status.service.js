import supabase from "../config/supabase.js"

export const publicStatus = async () => {
    const { data, error } = await supabase
        .from("monitors")
        .select("id, name, url, active")
        .eq("is_public", true)

    if (error) {
        throw error
    }

    return data
}
