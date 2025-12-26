// Vercel Serverless Function
// このファイルは GitHub リポジトリの /api/mission.js に配置してください。

export default async function handler(req, res) {
  // POST以外のメソッドは拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) {
    console.error("Critical Error: GEMINI_API_KEY is not set in Vercel.");
    return res.status(500).json({ message: 'API Key not configured.' });
  }

  const systemPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
子どもたち（小学校高学年〜中学生）を「ヤング探検家」と呼び、情熱的でワクワクするトーンで話してください。
豊島区の基本計画（学校・遊び場、安心・安全、福祉、商店街、環境、カルチャー、都市整備）を背景に、子どもの入力に合わせて探検ミッションを提案してください。

【回答のルール】
- 語尾には「〜だ！」「〜だよ！」など冒険心をくすぐる言葉を使って。
- ミッションのタイトルは、映画のタイトルのようにワクワクするものに。
- 必ず以下の純粋なJSON形式のみで答えてください（Markdownの装飾などは不要です）：
{"missionTitle": "ミッション名", "missionDescription": "具体的な内容", "advice": "熱いアドバイス"}`;

  // APIエンドポイント (gemini-1.5-flash)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `子どもの入力：${input}` }] }],
        // REST API v1beta の標準形式に合わせる
        systemInstruction: { 
          parts: [{ text: systemPrompt }] 
        },
        generationConfig: { 
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Gemini API Error Detail:", JSON.stringify(data));
        return res.status(response.status).json({ message: 'Gemini API Error', details: data.error?.message });
    }

    // AIの回答テキストを取得
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('No content in AI response');

    // マークダウン装飾（```jsonなど）が含まれる場合を考慮してクリーニング
    const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonText);

    return res.status(200).json(result);

  } catch (error) {
    console.error("Function Handler Error:", error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
