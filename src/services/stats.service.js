import supabase from "../config/supabase.js"

export const getMonitorStats = async (monitorId) => {
    const { data: checks, error } = await supabase
        .from('checks')
        .select("status, response_time, checked_at")
        .eq("monitor_id", monitorId)

    if (error) {
        throw error
    }

    const totalChecks = checks.length

    const upChecks = checks.filter(
        check => check.status === 'up'
    ).length

    const downChecks = checks.filter(
        check => check.status === 'down'
    ).length

    const uptimePercentage =
        totalChecks === 0
            ? 0
            : (upChecks / totalChecks) * 100

    const responseTime = checks
        .filter(check => check.response_time !== null)
        .map(check => check.response_time)

    const averageResponseTime =
        responseTime.length === 0
            ? 0
            : responseTime.reduce(
                (sum, time) => sum + time,
                0
            ) / responseTime.length

    return {
        totalChecks,
        upChecks,
        downChecks,
        uptimePercentage,
        averageResponseTime
    }
}