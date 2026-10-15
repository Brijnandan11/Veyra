import supabase from "../config/supabase.js"
import argon2 from "argon2"
import { generateToken } from "../utils/jwt.js"

export const register = async (user) => {

    const { name, email, password } = user

    const hashedPassword = await argon2.hash(password)

    // Check if user already exists before inserting
    const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle()

    if (checkError) {
        if (checkError.code === "PGRST116" || checkError.message?.includes("single JSON object")) {
            throw new Error("Multiple accounts found with this email. Please contact support.")
        }
        throw checkError
    }

    if (existingUser) {
        throw new Error("An account with this email already exists. Try signing in.")
    }

    const { data, error } = await supabase
        .from("users")
        .insert({
            name,
            email,
            password: hashedPassword
        })
        .select("id, name, email, created_at")
        .maybeSingle()

    if (error) {
        // Handle unique constraint violation
        if (error.code === "23505" || error.message?.includes("duplicate key")) {
            throw new Error("An account with this email already exists. Try signing in.")
        }
        throw error
    }

    if (!data) {
        throw new Error("Unable to create user account")
    }

    return data
}

export const login = async (user) => {
    const { email, password } = user

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle()

    if (error) {
        // Handle "Cannot coerce the result to a single JSON object" error
        // This happens when multiple users have the same email (no unique constraint)
        if (error.code === "PGRST116" || error.message?.includes("single JSON object")) {
            throw new Error("Multiple accounts found with this email. Please contact support.")
        }
        throw error
    }

    if (!data) {
        throw new Error("Invalid email or password")
    }

    const passwordValid = await argon2.verify(data.password, password)

    if (!passwordValid) {
        throw new Error("Invalid email or password")
    }

    const token = generateToken(data)

    return {
        user: {
            id: data.id,
            name: data.name,
            email: data.email
        },
        token
    }
}
