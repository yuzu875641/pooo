import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// APIから取得するデータの型を定義（Formats部分のみ）
interface Format {
  itag: number;
  url: string;
  // 他にもプロパティがあるかもしれませんが、ここでは必要なものだけ
}

const WatchPage: React.FC = () => {
  const router = useRouter();
  const { v: videoid } = router.query; // クエリパラメータ 'v' から videoid を取得
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // サイトのタイトル
  const SITE_NAME = "動画を埋め込み!"; // ここをサイトのタイトルに変更してください

  useEffect(() => {
    // router.isReady でクエリパラメータが利用可能になってから処理を実行
    if (!router.isReady || !videoid) {
      return;
    }

    const fetchVideoData = async () => {
      setLoading(true);
      setError(null);
      setVideoUrl(null);
      
      const apiUrl = `https://siawaseok.f5.si/api/2/streams/${videoid}`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`API Response Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // formats 配列から itag が 96 のオブジェクトを探す
        const format96 = data.formats?.find((format: Format) => format.itag === 96);

        if (format96) {
          setVideoUrl(format96.url);
        } else {
          setError("itag 96 の動画フォーマットが見つかりませんでした。");
        }
      } catch (e) {
        console.error("Fetch error:", e);
        setError("動画データの取得中にエラーが発生しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [router.isReady, videoid]); // router.isReady と videoid が変更されたときに実行

  return (
    <div>
      {/* ページのタイトルを設定 */}
      <Head>
        <title>{SITE_NAME}</title>
      </Head>

      <h1>動画再生ページ</h1>
      <p>Video ID: {videoid}</p>

      {loading && <p>ロード中...</p>}
      {error && <p style={{ color: 'red' }}>エラー: {error}</p>}
      
      {videoUrl ? (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2>再生</h2>
          {/* 取得したURLを video タグの src に埋め込む */}
          <video 
            controls 
            src={videoUrl} 
            style={{ width: '100%' }}
            // 必要に応じて type 属性を追加
          >
            お使いのブラウザは動画タグをサポートしていません。
          </video>
        </div>
      ) : (
        !loading && !error && <p>動画が見つかりません。</p>
      )}
    </div>
  );
};

export default WatchPage;
