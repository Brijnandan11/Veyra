import supabase from "../config/supabase.js"

export const getMonitorStats = async (monitorId) => {
    const { data: checks = [], error } = await supabase
        .from("checks")
        .select("status, response_time, checked_at")
        .eq("monitor_id", monitorId)

    if (error) {
        throw error
    }

    const totalChecks = checks.length
    const upChecks = checks.filter((check) => check.status === "up").length
    const downChecks = checks.filter((check) => check.status === "down").length

    const uptimePercentage =
        totalChecks === 0
            ? 0
            : Number(((upChecks / totalChecks) * 100).toFixed(2))

    const responseTimes = checks
        .filter((check) => check.response_time !== null && check.response_time !== undefined)
        .map((check) => Number(check.response_time))

    const averageResponseTime =
        responseTimes.length === 0
            ? 0
            : Number(
                (
                    responseTimes.reduce((sum, time) => sum + time, 0) /
                    responseTimes.length
                ).toFixed(2)
            )

    return {
        totalChecks,
        upChecks,
        downChecks,
        uptimePercentage,
        averageResponseTime
    }
}