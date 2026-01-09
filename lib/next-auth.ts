// lib/next-auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { authenticateUser } from "@/lib/google-sheets"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "名前", type: "text" },
        password: { label: "パスワード", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        
        try {
          const user = await authenticateUser(credentials.username, credentials.password)
          if (user) {
            return { id: user.id, name: user.name, email: null }
          }
        } catch (e) {
          console.error(e)
        }
        return null
      }
    })
  ],
  pages: {
    signIn: "/", 
    error: "/",  
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "secret",
}