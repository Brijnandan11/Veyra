import cron from "node-cron"
import { getActiveMonitors } from "../services/monitor.service.js"
import { checkUrl } from "../services/health.service.js"
import { createCheck } from "../services/check.service.js"
import { getOpenIncident, createIncident, resolveIncident } from "../services/incident.service.js"
import {
    sendMonitorDownEmail,
    sendMonitorRecoveredEmail,
} from "../services/email.service.js"

const lastChecked = new Map()

cron.schedule("* * * * *", async () => {
    try {
        const monitors = await getActiveMonitors()

        for (const monitor of monitors) {
            try {
                const now = Date.now()
                const lastCheck = lastChecked.get(monitor.id) ?? 0
                const intervalMs = monitor.interval * 1000

                if (now - lastCheck < intervalMs) {
                    continue
                }

                lastChecked.set(monitor.id, Date.now())

                const result = await checkUrl(monitor.url)

                await createCheck(monitor.id, result)

                const incident = await getOpenIncident(monitor.id)

                if (result.status === "down" && !incident) {
                    await createIncident(monitor.id)
                    await sendMonitorDownEmail(monitor)
                }

                if (result.status === "up" && incident) {
                    await resolveIncident(incident.id)
                    await sendMonitorRecoveredEmail(monitor)
                }

                console.log(monitor.name, result)

            } catch (error) {
                console.error(
                    `Failed to check ${monitor.name}:`,
                    error.message
                )
            }
        }

    } catch (error) {
        console.error("Scheduler error:", error.message)
    }
})
