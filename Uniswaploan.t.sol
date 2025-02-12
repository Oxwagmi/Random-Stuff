// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IPoolManager} from "v4-core/contracts/interfaces/IPoolManager.sol";
import {CurrencyLibrary, Currency} from "v4-core/contracts/types/Currency.sol";
import {IUnlockCallback} from "v4-core/contracts/interfaces/callback/IUnlockCallback.sol";
import {Test, console} from "forge-std/Test.sol";


contract MyContract {
    using CurrencyLibrary for Currency;
    // IPoolManager testnet_poolManager = IPoolManager(0x38EB8B22Df3Ae7fb21e92881151B365Df14ba967);

    IPoolManager poolManager = IPoolManager(0x1F98400000000000000000000000000000000004);

    function doSomethingWithPools() public {
        poolManager.unlock("");
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "only pool manager can call this function");
        poolManager.take(Currency.wrap(address(0)), address(this), 1 ether);

        poolManager.settle{value: 1 ether}();
   return "";
    }

  receive() external payable {  }

  
    
}

contract UniswapLoan is Test {
    address eoa;

    function setUp() public {
        vm.createSelectFork("unichain_mainnet");
        eoa = address(0xE0A0000000000000000000000000000000000);
    }

    function test_deploy() public {
        vm.startPrank(eoa);
        MyContract myc = new MyContract();
        myc.doSomethingWithPools();
        vm.stopPrank();
    }
}
