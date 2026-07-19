# 3D CGは、なぜ画面に映るのか？（数式ゼロ・全13ページ）

中学数学の「座標」だけを前提に、現代ゲームの描画パイプライン
（頂点変換 → 描画パス → クアッドの罠 → Meshlet → Nanite）を、
**1ページ1テーマ×13ページ**で丁寧に学べる体験型解説サイトです。

## 特徴

- 数式・コード一切なし。すべて図解・例え話・触って動かせるThree.jsデモで説明
- 各ページ共通の構成: このページで分かること → 前ページの30秒復習 → 本文（なぜ→例え→仕組み→触って確認→よくある誤解→まとめ）→ 理解度クイズ3問 → 用語集
- 各デモに「ガイド付きツアー」（デモが自動で動いて実演する吹き出しガイド）
- 巻末に全用語集（glossary.html）と卒業クイズ10問

## 構成

```
index.html            表紙・学習マップ
glossary.html         用語集
pages/
  ch1-coordinates.html        第1章  座標とは何か
  ch1b-vertex-polygon.html    第1章b 頂点とポリゴン
  ch2a-local-world.html       第2章a ローカル空間とワールド空間
  ch2b-view.html              第2章b ビュー空間
  ch2c-projection.html        第2章c 投影とクリップ
  ch2d-rasterize.html         第2章d ラスタライズ
  ch3a-gbuffer.html           第3章a G-Buffer
  ch3b-lighting.html          第3章b ライティングパス
  ch3c-transparent-post.html  第3章c 半透明とポストプロセス
  ch4-quad-overdraw.html      第4章  クアッドの罠
  ch5-meshlet.html            第5章  Meshlet
  ch6-nanite.html             第6章  Nanite
  ch7-summary.html            第7章  まとめ・卒業クイズ
css/style.css         共通スタイル
js/
  site.js             共通機能（章ナビ・前後ページャー・クイズ・ガイド付きツアー・チェックリスト）
  three-common.js     Three.js共通ヘルパー
  ui.js               UI部品ヘルパー
  demoA-*.js / demoB-*.js / section*.js   各デモ
  vendor/three/       Three.js本体（CDN非依存のローカル同梱）
SPEC.md               開発仕様書（v2）
```

## ローカルでの確認方法

静的ファイルのみで動作します。

```bash
python3 -m http.server 8000
```

`http://localhost:8000/` を開いてください。

## GitHub Pagesでの公開

このリポジトリのGitHub Pagesを有効にすると
`https://ytaniytani.github.io/3D-rendering-process-Web/` で公開できます。
