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

    function signdayo(bytes32 hash, bytes memory sig) public pure returns(address) {
        return  _recoverSigner(hash, sig);
    }

    function createQue(bytes memory hashed_A_nonce, bytes memory B_signed_hashed_A_nonce, bytes memory B_pubkey, bytes memory hashed_data) public {
        bytes32 expected_A_nonce = bytes32(hashed_A_nonce);
        address signer = _recoverSigner(expected_A_nonce, B_signed_hashed_A_nonce);

        address B_address = _calculateAddressFromPubKey(B_pubkey);
        require(signer == B_address, "PERV (createQue): not match the signer to the platformer");

        _B_pubkey[hashed_A_nonce] = B_pubkey;
        _B_address[B_pubkey] = B_address;
        _hashed_data[hashed_A_nonce] = hashed_data;
        _hash_convert_to_bytes[bytes32(hashed_A_nonce)] = hashed_A_nonce; // 処理の都合上
    }

    function putIntent(bytes memory dataurl, bytes memory B_signed_dataurl, bytes memory hashed_A_nonce) public {
       bytes32 expected_dataurl = bytes32(dataurl);
        address signer = _recoverSigner(expected_dataurl, B_signed_dataurl);

        bytes memory B_pubkey = _B_pubkey[hashed_A_nonce];
        address B_address = _B_address[B_pubkey];
        
        // console.log(signer);
        // console.log(B_address);

        require(signer == B_address, "PERV (putIntent): not match the signer to platformer");

        bytes32 expected_hash = bytes32(_hashed_data[hashed_A_nonce]);
        uint256 hash_range = expected_hash.length;
        uint256 dataurl_range = dataurl.length;
        uint256 start = dataurl_range - hash_range;

        bytes32 hash = bytes32(slice(dataurl, start, hash_range));
        console.log("url:", string(abi.encodePacked(expected_dataurl)));
        // console.log(string(abi.encodePacked(hash)));

        require(hash == expected_hash, "PERV (putIntent): not match the data hash");

        _B_signed_dataurl[hashed_A_nonce] = B_signed_dataurl;
        _dataurl[hashed_A_nonce] = dataurl;
    }

    function putFinaility(bytes memory A_signed_dataurl, bytes memory A_pubkey, bytes memory A_nonce) public {
        bytes32 expected_A_nonce = keccak256(A_nonce);
        bytes memory expected_hashed_A_nonce = _hash_convert_to_bytes[expected_A_nonce];
        require(keccak256(_B_signed_dataurl[expected_hashed_A_nonce]) == keccak256(bytes("")), "PERV: not match");
        bytes memory dataurl = _dataurl[expected_hashed_A_nonce];

        bytes32 expected_dataurl = bytes32(dataurl);
        address signer = _recoverSigner(expected_dataurl, A_signed_dataurl);
        address A_address = _calculateAddressFromPubKey(A_pubkey);

        require(signer == A_address, "PERV (putFinaility): not match the signer to provider");

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