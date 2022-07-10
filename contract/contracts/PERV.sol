// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Import this file to use console.log
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PERV {
    using ECDSA for bytes32;

    mapping(bytes => bytes) private _A_pubkey;
    mapping(bytes => bytes) private _B_pubkey;

    mapping(bytes => bytes) private _hashed_data;

    mapping(bytes => bytes) private _A_signed_dataurl;
    mapping(bytes => bytes) private _B_signed_dataurl;

    mapping(bytes => bytes) private _dataurl;

    mapping(bytes32 => bytes) private _hash_convert_to_bytes;
    mapping(bytes => address) private _B_address;


    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    function owner() public view returns(address) {
        return _owner;
    }

    function hashdayo(bytes memory data) public pure returns(bytes32) {
        return keccak256(data);
    }

    function signdayo(bytes memory hash, bytes memory sig) public pure returns(address) {
        return bytes32(hash).toEthSignedMessageHash().recover(sig);
    }

    function createQue(bytes memory hashed_A_nonce, bytes memory B_signed_hashed_A_nonce, bytes memory B_pubkey, bytes memory hashed_data) public {
        bytes32 expected_A_nonce = bytes32(hashed_A_nonce).toEthSignedMessageHash();
        // address signer = _recoverSigner(expected_A_nonce, B_signed_hashed_A_nonce);
        address signer = bytes32(hashed_A_nonce).toEthSignedMessageHash().recover(B_signed_hashed_A_nonce);
        address B_address = _calculateAddressFromPubKey(B_pubkey);

        console.log("signer: ", signer);
        console.log("B_address: ", B_address);
        console.log("msg.sender: ", msg.sender);

        require(signer == msg.sender, "PERV (createQue): not match the signer to the platformer");

        _B_pubkey[hashed_A_nonce] = B_pubkey;
        _B_address[B_pubkey] = B_address;
        _hashed_data[hashed_A_nonce] = hashed_data;
        _hash_convert_to_bytes[bytes32(hashed_A_nonce)] = hashed_A_nonce; // 処理の都合上
    }

    function putIntent(bytes memory B_signed_dataurl, bytes memory hashed_A_nonce, bytes memory dataurl) public {
        bytes32 expected_dataurl = keccak256(bytes(dataurl));
        address signer = _recoverSigner(expected_dataurl, B_signed_dataurl);
        bytes memory B_pubkey = _B_pubkey[hashed_A_nonce];
        address B_address = _B_address[B_pubkey];

        require(signer == B_address, "PERV (putIntent): not match the signer to platformer");

        bytes32 expected_hash = bytes32(_hashed_data[hashed_A_nonce]);
        bytes32 hash;

        uint256 deal_range = expected_hash.length;
        uint256 data_range = dataurl.length;
        uint256 overflow = data_range - deal_range;

        assembly {
            hash := mload(add(dataurl, overflow))
        }

        require(hash == expected_hash, "PERV (putIntent): not match the data hash");

        _B_signed_dataurl[hashed_A_nonce] = B_signed_dataurl;
        _dataurl[hashed_A_nonce] = dataurl;
    }

    function putFinaility(bytes memory A_signed_dataurl, bytes memory A_pubkey, bytes memory A_nonce) public {
        bytes32 expected_A_nonce = keccak256(A_nonce);
        bytes memory expected_hashed_A_nonce = _hash_convert_to_bytes[expected_A_nonce];
        require(keccak256(_B_signed_dataurl[expected_hashed_A_nonce]) == keccak256(bytes("")), "PERV: not match");
        bytes memory dataurl = _dataurl[expected_hashed_A_nonce];

        bytes32 expected_dataurl = keccak256(dataurl);
        address signer = _recoverSigner(expected_dataurl, A_signed_dataurl);
        address A_address = _calculateAddressFromPubKey(A_pubkey);

        require(signer == A_address, "PERV (putFinaility): not match the signer to provider");

        _A_pubkey[expected_hashed_A_nonce] = A_pubkey;
        _A_signed_dataurl[expected_hashed_A_nonce] = A_signed_dataurl;
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
    
    function _calculateAddressFromPubKey(bytes memory pub) internal pure returns (address addr) {
       bytes32 hash = keccak256(pub);
       addr = address(uint160(bytes20(hash)));
    }
}