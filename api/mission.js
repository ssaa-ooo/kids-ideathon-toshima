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

  const systemPrompt = `あなたは豊島区の未来を一緒に考える「としま探検隊のリーダー」です。
小学校高学年の「ヤング探検家」に向けて、ワクワクする情熱的なトーンで話してください。
【回答ルール】
- 語尾は「〜だ！」「〜だよ！」「〜してみよう！」
- 必ず以下の純粋なJSONのみで答えてください：
{"missionTitle": "ミッション名", "missionDescription": "具体的な内容", "advice": "リーダーのアドバイス"}`;

  // 安定版 v1 エンドポイントを使用
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `子どもの入力：${input}` }] }],
        // 修正ポイント: エラーに基づき、snake_caseからcamelCaseに戻しました
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
      console.error("【Gemini APIエラー詳細】", JSON.stringify(data));
      return res.status(response.status).json({ 
        error: 'AIとの通信に失敗しました。',
        detail: data.error?.message
      });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('AIからの回答が空でした。');

    // AIの回答からJSONを安全に取り出す
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    return res.status(200).json(result);

  } catch (error) {
    console.error("【サーバー内部エラー】", error.message);
    return res.status(500).json({ error: 'サーバー内で問題が発生しました。', detail: error.message });
  }
}
