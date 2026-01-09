"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Lock, Loader2, PlusCircle, FileSpreadsheet, Link as LinkIcon, Users, Calendar, User } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  
  // ログイン用ステート
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // フォーム登録用ステート
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regForm, setRegForm] = useState({
    name: "",      // フォーム名
    creator: "",   // 作成者名
    formUrl: "",   // フォームURL
    sheetUrl: "",  // スプレッドシートURL
    target: "",    // 対象チーム
    deadline: ""   // 回答期限
  })

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false,
        username: name,
        password: password,
      })

      if (result?.error) {
        setError("名前またはパスワードが間違っています")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // フォーム登録処理
  const handleRegister = async () => {
    // 必須チェック
    if (!regForm.name || !regForm.sheetUrl || !regForm.creator) {
      alert("「フォーム名」「作成者名」「スプレッドシートURL」は必須です")
      return
    }
    
    setRegLoading(true)
    try {
      const res = await fetch("/api/forms/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      })
      
      const data = await res.json()
      if (data.success) {
        alert("登録しました！")
        setIsRegisterOpen(false)
        // フォームをリセット
        setRegForm({ 
          name: "", 
          creator: "",
          formUrl: "", 
          sheetUrl: "", 
          target: "", 
          deadline: "" 
        })
      } else {
        alert("エラー: " + data.error)
      }
    } catch (e) {
      alert("通信エラーが発生しました")
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* メインのログインカード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">YNUSBフォーム提出確認ログイン</CardTitle>
            <CardDescription className="text-center">
              あだ名とパスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">あだ名（正確に）</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Sprach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                ログイン
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* フォーム作成者用 登録ボタンエリア */}
        <div className="flex justify-center">
          <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-muted-foreground text-xs">
                <PlusCircle className="mr-2 h-3 w-3" />
                フォーム作成者はこちら
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新規フォーム登録</DialogTitle>
                <DialogDescription>
                  ダッシュボードに表示する新しいフォームを追加します。
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                
                {/* 1. フォーム名 */}
                <div className="grid gap-2">
                  <Label htmlFor="fname" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> フォーム名 (必須)
                  </Label>
                  <Input 
                    id="fname" 
                    placeholder="例: 春合宿仮出欠" 
                    value={regForm.name}
                    onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                  />
                </div>

                {/* 2. 作成者名 */}
                <div className="grid gap-2">
                  <Label htmlFor="fcreator" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> 作成者名 (必須)
                  </Label>
                  <Input 
                    id="fcreator" 
                    placeholder="例: Sprach（あだ名）" 
                    value={regForm.creator}
                    onChange={(e) => setRegForm({...regForm, creator: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    あなただけが管理画面を見れるようになります
                  </p>
                </div>

                {/* 3. フォームURL */}
                <div className="grid gap-2">
                  <Label htmlFor="furl" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> GoogleフォームのURL
                  </Label>
                  <Input 
                    id="furl" 
                    placeholder="https://docs.google.com/forms/..." 
                    value={regForm.formUrl}
                    onChange={(e) => setRegForm({...regForm, formUrl: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ユーザーがクリックして回答画面へ飛ぶためのURLです
                  </p>
                </div>

                {/* 4. スプレッドシートURL */}
                <div className="grid gap-2">
                  <Label htmlFor="fsheet" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> スプレッドシートURL (必須)
                  </Label>
                  <Input 
                    id="fsheet" 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                    value={regForm.sheetUrl}
                    onChange={(e) => setRegForm({...regForm, sheetUrl: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    回答が集まるスプレッドシートのURLを貼ってください。URL取得方法：フォームの回答タブ→スプレッドシートへリンク→そのスプレッドシートのURLをコピー。【重要】スプレッドシートのデータを読み取るため、スプレッドシートの共有→sheets-reader@ynusb-483510.iam.gserviceaccount.comを入力して共有してください。                 </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 5. 対象チーム */}
                  <div className="grid gap-2">
                    <Label htmlFor="ftarget" className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> 対象の期
                    </Label>
                    <Input 
                      id="ftarget" 
                      placeholder="44,45(カンマ区切り、空欄で全員)" 
                      value={regForm.target}
                      onChange={(e) => setRegForm({...regForm, target: e.target.value})}
                    />
                  </div>

                  {/* 6. 回答期限 */}
                  <div className="grid gap-2">
                    <Label htmlFor="fdeadline" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> 回答期限
                    </Label>
                    <Input 
                      id="fdeadline" 
                      placeholder="例: 1/31" 
                      value={regForm.deadline}
                      onChange={(e) => setRegForm({...regForm, deadline: e.target.value})}
                    />
                  </div>
                </div>

              </div>
              
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsRegisterOpen(false)}>キャンセル</Button>
                <Button onClick={handleRegister} disabled={regLoading}>
                  {regLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  確定して追加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      </div>
    </div>
  )
}