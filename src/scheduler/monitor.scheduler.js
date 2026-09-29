import cron from "node-cron"
import { getActiveMonitors } from "../services/monitor.service.js"
import { checkUrl } from "../services/health.service.js"
import { createCheck } from "../services/check.service.js"

cron.schedule("* * * * *", async () => {
    try {
        const monitors = await getActiveMonitors()

        for (const monitor of monitors) {
            try {
                const result = await checkUrl(monitor.url)

                await createCheck(monitor.id, result)
                 
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