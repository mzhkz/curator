// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract PERV {
    mapping(bytes => bytes) private _A_pubkey;
    mapping(bytes => bytes) private _B_pubkey;

    mapping(bytes => bytes) private _hashed_data;

    mapping(bytes => bytes) private _A_signed_dataurl;
    mapping(bytes => bytes) private _B_signed_dataurl;

    mapping(bytes => string) private _dataurl;

    mapping(bytes32 => bytes) private _hash_convert_to_bytes;
    mapping(bytes => address) private _B_address;


    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    function createQue(bytes memory hashed_A_nonce, bytes memory B_signed_hashed_A_nonce, bytes memory B_pubkey, bytes memory hashed_data) public {
        bytes32 expected_A_nonce = keccak256(hashed_A_nonce);
        address signer = _recoverSigner(expected_A_nonce, B_signed_hashed_A_nonce);
        address B_address = _calculateAddressFromPubKey(B_pubkey);

        require(signer == B_address, "PERV: not match");

        _B_pubkey[hashed_A_nonce] = B_pubkey;
        _B_address[B_pubkey] = B_address;
        _hashed_data[hashed_A_nonce] = hashed_data;
        _hash_convert_to_bytes[bytes32(hashed_A_nonce)] = hashed_A_nonce; // 処理の都合上
    }

    function putIntent(bytes memory B_signed_dataurl, bytes memory hashed_A_nonce, string memory dataurl) public {
        bytes32 expected_dataurl = keccak256(bytes(dataurl));
        address signer = _recoverSigner(expected_dataurl, B_signed_dataurl);
        bytes memory B_pubkey = _B_pubkey[hashed_A_nonce];
        address B_address = _B_address[B_pubkey];

        require(signer == B_address, "PERV: not match");

        // データURLが一致するかどうか

        _B_signed_dataurl[hashed_A_nonce] = B_signed_dataurl;
        _dataurl[hashed_A_nonce] = dataurl;
    }

    function putFinaility(bytes memory A_signed_dataurl, bytes memory A_pubkey, bytes memory A_nonce) public {
        bytes32 expected_A_nonce = keccak256(A_nonce);
        bytes memory expected_hashed_A_nonce = _hash_convert_to_bytes[expected_A_nonce];
        require(keccak256(_B_signed_dataurl[expected_hashed_A_nonce]) == keccak256(bytes("")), "PERV: not match");
        string memory dataurl = _dataurl[expected_hashed_A_nonce];

        bytes32 expected_dataurl = keccak256(bytes(dataurl));
        address signer = _recoverSigner(expected_dataurl, A_signed_dataurl);
        address A_address = _calculateAddressFromPubKey(A_pubkey);

        require(signer == A_address, "PERV: not match");

        _A_pubkey[expected_hashed_A_nonce] = A_pubkey;
        _A_signed_dataurl[expected_hashed_A_nonce] = A_signed_dataurl;
    }

    function _recoverSigner(bytes32 message, bytes memory sig)
       internal
       pure
       returns (address)
    {
       uint8 v;
       bytes32 r;
       bytes32 s;
       (v, r, s) = _splitSignature(sig);
       return ecrecover(message, v, r, s);
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
       assembly {
           mstore(0, hash)
           addr := mload(0)
        }
    }
}