import supabase from "../config/supabase.js"

export const getOpenIncident = async (monitorId) => {
    const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("monitor_id", monitorId)
        .eq("status", "open")
        .maybeSingle()

    if (error) {
        throw error
    }
    return data
}

export const createIncident = async (monitorId) => {
    const { data, error } = await supabase
        .from("incidents")
        .insert({
            monitor_id: monitorId,
            status: "open"
        })
        .select()
        .single()

    if (error) {
        throw error
    }
    return data
}

export const resolveIncident = async (incidentId) => {
    const { data, error } = await supabase
        .from("incidents")
        .update({
            status: "resolved",
            resolved_at: new Date().toISOString()
        })
        .eq("id", incidentId)
        .select()
        .single()

    if (error) {
        throw error
    }
    return data

}

