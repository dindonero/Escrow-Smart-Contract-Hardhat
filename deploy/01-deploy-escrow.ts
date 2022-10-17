import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/dist/types"
import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { network } from "hardhat"
import verify from "../utils/verify"

const deployEscrow: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("----------------------------------------------------")
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    const args: any[] = []
    const escrow = await deploy("Escrow", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(escrow.address, args)
    }
    log("----------------------------------------------------")
}

export default deployEscrow
deployEscrow.tags = ["all", "escrow"]
