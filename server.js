const express = require('express');
const fetch = require('node-fetch');

const app = express();
const SITE_NAME = "ゆず";

module.exports = app;

app.get('/watch', async (req, res) => {
    const videoid = req.query.v;

    if (!videoid) {
        return res.status(400).send(
            '<html><head><title>' + SITE_NAME + '</title></head><body>' +
            '<div style="font-family: sans-serif; text-align: center; max-width: 800px; margin: 40px auto;">' +
            '<h1>エラー</h1>' +
            '<p style="color: red;">ビデオID (v) が指定されていません。</p>' +
            '</div></body></html>'
        );
    }

    // ★ 修正箇所: 文字列結合 (+) を使用し、バッククォートを回避 ★
    const externalApiUrl = 'https://siawaseok.f5.si/api/2/streams/' + videoid; 
    let formats = null;
    let error = null;

    try {
        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            throw new Error('External API returned status: ' + response.status);
        }

        const data = await response.json();
        formats = data.formats || [];

    } catch (e) {
        error = "動画データの取得中にサーバー側でエラーが発生しました。";
    }

    const hasFormats = formats && formats.length > 0;
    const status = hasFormats ? 200 : (error ? 500 : 404);
    
    // 全フォーマットのHTML表示部分を生成
    let formatsHtml = '';

    if (hasFormats) {
        formatsHtml = formats.map(format => {
            const resolution = format.resolution && format.resolution !== "audio only" ? format.resolution : "Audio Only";
            const videoTag = format.vcodec !== "none" 
                ? '<video controls src="' + format.url + '" style="max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #ccc;">お使いのブラウザはこのフォーマットをサポートしていません。</video>'
                : '<audio controls src="' + format.url + '" style="width: 100%; margin-top: 10px;">音声のみ</audio>';

            return '<div class="format-item">' +
                '<h3>itag: ' + format.itag + ' / ' + resolution + '</h3>' +
                '<p><strong>ファイル形式:</strong> ' + (format.ext || '不明') + '</p>' +
                '<p><strong>コーデック:</strong> (V: ' + (format.vcodec || 'なし') + ') (A: ' + (format.acodec || 'なし') + ')</p>' +
                '<p><strong>URL:</strong> <a href="' + format.url + '" target="_blank" rel="noopener noreferrer">リンクを確認</a></p>' +
                videoTag +
                '</div><hr>';
        }).join('');
    } else {
        formatsHtml = error ? 
            '<p class="error">エラー: ' + error + '</p>' : 
            '<p>利用可能な動画フォーマットが見つかりませんでした。</p>';
    }

    // HTML全体を文字列結合で返す
    res.status(status).send(
        '<html>' +
        '<head>' +
            '<title>' + SITE_NAME + '</title>' +
            '<style>' +
                'body { font-family: sans-serif; text-align: center; background-color: #f0f0f0; }' +
                '.container { max-width: 900px; margin: 40px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: left; }' +
                'h1 { color: #333; text-align: center; }' +
                'h2 { border-bottom: 2px solid #eee; padding-bottom: 5px; }' +
                'h3 { margin-top: 20px; color: #555; }' +
                '.error { color: #d9534f; font-weight: bold; text-align: center; }' +
                'hr { border: 0; border-top: 1px solid #eee; margin: 20px 0; }' +
                '.format-item { padding: 10px; border: 1px solid #f9f9f9; margin-bottom: 10px; }' +
            '</style>' +
        '</head>' +
        '<body>' +
            '<div class="container">' +
                '<h1>' + SITE_NAME + ' - 動画フォーマット一覧</h1>' +
                '<p style="text-align: center;"><strong>Video ID:</strong> ' + videoid + '</p>' +
                '<h2>利用可能なストリーム</h2>' +
                formatsHtml +
            '</div>' +
        '</body>' +
        '</html>'
    );
});
