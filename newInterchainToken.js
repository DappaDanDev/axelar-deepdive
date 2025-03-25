const hre = require("hardhat");
const crypto = require("crypto");
const ethers = hre.ethers;
const {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} = require("@axelar-network/axelarjs-sdk");

const interchainTokenServiceContractABI = require("./utils/interchainTokenServiceABI");
const interchainTokenFactoryContractABI = require("./utils/interchainTokenFactoryABI");
const interchainTokenContractABI = require("./utils/interchainTokenABI");

const interchainTokenServiceContractAddress =
  "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";
const interchainTokenFactoryContractAddress =
  "0x83a93500d23Fbc3e82B410aD07A6a9F7A0670D66";

  //...

async function getSigner() {
    const [signer] = await ethers.getSigners();
    return signer;
  }


  //...

async function getContractInstance(contractAddress, contractABI, signer) {
    return new ethers.Contract(contractAddress, contractABI, signer);
  }

// Register and deploy a new interchain token to the BSC testnet
async function registerAndDeploy() {
    // Generate random salt
    const salt = "0x" + crypto.randomBytes(32).toString("hex");
  
    // Create a new token
    const name = "DappaDan Interchain Token";
    const symbol = "DAN";
    const decimals = 18;
  
    // Initial token supply
    const initialSupply = ethers.utils.parseEther("1000");
  
    // Get a signer to sign the transaction
    const signer = await getSigner();
  
    // Create contract instances
    const interchainTokenFactoryContract = await getContractInstance(
      interchainTokenFactoryContractAddress,
      interchainTokenFactoryContractABI,
      signer,
    );
    const interchainTokenServiceContract = await getContractInstance(
      interchainTokenServiceContractAddress,
      interchainTokenServiceContractABI,
      signer,
    );
  
    // Generate a unique token ID using the signer's address and salt
    const tokenId = await interchainTokenFactoryContract.interchainTokenId(
      signer.address,
      salt,
    );
  
    // Retrieve new token address
    const tokenAddress =
      await interchainTokenServiceContract.interchainTokenAddress(tokenId);
  
    // Retrieve token manager address
    const expectedTokenManagerAddress =
      await interchainTokenServiceContract.tokenManagerAddress(tokenId);
  
    // Deploy new Interchain Token
    const deployTxData =
      await interchainTokenFactoryContract.deployInterchainToken(
        salt,
        name,
        symbol,
        decimals,
        initialSupply,
        signer.address,
      );
  
    console.log(
      `
    Deployed Token ID: ${tokenId},
    Token Address: ${tokenAddress},
    Transaction Hash: ${deployTxData.hash},
    salt: ${salt},
    Expected Token Manager Address: ${expectedTokenManagerAddress},
       `,
    );
  }

  //...

async function main() {
    const functionName = process.env.FUNCTION_NAME;
    switch (functionName) {
      case "registerAndDeploy":
        await registerAndDeploy();
        break;

        case "deployToRemoteChain":
            await deployToRemoteChain();
            break;

            case "transferTokens":
                await transferTokens();
                break;

          default:
            console.error(`Unknown function: ${functionName}`);
            process.exitCode = 1;
            return;
    }
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });



  //...

const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

// Estimate gas costs.
async function gasEstimator() {
  const gas = await api.estimateGasFee(
    EvmChain.BINANCE,
    EvmChain.AVALANCHE,
    GasToken.ETH,
    700000,
    1.1
  );

  return gas;
}

//...

//...

// Deploy to remote chain: Avalanche Fuji
async function deployToRemoteChain() {

    // Get a signer for authorizing transactions
    const signer = await getSigner();
    // Get contract for remote deployment
    const interchainTokenFactoryContract = await getContractInstance(
      interchainTokenFactoryContractAddress,
      interchainTokenFactoryContractABI,
      signer
    );
  
    // Estimate gas fees
    const gasAmount = await gasEstimator();
  
    // Salt value from registerAndDeploy(). Replace with your own
    const salt =
      "0xa1f8a28dcaf03a178743c3208fa7bdb03e56932389c573d44accb80aa16c83b4";
  
    // Initiate transaction
    const txn = await interchainTokenFactoryContract[
      "deployRemoteInterchainToken(bytes32,string,uint256)"
    ](
        salt,
        "Avalanche",
        gasAmount,
        { value: gasAmount }
      );
  
    console.log(`Transaction Hash: ${txn.hash}`);
  }
  
  //...

  async function transferTokens() {
    // Get signer
    const signer = await getSigner();
  
    const interchainToken = await getContractInstance(
      "0x377b30DaC9E2E4E19722E5e3Bf3a683F862889d6", // Update with new token address
      interchainTokenContractABI, // Interchain Token contract ABI
      signer
    );
  
    // Calculate gas amount
    const gasAmount = await gasEstimator();
  
    // Initiate transfer via token
    const transfer = await interchainToken.interchainTransfer(
      "Avalanche", // Destination chain
      "0x22Ddfd8a9C1AeC4AD5C2763F29c7C92f65cFbA1b", // Update with your own wallet address
      ethers.utils.parseEther("25"), // Transfer 25 tokens
      "0x", // Empty data payload
      { value: gasAmount } // Transaction options
    );
    console.log("Transfer Transaction Hash:", transfer.hash);
  }

  //...
