import { register, login } from "../services/auth.service.js"

export const registerUser = async (req, res) => {
    try {
        const user = await register(req.body)

        res.status(201).json({
            data: user
        })

    } catch (error) {
        // A user-supplied email that already exists (or other unique
        // constraint violations) is a client conflict, not a server fault.
        if (error.code === "23505") {
            return res.status(409).json({
                error: "An account with this email already exists"
            })
        }

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
        // Unknown email, wrong password, or a missing account are
        // authentication failures — respond 401, not 500.
        if (
            error.message === "Invalid email or password" ||
            error.code === "PGRST116"
        ) {
            return res.status(401).json({
                error: "Invalid email or password"
            })
        }

        res.status(500).json({
            error: error.message
        })
    }
}