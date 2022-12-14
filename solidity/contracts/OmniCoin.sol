pragma solidity 0.8.17;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executables/AxelarExecutable.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/StringAddressUtils.sol";
import {NonblockingLzApp} from "./lz/NonblockingLzApp.sol";

contract OmniCoin is ERC20, AxelarExecutable, NonblockingLzApp {
    using StringToAddress for string;
    using AddressToString for address;

    IAxelarGasService public immutable axelarGasService;

    event UnAuthorizedRecieve(string indexed chain, address indexed sender);

    constructor(
        address axelarGateway,
        address axelarRelayer,
        address layerZeroEndpoint
    )
        AxelarExecutable(axelarGateway)
        NonblockingLzApp(layerZeroEndpoint)
        ERC20("Omnichain Cool Wallet", "OCW")
    {
        axelarGasService = IAxelarGasService(axelarRelayer);
    }

    /// @notice Mint test token
    /// @dev ONLY FOR TESTING PURPOSE
    /// @param decimalAmount amount of tokens excluding the decimal; 1 will gives you 1 * 10e18.
    function mint(uint256 decimalAmount) external {
        _mint(msg.sender, decimalAmount * 1 ether);
    }

    function xcTransfer(
        string memory toChain,
        address recipient,
        uint256 amount
    ) external payable {
        _burn(msg.sender, amount);
        bytes memory payload = abi.encode(recipient, amount);
        string memory destinationContract = address(this).toString();
        if (msg.value > 0) {
            axelarGasService.payNativeGasForContractCall{value: msg.value}(
                address(this),
                toChain,
                destinationContract,
                payload,
                msg.sender
            );
        }
        gateway.callContract(toChain, destinationContract, payload);
    }

    function bridge(uint16 toChainId) external payable onlyOwner {
        _burn(msg.sender, 1 ether);
        _lzSend(
            toChainId,
            bytes(""),
            payable(msg.sender),
            address(0x0),
            bytes(""),
            msg.value
        );
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        if (sourceAddress.toAddress() != address(this)) {
            emit UnAuthorizedRecieve(sourceChain, sourceAddress.toAddress());
            return;
        }

        (address recipient, uint256 amount) = abi.decode(
            payload,
            (address, uint256)
        );
        _mint(recipient, amount);
    }

    function _nonblockingLzReceive(
        uint16, /* srcChainId */
        bytes memory,
        uint64,
        bytes memory
    ) internal override {
        _mint(owner(), 1 ether);
    }
}
