import supabase from "../config/supabase.js"

export const getMonitorStats = async (monitorId) => {
    const { data, error } = await supabase
        .from("checks")
        .select("status, response_time")
        .eq("monitor_id", monitorId)

    if (error) {
        throw error
    }

    const totalChecks = data.length
    const successfulChecks = data.filter((check) => check.status === "up").length
    const averageResponseTime = totalChecks
        ? data.reduce((sum, check) => sum + Number(check.response_time || 0), 0) / totalChecks
        : 0

    return {
        totalChecks,
        successfulChecks,
        uptimePercentage: totalChecks ? (successfulChecks / totalChecks) * 100 : 0,
        averageResponseTime
    }
}
