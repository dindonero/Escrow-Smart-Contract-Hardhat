// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error Escrow__EtherSentMustEqualAmount(uint256 etherSent, uint256 amount);
error Escrow__AmountMustBeAboveZero();
error Escrow__DurationMustBeAboveZero();
error Escrow__ToAddressMustNotBeZero();

error Escrow__DepositIsStillLocked(uint256 releaseTime);
error Escrow__DepositDoesNotExist();
error Escrow__MsgSenderIsNotDepositReceiver();

/**
 * @title Escrow
 * @author github.com/dindonero
 * @notice A contract that holds funds until a release time.
 */
contract Escrow {
    struct EscrowDeposit {
        address to;
        address token;
        uint256 amount;
        uint256 releaseTime;
    }

    // Events
    event Deposit(
        uint256 indexed depositId,
        address indexed depositor,
        address indexed to,
        address token,
        uint256 amount,
        uint256 releaseTime
    );
    event Withdrawal(address indexed receiver, uint256 indexed amount);

    // Local Variables
    // tokenAddress -> userAddress -> EscrowDeposit
    mapping(uint256 => EscrowDeposit) private s_deposits;

    uint256 private s_depositCounter = 0;

    /**
     * @notice Creates a new deposit that it not released until the release time.
     * @dev To create a ETH deposit, set token to address(0).
     * @dev The token must have been approved to this contract prior to its execution by each user.
     * @param to The address that will receive the funds.
     * @param token The address of the token to deposit.
     * @param amount The amount of tokens to deposit.
     * @param duration The duration in seconds until the funds can be withdrawn.
     */
    function deposit(
        address to,
        address token,
        uint256 amount,
        uint256 duration
    ) public payable {
        if (amount == 0) revert Escrow__AmountMustBeAboveZero();
        if (duration == 0) revert Escrow__DurationMustBeAboveZero();
        if (to == address(0)) revert Escrow__ToAddressMustNotBeZero();

        if (token == address(0)) {
            if (msg.value != amount) revert Escrow__EtherSentMustEqualAmount(msg.value, amount);
        } else {
            IERC20 erc20 = IERC20(token);
            erc20.transferFrom(msg.sender, address(this), amount);
        }

        uint256 depositId = s_depositCounter;

        uint256 releaseTime = block.timestamp + duration;

        EscrowDeposit memory m_deposit = EscrowDeposit({
            to: to,
            token: token,
            amount: amount,
            releaseTime: releaseTime
        });

        s_deposits[depositId] = m_deposit;

        s_depositCounter++;

        emit Deposit(depositId, msg.sender, to, token, amount, releaseTime);
    }

    /**
     * @notice Withdraws the funds of a deposit.
     * @dev The funds can only be withdrawn after the release time.
     * @dev This function is safe from Reentrancy, because it resets the deposit before transferring the funds.
     * @param depositId The id of the deposit.
     */
    function withdraw(uint256 depositId) public {
        EscrowDeposit memory m_deposit = getDeposit(depositId);

        if (m_deposit.amount == 0) revert Escrow__DepositDoesNotExist();
        if (m_deposit.to != msg.sender) revert Escrow__MsgSenderIsNotDepositReceiver();
        if (m_deposit.releaseTime > block.timestamp)
            revert Escrow__DepositIsStillLocked(m_deposit.releaseTime);

        address to = m_deposit.to;
        address token = m_deposit.token;
        uint256 amount = m_deposit.amount;

        m_deposit.to = address(0);
        m_deposit.token = address(0);
        m_deposit.amount = 0;
        m_deposit.releaseTime = 0;

        // First we reset the deposit to avoid reentrancy
        s_deposits[depositId] = m_deposit;

        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            IERC20 erc20 = IERC20(token);
            erc20.transfer(to, amount);
        }

        emit Withdrawal(to, amount);
    }

    // Getters
    function getDeposit(uint256 depositId) public view returns (EscrowDeposit memory) {
        return s_deposits[depositId];
    }

    function getDepositCounter() public view returns (uint256) {
        return s_depositCounter;
    }
}
