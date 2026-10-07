import express from "express"
import supabase from "./config/supabase.js"
import monitorRoutes from "./routes/monitor.routes.js"
import authRoutes from "./routes/auth.routes.js"

const app = express()

app.use(express.json())

app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/monitors", monitorRoutes)

app.get("/", (req, res) => {
    res.json({
        message: "Veyra is running"
    })
})

app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "ok"
    })
})

app.get("/api/v1/test-db", async (req, res) => {
    const { data, error } = await supabase
        .from("monitors")
        .select("*")

    if (error) {
        return res.status(500).json({
            error: error.message
        })
    }

    res.json({
        data
    })
})

export default app