import cron from "node-cron"
import { getActiveMonitors } from "../services/monitor.service.js"
import { checkUrl } from "../services/health.service.js"
import { createCheck } from "../services/check.service.js"
import { getOpenIncident, createIncident, resolveIncident } from "../services/incident.service.js"

cron.schedule("* * * * *", async () => {
    try {
        const monitors = await getActiveMonitors()

        for (const monitor of monitors) {
            try {
                const result = await checkUrl(monitor.url)

                await createCheck(monitor.id, result)

                const incident = await getOpenIncident(monitor.id)

                if(result.status === "down" && !incident){
                    await createIncident(monitor.id)
                }

                if(result.status === "down" && incident){

                }

                if(result.status === "up" && incident){
                    await resolveIncident(incident.id)
                }

                if(result.status === "up" && !incident){

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