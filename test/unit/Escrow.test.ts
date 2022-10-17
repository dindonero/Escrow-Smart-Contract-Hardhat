import { developmentChains } from "../../helper-hardhat-config"
import { deployments, ethers, network } from "hardhat"
import { assert, expect } from "chai"
import { ERC20Mock, Escrow } from "../../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Escrow Unit Test", function () {
          let escrow: Escrow,
              erc20mock: ERC20Mock,
              deployer: SignerWithAddress,
              secondAccount: SignerWithAddress
          let amount = 100,
              duration = 10
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              secondAccount = accounts[1]

              await deployments.fixture("all")
              escrow = await ethers.getContract("Escrow", deployer)
              erc20mock = await ethers.getContract("ERC20Mock", deployer)
              await erc20mock.approve(escrow.address, erc20mock.balanceOf(deployer.address))
          })
          it("is contract deployed", async function () {
              assert.notEqual(escrow.address, undefined)
          })

          describe("deposit", function () {
              describe("erc20", async () => {
                  it("emits a Deposit event after a deposit", async () => {
                      await expect(
                          await escrow.deposit(deployer.address, erc20mock.address, 100, 10)
                      ).to.emit(escrow, "Deposit")
                  })
                  it("reverts if the amount is 0", async () => {
                      await expect(
                          escrow.deposit(deployer.address, erc20mock.address, 0, 10)
                      ).to.be.revertedWith("Escrow__AmountMustBeAboveZero()")
                  })
                  it("reverts if the duration is 0", async () => {
                      await expect(
                          escrow.deposit(deployer.address, erc20mock.address, 100, 0)
                      ).to.be.revertedWith("Escrow__DurationMustBeAboveZero()")
                  })
                  it("deposit is created with correct values", async () => {
                      let depositId: number
                      const tx = await escrow.deposit(
                          deployer.address,
                          erc20mock.address,
                          amount,
                          duration
                      )
                      const receipt = await tx.wait(1)

                      receipt.events
                          ?.filter((event) => event.event === "Deposit")
                          .forEach((event) => {
                              depositId = event.args?.depositId.toNumber()
                          })

                      const blockNumber = await ethers.provider.getBlockNumber()
                      const blockTimestamp = (await ethers.provider.getBlock(blockNumber)).timestamp

                      const deposit = await escrow.getDeposit(depositId)

                      assert.equal(deposit.token, erc20mock.address)
                      assert.equal(deposit.amount.toNumber(), amount)
                      assert.equal(deposit.releaseTime.toNumber(), blockTimestamp + duration)
                  })
              })

              describe("eth", async () => {
                  it("emits a Deposit event after a deposit", async () => {
                      await expect(
                          await escrow.deposit(
                              deployer.address,
                              ethers.constants.AddressZero,
                              100,
                              10,
                              { value: amount }
                          )
                      ).to.emit(escrow, "Deposit")
                  })
                  it("deposit is created with correct values", async () => {
                      const depositId = await escrow.getDepositCounter()

                      await escrow.deposit(
                          deployer.address,
                          ethers.constants.AddressZero,
                          amount,
                          duration,
                          { value: amount }
                      )

                      const blockNumber = await ethers.provider.getBlockNumber()
                      const blockTimestamp = (await ethers.provider.getBlock(blockNumber)).timestamp

                      const deposit = await escrow.getDeposit(depositId)

                      assert.equal(deposit.token, ethers.constants.AddressZero)
                      assert.equal(deposit.amount.toNumber(), amount)
                      assert.equal(deposit.releaseTime.toNumber(), blockTimestamp + duration)
                  })
              })
          })
          describe("withdraw", () => {
              let depositId: number
              beforeEach(async () => {
                  const tx = await escrow.deposit(deployer.address, erc20mock.address, amount, 1)
                  const receipt = await tx.wait(1)
                  receipt.events
                      ?.filter((event) => event.event === "Deposit")
                      .forEach((event) => {
                          depositId = event.args?.depositId.toNumber()
                      })
              })
              it("emits a Withdraw event after a withdraw", async () => {
                  await new Promise((resolve) => setTimeout(resolve, 1000))
                  await expect(await escrow.withdraw(depositId)).to.emit(escrow, "Withdrawal")
              })
              it("reverts if the deposit does not exist", async () => {
                  await expect(escrow.withdraw(depositId + 1)).to.be.revertedWith(
                      "Escrow__DepositDoesNotExist()"
                  )
              })
              it("reverts if the deposit is not released", async () => {
                  await escrow.deposit(deployer.address, erc20mock.address, amount, 10)
                  await expect(escrow.withdraw(depositId + 1)).to.be.revertedWith(
                      "Escrow__DepositIsStillLocked"
                  )
              })
              it("reverts if the caller is not the receiver", async () => {
                  const escrowAsSecondAccount = escrow.connect(secondAccount)
                  await expect(escrowAsSecondAccount.withdraw(depositId)).to.be.revertedWith(
                      "Escrow__MsgSenderIsNotDepositReceiver"
                  )
              })

              it("withdraws the correct amount of erc20", async () => {
                  await new Promise((resolve) => setTimeout(resolve, 1000))

                  const balance = await erc20mock.balanceOf(deployer.address)

                  await escrow.withdraw(depositId)

                  const newBalance = await erc20mock.balanceOf(deployer.address)
                  const deposit = await escrow.getDeposit(depositId)

                  assert.equal(newBalance.toString(), balance.add(amount).toString())
                  assert.equal(deposit.amount.toNumber(), 0)
                  assert.equal(deposit.releaseTime.toNumber(), 0)
                  assert.equal(deposit.token, ethers.constants.AddressZero)
              })

              it("withdraws the correct amount of eth", async () => {
                  const tx = await escrow.deposit(
                      deployer.address,
                      ethers.constants.AddressZero,
                      amount,
                      1,
                      { value: amount }
                  )
                  const receipt = await tx.wait(1)

                  let ethDepositId: number
                  receipt.events
                      ?.filter((event) => event.event === "Deposit")
                      .forEach((event) => {
                          ethDepositId = event.args?.depositId.toNumber()
                      })

                  const balance = await ethers.provider.getBalance(deployer.address)

                  const withdrawTx = await escrow.withdraw(ethDepositId)
                  const withdrawReceipt = await withdrawTx.wait(1)

                  const gasCostWei = withdrawReceipt.gasUsed.mul(withdrawReceipt.effectiveGasPrice)

                  const newBalance = await ethers.provider.getBalance(deployer.address)
                  const deposit = await escrow.getDeposit(ethDepositId)

                  assert.equal(
                      newBalance.add(gasCostWei).toString(),
                      balance.add(amount).toString()
                  )
                  assert.equal(deposit.amount.toNumber(), 0)
                  assert.equal(deposit.releaseTime.toNumber(), 0)
                  assert.equal(deposit.token, ethers.constants.AddressZero)
              })
          })
      })
