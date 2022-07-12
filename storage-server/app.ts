import express from "express";
import { ethers } from "ethers";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

import PERVArtifact from "./dest/PERV.json";
import PERVAddress from "./dest/PERV-address.json";

const app: express.Express = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ dest: path.join(__dirname, "storage") });

const url = "http://127.0.0.1:8545/";
const provider = new ethers.providers.JsonRpcProvider(url);
const _wallet: ethers.Wallet = new ethers.Wallet(
	"0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
);

const wallet = _wallet.connect(provider);
const contract = new ethers.Contract(
	PERVAddress.address as string,
	PERVArtifact.abi as any,
	wallet
);

// 辞書オブジェクトを作成する
const nonces: { [hashed_b_nonce: string]: string } = {};

app.listen(3000, () => {
	console.log(`connected at: ${provider.connection.url}`);
	console.log(`address: ${wallet.address}`);
	console.log(`publickey: ${wallet.publicKey}`);
	console.log("Start on port 3000.");
});

type RequestNonce = {
	hex_hashed_a_nonce: string;
};

type UploadFile = {
	hex_hashed_b_nonce: string;
};

type GetDataParams = {
	hex_hashed_data: string;
};

/**
 * クライアントAから、データを提供したい意思を受ける
 * Aから受け取ったハッシュ化されたナンスに署名をして返却する
 * @req_params hex_hashed_a_nonce クライアントAが発行したナンス
 */
app.post(
	"/req_nonce",
	async (req: express.Request<RequestNonce>, res: express.Response) => {
		console.log("#### req_nonce");
		const hex_hashed_a_nonce = req.body.hex_hashed_a_nonce;
		console.log(`A nonce: ${hex_hashed_a_nonce}`);
		const binary_hashed_a_nonce = ethers.utils.arrayify(hex_hashed_a_nonce);
		const hex_b_signed_hashed_nonce = await wallet.signMessage(
			binary_hashed_a_nonce
		);
		const hex_b_public_key = wallet.publicKey;
		const hex_hashed_b_nonce = ethers.utils.id(hex_hashed_a_nonce + "server");
		console.log(`B nonce: ${hex_hashed_b_nonce}`);

		nonces[hex_hashed_b_nonce] = hex_hashed_a_nonce;
		res.json({
			hex_b_sig_hash_a_nonce: hex_b_signed_hashed_nonce,
			hex_b_public_key: hex_b_public_key,
			hex_hashed_b_nonce: hex_hashed_b_nonce,
		});
	}
);

/**
 * クライアントAからファイルアップロードのリクエストを受け取る。
 * また、コントラクトにデータを受け取った記録を残す
 * @req_params hex_hashed_b_nonce Bが発行したナンス
 */
app.post(
	"/upload_file",
	upload.single("file"),
	async (
		req: express.Request<UploadFile>,
		res: express.Response,
		next: express.NextFunction
	) => {
		console.log("#### upload_file");
		const hex_hashed_b_nonce = req.body.hex_hashed_b_nonce;
		if (nonces[hex_hashed_b_nonce] === undefined) {
			res.status(401).json("not correct hex_hashed_b_nonce value.");
		}
		const file_path = req.file.path;
		const buffer = await fs.readFileSync(file_path);
		const hex_hashed_data = ethers.utils.keccak256(buffer);
		const dataurl = "http://localhost:3000/hash/" + hex_hashed_data;
		const hex_dataurl = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(dataurl));
		const hex_hashed_dataurl = ethers.utils.keccak256(hex_dataurl);
		const binary_hashed_dataurl = ethers.utils.arrayify(hex_hashed_dataurl);
		const binary_dataurl = ethers.utils.arrayify(hex_dataurl);
		const hex_B_signed_dataurl = await wallet.signMessage(
			binary_hashed_dataurl
		);
		const hex_hashed_a_nonce = nonces[hex_hashed_b_nonce];
		const binary_hashed_nonce = ethers.utils.arrayify(hex_hashed_a_nonce);

		await fs.renameSync(
			file_path,
			path.join(path.join(__dirname, "storage"), hex_hashed_data)
		);

		//send transaction
		const tx = await contract.putIntent(
			binary_dataurl,
			binary_hashed_dataurl,
			hex_B_signed_dataurl,
			binary_hashed_nonce
		);
		await tx.wait();
		res.send({
			dataurl: dataurl,
		});
	}
);

/**
 * クライアントから受け通った:data_hashをもとに、対応するバイナリデータを返却する。
 */
app.get(
	"/hash/:hex_hashed_data",
	(req: express.Request<GetDataParams>, res: express.Response) => {
		console.log(req.params.hex_hashed_data);
		res.download(
			path.join(path.join(__dirname, "storage"), req.params.hex_hashed_data)
		);
	}
);

/**
 * 自分自身の公開鍵をクライアントに返す
 * @req_params hex_hashed_data 対応するデータのハッシュ値
 */
app.get("/pubkey", (req: express.Request, res: express.Response) => {
	res.json({
		pubkey: wallet.publicKey,
	});
});
