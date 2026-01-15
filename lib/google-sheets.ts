import { google } from "googleapis"

export const runtime = "nodejs"

// 型定義
export interface FormStatus {
  formId: string
  formName: string
  formUrl: string
  submitted: boolean
  deadline: string    
  isRequired: boolean 
  creator: string 
}

export interface SubmissionStatus {
  userId: string
  userName: string
  userRole: string
  userTeam: string
  userGroup: string  
  userEmail: string
  forms: FormStatus[]
}

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

async function getSheetData(spreadsheetId: string, range: string): Promise<string[][]> {
  try {
    const sheets = getSheetsClient()
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range })
    return response.data.values || []
  } catch (error) {
    console.warn(`データ取得失敗 ID:${spreadsheetId} Range:${range}`, error)
    return []
  }
}

function normalizeName(name: string): string {
  if (!name) return ""
  return name.replace(/[\s　]+/g, "").trim().toLowerCase()
}

function safeTrim(text: string): string {
  if (!text) return ""
  return text.trim()
}

function extractSpreadsheetId(input: string): string {
  if (!input) return ""
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match && match[1] ? match[1] : input
}

export async function authenticateUser(name: string, password: string) {
  const managementId = process.env.GOOGLE_MANAGEMENT_SHEET_ID
  if (!managementId) return null

  const data = await getSheetData(managementId, "名簿!A:Z")
  if (data.length < 2) return null

  const header = data[0]
  const nameIdx = header.findIndex(c => c.includes("名前") || c.includes("氏名"))
  const passIdx = header.findIndex(c => c.includes("パスワード") || c.includes("PASS"))
  const roleIdx = header.findIndex(c => c.includes("権限"))
  const teamIdx = header.findIndex(c => c.includes("チーム"))
  const groupIdx = header.findIndex(c => c.includes("グループ") || c.includes("Group")) 

  if (nameIdx === -1 || passIdx === -1) return null
  const normalizedInputName = normalizeName(name)
  
  const userRow = data.slice(1).find(row => 
    normalizeName(row[nameIdx]) === normalizedInputName && 
    (row[passIdx] || "") === password
  )

  if (userRow) {
    return {
      id: normalizeName(userRow[nameIdx]),
      name: userRow[nameIdx],
      role: roleIdx !== -1 ? safeTrim(userRow[roleIdx]) : "一般",
      team: teamIdx !== -1 ? safeTrim(userRow[teamIdx]) : "",
      group: groupIdx !== -1 ? safeTrim(userRow[groupIdx]) : "", 
    }
  }
  return null
}

