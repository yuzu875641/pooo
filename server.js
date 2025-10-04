// server.js

// 必要なモジュールのインポート
const express = require('express');
const fetch = require('node-fetch'); // node-fetchをインストールしていない場合は、Node.js 18以降の組み込みfetchに置き換えることも可能です。

const app = express();
const SITE_NAME = "ゆず"; // ★ここにサイトのタイトルを設定してください★

// VercelがServerless Functionのエントリポイントとして使用できるようにExpressアプリをエクスポート
module.exports = app;

/**
 * ルート: /watch?v={videoid} を処理する
 */
app.get('/watch', async (req, res) => {
    // 1. クエリパラメータからvideoidを取得
    const videoid = req.query.v;

    if (!videoid) {
        // videoidがない場合はエラーレスポンスを返す
        return res.status(400).send(`
            <html>
                <head><title>${SITE_NAME}</title></head>
                <body>
                    <div style="font-family: sans-serif; text-align: center; max-width: 800px; margin: 40px auto;">
                        <h1>エラー</h1>
                        <p style="color: red;">ビデオID (v) がクエリパラメータに指定されていません。</p>
                        <p>例: /watch?v=xxxxxxxxxxx</p>
                    </div>
                </body>
            </html>
        `);
    }

    const externalApiUrl = \`https://siawaseok.f5.si/api/2/streams/\${videoid}\`;
    let videoUrl = null;
    let error = null;

    try {
        // 2. 外部APIの呼び出し（サーバーサイドで実行）
        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            // 外部APIが2xx以外のステータスコードを返した場合
            throw new Error(\`External API returned status: \${response.status}\`);
        }

        const data = await response.json();
        
        // 3. formats配列からitagが96のURLを抽出
        const format96 = data.formats?.find(format => format.itag === 96);

        if (format96) {
            videoUrl = format96.url;
        } else {
            error = "itag 96 (高画質) の動画フォーマットが見つかりませんでした。";
        }

    } catch (e) {
        console.error("API Error for videoid:", videoid, e);
        error = "動画データの取得中にサーバー側でエラーが発生しました。";
    }

    // 4. HTMLレスポンスの生成と返却
    const status = videoUrl ? 200 : 404; // URLがあれば200、なければ404
    
    res.status(status).send(\`
        <html>
            <head>
                <title>${SITE_NAME}</title>
                <style>
                    body { font-family: sans-serif; text-align: center; background-color: #f0f0f0; }
                    .container { max-width: 800px; margin: 40px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    h1 { color: #333; }
                    .error { color: #d9534f; font-weight: bold; }
                    video { width: 100%; height: auto; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>動画再生</h1>
                    <p><strong>Video ID:</strong> \${videoid}</p>
                    \${error ? \`
                        <p class="error">エラー: \${error}</p>
                    \` : \`
                        <h2>再生</h2>
                        <video controls autoplay src="\${videoUrl}">
                            お使いのブラウザは動画タグをサポートしていません。
                        </video>
                    \`}
                </div>
            </body>
        </html>
    \`);
});
