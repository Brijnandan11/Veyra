import { publicStatus as publicStatusService } from "../services/public-status.service.js"

export const publicStatus = async (req, res) => {
    try {
        const monitor = await publicStatusService()

        res.status(200).json({
            data: monitor
        })

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}