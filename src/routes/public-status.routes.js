import express from "express"
import { publicStatus } from "../controllers/public-status.controller.js"

const router = express.Router()

router.get("/", publicStatus)

export default router
