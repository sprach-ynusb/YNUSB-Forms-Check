// 環境変数のチェックスクリプト
require('dotenv').config({ path: '.env.local' })

const privateKey = process.env.GOOGLE_PRIVATE_KEY

if (!privateKey) {
  console.error('❌ GOOGLE_PRIVATE_KEYが設定されていません')
  process.exit(1)
}

console.log('✅ GOOGLE_PRIVATE_KEYが設定されています')
console.log('先頭50文字:', privateKey.substring(0, 50))
console.log('末尾50文字:', privateKey.substring(Math.max(0, privateKey.length - 50)))

const hasBegin = privateKey.includes('BEGIN PRIVATE KEY')
const hasEnd = privateKey.includes('END PRIVATE KEY')

console.log('\nキーの検証:')
console.log('BEGIN PRIVATE KEY:', hasBegin ? '✅' : '❌')
console.log('END PRIVATE KEY:', hasEnd ? '✅' : '❌')

if (!hasBegin || !hasEnd) {
  console.error('\n❌ GOOGLE_PRIVATE_KEYにBEGIN/END行が含まれていません')
  console.log('\n正しい形式:')
  console.log('GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"')
  process.exit(1)
}

console.log('\n✅ キーの形式は正しいようです')



