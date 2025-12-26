export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'APIキーが設定されていません。' });

  const fullPrompt = `あなたは豊島区の未来を考える「としま探検隊のリーダー」です。
小学生向けに、ワクワクする探検ミッションを1つ提案してください。
必ず以下のJSON形式でのみ回答してください。余計な文章は一切含めないでください。

{"missionTitle": "ミッション名", "missionDescription": "内容", "advice": "アドバイス"}

子どもの入力：${input}`;

  // エンドポイントを v1beta に、モデルを gemini-1.5-flash に設定
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("【Google API Error】", JSON.stringify(data));
      return res.status(response.status).json({ 
        error: "AI連携エラー", 
        detail: data.error?.message || "通信エラー"
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("AIの回答が空でした。");

    // JSON部分だけを正規表現で取り出す（念のための処理）
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("有効なJSONが返されませんでした。");

    return res.status(200).json(JSON.parse(jsonMatch[0]));
    
  } catch (error) {
    console.error("【Server Error】", error);
    return res.status(500).json({ error: "サーバー内部エラー", detail: error.message });
  }
}
