const program = require("commander");
const ethers = require("ethers");
const fs = require("fs");
const axios = require("axios");

const CuratorArtifact = require("./dest/Curator.json");
const CuratorAddress  = require("./dest/Curator-address.json");

const url = "http://localhost:8545";
const provider = new ethers.providers.JsonRpcProvider(url);

const _wallet = new ethers.Wallet(
	"0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
);
const wallet = _wallet.connect(provider);
const contract = new ethers.Contract(
	CuratorArtifact.address,
	CuratorAddress.abi,
	wallet
);

const CLI_COLOR_RESET = "\x1b[0m";
const CLI_GREEN = "\x1b[32m";
const CLI_RESET = "\x1b[37m";
const CLI_BLUE = "\x1b[34m";
const CLI_BOLD = "\x1b[1m";

program
  .version("1.0.0", "-v, --version") // version の設定
  
  // -p or --path で与えられるオプションを設定する
  // <value> は必ず必要で [value] は任意
  
program
  .command("checksign [address] [dataurl]") // command を使用する場合
  .description("to request to update data to the server, and get a sig B nonce.")
    .action(async (address, dataurl) => {
        const response = await axios.get(`${address}/pubkey`);
        const { hex_b_public_key } = response.data;

        const hex_dataurl = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(dataurl));
        const binary_dataurl = ethers.utils.arrayify(hex_dataurl);
        const hex_hashed_dataurl = ethers.utils.keccak256(hex_dataurl);
        const binary_hashed_dataurl = ethers.utils.arrayify(hex_hashed_dataurl);
        // const hex_double_hashed_dataurl = ethers.utils.keccak256(hex_hashed_dataurl);
        
        const res = await contract.getSignatures(binary_dataurl);
        const hex_A_signed_dataurl = res.A_sig
        const hex_B_signed_dataurl = res.B_sig
        
        // const hex_b_signer = ethers.utils.recoverAddress(ethers.utils.arrayify(hex_hashed_dataurl), hex_B_signed_dataurl);
        const hex_b_address = ethers.utils.computeAddress(ethers.utils.arrayify(hex_b_public_key));
        const hex_b_signer = await contract.checksign(binary_hashed_dataurl, hex_B_signed_dataurl)

        if (hex_b_signer !== hex_b_address) { 
            throw Error("not match between B_address and B_signer");
        }

        console.log("")
        console.log(CLI_BOLD + "OUTPUT (checksign): " + CLI_COLOR_RESET)
        console.log("")
        console.log(CLI_GREEN + ` hex_b_public_key: ${hex_b_public_key}`)
        console.log(CLI_GREEN + ` hex_b_signer: ${hex_b_signer}`)
        console.log(CLI_GREEN + ` hex_b_address: ${hex_b_address}`)
        console.log(CLI_GREEN + ` hex_A_signed_dataurl: ${hex_A_signed_dataurl}`)
        console.log(CLI_GREEN + ` hex_B_signed_dataurl: ${hex_B_signed_dataurl}`)
        console.log("")
        console.log(CLI_BLUE + "Done!")
        console.log("")
    });

program
  .command("checkdata [dataurl]") // command を使用する場合
  .description("to request to update data to the server, and get a sig B nonce.")
    .action(async (dataurl) => {
        const response_get = await axios.get(dataurl, {}, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response_get.data, 'binary');
        const hex_hashed_data = ethers.utils.keccak256(buffer);

        const hash_length = hex_hashed_data.length
        const hex_expected_hash = dataurl.substring(dataurl.length - hash_length, dataurl.length);

        if (hex_hashed_data !== hex_expected_hash) { 
            throw Error("not match between the hash by the data and the hash included in the hash");
        }

        console.log("")
        console.log(CLI_BOLD + "OUTPUT (checksign): " + CLI_COLOR_RESET)
        console.log("")
        console.log(CLI_GREEN + ` hex_hashed_data: ${hex_hashed_data}`)
        console.log(CLI_GREEN + ` hex_expected_hash: ${hex_expected_hash}`)
        console.log("")
        console.log(CLI_BLUE + CLI_BOLD + "All steps has benn completed!")
        console.log("")
    });
  

program.on("--help", () => {
  console.log("");
  console.log("  PERV Validator CLI:");
});

// これで shell で実行する際に与えた引数をパースする
program.parse(process.argv);

// --path が指定されていた場合
if (program.path) {
  // option の arg はこれで取れる
  console.log(program.path);
}

if (program.target) {
  // target に arg をさらに渡していればの値が、
  // なければ true がかえってくる
  console.log(program.target);
}