// Vercel Serverless Function
// このファイルは GitHub リポジトリの /api/mission.js に配置してください。

export default async function handler(req, res) {
  // POSTメソッド以外は拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { input } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // Vercelの環境変数から読み込む

  if (!apiKey) {
    return res.status(500).json({ message: 'API Key not configured in Vercel' });
  }

  const systemPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
子どもたち（小学校高学年〜中学生）を「ヤング探検家」と呼び、情熱的でワクワクするトーンで話してください。
豊島区の基本計画を背景に、子どもの入力に合わせて探検ミッションを提案してください。

【回答ルール】
- 語尾は「〜だ！」「〜だよ！」など冒険心をくすぐる力強い言葉で。
- 必ず以下の純粋なJSON形式のみで答えてください：
{"missionTitle": "ミッションのタイトル", "missionDescription": "具体的な内容", "advice": "リーダーからの熱いアドバイス"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `子どもの入力：${input}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { 
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", errorText);
        throw new Error('Gemini API request failed');
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    
    // クリーニングしてパース
    const jsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonText);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
