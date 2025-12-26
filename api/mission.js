// Vercel Serverless Function
// 配置場所: GitHubリポジトリの /api/mission.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  // 1. システムプロンプトとユーザー入力を合体させる（最も互換性が高い方法）
  const fullPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
小学校高学年の「ヤング探検家」に向けて、ワクワクする情熱的なトーンで話してください。

【ミッション生成ルール】
豊島区の基本計画を背景に、以下の「子どもの入力」に合わせた探検ミッションを1つ提案してください。
回答は必ず以下のJSON形式のみで出力し、余計な解説文は一切含めないでください。

{"missionTitle": "ミッション名", "missionDescription": "具体的な内容", "advice": "リーダーのアドバイス"}

子どもの入力：${input}`;

  // 2. 安定版 v1 エンドポイントを使用
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ]
        // 400エラーの原因となる system_instruction や generation_config 内のオプションを削除し、
        // プロンプト（text）側ですべてを制御する方式に変更しました。
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("【Gemini APIエラー詳細】", JSON.stringify(data));
      return res.status(response.status).json({ 
        error: 'AIとの通信に失敗しました。',
        detail: data.error?.message
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('AIからの回答が空でした。');

    // 3. AIがMarkdownタグ（\`\`\`json ... \`\`\`）を含めて返してきた場合でも、JSON部分だけを抽出する
    let cleanJson = rawText;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/); // 最初と最後の { } の間を抜き出す
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    try {
      const result = JSON.parse(cleanJson);
      return res.status(200).json(result);
    } catch (parseError) {
      console.error("【解析エラー】JSONの形式が正しくありません:", rawText);
      return res.status(500).json({ error: 'AIの回答を正しく読み取れませんでした。' });
    }

  } catch (error) {
    console.error("【サーバー内部エラー】", error.message);
    return res.status(500).json({ error: 'サーバー内で問題が発生しました。', detail: error.message });
  }
}
