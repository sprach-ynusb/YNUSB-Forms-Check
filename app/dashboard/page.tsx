"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmissionStatus } from "@/lib/google-sheets"
import { Loader2, AlertCircle, Settings, ChevronRight, Minus, ArrowUpDown, ExternalLink, Filter, Calendar, Lock } from "lucide-react"

interface SubmissionStatusResponse {
  statuses: SubmissionStatus[]
  currentUserRole: string
  currentUserTeam?: string
}

type SortConfig = {
  key: "name" | "rate"
  direction: "asc" | "desc"
} | null

export default function SubmissionsPage() {
  const router = useRouter()
  const [data, setData] = useState<SubmissionStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // フィルタリング用ステート
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [selectedForm, setSelectedForm] = useState("all")

  // ソート設定
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "rate", direction: "asc" })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/sheets/submission-status")
        
        if (!response.ok) {
          let errorMessage = "データの取得に失敗しました"
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (e) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
          throw new Error(errorMessage)
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error("データ取得エラー:", err)
        setError(err instanceof Error ? err.message : "エラーが発生しました")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // ソートハンドラー
  const handleSort = (key: "name" | "rate") => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" }
      }
      return { key, direction: "asc" }
    })
  }

  // フォーム一覧の取得（新しい順に並び替え）
  const allForms = useMemo(() => {
    if (!data || data.statuses.length === 0) return []
    return [...data.statuses[0].forms].reverse()
  }, [data])

  // 表示するフォーム列の決定
  const targetForms = useMemo(() => {
    if (selectedForm === "all") {
      return allForms
    }
    return allForms.filter(f => f.formId === selectedForm)
  }, [allForms, selectedForm])

  // 提出率計算ヘルパー
  const calculateSubmissionRate = useCallback((userStatus: SubmissionStatus) => {
    const targetFormIds = targetForms.map(f => f.formId)
    const formsToCheck = userStatus.forms.filter(f => targetFormIds.includes(f.formId) && f.isRequired)
    
    if (formsToCheck.length === 0) return 0
    const submittedCount = formsToCheck.filter(f => f.submitted).length
    return Math.round((submittedCount / formsToCheck.length) * 100)
  }, [targetForms])

  // チーム一覧の抽出
  const teams = useMemo(() => {
    if (!data) return []
    const allTeams = data.statuses.map(s => s.userTeam).filter(t => t && t !== "")
    return Array.from(new Set(allTeams)).sort()
  }, [data])

  // メインロジック
  const processedStatuses = useMemo(() => {
    if (!data) return []
    let items = [...data.statuses]

    const currentUserId = data.statuses.length > 0 ? data.statuses[0].userId : null

    // チーム絞り込み
    if (selectedTeam && selectedTeam !== "all") {
      items = items.filter(item => item.userTeam === selectedTeam)
    }

    // ソート処理（自分は常に最上位）
    items.sort((a, b) => {
      if (a.userId === currentUserId) return -1
      if (b.userId === currentUserId) return 1

      if (sortConfig) {
        if (sortConfig.key === "name") {
          const nameA = a.userName || a.userEmail
          const nameB = b.userName || b.userEmail
          return sortConfig.direction === "asc" 
            ? nameA.localeCompare(nameB, "ja") 
            : nameB.localeCompare(nameA, "ja")
        }
        if (sortConfig.key === "rate") {
          const rateA = calculateSubmissionRate(a)
          const rateB = calculateSubmissionRate(b)
          return sortConfig.direction === "asc" ? rateA - rateB : rateB - rateA
        }
      }
      return 0
    })

    return items
  }, [data, selectedTeam, sortConfig, calculateSubmissionRate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold tracking-tight">提出状況</h2></div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />エラーが発生しました
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || data.statuses.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">提出状況</h2>
        <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">データが見つかりませんでした</p></CardContent></Card>
      </div>
    )
  }

  const { statuses, currentUserRole, currentUserTeam } = data
  const myself = statuses[0] 
  const normalize = (s: string) => s ? s.replace(/[\s　]+/g, "").trim().toLowerCase() : ""

  // 管理対象フォームの抽出
  const managedForms = allForms.filter(f => {
    if (!f.creator) return false
    return normalize(f.creator) === normalize(myself.userName)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">提出状況</h2>
        <p className="text-muted-foreground">
          権限: <Badge variant="secondary">{currentUserRole}</Badge>
          {currentUserTeam && <> | チーム: <Badge variant="outline">{currentUserTeam}</Badge></>}
        </p>
      </div>

      {/* 管理者用セクション */}
      {managedForms.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />管理中のフォーム
            </CardTitle>
            <CardDescription>作成したフォームの回答状況をチーム別に確認できます。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {managedForms.map(form => (
                <Button 
                  key={form.formId}
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-start gap-1 w-full bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  onClick={() => router.push(`/dashboard/forms/${form.formId}?name=${encodeURIComponent(form.formName)}`)}
                >
                  <div className="font-semibold text-sm flex items-center gap-1 w-full justify-between">
                    {form.formName}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex w-full justify-between text-xs text-muted-foreground mt-1">
                    <span>作成者: あなた</span>
                    {form.deadline && <span>〆{form.deadline}</span>}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルタリングバー */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">チームで絞り込み</label>
              <div className="relative">
                <select
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="all">全チーム表示</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">フォームを表示</label>
              <div className="relative">
                <select
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  value={selectedForm}
                  onChange={(e) => setSelectedForm(e.target.value)}
                >
                  <option value="all">すべてのフォーム</option>
                  {allForms.map(form => (
                    <option key={form.formId} value={form.formId}>{form.formName}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>提出状況一覧</CardTitle>
          <CardDescription>
            {processedStatuses.length}名のユーザーを表示中
            {selectedForm !== "all" && "（フォーム絞り込み中）"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px] align-top py-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("name")}
                      className="h-8 -ml-3 px-3 hover:bg-accent hover:text-accent-foreground font-semibold"
                    >
                      名前
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  
                  {(currentUserRole.includes("管理") || currentUserRole.includes("admin") || currentUserRole.includes("作成")) && (
                    <>
                      <TableHead className="min-w-[100px] align-top py-4 pt-5">権限</TableHead>
                      <TableHead className="min-w-[100px] align-top py-4 pt-5">チーム</TableHead>
                    </>
                  )}
                  
                  {/* ■ 修正: 対象者かどうかでリンクを出し分ける */}
                  {targetForms.map((form) => {
                    // 自分自身(myself)のこのフォームのステータスを確認
                    const myFormStatus = myself.forms.find(f => f.formId === form.formId)
                    // isRequired が true なら対象者
                    const isTargetForMe = myFormStatus?.isRequired

                    return (
                      <TableHead key={form.formId} className="text-center min-w-[120px] align-top py-4">
                        <div className="flex flex-col items-center gap-1">
                          {isTargetForMe ? (
                            // 対象者ならリンクを表示
                            <a 
                              href={form.formUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 hover:underline hover:text-primary transition-colors font-semibold"
                              title="Googleフォームを開く"
                            >
                              {form.formName}
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                          ) : (
                            // 対象外ならグレーアウトしてリンクなし
                            <div 
                              className="flex items-center justify-center gap-1 text-muted-foreground/50 cursor-not-allowed"
                              title="あなたはこのフォームの対象ではありません"
                            >
                              <span className="font-medium">{form.formName}</span>
                              <Lock className="h-3 w-3 opacity-50" />
                            </div>
                          )}
                          
                          {form.deadline && (
                            <div className="flex items-center text-xs text-muted-foreground font-normal">
                              <Calendar className="h-3 w-3 mr-1" />
                              {form.deadline}
                            </div>
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
                  
                  <TableHead className="text-center min-w-[100px] align-top py-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort("rate")}
                      className="h-8 px-3 hover:bg-accent hover:text-accent-foreground font-semibold"
                    >
                      提出率
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedStatuses.map((userStatus) => {
                  const submissionRate = calculateSubmissionRate(userStatus)
                  const hasUnsubmitted = targetForms.some((tf) => {
                    const f = userStatus.forms.find(uf => uf.formId === tf.formId)
                    return f && !f.submitted && f.isRequired
                  })
                  
                  const isMe = data?.statuses[0]?.userId === userStatus.userId;

                  return (
                    <TableRow
                      key={userStatus.userId}
                      className={`
                        ${hasUnsubmitted ? "bg-red-50 dark:bg-red-950/20" : ""}
                        ${isMe ? "border-l-4 border-l-blue-500 bg-blue-50/50" : ""} 
                      `}
                    >
                      <TableCell className="font-medium">
                        {userStatus.userName || userStatus.userEmail}
                        {isMe && <Badge variant="secondary" className="ml-2 text-[10px]">あなた</Badge>}
                      </TableCell>
                      
                      {(currentUserRole.includes("管理") || currentUserRole.includes("admin") || currentUserRole.includes("作成")) && (
                        <>
                          <TableCell>
                            <Badge variant="secondary">{userStatus.userRole}</Badge>
                          </TableCell>
                          <TableCell>
                            {userStatus.userTeam ? (
                              <Badge variant="outline">{userStatus.userTeam}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </>
                      )}

                      {targetForms.map((tf) => {
                        const form = userStatus.forms.find(f => f.formId === tf.formId)
                        if (!form) return <TableCell key={tf.formId}>-</TableCell>

                        return (
                          <TableCell key={form.formId} className="text-center">
                            {!form.isRequired ? (
                              <div className="text-muted-foreground/30 flex justify-center w-full" title="対象外">
                                <Minus className="h-5 w-5" />
                              </div>
                            ) : form.submitted ? (
                              <Badge variant="success">提出済</Badge>
                            ) : (
                              <Badge variant="destructive">未提出</Badge>
                            )}
                          </TableCell>
                        )
                      })}

                      <TableCell className="text-center">
                        <span
                          className={`font-semibold ${
                            submissionRate === 100
                              ? "text-green-600 dark:text-green-400"
                              : submissionRate === 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-yellow-600 dark:text-yellow-400"
                          }`}
                        >
                          {submissionRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{statuses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedForm === "all" ? "全提出完了" : "提出済み"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {processedStatuses.filter((s) => {
                 const targetFormIds = targetForms.map(f => f.formId)
                 return s.forms
                   .filter(f => targetFormIds.includes(f.formId) && f.isRequired)
                   .every(f => f.submitted)
              }).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">未提出あり</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {processedStatuses.filter((s) => {
                 const targetFormIds = targetForms.map(f => f.formId)
                 return s.forms
                   .filter(f => targetFormIds.includes(f.formId) && f.isRequired)
                   .some(f => !f.submitted)
              }).length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}