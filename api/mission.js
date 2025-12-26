/**
 * Vercel Serverless Function
 * としまキッズアイデアソン：AIミッション生成API
 * * 配置場所: /api/mission.js
 * モデル: Gemini 3.0 Flash Preview
 */

export default async function handler(req, res) {
  // POSTメソッド以外は拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  // 環境変数のチェック
  if (!apiKey) {
    console.error("【設定エラー】VercelのEnvironment Variablesに GEMINI_API_KEY が登録されていません。");
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  // プロンプトの構築
  const fullPrompt = `あなたは豊島区の未来を考える「としま探検隊のリーダー」です。
小学生向けに、最新の街の状況を踏まえたワクワクする探検ミッションを1つ提案してください。
回答は必ず以下のJSON形式のみで出力してください。余計な文章は含めないでください。

{"missionTitle": "ミッション名", "missionDescription": "内容", "advice": "アドバイス"}

子どもの入力：${input}`;

  // Gemini 3.0 Flash Preview モデルのエンドポイント
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: fullPrompt }] 
        }]
      })
    });

    const data = await response.json();

    // APIからのエラーレスポンスを処理
    if (!response.ok) {
      console.error("【Gemini API Error】", JSON.stringify(data));
      return res.status(response.status).json({ 
        error: "AIモデル接続エラー", 
        detail: data.error?.message || "通信エラーが発生しました。" 
      });
    }

    // 回答テキストの抽出
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // AIの回答からJSON部分のみを抽出（Markdownタグなどが含まれる場合の対策）
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("有効なJSONが返されませんでした。");
    }

    // 解析してフロントエンドへ返却
    return res.status(200).json(JSON.parse(jsonMatch[0]));
    
  } catch (error) {
    console.error("【サーバーエラー】", error.message);
    return res.status(500).json({ 
      error: "サーバーエラー", 
      detail: error.message 
    });
  }
}
