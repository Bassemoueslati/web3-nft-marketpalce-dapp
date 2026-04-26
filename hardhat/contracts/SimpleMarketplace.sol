// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 id;
        address nftAddress;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool isSold;
    }

    uint256 public listingCounter;
    mapping(uint256 => Listing) public listings;

    event ItemListed(
        uint256 indexed listingId,
        address indexed nftAddress,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );
    event ItemSold(uint256 indexed listingId, address buyer, uint256 price);
    event ItemCanceled(uint256 indexed listingId);

    function listItem(address nftAddress, uint256 tokenId, uint256 price) external {
        require(price > 0, "Price must be greater than 0");

        IERC721(nftAddress).transferFrom(msg.sender, address(this), tokenId);

        listingCounter += 1;
        listings[listingCounter] = Listing({
            id: listingCounter,
            nftAddress: nftAddress,
            tokenId: tokenId,
            seller: payable(msg.sender),
            price: price,
            isSold: false
        });

        emit ItemListed(listingCounter, nftAddress, tokenId, msg.sender, price);
    }

    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage item = listings[listingId];

        require(item.id > 0, "Listing does not exist");
        require(!item.isSold, "Already sold");
        require(msg.value == item.price, "Wrong price");

        item.isSold = true;
        item.seller.transfer(msg.value);
        IERC721(item.nftAddress).transferFrom(address(this), msg.sender, item.tokenId);

        emit ItemSold(listingId, msg.sender, msg.value);
    }

    function cancelItem(uint256 listingId) external {
        Listing storage item = listings[listingId];

        require(item.id > 0, "Listing does not exist");
        require(!item.isSold, "Already sold");
        require(item.seller == msg.sender, "Only seller can cancel");

        item.isSold = true;
        IERC721(item.nftAddress).transferFrom(address(this), msg.sender, item.tokenId);

        emit ItemCanceled(listingId);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getUnsoldListings() external view returns (Listing[] memory) {
        uint256 total = listingCounter;
        uint256 unsoldCount = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (!listings[i].isSold) {
                unsoldCount += 1;
            }
        }

        Listing[] memory results = new Listing[](unsoldCount);
        uint256 current = 0;

        for (uint256 i = 1; i <= total; i++) {
            if (!listings[i].isSold) {
                results[current] = listings[i];
                current += 1;
            }
        }

        return results;
    }
}
