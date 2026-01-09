import { NextResponse } from "next/server"
import { updatePassword } from "@/lib/google-sheets"
import { getServerSession } from "next-auth" // v4用のインポート
import { authOptions } from "@/lib/next-auth"

// ビルドエラー回避用
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    // ■ v4の書き方に修正
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.name) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 })
    }

    const { newPassword } = await request.json()
    
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json({ error: "パスワードが短すぎます" }, { status: 400 })
    }

    const success = await updatePassword(session.user.name, newPassword)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 })
    }

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 })
  }
}