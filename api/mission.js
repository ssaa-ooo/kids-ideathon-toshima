// Vercel Serverless Function
// 配置場所: GitHubリポジトリの /api/mission.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("【設定エラー】Vercelの環境変数 GEMINI_API_KEY が設定されていません。");
    return res.status(500).json({ error: 'APIキーが設定されていません。VercelのSettingsを確認してください。' });
  }

  // 命令をプロンプトの中に完全に組み込む（systemInstructionフィールドを使わないことで400/404エラーを回避）
  const fullPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
小学校高学年の「ヤング探検家」に向けて、ワクワクする情熱的なトーンで話してください。

【ミッション生成ルール】
豊島区の基本計画を背景に、以下の「子どもの入力」に合わせた探検ミッションを1つ提案してください。
回答は必ず以下のJSON形式のみで出力し、余計な解説文は一切含めないでください。

{"missionTitle": "ミッション名", "missionDescription": "具体的な内容", "advice": "リーダーのアドバイス"}

子どもの入力：${input}`;

  // エンドポイントを v1beta に設定（1.5 Flashモデルに最も適したエンドポイント）
  // モデル名が見つからないエラーへの対策として、最も標準的な gemini-1.5-flash を指定
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
        // 404や400エラーの温床となるパラメータ（systemInstruction等）をすべて削除し、
        // プロンプト側だけで制御する「最も壊れにくい」リクエスト形式です。
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("【Gemini APIエラー詳細】", JSON.stringify(data));
      
      // 404エラー（Not Found）の場合のアドバイスを含める
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'AIモデルが見つかりません(404)', 
          detail: 'お使いのAPIキーが作成されたプロジェクトで「Generative Language API」が有効になっているか、Google AI Studioの設定を確認してください。' 
        });
      }

      return res.status(response.status).json({ 
        error: 'AIとの通信に失敗しました。',
        detail: data.error?.message || "Unknown error"
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('AIからの回答が空でした。');

    // JSON部分だけを抽出する
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
