# Next.js Auth Dashboard

Next.js (App Router)、TypeScript、Tailwind CSS、Shadcn UI、NextAuth.js v5を使用したモダンな認証ダッシュボードアプリケーションです。

## 機能

- ✅ Next.js 14 App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Shadcn UIコンポーネント
- ✅ NextAuth.js v5による認証
- ✅ Google OAuthログイン
- ✅ Google Sheets API連携
- ✅ スプレッドシートからのデータ取得機能
- ✅ レスポンシブデザイン
- ✅ ダークモード対応

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env.local`にコピーし、必要な値を設定してください。

```bash
cp .env.example .env.local
```

`.env.local`ファイルを編集して、以下の値を設定します：

```env
AUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
GOOGLE_MANAGEMENT_SHEET_ID=your-management-sheet-id
```

#### AUTH_SECRETの生成

以下のコマンドでAUTH_SECRETを生成できます：

```bash
openssl rand -base64 32
```

または、オンラインツールを使用してランダムな文字列を生成してください。

#### Google OAuth認証情報の取得

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションの種類を「ウェブアプリケーション」に設定
6. 承認済みのリダイレクト URIに以下を追加：
   - `http://localhost:3000/api/auth/callback/google`
   - 本番環境のURLがある場合：`https://yourdomain.com/api/auth/callback/google`
7. クライアントIDとクライアントシークレットをコピーして`.env.local`に設定

#### Google Sheets API認証情報の取得

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（または作成）
3. 「APIとサービス」→「ライブラリ」に移動
4. 「Google Sheets API」を検索して有効化
5. 「APIとサービス」→「認証情報」に移動
6. 「認証情報を作成」→「サービスアカウント」を選択
7. サービスアカウント名を入力して作成
8. 作成したサービスアカウントをクリック
9. 「キー」タブ→「キーを追加」→「新しいキーを作成」→「JSON」を選択
10. ダウンロードしたJSONファイルから以下を取得：
    - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
    - `private_key` → `GOOGLE_PRIVATE_KEY`（改行文字`\n`を含む形式で設定）
11. 管理用スプレッドシートを開き、右上の「共有」ボタンをクリック
12. サービスアカウントのメールアドレスを追加（閲覧者権限でOK）
13. スプレッドシートのURLからIDを取得（`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`の`{SHEET_ID}`部分）
14. 取得したIDを`GOOGLE_MANAGEMENT_SHEET_ID`に設定

**注意**: `GOOGLE_PRIVATE_KEY`は改行文字を含むため、環境変数ファイルでは`\n`として記述するか、実際の改行を含める必要があります。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
nextjs-auth-dashboard/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # NextAuth.js APIルート
│   ├── dashboard/
│   │   ├── layout.tsx            # ダッシュボードレイアウト
│   │   └── page.tsx              # ダッシュボードページ
│   ├── globals.css               # グローバルスタイル
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # ホームページ（ログイン）
├── auth.ts                       # NextAuth.js設定
├── components/
│   └── ui/                       # Shadcn UIコンポーネント
├── lib/
│   ├── utils.ts                  # ユーティリティ関数
│   └── google-sheets.ts          # Google Sheets API関数
├── middleware.ts                 # Next.jsミドルウェア
└── types/
    └── next-auth.d.ts            # NextAuth.js型定義
```

## 使用技術

- **Next.js 14** - Reactフレームワーク（App Router）
- **TypeScript** - 型安全性
- **Tailwind CSS** - ユーティリティファーストのCSS
- **Shadcn UI** - 再利用可能なUIコンポーネント
- **NextAuth.js v5** - 認証ライブラリ
- **Google APIs** - Google Sheets API連携
- **Radix UI** - アクセシブルなUIプリミティブ

## スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - 本番用ビルド
- `npm run start` - 本番サーバーを起動
- `npm run lint` - ESLintを実行

## Google Sheets API機能

このプロジェクトには、Googleスプレッドシートからデータを読み込む機能が含まれています。

### 利用可能な関数

#### `getManagementData()`
管理用シートから「名簿」と「フォーム一覧」を取得します。

```typescript
import { getManagementData } from "@/lib/google-sheets"

