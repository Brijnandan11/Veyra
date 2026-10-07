import supabase from "../config/supabase.js"

export const createMonitor = async (monitorData, userId) => {

    const { data, error } = await supabase
        .from("monitors")
        .insert({
            ...monitorData,
            user_id: userId
        })
        .select()
        .single()

    if (error) {
        throw error
    }

    return data
}

export const getMonitors = async (userId) => {
    const { data, error } = await supabase
        .from("monitors")
        .select("*")
        .eq("user_id", userId)

    if (error) {
        throw error
    }

    return data
}

export const getMonitor = async (id, userId) => {
    const { data, error } = await supabase
        .from("monitors")
        .select()
        .eq("id", id)
        .eq("user_id", userId)
        .single()

    if (error) {
        throw error
    }

    return data
}

export const updateMonitor = async (id, monitorData, userId) => {
    const { data, error } = await supabase
        .from("monitors")
        .update(monitorData)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single()

    if (error) {
        throw error
    }

    return data
}

export const deleteMonitor = async (id, userId) => {
    const { data, error } = await supabase
    .from("monitors")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

    if(error){
        throw error
    }

    return data
}

export const getActiveMonitors = async () => {
    const { data, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("active",true)

    if(error){
        throw error
    }

    return data
}