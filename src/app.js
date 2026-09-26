import express from "express"

const app = express()

app.get('/', (req,res) =>{
    res.json({
        message: "Verya is running"
    })
})

app.get('/health',(req, res) =>{
    res.json({
        status: "OK"
    })
})

app.get('/api/v1/health',(req, res) =>{
    res.json({
        status: "OK"
    })
})

export default app