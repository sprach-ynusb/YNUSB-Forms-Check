"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import { SubmissionStatus } from "@/lib/google-sheets"

export default function FormDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const formId = params.id as string
  const formName = searchParams.get("name") || "フォーム詳細"

  const [statuses, setStatuses] = useState<SubmissionStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // ■ ここを変更: formIdパラメータを付けてリクエスト
        const response = await fetch(`/api/sheets/submission-status?formId=${formId}`)
        if (!response.ok) throw new Error("データ取得失敗")
        const result = await response.json()
        setStatuses(result.statuses)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [formId])

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
  }

  // 1. チームごとにユーザーをグループ化
  const teamsMap = new Map<string, SubmissionStatus[]>()
  
  statuses.forEach(user => {
    const targetForm = user.forms.find(f => f.formId === formId)
    if (!targetForm) return 

    const teamName = user.userTeam || "チーム未所属"
    if (!teamsMap.has(teamName)) {
      teamsMap.set(teamName, [])
    }
    teamsMap.get(teamName)?.push(user)
  })

  // 2. 表示用に整形
  const teams = Array.from(teamsMap.entries()).map(([teamName, members]) => {
    // 並び替え: 未提出者を先頭に
    const sortedMembers = members.sort((a, b) => {
      const formA = a.forms.find(f => f.formId === formId)
      const formB = b.forms.find(f => f.formId === formId)
      
      if (!formA?.isRequired) return 1
      if (!formB?.isRequired) return -1
      if (formA.submitted === formB.submitted) return 0
      return formA.submitted ? 1 : -1
    })

    const total = members.filter(m => m.forms.find(f => f.formId === formId)?.isRequired).length
    const submitted = members.filter(m => {
      const f = m.forms.find(f => f.formId === formId)
      return f?.isRequired && f?.submitted
    }).length

    return {
      name: teamName,
      members: sortedMembers,
      stats: { total, submitted, rate: total > 0 ? Math.round((submitted / total) * 100) : 0 }
    }
  })

  // チーム名でソート
  teams.sort((a, b) => a.name.localeCompare(b.name, "ja"))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{formName}</h1>
          <p className="text-muted-foreground">チーム別提出状況（全{statuses.length}名）</p>
        </div>
      </div>

      <div className="grid gap-6">
        {teams.map((team) => (
          <Card key={team.name} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">
                    提出率: <span className={
                      team.stats.rate === 100 ? "text-green-600" : 
                      team.stats.rate < 50 ? "text-red-600" : "text-yellow-600"
                    }>{team.stats.rate}%</span>
                    <span className="text-muted-foreground ml-1">
                      ({team.stats.submitted}/{team.stats.total})
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {team.members.map(member => {
                  const form = member.forms.find(f => f.formId === formId)
                  if (!form) return null
                  
                  // 対象外は非表示にする場合
                  if (!form.isRequired) return null 

                  return (
                    <div key={member.userId} className={`flex items-center justify-between p-4 ${
                      form.submitted ? "bg-white dark:bg-gray-950" : "bg-red-50 dark:bg-red-950/20"
                    }`}>
                      <div className="flex items-center gap-3">
                        {form.submitted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <div className="font-medium">{member.userName}</div>
                          <div className="text-xs text-muted-foreground">{member.userEmail}</div>
                        </div>
                      </div>
                      <div>
                        {form.submitted ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">提出済</Badge>
                        ) : (
                          <Badge variant="destructive">未提出</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
                {/* 該当者なしの場合 */}
                {team.members.every(m => !m.forms.find(f => f.formId === formId)?.isRequired) && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    このフォームの対象者はいません
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}