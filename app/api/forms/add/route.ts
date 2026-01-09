import { google } from "googleapis"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

function getSheetsClient() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
    throw new Error("Credentials missing")
  }
  privateKey = privateKey.replace(/\\n/g, "\n").replace(/^["']|["']$/g, "")
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
  }
  privateKey = privateKey.replace(/\n{3,}/g, "\n\n")

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return google.sheets({ version: "v4", auth })
}

function extractSpreadsheetId(input: string): string {
  if (!input) return ""
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match && match[1] ? match[1] : input
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // creator を受け取るように追加
    const { name, formUrl, sheetUrl, target, deadline, creator } = body

    if (!name || !sheetUrl || !creator) {
      return NextResponse.json({ success: false, error: "必須項目が足りません" }, { status: 400 })
    }

    const managementId = process.env.GOOGLE_MANAGEMENT_SHEET_ID
    if (!managementId) {
      return NextResponse.json({ success: false, error: "管理シートIDが設定されていません" }, { status: 500 })
    }

    const sheetId = extractSpreadsheetId(sheetUrl)
    const sheets = getSheetsClient()

    // フォーム一覧シートに追加（F列に creator を追加）
    await sheets.spreadsheets.values.append({
      spreadsheetId: managementId,
      range: "フォーム一覧!A:F", // 範囲をFまで拡張
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [name, sheetId, formUrl, target, deadline, creator]
        ]
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("フォーム追加エラー:", error)
    return NextResponse.json({ success: false, error: "登録に失敗しました" }, { status: 500 })
  }
}