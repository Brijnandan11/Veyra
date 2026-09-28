export const checkUrl = async (url) => {
    const start = Date.now()

    try {
        const response = await fetch(url)

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
    }
}