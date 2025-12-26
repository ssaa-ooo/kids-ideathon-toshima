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

  // 命令を通常のメッセージ（prompt）に組み込むことで、APIのバージョン差異によるエラーを回避します
  const fullPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
小学校高学年の「ヤング探検家」に向けて、ワクワクする情熱的なトーンで話してください。

【ミッション生成ルール】
豊島区の基本計画を背景に、以下の「子どもの入力」に合わせた探検ミッションを1つ提案してください。
回答は必ず以下のJSON形式のみで出力し、余計な解説文は一切含めないでください。

{"missionTitle": "ミッション名", "missionDescription": "具体的な内容", "advice": "リーダーのアドバイス"}

子どもの入力：${input}`;

  // v1beta を使用し、モデル名との一致を図ります
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
        // 400エラーの原因となるオプション項目をすべて削除し、
        // もっとも基本的なリクエスト構造にしました。
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("【Gemini APIエラー詳細】", JSON.stringify(data));
      return res.status(response.status).json({ 
        error: 'AIとの通信に失敗しました。',
        detail: data.error?.message || "Unknown error"
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('AIからの回答が空でした。');

    // JSON部分だけを抽出する（AIが前後に解説を付けても大丈夫なようにします）
    let cleanJson = rawText;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    try {
      const result = JSON.parse(cleanJson);
      return res.status(200).json(result);
    } catch (parseError) {
      console.error("【解析エラー】JSON形式ではありません:", rawText);
      return res.status(500).json({ error: 'AIの回答を正しく読み取れませんでした。' });
    }

  } catch (error) {
    console.error("【サーバー内部エラー】", error.message);
    return res.status(500).json({ error: 'サーバー内で問題が発生しました。', detail: error.message });
  }
}
