const express = require('express');
const fetch = require('node-fetch');

const app = express();
const SITE_NAME = "ゆず";

module.exports = app;

app.get('/watch', async (req, res) => {
    const videoid = req.query.v;

    if (!videoid) {
        return res.status(400).send(`
            <html>
                <head><title>${SITE_NAME}</title></head>
                <body>
                    <div style="font-family: sans-serif; text-align: center; max-width: 800px; margin: 40px auto;">
                        <h1>エラー</h1>
                        <p style="color: red;">ビデオID (v) が指定されていません。</p>
                    </div>
                </body>
            </html>
        `);
    }

    const externalApiUrl = \`https://siawaseok.f5.si/api/2/streams/\${videoid}\`; 
    let videoUrl = null;
    let error = null;

    try {
        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            throw new Error(\`External API returned status: \${response.status}\`);
        }

        const data = await response.json();
        
        const format96 = data.formats?.find(format => format.itag === 96);

        if (format96) {
            videoUrl = format96.url;
        } else {
            error = "itag 96 (高画質) の動画フォーマットが見つかりませんでした。";
        }

    } catch (e) {
        error = "動画データの取得中にサーバー側でエラーが発生しました。";
    }

    const status = videoUrl ? 200 : 404;
    
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
