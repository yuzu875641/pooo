const express = require('express');
const fetch = require('node-fetch');

const app = express();
const SITE_NAME = "ゆず";

module.exports = app;

app.get('/watch', async (req, res) => {
    const videoid = req.query.v;
    const targetItag = req.query.itag;

    if (!videoid || !targetItag) {
        return res.status(400).send(
            '<html><head><title>' + SITE_NAME + '</title></head><body>' +
            '<div style="font-family: sans-serif; text-align: center; max-width: 800px; margin: 40px auto;">' +
            '<h1>エラー</h1>' +
            '<p style="color: red;">ビデオID (v) および iTag がクエリパラメータに指定されていません。</p>' +
            '<p>正しい形式: /watch?v={videoid}&itag={itag}</p>' +
            '</div></body></html>'
        );
    }

    const externalApiUrl = 'https://siawaseok.f5.si/api/2/streams/' + videoid; 
    let videoUrl = null;
    let error = null;

    try {
        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            throw new Error('External API returned status: ' + response.status);
        }

        const data = await response.json();
        
        // API応答のitagが文字列であるため、文字列で比較
        const targetFormat = data.formats?.find(format => format.itag === targetItag); 

        if (targetFormat) {
            videoUrl = targetFormat.url;
            
            if (targetFormat.vcodec === "none") {
                 error = 'itag ' + targetItag + ' は音声専用（' + (targetFormat.acodec || '不明') + '）です。';
                 videoUrl = null; // 音声専用の場合は動画再生を試みない
            }

        } else {
            error = '指定された iTag (' + targetItag + ') の動画フォーマットが見つかりませんでした。';
        }

    } catch (e) {
        error = "動画データの取得中にサーバー側でエラーが発生しました。";
    }

    const status = videoUrl ? 200 : 404;

    // 動画を画面いっぱいに表示するためのCSSを適用
    if (videoUrl) {
        // コンテンツを全画面表示するためのHTML
        const fullScreenHtml = 
            '<html>' +
            '<head>' +
                '<title>' + SITE_NAME + ' - ' + targetItag + '</title>' +
                '<style>' +
                    'body { margin: 0; padding: 0; background-color: #000; overflow: hidden; }' +
                    '#video-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }' +
                    '#video-player { width: 100%; height: 100%; object-fit: contain; }' +
                '</style>' +
            '</head>' +
            '<body>' +
                '<div id="video-container">' +
                    '<video id="video-player" controls autoplay src="' + videoUrl + '">' +
                        'お使いのブラウザは動画タグをサポートしていません。' +
                    '</video>' +
                '</div>' +
            '</body>' +
            '</html>';
        
        return res.status(200).send(fullScreenHtml);
    }
    
    // エラー時のHTML (全画面表示ではない)
    const errorHtml = 
        '<html>' +
        '<head>' +
            '<title>' + SITE_NAME + ' - エラー</title>' +
            '<style>' +
                'body { font-family: sans-serif; text-align: center; background-color: #f0f0f0; }' +
                '.container { max-width: 800px; margin: 40px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }' +
                'h1 { color: #333; }' +
                '.error { color: #d9534f; font-weight: bold; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="container">' +
                '<h1>' + SITE_NAME + ' - エラー</h1>' +
                '<p><strong>Video ID:</strong> ' + videoid + '</p>' +
                '<p><strong>iTag:</strong> ' + targetItag + '</p>' +
                '<p class="error">エラー: ' + (error || '指定されたストリームが見つかりません。') + '</p>' +
            '</div>' +
        '</body>' +
        '</html>';

    res.status(status).send(errorHtml);
});
