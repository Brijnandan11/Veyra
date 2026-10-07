import supabase from "../config/supabase.js"

export const createCheck = async (monitorId, result) => {
    const { data, error } = await supabase
        .from("checks")
        .insert({
            monitor_id: monitorId,
            status: result.status,
            status_code: result.statusCode,
            response_time: result.responseTime,
            error: result.error ?? null
        })
        .select()
        .single()

        if(error){
            throw error
        }
     return data
}

export const getChecksByMonitor = async(monitorId, userId) => {
    const { data, error } = await supabase
      .from("checks")
      .select("*")
      .eq("monitor_id", monitorId)
      .eq("user_id", userId)
      .order("checked_at", { ascending: false })

      if(error){
        throw error
      }

      return data
}