import { getServerSession } from "next-auth" // v4用のインポート
import { authOptions } from "@/lib/next-auth" // 設定ファイルのインポート
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Home, FileCheck } from "lucide-react"
import { UserNav } from "@/components/UserNav" // 作成したメニュー部品

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ■ v4の書き方に修正
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          
          
          {/* メニュー部品を表示 */}
          <UserNav user={session.user} />
          
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}