export async function updatePassword(name: string, newPassword: string): Promise<boolean> {
  const managementId = process.env.GOOGLE_MANAGEMENT_SHEET_ID
  if (!managementId) return false
  const sheets = getSheetsClient()
  const data = await getSheetData(managementId, "名簿!A:Z")
  const header = data[0]
  const nameIdx = header.findIndex(c => c.includes("名前"))
  const passIdx = header.findIndex(c => c.includes("パスワード"))
  if (nameIdx === -1 || passIdx === -1) return false
  const normalizedInputName = normalizeName(name)
  const rowIndex = data.findIndex(row => normalizeName(row[nameIdx]) === normalizedInputName)
  if (rowIndex === -1) return false
  const sheetRowNumber = rowIndex + 1
  const columnLetter = String.fromCharCode(65 + passIdx)
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: managementId,
      range: `名簿!${columnLetter}${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newPassword]] }
    })
    return true
  } catch (e) {
    console.error("パスワード更新エラー:", e)
    return false
  }
}

// ■ デバッグ版: フォームのヘッダーをログに出力
export async function calculateSubmissionStatus(viewerName: string, targetFormId?: string): Promise<SubmissionStatus[]> {
  const managementId = process.env.GOOGLE_MANAGEMENT_SHEET_ID
  if (!managementId) throw new Error("環境変数 GOOGLE_MANAGEMENT_SHEET_ID がありません")

  const rosterData = await getSheetData(managementId, "名簿!A:Z")
  const formListData = await getSheetData(managementId, "フォーム一覧!A:Z")

  // 1. フォーム一覧パース
  const forms = formListData.slice(1).map(row => {
    const name = row[0]
    const rawIdInput = row[1] || "" 
    const url = row[2] || ""
    const targetGroups = row[3] ? safeTrim(row[3]) : "" 
    const deadline = row[4] ? safeTrim(row[4]) : ""     
    const creator = row[5] ? safeTrim(row[5]) : ""
    if (!name || !rawIdInput) return null
    const extractedId = extractSpreadsheetId(rawIdInput)
    const isUrlFormat = rawIdInput.includes("http") || rawIdInput.includes("spreadsheets")
    const isSheetName = !isUrlFormat && extractedId.length < 30 
    return { name, id: isSheetName ? managementId : extractedId, sheetName: isSheetName ? extractedId : undefined, url, targetGroups, deadline, creator }
  }).filter(f => f !== null) as { name: string, id: string, sheetName?: string, url: string, targetGroups: string, deadline: string, creator: string }[]

  // 2. 名簿データのパース
  const header = rosterData[0] || []
  const nameIdx = header.findIndex(c => c.includes("名前") || c.includes("氏名"))
  const roleIdx = header.findIndex(c => c.includes("権限"))
  const teamIdx = header.findIndex(c => c.includes("チーム"))
  const groupIdx = header.findIndex(c => c.includes("グループ") || c.includes("Group"))
  const nicknameIdx = header.findIndex(c => 
    c.includes("あだ名") || c.includes("ニックネーム") || c.includes("Nickname") || c.includes("通称") || c.includes("呼称")
  )
  const safeNameIdx = nameIdx === -1 ? 0 : nameIdx

  const allUsers = rosterData.slice(1).map(row => {
    const name = row[safeNameIdx] || "不明"
    const nickname = nicknameIdx !== -1 ? (row[nicknameIdx] || "") : ""
    return {
      rawName: name,
      normalizedName: normalizeName(name),
      normalizedNickname: normalizeName(nickname),
      role: roleIdx !== -1 ? safeTrim(row[roleIdx]) || "一般" : "一般",
      team: teamIdx !== -1 ? safeTrim(row[teamIdx]) || "" : "",
      group: groupIdx !== -1 ? safeTrim(row[groupIdx]) || "" : "", 
      email: ""
    }
  }).filter(u => u.normalizedName !== "")

  // 3. 閲覧者特定
  const normalizedViewerName = normalizeName(viewerName)
  const viewer = allUsers.find(u => u.normalizedName === normalizedViewerName)
  if (!viewer) return []

  // 権限判定
  let targetUsers: typeof allUsers = []
  const isGlobalAdmin = viewer.role.includes("全体") || viewer.role.includes("管理") || viewer.role.includes("admin")
  let isTargetFormCreator = false
  if (targetFormId) {
    const targetForm = forms.find(f => f.id === targetFormId)
    if (targetForm && normalizeName(targetForm.creator) === viewer.normalizedName) {
      isTargetFormCreator = true
    }
  }

  if (isGlobalAdmin || isTargetFormCreator) {
    targetUsers = allUsers
  } else {
    if (viewer.role.includes("リーダー") || viewer.role.includes("Leader")) {
      if (viewer.team) {
        targetUsers = allUsers.filter(u => u.team === viewer.team)
      } else {
        targetUsers = [viewer]
      }
    } else {
      targetUsers = [viewer]
    }
  }

  targetUsers.sort((a, b) => {
    if (a.normalizedName === viewer.normalizedName) return -1
    if (b.normalizedName === viewer.normalizedName) return 1
    return a.normalizedName.localeCompare(b.normalizedName, "ja")
  })

  // 4. 回答状況取得（デバッグ強化版）
  const getSubmittedNames = async (id: string, formName: string, sheetName?: string) => {
    const range = sheetName ? `${sheetName}!A:Z` : "A:Z"
    const data = await getSheetData(id, range)
    if (data.length < 2) return new Set<string>()
    
    const header = data[0]
    
    // ▼ ヘッダーのスペースを除去して正規化してからチェックするように改良
    const normalizedHeader = header.map(h => h.replace(/[\s　]+/g, ""))
    
    // ▼ デバッグログ: フォーム側のヘッダーを表示
    console.log(`[Form: ${formName}] Headers:`, header)

    // 優先度1: 明示的な「名前」
    let nameIdx = normalizedHeader.findIndex(c => 
      c.includes("名前") || c.includes("氏名") || c.includes("Name") || c.includes("name")
    )
    
    // 優先度2: 明示的な「あだ名」
    if (nameIdx === -1) {
      nameIdx = normalizedHeader.findIndex(c => 
        c.includes("あだ名") || 
        c.includes("ニックネーム") || 
        c.includes("Nickname") ||
        c.includes("通称")
      )
    }

    // 優先度3: なければ2列目（Googleフォームの定石）
    if (nameIdx === -1 && header.length > 1) {
      console.log(`[Form: ${formName}] 名前列が見つからないためB列(index 1)を使用します`)
      nameIdx = 1
    }

    const set = new Set<string>()
    if (nameIdx !== -1) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][nameIdx]) set.add(normalizeName(data[i][nameIdx]))
      }
    }
    return set
  }

  const formSubmissions = new Map<string, Set<string>>()
  for (const form of forms) {
    // フォーム名も渡してログに出す
    const set = await getSubmittedNames(form.id, form.name, form.sheetName)
    formSubmissions.set(form.name, set)
  }

  // 5. 組み立て
  return targetUsers.map(user => {
    const userForms = forms.map(form => {
      const submittedSet = formSubmissions.get(form.name)
      let isSubmitted = false
      if (submittedSet) {
        if (submittedSet.has(user.normalizedName)) {
          isSubmitted = true
        } else if (user.normalizedNickname && submittedSet.has(user.normalizedNickname)) {
          isSubmitted = true
        } else {
          for (const submittedName of submittedSet) {
            if (submittedName.includes(user.normalizedName)) {
              isSubmitted = true; break
            }
            if (user.normalizedNickname && submittedName.includes(user.normalizedNickname)) {
              isSubmitted = true; break
            }
          }
        }
      }
      let isRequired = true
      if (form.targetGroups) {
        const allowedGroups = form.targetGroups.split(/[,、\s]+/).map(g => g.trim()).filter(g => g)
        isRequired = allowedGroups.includes(user.group)
      }
      return {
        formId: form.id, formName: form.name, formUrl: form.url, deadline: form.deadline,
        submitted: isSubmitted, isRequired: isRequired, creator: form.creator
      }
    })
    return {
      userId: user.normalizedName, userName: user.rawName, userRole: user.role,
      userTeam: user.team, userGroup: user.group, userEmail: user.email, forms: userForms
    }
  })
}