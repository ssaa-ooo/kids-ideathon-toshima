export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'APIキーが設定されていません。' });

  const fullPrompt = `あなたは豊島区のリーダーです。小学生向けにワクワクする探検ミッションを1つ提案してください。回答は必ず以下のJSON形式のみで出力してください。
  {"missionTitle": "ミッション名", "missionDescription": "内容", "advice": "アドバイス"}
  入力：${input}`;

  // 【修正】エンドポイントを v1 に変更
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("有効なJSONが返されませんでした。");

    return res.status(200).json(JSON.parse(jsonMatch[0]));
    
  } catch (error) {
    return res.status(500).json({ error: "サーバーエラー", detail: error.message });
  }
}
