import { DeployFunction } from "hardhat-deploy/dist/types"
import { network } from "hardhat"

const deployMocks: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (chainId == 31337) {
        log("----------------------------------------------------")
        const args: any[] = []
        const erc20mock = await deploy("ERC20Mock", {
            from: deployer,
            args: args,
            log: true,
        })
        log("----------------------------------------------------")
    }
}

export default deployMocks
deployMocks.tags = ["all", "mocks"]