const { roster, formList } = await getManagementData()
```

#### `getSubmittedUsers()`
フォーム一覧にあるIDを使って、各フォームの回答シートから「メールアドレス」の列を取得し、提出済みユーザーのリストを作成します。

```typescript
import { getSubmittedUsers } from "@/lib/google-sheets"

const submittedEmails = await getSubmittedUsers()
```

#### `getRoster()` / `getFormList()`
名簿またはフォーム一覧のみを取得するヘルパー関数です。

#### `calculateSubmissionStatus()`
名簿と各フォームの回答を突き合わせて、誰がどのフォームを提出済みかを計算します。

```typescript
import { calculateSubmissionStatus } from "@/lib/google-sheets"

const statuses = await calculateSubmissionStatus()
```

#### `filterSubmissionStatusByRole()`
権限に基づいて表示するデータをフィルタリングします。

```typescript
import { filterSubmissionStatusByRole } from "@/lib/google-sheets"

const filteredStatuses = filterSubmissionStatusByRole(statuses, userEmail)
```

### スプレッドシートの構造

#### 管理用シート

**名簿シート**の構造（推奨）:
- **名前列**: 「名前」「name」「氏名」などの列名（必須）
- **メールアドレス列**: 「メールアドレス」「メール」「email」「e-mail」などの列名（任意、認証用）
- **権限列**: 「権限」「role」「役割」などの列名（値: "一般"、"チーム代表者"、"管理者"など）
- **チーム列**: 「チーム」「team」「グループ」などの列名（チーム代表者の場合に使用）

**フォーム一覧シート**の構造:
- **第1列**: フォームID（スプレッドシートID）またはシート名
- **第2列以降**: フォーム名など（オプション）

#### フォーム回答シート
- **名前列**: 「名前」「name」「氏名」「お名前」などの列名を持つ列から名前を自動検出
- システムはヘッダー行から名前列を自動検出します（どの位置でも検出可能）
- 名前列の検出優先順位:
  1. ヘッダー行から「名前」「name」「氏名」「お名前」などを含む列を検出
  2. より緩い検索で「名」または「name」を含む列を検出
  3. それでも見つからない場合、第2列をフォールバックとして使用
- 複数のシートがある場合、すべてのシートから取得します
- **提出状況の判定は名前で行われます**（名簿の名前とフォーム回答の名前を照合）

### 使用例

```typescript
// APIルートでの使用例
import { getSubmittedUsers, getManagementData } from "@/lib/google-sheets"

export async function GET() {
  try {
    const submittedEmails = await getSubmittedUsers()
    return Response.json({ emails: submittedEmails })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

## 提出状況ダッシュボード

### 機能概要

提出状況ダッシュボード（`/dashboard/submissions`）では、名簿と各フォームの回答状況を突き合わせて、「誰がどのフォームを提出済みか」を可視化します。

### 権限と表示範囲

- **一般ユーザー**: 自分の行のみ表示。各フォームが「提出済」か「未提出」かがわかります。
- **チーム代表者**: 自分のチームメンバー全員の提出状況が見えます。
- **管理者（フォーム作成者）**: 全員の提出状況が見えます。

権限判定は、ログインしたGoogleのメールアドレスと「名簿」シートの権限カラムを照合して行われます。

### UI機能

- **テーブル形式**: ユーザーごとに提出状況を一覧表示
- **未提出の強調**: 未提出があるユーザーは赤色で強調表示
- **提出率表示**: 各ユーザーの提出率をパーセンテージで表示
- **統計情報**: 総ユーザー数、全提出完了数、未提出ありの数を表示

### APIエンドポイント

- `GET /api/sheets/submission-status`: 認証済みユーザーの権限に応じた提出状況データを返します

## ライセンス

MIT

#   Y N U S B - F o r m s - C h e c k  
 