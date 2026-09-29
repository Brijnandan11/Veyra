import supabase from "../config/supabase.js"

export const createMonitor = async (monitorData) => {

    const { data, error } = await supabase
        .from("monitors")
        .insert(monitorData)
        .select()
        .single()

    if (error) {
        throw error
    }

    return data
}

export const getMonitors = async () => {
    const { data, error } = await supabase
        .from("monitors")
        .select("*")

    if (error) {
        throw error
    }

    return data
}

export const getMonitor = async (id) => {
    const { data, error } = await supabase
        .from("monitors")
        .select()
        .eq("id", id)
        .single()

    if (error) {
        throw error
    }

    return data
}

export const updateMonitor = async (id, monitorData) => {
    const { data, error } = await supabase
        .from("monitors")
        .update(monitorData)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw error
    }

    return data
}

export const deleteMonitor = async (id) => {
    const { data, error } = await supabase
    .from("monitors")
    .delete()
    .eq("id", id)
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