import { register } from "../services/auth.service.js"

export const registerUser = async (req, res) => {
    try {
        const user = await register(req.body)

        res.status(201).json({
            data: user
        })

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}