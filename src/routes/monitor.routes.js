import express from 'express'
import { createMonitor, getMonitors, getMonitor, updateMonitor, deleteMonitor } from '../controllers/monitor.controller.js'

const router = express.Router()

router.post("/", createMonitor)
router.get("/", getMonitors)
router.get("/:id", getMonitor)
router.patch("/:id", updateMonitor)
router.delete("/:id", deleteMonitor)
export default router