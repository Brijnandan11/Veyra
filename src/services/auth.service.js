import supabase from "../config/supabase.js"
import argon2 from "argon2"
import { generateToken } from "../utils/jwt.js"

export const register = async (user) => {

    const { name, email, password } = user

    const hashedPassword = await argon2.hash(password)

    const { data, error } = await supabase
        .from("users")
        .insert({
            name,
            email,
            password: hashedPassword
        })
        .select("id, name, email, created_at")
        .single()

    if (error) {
        throw error
    }

    return data
}

export const login = async (user) => {
    const { email, password } = user

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single()

    if (error) {
        throw error
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
        },token
    }

}
