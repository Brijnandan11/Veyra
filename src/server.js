import app from "./app.js"
import "./scheduler/monitor.scheduler.js"

const PORT = process.env.PORT || 3000

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})