const program = require("commander");
const ethers = require("ethers");
const fs = require("fs");
const axios = require("axios");

const PERVArtifact = require("./dest/PERV.json");
const PERVAddress  = require("./dest/PERV-address.json");

const url = "http://localhost:8545";
const provider = new ethers.providers.JsonRpcProvider(url);

const _wallet = new ethers.Wallet(
	"0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
);
const wallet = _wallet.connect(provider);
const contract = new ethers.Contract(
	PERVAddress.address,
	PERVArtifact.abi,
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
        const hex_double_hashed_dataurl = ethers.utils.keccak256(binary_hashed_dataurl);
        
        const res = await contract.getSignatures(binary_dataurl);
        const hex_A_signed_dataurl = res.A_sig
        const hex_B_signed_dataurl = res.B_sig

        console.log(hex_hashed_dataurl)
        console.log(hex_A_signed_dataurl)
        console.log(hex_B_signed_dataurl)
        
        const hex_b_signer = ethers.utils.recoverAddress(hex_double_hashed_dataurl, hex_B_signed_dataurl);
        const hex_b_address = ethers.utils.computeAddress(hex_b_public_key);

        console.log(hex_b_signer)
        console.log(hex_b_address)

        if (hex_b_signer !== hex_b_address) { 
            throw Error("not match between B_address and B_signer");
        }

        console.log("")
        console.log(CLI_BOLD + "OUTPUT (checksign): " + CLI_COLOR_RESET)
        console.log("")
        console.log(CLI_GREEN + ` hex_b_public_key: ${hex_b_public_key}`)
        console.log(CLI_GREEN + ` hex_b_address: ${hex_b_address}`)
        console.log(CLI_GREEN + ` hex_A_signed_dataurl: ${hex_A_signed_dataurl}`)
        console.log(CLI_GREEN + ` hex_B_signed_dataurl: ${hex_B_signed_dataurl}`)
        console.log("")
        console.log(CLI_BLUE + "Done!")
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