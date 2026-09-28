import express from "express"
import { randomUUID } from "node:crypto"
import supabase from "./config/supabase.js"

const app = express()

let monitors = []

app.use(express.json())

app.get('/', (req,res) =>{
    res.json({
        message: "Verya is running"
    })
})

app.get('/api/v1/health',(req, res) =>{
    res.json({
        status: "ok"
    })
})

app.post('/api/v1/monitors',(req,res)=>{
    const monitor = {
        id: randomUUID(),
        ...req.body
    }
    monitors.push(monitor)
    res.json({
        data : monitor
    })
})

app.get('/api/v1/monitors',(req,res)=>{
   res.json({
      data: monitors
   })
})

app.get('/api/v1/monitors/:id',(req,res)=>{

    const monitor =monitors.find(moni => moni.id === req.params.id)

    if(!monitor){
        return res.status(404).json({
            message: "Monitor not found"
        })
    }

    res.json({
        data: monitor
    })
})

app.patch('/api/v1/monitors/:id',(req,res)=>{
    const monitor = monitors.find(moni => moni.id === req.params.id)

    if(!monitor){
        return res.status(404).json({
             message: "Monitor not found"
        })
    }

    Object.assign(monitor, req.body)

    res.json({
        data: monitor
    })
})

app.delete('/api/v1/monitors/:id',(req,res)=>{
    const monitor = monitors.find(moni => moni.id === req.params.id)

    if(!monitor){
        return res.status(404).json({
            message: "Monitor not found"
        })
    }
    monitors = monitors.filter(moni => moni.id !== req.params.id)

    res.json({
        message: "Monitor deleted succesfully"
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