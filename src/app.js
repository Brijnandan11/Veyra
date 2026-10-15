import "dotenv/config"
import express from "express"
import cors from "cors"
import supabase from "./config/supabase.js"
import monitorRoutes from "./routes/monitor.routes.js"
import authRoutes from "./routes/auth.routes.js"
import publicStatusRoutes from "./routes/public-status.routes.js"
import { authMiddleware } from "./middlewares/auth.middleware.js"

const app = express()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://veyra-green-kappa.vercel.app"
].filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin?.endsWith(".vercel.app")) {
      callback(null, true)
      return
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true
}))
app.use(express.json())

app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/monitors", monitorRoutes)
app.use("/api/v1/public/status", publicStatusRoutes)

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