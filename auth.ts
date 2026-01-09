import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authenticateUser } from "@/lib/google-sheets"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        name: { label: "名前", type: "text" },
        password: { label: "パスワード", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.name || !credentials?.password) return null
        
        const name = credentials.name as string
        const password = credentials.password as string

        const user = await authenticateUser(name, password)
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: `${user.role}:${user.team}` 
          }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session }) { return session },
    async jwt({ token }) { return token }
  }
})