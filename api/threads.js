/**
 * Vercel Serverless Function
 * Threads APIから投稿を取得するプロキシ
 * 配置場所: /api/threads.js
 */

export default async function handler(req, res) {
  // GETメソッド以外は拒否
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error("THREADS_ACCESS_TOKEN is not set in Vercel.");
    return res.status(500).json({ error: 'APIキーが設定されていません。' });
  }

  // Threads API v1.0: 自分の投稿リストを取得するエンドポイント
  const url = `https://graph.threads.net/v1.0/me/threads?fields=id,media_product_type,media_type,media_url,permalink,owner,username,text,timestamp&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Threads API Error:", data);
      return res.status(response.status).json({ error: 'Threadsからのデータ取得に失敗しました。' });
    }

    // 正常なデータをフロントエンドへ返す
    return res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error.message);
    return res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
}
