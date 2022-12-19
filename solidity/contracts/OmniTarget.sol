pragma solidity ^0.8.0;
import {NonblockingLzApp} from "./lz/NonblockingLzApp.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20, NonblockingLzApp {
    uint256 public immutable bridgeAmount;

    event Burned(uint16 chainId, uint256 amount);
    event Minted(uint16 chainId, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint
    ) ERC20(_name, _symbol) NonblockingLzApp(_lzEndpoint) {
        bridgeAmount = 1 ether;
    }

    function bridge(uint16 _dstChainId) external payable onlyOwner {
        _burn(msg.sender, bridgeAmount);
        _lzSend(
            _dstChainId,
            bytes(""),
            payable(msg.sender),
            address(0x0),
            bytes(""),
            msg.value
        );
        emit Burned(_dstChainId, bridgeAmount);
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory,
        uint64,
        bytes memory
    ) internal override {
        _mint(owner(), bridgeAmount);
        emit Minted(_srcChainId, bridgeAmount);
    }
}
