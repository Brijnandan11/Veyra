import { z } from "zod"

export const createMonitorSchema = z.object({
    name: z.string().trim().min(1),
    url: z.string().url(),
    interval: z.number().int().positive(),
    active: z.boolean().optional()
})

