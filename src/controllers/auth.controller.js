import { register, login } from "../services/auth.service.js"

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

export const loginUser = async (req,res) => {
    try {
        const user = await login(req.body)

        res.status(200).json({
            data: user
        })
    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}