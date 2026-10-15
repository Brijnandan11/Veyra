import { Resend } from "resend"
import "dotenv/config"

const resend = new Resend(process.env.RESEND_API_KEY)

const to = process.argv[2]

if (!to) {
    console.error("Usage: node src/test-email.js your-email@example.com")
    process.exit(1)
}

if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.error("RESEND_API_KEY or EMAIL_FROM is missing")
    process.exit(1)
}

try {
    const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to,
        subject: "Veyra — Email Test",
        html: `
            <h2>Veyra email notifications are working!</h2>
            <p>This is a test email from your Veyra backend.</p>
        `,
    })

    if (error) {
        console.error("Email failed:", error)
        process.exitCode = 1
    } else {
        console.log("Email accepted by Resend:", data?.id)
    }
} catch (error) {
    console.error("Email test failed:", error.message)
    process.exitCode = 1
}