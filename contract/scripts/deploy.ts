import { ethers, artifacts } from "hardhat";
import fs from "fs";
import path from "path";
import { Contract } from "ethers";

async function main() {
	const [deployer] = await ethers.getSigners();
	const PERV = await ethers.getContractFactory("PERV");
	const perv = await PERV.deploy();
	await perv.deployed();
	console.log(`MyNFT ERC721 was deployed to: ${perv.address}}`);
	generateABIFile(perv, "PERV");
}

function generateABIFile(
	contract: Contract,
	contractName: string,
	destPath: string = path.join(__dirname, "/../dest")
) {
	const contractsDir = path.join(destPath);
	if (!fs.existsSync(contractsDir)) {
		fs.mkdirSync(contractsDir);
	}
	fs.writeFileSync(
		contractsDir + `/${contractName}-address.json`,
		JSON.stringify({ address: contract.address }, undefined, 2)
	);
	const ContractArtifact = artifacts.readArtifactSync(contractName);
	fs.writeFileSync(
		contractsDir + `/${contractName}.json`,
		JSON.stringify(ContractArtifact, undefined, 2)
	);
	console.log(` ${contractName} abi and address was saved at
${contractsDir}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
