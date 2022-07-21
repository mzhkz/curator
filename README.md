# Curator Contract

クライアントとサーバが存在し，クライアントがサーバにデータを提供し，サーバはデータを受け取り，さらにそのデータを外部から参照可能な状態を保持すること（以下，アクセス管理）を委託されている関係において，クライアントとサーバの双方の意思に基づいてデータが提供また，アクセス管理がなされているかどうかを第三者によって検証可能にするプロトコルを提案する．本稿では，ブロックチェーン技術と暗号技術を用いて，データが参加者の意思によって提供され，かつ，サーバの意思によってデータを受け取り，かつデータに対してアクセス管理がなされていることをクライアントとサーバ以外の第三者が検証できるプロトコルを実際に実装した．

# Features

![データフローと全体のアーキテクチャ](/figures/Fig1.pdf)

# Requirement

# Installation

サーバとクライアント(provider, validator)、さらにはコントラクトをインストールします。
さらに、必要な NPM パッケージをダウンロードします。

```bash
git clone https://github.com/mzhkz/PETV-wip2022.git
cd contract && yarn
cd validator && yarn
cd provider && yarn
cd server && yarn
```

# Usage

Hardhat フレームワークにビルトインされている Ethereum ノードを起動します。

```bash
cd contract
npx hardhat node
```

続いて、コントラクトをコンパイルおよびデプロイを行います。

```bash
cd contract
npx hardhat run script/deploy.ts --network localhost
```

続いて、ストレージサーバを起動します。

```bash
cd server
npx ts-node app.ts
```

ファイルアップロードのキューを作成します。

```bash
node provider req [B_host] [A_nonce]
```

サーバから受け取ったキューをコントラクトに登録します。

```bash
node provider que [b_sig_hash_a_nonce] [A_nonce]
```

データをサーバにアップロードします。

```bash
node provider upload [B_host] [file_path] [hashed_b_nonce]
```

データの提供の記録をコントラクトに記録します。

```bash
node provider final [dataurl] [A_nonce]
```

# Note

以下に、発表用論文とスライドのリンクを掲載します。

- Paper: https://portal.sfc.wide.ad.jp/meetings/2022s/wip/kumo_bcali/220714_moz_wip_paper.pdf
- Presentation: https://portal.sfc.wide.ad.jp//meetings/2022s/wip/kumo_bcali/220714_wip_moz_prentation.pdf

# Author

- 作成者: moz
- 所属: 慶應義塾大学 環境情報学部 村井純研究会
- E-mail: moz[@]sfc.wide.ad.jp

# License

GNU General Public License (GPL)
