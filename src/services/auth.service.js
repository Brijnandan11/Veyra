import supabase from "../config/supabase.js"
import argon2 from "argon2"

export const register = async(user) => {

    const { name, email, password } = user

    const hashedPassword = await argon2.hash(password)

    const { data, error} = await supabase
    .from("users")
    .insert({
        name,
        email,
        hashedPassword
    })
    .select("id, name, email, created_at")
    .single()

    if(error){
        throw error
    }

    return data
}
