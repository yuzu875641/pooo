const express = require('express');
const fetch = require('node-fetch');

const app = express();
const SITE_NAME = "ゆず";

module.exports = app;

app.get('/watch', async (req, res) => {
    const videoid = req.query.v;
    const targetItag = req.query.itag; // ★ 修正箇所: itagを取得 ★

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
        
        // ★ 修正箇所: 指定された targetItag のオブジェクトを検索 ★
        // API応答のitagが文字列であるため、比較も文字列で行う
        const targetFormat = data.formats?.find(format => format.itag === targetItag); 

        if (targetFormat) {
            // 動画または音声のURLを取得
            videoUrl = targetFormat.url;
            
            // ターゲットのフォーマットが音声専用であるかをチェック
            if (targetFormat.vcodec === "none") {
                 error = `itag ${targetItag} は音声専用（${targetFormat.acodec || '不明'}）です。`
            }

        } else {
            error = '指定された iTag (' + targetItag + ') の動画フォーマットが見つかりませんでした。';
        }

    } catch (e) {
        error = "動画データの取得中にサーバー側でエラーが発生しました。";
    }

    const status = videoUrl ? 200 : 404;

    // 動画URLが見つかっても、エラーメッセージがある場合は動画埋め込みを避ける
    const contentHtml = videoUrl && !error ?
        '<video controls autoplay src="' + videoUrl + '" style="max-width: 100%; height: auto; border-radius: 4px;">お使いのブラウザは動画タグをサポートしていません。</video>' :
        '<p class="error">エラー: ' + (error || '指定されたストリームが見つかりません。') + '</p>';
    
    // HTML全体を文字列結合で返す
    res.status(status).send(
        '<html>' +
        '<head>' +
            '<title>' + SITE_NAME + '</title>' +
            '<style>' +
                'body { font-family: sans-serif; text-align: center; background-color: #f0f0f0; }' +
                '.container { max-width: 800px; margin: 40px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }' +
                'h1 { color: #333; }' +
                '.error { color: #d9534f; font-weight: bold; }' +
                'video { width: 100%; height: auto; border-radius: 4px; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="container">' +
                '<h1>' + SITE_NAME + ' - 動画再生</h1>' +
                '<p><strong>Video ID:</strong> ' + videoid + '</p>' +
                '<p><strong>iTag:</strong> ' + targetItag + '</p>' +
                '<h2>再生ウィンドウ</h2>' +
                contentHtml +
            '</div>' +
        '</body>' +
        '</html>'
    );
});
