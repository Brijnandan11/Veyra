import express from 'express'
import {
    createMonitor,
    getMonitors,
    getMonitor,
    updateMonitor,
    deleteMonitor,
    getMonitorStats,
    getChecksByMonitor,
    getMonitorIncidents
} from '../controllers/monitor.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.use(authMiddleware)

router.post("/", createMonitor)
router.get("/", getMonitors)

router.get("/:id/stats", getMonitorStats)
router.get("/:id/checks", getChecksByMonitor)
router.get("/:id/incidents", getMonitorIncidents)

router.get("/:id", getMonitor)

router.patch("/:id", updateMonitor)
router.delete("/:id", deleteMonitor)

export default router