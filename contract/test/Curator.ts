import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Curator", () => {
	async function deployPERV() {
		const Curator = await ethers.getContractFactory("Curator");
		const perv = await Curator.deploy();

		const [owner, A, B, C] = [
			new ethers.Wallet(
				"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
			),
			new ethers.Wallet(
				"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
			),
			new ethers.Wallet(
				"0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
			),
			new ethers.Wallet(
				"0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
			),
		];

		const [signer_owner, signer_A, signer_B, signer_C] =
			await ethers.getSigners();

		return { perv, owner, A, B, C, signer_owner, signer_A, signer_B, signer_C };
	}

	describe("Deployment", () => {
		it("Should set the owner", async () => {
			const { perv, owner } = await loadFixture(deployPERV);
			expect(await perv.owner()).to.equal(owner.address);
		});
		// it("Should equal between hash sets by local and contract", async () => {
		// 	const { perv, owner } = await loadFixture(deployPERV);
		// 	const message = "abc";
		// 	const contract_hash = await perv.hashdayo(
		// 		ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message))
		// 	);
		// 	const local_hast = await ethers.utils.id(message);
		// 	expect(contract_hash).to.equal(local_hast);
		// });

		// it("Should equal between hash sets by singner and recover address", async () => {
		// 	const { perv, A, signer_A } = await loadFixture(deployPERV);
		// 	const message = "abc";
		// 	const hash = await ethers.utils.id(message);
		// 	const messageHashBinary = ethers.utils.arrayify(hash);
		// 	const signature = await A.signMessage(messageHashBinary);
		// 	const signer = await perv
		// 		.connect(signer_A)
		// 		.signdayo(messageHashBinary, signature);

		// 	expect(signer).to.equal(A.address);
		// });

		it("Should equal between computed addresses by local and contract", async () => {
			const { perv, B } = await loadFixture(deployPERV);
			const address_by_contract = (
				await perv._calculateAddressFromPubKey(B.publicKey)
			).toLowerCase();
			const address_by_local = ethers.utils
				.hexDataSlice(
					ethers.utils.keccak256(ethers.utils.hexDataSlice(B.publicKey, 1)),
					12
				)
				.toLowerCase();
			expect(address_by_contract).to.equal(address_by_local);
			expect(address_by_local).to.equal(B.address.toLowerCase());
		});
	});

	describe("create Que", () => {
		it("Should generate nonce and sign it", async () => {
			const { perv, A, B, signer_A, signer_B } = await loadFixture(deployPERV);

			const nonce = "abcede";
			const hex_nonce = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(nonce));
			const hex_hashed_nonce = ethers.utils.keccak256(hex_nonce);
			console.log(hex_hashed_nonce);
			const binary_hashed_nonce = ethers.utils.arrayify(hex_hashed_nonce);

			const hex_B_signed_hashed_nonce = await B.signMessage(
				binary_hashed_nonce
			);

			const data = "12345";
			const hex_hashed_data = ethers.utils.id(data);
			const hex_str_hashed_data = ethers.utils.hexlify(
				ethers.utils.toUtf8Bytes(hex_hashed_data)
			);
			const binary_hashed_data = ethers.utils.arrayify(hex_str_hashed_data);

			await perv
				.connect(signer_A)
				.createQue(
					binary_hashed_nonce,
					hex_B_signed_hashed_nonce,
					B.publicKey,
					binary_hashed_data
				);

			const dataurl = "https://localhost:1209/" + hex_hashed_data;
			const hex_dataurl = ethers.utils.hexlify(
				ethers.utils.toUtf8Bytes(dataurl)
			);
			// const hex32_dataurl = ethers.utils.formatBytes32String(hex_dataurl);
			// const binary_dataurl = ethers.utils.arrayify(hex32_dataurl);
			const hex_hashed_dataurl = ethers.utils.keccak256(hex_dataurl);
			const binary_hashed_dataurl = ethers.utils.arrayify(hex_hashed_dataurl);
			const binary_dataurl = ethers.utils.arrayify(hex_dataurl);
			const hex_B_signed_dataurl = await B.signMessage(binary_hashed_dataurl);

			await perv
				.connect(signer_B)
				.putIntent(
					binary_dataurl,
					binary_hashed_dataurl,
					hex_B_signed_dataurl,
					binary_hashed_nonce
				);

			const hex_A_signed_dataurl = await A.signMessage(binary_hashed_dataurl);
			const binary_nonce = ethers.utils.arrayify(hex_nonce);

			await perv
				.connect(signer_A)
				.putFinaility(hex_A_signed_dataurl, A.publicKey, binary_nonce);

			const { A_sig, B_sig } = await perv.getSignatures(binary_dataurl);
			console.log(A_sig);
			console.log(B_sig);
		});
	});
});
