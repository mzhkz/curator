// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PERV {
    using ECDSA for bytes32;

    mapping(bytes => bytes) private _A_pubkey; // hashed_A_nonce -> A_pubkey
    mapping(bytes => bytes) private _B_pubkey; // hashed_A_nonce -> B_pubkey

    mapping(bytes => bytes) private _hashed_data; // hashed_A_nonce -> hashed_data

    mapping(bytes => bytes) private _A_signed_dataurl; // hashed_A_nonce -> A_signed
    mapping(bytes => bytes) private _B_signed_dataurl; // hashed_A_nonce -> B_signed

    mapping(bytes => bytes) private _dataurl; // hashed_A_nonce -> dataurl
    mapping(bytes => bytes) private _hashed_dataurl;  // hashed_A_nonce -> hashed_dataurl 仕様にはいらないが、署名の検証にはハッシュ値が必要なので特別に定義

    mapping(bytes => address) private _B_address; // hashed_A_nonce -> B_address  アドレスの再計算を避けるため

    mapping(bytes => bytes) private _hashed_A_nonce_from_dataurl; // dataurl -> hashed_A_nonce


    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    function owner() public view returns(address) {
        return _owner;
    }

    // // 以下、テスト実装

    // function hashdayo(bytes memory data) public pure returns(bytes32) {
    //     return keccak256(data);
    // }

    // function signdayo(bytes32 hash, bytes memory sig) public pure returns(address) {
    //     return  _recoverSigner(hash, sig);
    // }

    // 以下、本実装

    function getSignatures(bytes memory dataurl) public view returns (bytes memory A_sig, bytes memory B_sig) {
        bytes memory hashed_A_nonce = _hashed_A_nonce_from_dataurl[dataurl];
        A_sig = _A_signed_dataurl[hashed_A_nonce];
        B_sig = _B_signed_dataurl[hashed_A_nonce];

        require(keccak256(A_sig) != keccak256(bytes("0x")), "PERV (getSignatures): not found A_sig");
        require(keccak256(B_sig) != keccak256(bytes("0x")), "PERV (getSignatures): not found B_sig");
    }

    function createQue(bytes memory hashed_A_nonce, bytes memory B_signed_hashed_A_nonce, bytes memory B_pubkey, bytes memory hashed_data) public {
        bytes32 expected_A_nonce = bytes32(hashed_A_nonce);
        address signer = _recoverSigner(expected_A_nonce, B_signed_hashed_A_nonce);

        address B_address = _calculateAddressFromPubKey(B_pubkey);
        require(signer == B_address, "PERV (createQue): not match between the signer and the platformer");

        _B_pubkey[hashed_A_nonce] = B_pubkey;
        _B_address[B_pubkey] = B_address;
        _hashed_data[hashed_A_nonce] = hashed_data;
    }

    function putIntent(bytes memory dataurl, bytes memory hashed_dataurl, bytes memory B_signed_dataurl, bytes memory hashed_A_nonce) public {
        require(bytes32(hashed_dataurl) == keccak256(dataurl), "PERV (putIntent): not match between the hashed_dataurl to dataurl");

        bytes32 expected_hash_dataurl = bytes32(hashed_dataurl);
        address signer = _recoverSigner(expected_hash_dataurl, B_signed_dataurl);

        bytes memory B_pubkey = _B_pubkey[hashed_A_nonce];
        address B_address = _B_address[B_pubkey];

        require(signer == B_address, "PERV (putIntent): not match between the signer and the platformer");

        bytes memory expected_hash = _hashed_data[hashed_A_nonce];
        uint256 hash_range = expected_hash.length;
        uint256 dataurl_range = dataurl.length;
        uint256 start = dataurl_range - hash_range;

        bytes memory hash = slice(dataurl, start, hash_range);
        // console.log("url:", string(dataurl));
        // console.log("cal:", string(hash));
        // console.log("expected: ", string(expected_hash));

        require(keccak256(hash) == keccak256(expected_hash), "PERV (putIntent): not match the data hash");

        _B_signed_dataurl[hashed_A_nonce] = B_signed_dataurl;
        _dataurl[hashed_A_nonce] = dataurl;
        _hashed_dataurl[hashed_A_nonce] = hashed_dataurl;
        _hashed_A_nonce_from_dataurl[dataurl] = hashed_A_nonce; // クライアントCによる検証のために、dataurlからナンスを参照できるようにする。
    }

    function putFinaility(bytes memory A_signed_dataurl, bytes memory A_pubkey, bytes memory A_nonce) public {
        bytes32 expected_A_nonce = keccak256(A_nonce);
        bytes memory expected_hashed_A_nonce = abi.encodePacked(expected_A_nonce);
        require(keccak256(_B_signed_dataurl[expected_hashed_A_nonce]) != keccak256(bytes("0x")), "PERV: not match");

        bytes memory hashed_dataurl = _hashed_dataurl[expected_hashed_A_nonce];
        bytes32 expected_hash_dataurl = bytes32(hashed_dataurl);

        address signer = _recoverSigner(expected_hash_dataurl, A_signed_dataurl);
        address A_address = _calculateAddressFromPubKey(A_pubkey);

        require(signer == A_address, "PERV (putFinaility): not match between the signer and the provider");

        _A_pubkey[expected_hashed_A_nonce] = A_pubkey;
        _A_signed_dataurl[expected_hashed_A_nonce] = A_signed_dataurl;
    }

    function _calculateAddressFromPubKey(bytes memory key) public pure returns (address addr) {
        bytes memory data = slice(key, 1, key.length-1);
        bytes32 keyHash = keccak256(data);
        data = abi.encodePacked(keyHash);
        data = slice(data, 12, data.length-12);
        assembly {
            addr := mload(add(data,20))
        } 
    }

    function _recoverSigner(bytes32 hash, bytes memory sig)
       internal
       pure
       returns (address)
    {
       uint8 v;
       bytes32 r;
       bytes32 s;
       (v, r, s) = _splitSignature(sig);
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix, hash));
       return ecrecover(prefixedHashMessage, v, r, s);
    }
    
    function _splitSignature(bytes memory sig)
       internal
       pure
       returns (uint8, bytes32, bytes32)
    {
       require(sig.length == 65);
       
       bytes32 r;
       bytes32 s;
       uint8 v;
       assembly {
           // first 32 bytes, after the length prefix
           r := mload(add(sig, 32))
           // second 32 bytes
           s := mload(add(sig, 64))
           // final byte (first byte of the next 32 bytes)
           v := byte(0, mload(add(sig, 96)))
       }
       return (v, r, s);
    }

    function slice(
        bytes memory _bytes,
        uint256 _start,
        uint256 _length
    )
        internal
        pure
        returns (bytes memory)
    {
        require(_length + 31 >= _length, "slice_overflow");
        require(_bytes.length >= _start + _length, "slice_outOfBounds");

        bytes memory tempBytes;

        assembly {
            switch iszero(_length)
            case 0 {
                tempBytes := mload(0x40)
                let lengthmod := and(_length, 31)

                let mc := add(add(tempBytes, lengthmod), mul(0x20, iszero(lengthmod)))
                let end := add(mc, _length)

                for {
                    let cc := add(add(add(_bytes, lengthmod), mul(0x20, iszero(lengthmod))), _start)
                } lt(mc, end) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                    mstore(mc, mload(cc))
                }

                mstore(tempBytes, _length)
                mstore(0x40, and(add(mc, 31), not(31)))
            }
            default {
                tempBytes := mload(0x40)
                mstore(tempBytes, 0)
                mstore(0x40, add(tempBytes, 0x20))
            }
        }

        return tempBytes;
    }
}