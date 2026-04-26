// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract SimpleNFT is ERC721URIStorage {
    uint256 public tokenIdCounter;

    constructor() ERC721("SimpleNFT", "SNFT") {}

    function mintToken(address to, string memory tokenURI) external returns (uint256) {
        tokenIdCounter += 1;
        uint256 newTokenId = tokenIdCounter;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        return newTokenId;
    }
}
