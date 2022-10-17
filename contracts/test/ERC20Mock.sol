// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor() ERC20("ERC20Mock", "ERC20M") {
        _mint(msg.sender, 1000000000000000000000000);
    }
}
