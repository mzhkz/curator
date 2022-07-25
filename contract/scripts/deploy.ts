import { ethers, artifacts } from "hardhat";
import fs from "fs";
import path from "path";
import { Contract } from "ethers";

async function main() {
	const [deployer] = await ethers.getSigners();
	const Curator = await ethers.getContractFactory("Curator");
	const curator = await Curator.deploy();
	await curator.deployed();
	console.log(`Curator Contract was deployed to: ${curator.address}}`);
	generateABIFile(curator, "Curator");
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
