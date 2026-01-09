import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/next-auth"
import { calculateSubmissionStatus } from "@/lib/google-sheets"

export const runtime = "nodejs"

// Requestオブジェクトを受け取るように変更
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.name) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 })
    }

    // URLから formId パラメータを取得
    const { searchParams } = new URL(req.url)
    const targetFormId = searchParams.get("formId") || undefined

    // 第2引数に targetFormId を渡す
    const statuses = await calculateSubmissionStatus(session.user.name, targetFormId)

    return NextResponse.json({
      statuses,
      currentUserRole: "一般", 
      currentUserTeam: "",
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 })
  }
}