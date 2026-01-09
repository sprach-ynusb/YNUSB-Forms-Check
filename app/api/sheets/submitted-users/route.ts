import { auth } from "@/auth"
import { getSubmittedUsers } from "@/lib/google-sheets"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // 認証チェック
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const emails = await getSubmittedUsers()
    return NextResponse.json({ emails, count: emails.length })
  } catch (error) {
    console.error("提出済みユーザー取得エラー:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "データ取得に失敗しました" },
      { status: 500 }
    )
  }
}



