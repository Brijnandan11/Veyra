import { Resend } from "resend"
import supabase from "../config/supabase.js"

const resend = new Resend(process.env.RESEND_API_KEY)

async function getMonitorOwnerEmail(userId) {
    if (!userId) return null

    const { data, error } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .maybeSingle()

    if (error) throw error

    return data?.email ?? null
}

async function sendEmail({ to, subject, html }) {
    if (!process.env.RESEND_API_KEY) {
        console.error("Email skipped: RESEND_API_KEY is missing")
        return
    }

    if (!process.env.EMAIL_FROM) {
        console.error("Email skipped: EMAIL_FROM is missing")
        return
    }

    const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
    })

    if (error) throw error
}

export async function sendMonitorDownEmail(monitor) {
    try {
        const email = await getMonitorOwnerEmail(monitor.user_id)

        if (!email) {
            console.log(`No owner email for monitor: ${monitor.name}`)
            return
        }

        await sendEmail({
            to: email,
            subject: `🔴 Veyra alert: ${monitor.name} is down`,
            html: `
                <h2>Your monitor is down</h2>
                <p><strong>${escapeHtml(monitor.name)}</strong> is not responding as expected.</p>
                <p>URL: <a href="${escapeHtml(monitor.url)}">${escapeHtml(monitor.url)}</a></p>
                <p>Veyra will notify you when the monitor recovers.</p>
            `,
        })

        console.log(`Down notification sent for ${monitor.name}`)
    } catch (error) {
        console.error(`Failed to send down email for ${monitor.name}:`, error.message)
    }
}

export async function sendMonitorRecoveredEmail(monitor) {
    try {
        const email = await getMonitorOwnerEmail(monitor.user_id)

        if (!email) {
            console.log(`No owner email for monitor: ${monitor.name}`)
            return
        }

        await sendEmail({
            to: email,
            subject: `🟢 Veyra recovery: ${monitor.name} is back up`,
            html: `
                <h2>Your monitor has recovered</h2>
                <p><strong>${escapeHtml(monitor.name)}</strong> is responding again.</p>
                <p>URL: <a href="${escapeHtml(monitor.url)}">${escapeHtml(monitor.url)}</a></p>
            `,
        })

        console.log(`Recovery notification sent for ${monitor.name}`)
    } catch (error) {
        console.error(`Failed to send recovery email for ${monitor.name}:`, error.message)
    }
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char])
}
