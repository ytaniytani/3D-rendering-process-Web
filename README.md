# 3D CGは、なぜ画面に映るのか？

中学数学の「座標」の知識だけで、現代のゲーム描画パイプライン（頂点変換 → 描画パス → Meshlet → Nanite）を
数式なしで理解できる、体験型のインタラクティブ解説ページです。

## 構成

- `index.html` — ページ本体（7セクション構成）
- `css/style.css` — 共通スタイル
- `js/` — 各セクションのThree.jsアプリケーション
  - `section1-points.js` : 座標と三角形の組み立て
  - `section2-spaces.js` : ローカル→ワールド→ビュー→クリップ→スクリーンの4空間変換
  - `section3-passes.js` : G-Bufferと描画パスの切り替えビュー
  - `section4-quadoverdraw.js` : クアッドオーバードローのシミュレーター
  - `section5-meshlet.js` : Meshletカリングのビジュアライザー
  - `section6-nanite.js` : Naniteのハイブリッド・ラスタライザーのシミュレーター
- `js/vendor/three/` — Three.js本体（CDN非依存でGitHub Pages上でも安定動作するようローカルに同梱）

## ローカルでの確認方法

静的ファイルのみで動作するため、任意の静的サーバーで配信するだけで確認できます。

```bash
python3 -m http.server 8000
```

その後 `http://localhost:8000/` を開いてください。

## GitHub Pagesでの公開

このリポジトリのGitHub Pagesを有効にすると
`https://ytaniytani.github.io/3D-rendering-process-Web/` で公開できます。
