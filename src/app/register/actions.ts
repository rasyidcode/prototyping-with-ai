"use server";

import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function registerUser(
  prevState: string | undefined,
  formData: FormData,
) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return "somethingWentWrong";
  }

  try {
    const client = await pool.connect();
    try {
      // Check if email is already taken
      const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existingUser.rows.length > 0) {
        return "errorEmailTaken";
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert user
      await client.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
        [name, email, hashedPassword]
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error registering user:", error);
    return "somethingWentWrong";
  }

  redirect("/login");
}
