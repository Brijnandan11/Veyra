import { createMonitor as createMonitorService, getMonitors as getMonitorsService, getMonitor as getMonitorService, updateMonitor as updateMonitorService, deleteMonitor as deleteMonitorService, getActiveMonitors as getActiveMonitorService } from "../services/monitor.service.js"

import { getMonitorStats as getMonitorStatsService } from "../services/stats.service.js"

import { getChecksByMonitor as getChecksByMonitorService } from "../services/check.service.js"

import { getMonitorIncidents as getMonitorIncidentsService } from "../services/incident.service.js"

export const createMonitor = async (req, res) => {
    try {
        const monitor = await createMonitorService(req.body, req.user.id)

        res.status(201).json({
            data: monitor
        })
    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

export const getMonitors = async (req, res) => {
    try {
        const monitors = await getMonitorsService(req.user.id)

        res.status(200).json({
            data: monitors
        })
    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

export const getMonitor = async (req, res) => {
    try {

        const monitor = await getMonitorService(req.params.id, req.user.id)

        res.status(200).json({
            data: monitor
        })

    } catch (error) {

        if (error.code === "PGRST116") {
            return res.status(404).json({
                error: "Monitor not found"
            })
        }

        res.status(500).json({
            error: error.message
        })
    }
}

export const updateMonitor = async (req, res) => {
    try {
        const monitor = await updateMonitorService(req.params.id, req.body, req.user.id)

        res.status(200).json({
            data: monitor
        })
    } catch (error) {

        if (error.code === "PGRST116") {
            return res.status(404).json({
                error: "Monitor not found"
            })
        }
        res.status(500).json({
            error: error.message
        })
    }
}

export const deleteMonitor = async (req, res) => {
    try {
        const monitor = await deleteMonitorService(req.params.id, req.user.id)

        res.status(200).json({
            message: "Monitor deleted succesfully"
        })
    } catch (error) {

        if (error.code === "PGRST116") {
            return res.status(404).json({
                error: "Monitor not found"
            })
        }

        res.status(500).json({
            error: error.message
        })
    }

}

export const getMonitorStats = async (req, res) => {
    try {
        const stats = await getMonitorStatsService(req.params.id, req.user.id)

        res.status(200).json({
            data: stats
        })
    } catch (error) {
        if (error.code === "PGRST116") {
            return res.status(404).json({
                error: "Monitor not found"
            })
        }
        res.status(500).json({
            error: error.message
        })
    }
}

export const getChecksByMonitor = async (req, res) => {
    try {
        const checks = await getChecksByMonitorService(req.params.id, req.user.id)

        res.status(200).json({
            data: checks
        })
    } catch (error) {
        if (error.code === "PGRST116") {
            return res.status(404).json({
                error: "Monitor not found"
            })
        }
        res.status(500).json({
            error: error.message
        })
    }
}

export const getMonitorIncidents = async (req, res) => {
    try {
        const incidents = await getMonitorIncidentsService(req.params.id, req.user.id)

        res.status(200).json({
            data: incidents
        })
    } catch (error) {
        if (error.code === "PGRST116") {
            return res.status(404).json({
                error: "Monitor not found"
            })
        }
        res.status(500).json({
            error: error.message
        })
    }
}