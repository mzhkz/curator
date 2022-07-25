const program = require("commander");
const ethers = require("ethers");
const fs = require("fs");
const axios = require("axios");
var FormData = require('form-data');

const CuratorArtifact = require("./dest/Curator.json");
const CuratorAddress  = require("./dest/Curator-address.json");

const url = "http://localhost:8545";
const provider = new ethers.providers.JsonRpcProvider(url);

const _wallet = new ethers.Wallet(
	"0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);
const wallet = _wallet.connect(provider);
const contract = new ethers.Contract(
	CuratorAddress.address,
	CuratorArtifact.abi,
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
  .command("req [address] [nonce]") // command を使用する場合
  .description("to request to upload data to the server, and get a sig B nonce.")
    .action(async (address, nonce) => {
      const hex_a_nonce = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(nonce));
      const hex_hashed_a_nonce = ethers.utils.keccak256(hex_a_nonce);

      const response = await axios.post(`${address}/req_nonce`, body = { hex_hashed_a_nonce });
      const { hex_b_sig_hash_a_nonce, hex_b_public_key, hex_hashed_b_nonce } = response.data
      console.log("")
      console.log(CLI_BOLD + "OUTPUT (req): " + CLI_COLOR_RESET)
      console.log("")
      console.log(CLI_GREEN + ` hex_hashed_a_nonce: ${hex_hashed_a_nonce}`)
      console.log(CLI_GREEN + ` hex_b_sig_hash_a_nonce: ${hex_b_sig_hash_a_nonce}`)
      console.log(CLI_GREEN + ` hex_b_public_key: ${hex_b_public_key}`)
      console.log(CLI_GREEN + ` hex_hashed_b_nonce: ${hex_hashed_b_nonce}`)
      console.log("")
      console.log(CLI_BLUE + "Done!")
      console.log("")
    });

program
  .command("que [hex_b_sig_hash_a_nonce] [hex_hashed_a_nonce] [hex_b_public_key] [file_path]") // command を使用する場合
  .description("to issue a transaction which is included B signature, B public key and a hash of the data.")
    .action(async (hex_b_sig_hash_a_nonce, hex_hashed_a_nonce, hex_b_public_key, file_path) => {
        const buffer = await fs.readFileSync(file_path);
        const hex_hashed_data = ethers.utils.keccak256(buffer);
        const hex_str_hashed_data = ethers.utils.hexlify(
          ethers.utils.toUtf8Bytes(hex_hashed_data)
      );
      const binary_hashed_data = ethers.utils.arrayify(hex_str_hashed_data);
      const binary_hashed_a_nonce = ethers.utils.arrayify(hex_hashed_a_nonce);
      const tx = await contract.createQue(binary_hashed_a_nonce, hex_b_sig_hash_a_nonce, hex_b_public_key, binary_hashed_data);
      await tx.wait();
      console.log("")
      console.log(CLI_BOLD + "OUTPUT (que): " + CLI_COLOR_RESET)
      console.log("")
      console.log(CLI_GREEN + ` hex_hashed_data: ${hex_hashed_data}`);
      console.log(CLI_GREEN + ` transaction id: ${tx.hash}`);
      console.log("")
      console.log(CLI_BLUE + "Done!")
      console.log("")
});

program
  .command("upload [address] [file_path] [hex_hashed_b_nonce]") // command を使用する場合
  .description("request to upload the data to the server, and get a sig B nonce.")
    .action(async (address, file_path, hex_hashed_b_nonce) => {
        const params = new FormData();
        const readStream = fs.createReadStream(file_path)
        params.append("file", readStream);
        params.append("hex_hashed_b_nonce", hex_hashed_b_nonce);

        const response_post = await axios.post(`${address}/upload_file`, params);
        const { dataurl } = response_post.data

        const response_get = await axios.get(dataurl, {}, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response_get.data, 'binary');
        const hex_hashed_data = ethers.utils.keccak256(buffer);
      
        console.log("")
        console.log(CLI_BOLD + "OUTPUT (upload): " + CLI_COLOR_RESET)
        console.log("")
        console.log(CLI_GREEN + ` dataurl: ${dataurl}`)
        console.log(CLI_GREEN + ` confirm hash: ${hex_hashed_data}`)
        console.log("")
        console.log(CLI_BLUE + "Done!")
        console.log("")
    });

program
  .command("final [dataurl] [nonce]") // command を使用する場合
  .description("to issue a transaction which is included A(my) signature, and the nonce")
    .action(async (dataurl, nonce) => {
      const hex_dataurl = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(dataurl));
      const hex_hashed_dataurl = ethers.utils.keccak256(hex_dataurl);
      const binary_hashed_dataurl = ethers.utils.arrayify(hex_hashed_dataurl);
      const hex_A_signed_dataurl = await wallet.signMessage(binary_hashed_dataurl);

      const hex_nonce = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(nonce));
      const binary_nonce = ethers.utils.arrayify(hex_nonce);
      const a_publickey = wallet.publicKey

      const tx = await contract.putFinaility(hex_A_signed_dataurl, a_publickey, binary_nonce);
      await tx.wait();
      console.log("")
      console.log(CLI_BOLD + "OUTPUT (final): " + CLI_COLOR_RESET)
      console.log("")
      console.log(CLI_GREEN + ` hex_hashed_dataurl: ${hex_hashed_dataurl}`);
      console.log(CLI_GREEN + ` hex_A_signed_dataurl: ${hex_A_signed_dataurl}`);
      console.log(CLI_GREEN + ` transaction id: ${tx.hash}`);
      console.log("")
      console.log(CLI_BLUE + CLI_BOLD +"All steps has been completed!")
      console.log("")
});
  

program.on("--help", () => {
  console.log("");
  console.log("  PERV Data Provider CLI:");
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