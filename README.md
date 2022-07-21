# Curator Contract

クライアントとサーバが存在し，クライアントがサーバにデータを提供し，サーバはデータを受け取り，さらにそのデータを外部から参照可能な状態を保持すること（以下，アクセス管理）を委託されている関係において，クライアントとサーバの双方の意思に基づいてデータが提供また，アクセス管理がなされているかどうかを第三者によって検証可能にするプロトコルを提案する．本稿では，ブロックチェーン技術と暗号技術を用いて，データが参加者の意思によって提供され，かつ，サーバの意思によってデータを受け取り，かつデータに対してアクセス管理がなされていることをクライアントとサーバ以外の第三者が検証できるプロトコルを実際に実装した．

# Features

![データフローと全体のアーキテクチャ](/figures/Fig1.pdf)

# Requirement

# Installation

Requirement で列挙したライブラリなどのインストール方法を説明する

```bash
pip install huga_package
```

# Usage

サーバとクライアント(provider, validator)、さらにはコントラクトをインストールします。

```bash
git clone https://github.com/mzhkz/PETV-wip2022.git
```

Hardhat フレームワークにビルトインされている Ethereum ノードを起動します。

```bash
cd contract
yarn
npx hardhat node
```

```bash
node provider req [B_host] [A_nonce]
```

# Note

以下に、発表用論文とスライドのリンクを掲載します。

Paper: https://portal.sfc.wide.ad.jp/meetings/2022s/wip/kumo_bcali/220714_moz_wip_paper.pdf
Presentation: https://portal.sfc.wide.ad.jp//meetings/2022s/wip/kumo_bcali/220714_wip_moz_prentation.pdf

# Author

作成情報を列挙する

- 作成者: moz
- 所属: 慶應義塾大学 村井純研究会
- E-mail: moz[@]sfc.wide.ad.jp

# License

GNU General Public License (GPL)
