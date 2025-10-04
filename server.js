// server.js
const express = require('express');
const fetch = require('node-fetch'); // Node.jsの組み込みfetchを使用できる環境では不要

const app = express();
const SITE_NAME = "々"; // サイトのタイトルを設定

// VercelでServerless Functionとして動作させるためのエントリポイント
module.exports = app;

// ルート /watch?v={videoid} の処理
app.get('/watch', async (req, res) => {
    // 1. videoid の取得
    const videoid = req.query.v;

    if (!videoid) {
        return res.status(400).send(`
            <html>
                <head><title>${SITE_NAME}</title></head>
                <body>
                    <h1>エラー</h1>
                    <p>ビデオID (v) がクエリパラメータに指定されていません。</p>
                </body>
            </html>
        `);
    }

    const externalApiUrl = `https://siawaseok.f5.si/api/2/streams/${videoid}`;
    let videoUrl = null;
    let error = null;

    try {
        // 2. 外部APIの呼び出し (Node.jsのサーバーサイドで実行)
        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            throw new Error(`External API Error: ${response.status}`);
        }

        const data = await response.json();
        
        // 3. itag 96 の URLを抽出
        const format96 = data.formats?.find(format => format.itag === 96);

        if (format96) {
            videoUrl = format96.url;
        } else {
            error = "itag 96の動画URLが見つかりませんでした。";
        }

    } catch (e) {
        console.error("API Error:", e);
        error = "動画データの取得中にエラーが発生しました。";
    }

    // 4. HTMLレスポンスの生成
    res.status(videoUrl ? 200 : 404).send(`
        <html>
            <head>
                <title>${SITE_NAME}</title>
                <style>
                    body { font-family: sans-serif; text-align: center; }
                    .container { max-width: 800px; margin: 40px auto; }
                    video { width: 100%; max-height: 90vh; }
                    .error { color: red; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>動画再生</h1>
                    <p>Video ID: ${videoid}</p>
                    ${error ? `
                        <p class="error">エラー: ${error}</p>
                    ` : `
                        <h2>再生</h2>
                        <video controls src="${videoUrl}">
                            お使いのブラウザは動画タグをサポートしていません。
                        </video>
                    `}
                </div>
            </body>
        </html>
    `);
});

// VercelにServerless Functionとして公開しない静的なファイルなどのためのデフォルトハンドラ
// Node.js Expressアプリケーションの基本設定であり、VercelのServerless Functionの設定とは異なります。
// Serverless Functionとしてデプロイする場合、通常この設定は不要です。
// app.listen(3000, () => console.log('Server running on http://localhost:3000'));
