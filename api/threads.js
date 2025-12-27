/**
 * Vercel Serverless Function
 * Threads APIを使用して全ユーザーの投稿から検索
 * 配置場所: /api/threads.js
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error("THREADS_ACCESS_TOKEN is not set.");
    return res.status(500).json({ error: 'API設定が完了していません。' });
  }

  // 特定のキーワード「としまアイデア」で全ユーザーの投稿を検索するエンドポイント
  // 注: APIの仕様により、検索クエリ(q)はエンコードする必要があります
  const query = encodeURIComponent('としまアイデア');
  const url = `https://graph.threads.net/v1.0/threads/search?q=${query}&fields=id,text,username,timestamp,permalink&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Threads Search API Error:", data);
      return res.status(response.status).json({ 
        error: 'Threadsからのデータ検索に失敗しました。',
        detail: data.error?.message 
      });
    }

    // 検索結果をフロントエンドへ返却
    return res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
}
