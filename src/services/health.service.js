export const checkUrl = async (url) => {
    const start = Date.now()

    const controller = new AbortController()

    const timeout = setTimeout(() =>{
        controller.abort()
    },10000)

    try {
        const response = await fetch(url,
            {
                signal: controller.signal()
            }
        )

        const responseTime = Date.now() - start

        return {
            status: response.ok ? "up" : "down",
            statusCode: response.status,
            responseTime
        }

    } catch (error) {
        const responseTime = Date.now() - start

        return {
            status: "down",
            statusCode: null,
            responseTime,
            error: error.message
        }
    }finally{
        clearTimeout(timeout)
    }
}