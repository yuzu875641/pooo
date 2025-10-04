const express = require('express');
const fetch = require('node-fetch');

const app = express();
const SITE_NAME = "ゆず";

module.exports = app;

app.get('/watch', async (req, res) => {
    const videoid = req.query.v;
    const targetItag = req.query.itag;

    // --- パラメータチェック ---
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

    // --- 外部APIからのデータ取得 ---
    const externalApiUrl = 'https://siawaseok.f5.si/api/2/streams/' + videoid; 
    let videoUrl = null;
    let error = null;

    try {
        const response = await fetch(externalApiUrl);

        if (!response.ok) {
            // エラーをより具体的に報告
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
        console.error('Fetch Error:', e.message); // サーバーログに出力
        error = "動画データの取得中にサーバー側でエラーが発生しました。";
    }

    const status = videoUrl ? 200 : 404;

    // --- HLS.jsを使用した動画再生HTML (成功時) ---
    if (videoUrl) {
        // HLS.jsを使用するためのHTML (HLS.jsをCDNからロード)
        const fullScreenHtml = 
            '<html>' +
            '<head>' +
                '<title>' + SITE_NAME + ' - ' + targetItag + '</title>' +
                '<style>' +
                    'body { margin: 0; padding: 0; background-color: #000; overflow: hidden; }' +
                    '#video-container { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }' +
                    // object-fit: contain は動画のアスペクト比を維持し画面に収める
                    '#video-player { width: 100%; height: 100%; object-fit: contain; }' +
                '</style>' +
                // HLS.jsのCDNを読み込む
                '<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>' +
            '</head>' +
            '<body>' +
                '<div id="video-container">' +
                    // src属性は空にして、HLS.jsにソースの処理を任せる
                    '<video id="video-player" controls autoplay></video>' + 
                '</div>' +

                // HLS.jsの初期化スクリプト
                '<script>' +
                    'const video = document.getElementById(\'video-player\');' +
                    // Expressのサーバー側で取得した動画URLをJavaScript変数として埋め込む
                    'const videoSrc = "' + videoUrl.replace(/"/g, '\\"') + '";' + 

                    // HLS.jsによる再生処理
                    'if (Hls.isSupported()) {' +
                        'const hls = new Hls();' +
                        'hls.loadSource(videoSrc);' +
                        'hls.attachMedia(video);' +
                        // エラーハンドリングの例 (本番環境ではより詳細な実装を推奨)
                        'hls.on(Hls.Events.ERROR, function (event, data) {' +
                            'if (data.fatal) {' +
                                'switch(data.type) {' +
                                    'case Hls.ErrorTypes.NETWORK_ERROR:' +
                                        'console.error("HLS ネットワークエラー:", data.details);' +
                                        'hls.startLoad();' + // リロードを試みる
                                        'break;' +
                                    'case Hls.ErrorTypes.MEDIA_ERROR:' +
                                        'console.error("HLS メディアエラー:", data.details);' +
                                        'hls.recoverMediaError();' +
                                        'break;' +
                                    'default:' +
                                        'console.error("HLS致命的なエラー:", data.details);' +
                                        'hls.destroy();' +
                                        'break;' +
                                '}' +
                            '}' +
                        '});' +
                    '} else if (video.canPlayType(\'application/vnd.apple.mpegurl\')) {' +
                        // SafariなどのネイティブHLSをサポートするブラウザのためのフォールバック
                        'video.src = videoSrc;' +
                    '} else {' +
                        '// どちらもサポートされていない場合のフォールバック' +
                        'const container = document.getElementById(\'video-container\');' +
                        'container.innerHTML = \'<div style="color: white; text-align: center; padding: 20px;">' +
                            'お使いのブラウザは動画タグとHLS再生をサポートしていません。' +
                            '<br>ストリームURL: ' + videoSrc +
                        '</div>\';' +
                    '}' +
                    
                    // 自動再生を試みる (HLS.jsまたはネイティブのsrc設定後に実行)
                    'video.play().catch(error => {' +
                        '// 自動再生がブロックされた場合の処理' +
                        'console.warn("自動再生がブロックされました。ユーザーの操作が必要です。");' +
                        '// ユーザーに再生ボタンを押してもらうためのUIを表示するなどの対応が必要
                    '});' +
                '</script>' +
            '</body>' +
            '</html>';
        
        return res.status(200).send(fullScreenHtml);
    }
    
    // --- エラー時のHTML (失敗時) ---
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
