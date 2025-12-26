export default async function handler(req, res) {
  // POSTメソッド以外は受け付けない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { input } = req.body;
  // VercelのSettingsで設定した環境変数を読み込む
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません。VercelのSettingsを確認してください。' });
  }

  // AIへの指示（プロンプト）
  const fullPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
小学校高学年の「ヤング探検家」に向けて、ワクワクする情熱的なトーンで話してください。

【ミッション生成ルール】
豊島区の基本計画（国際アート・カルチャー都市など）を背景に、以下の「子どもの入力」に合わせた探検ミッションを1つ提案してください。
回答は必ず以下のJSON形式のみで出力し、余計な解説文や装飾（\`\`\`json など）は一切含めないでください。

{"missionTitle": "ミッション名", "missionDescription": "具体的な内容", "advice": "リーダーのアドバイス"}

子どもの入力：${input}`;

  // 最も安定している v1beta エンドポイントと gemini-1.5-flash モデルを使用
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }]
          }
        ]
      })
    });

    const data = await response.json();

    // Google APIからのエラーをハンドリング
    if (!response.ok) {
      console.error("【Google API Error】", JSON.stringify(data));
      return res.status(response.status).json({
        error: `AIエラー(${response.status})`,
        detail: data.error?.message || "Google APIとの通信に失敗しました。"
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('AIからの回答が空でした。');
    }

    // AIが ```json { ... } ``` のように返してきても大丈夫なように、JSON部分だけを抽出する
    let cleanJson = rawText;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    try {
      const result = JSON.parse(cleanJson);
      // 正常な結果をフロントエンドに返す
      return res.status(200).json(result);
    } catch (parseError) {
      console.error("【解析エラー】JSON形式ではありません:", rawText);
      return res.status(500).json({ error: 'AIの回答を読み取れませんでした。' });
    }

  } catch (error) {
    console.error("【サーバー内部エラー】", error.message);
    return res.status(500).json({ error: 'サーバー内で問題が発生しました。', detail: error.message });
  }
}
