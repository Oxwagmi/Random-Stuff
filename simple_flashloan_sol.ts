/** dependencies versions**
 
"dependencies": {
    "@solana/spl-token-3": "npm:@solana/spl-token@~0.3",
    "@solana/web3.js": "^1.98.0",
    "@solendprotocol/solend-sdk": "^0.6.16",
    "ws": "^8.18.0"
  }
**/


import {
  TransactionInstruction,PublicKey,Keypair,SystemProgram,Connection,TransactionMessage,VersionedTransaction
} from "@solana/web3.js";
import { BN } from 'bn.js';
import * as fs from 'fs';
import {
  SOLEND_PRODUCTION_PROGRAM_ID,
  flashBorrowReserveLiquidityInstruction,
  flashRepayReserveLiquidityInstruction,
} from '@solendprotocol/solend-sdk';
import * as Token from '@solana/spl-token-3';
export const BASE_MINTS_OF_INTEREST = {
  USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
};

export const BASE_MINTS_OF_INTEREST_B58 = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  SOL: 'So11111111111111111111111111111111111111112',
};

export const USDC_MINT_STRING = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;

// solend constants from here https://api.solend.fi/v1/config?deployment=production
export const SOLEND_TURBO_POOL = new PublicKey(
  '7RCz8wb6WXxUhAigok9ttgrVgDFFFbibcirECzWSBauM',
);

export const SOLEND_TURBO_SOL_RESERVE = new PublicKey(
  'UTABCRXirrbpCNDogCoqEECtM3V44jXGCsK23ZepV3Z',
);
export const SOLEND_TURBO_SOL_LIQUIDITY = new PublicKey(
  '5cSfC32xBUYqGfkURLGfANuK64naHmMp27jUT7LQSujY',
);
export const SOLEND_TURBO_SOL_FEE_RECEIVER = new PublicKey(
  '5wo1tFpi4HaVKnemqaXeQnBEpezrJXcXvuztYaPhvgC7',
);

export const SOLEND_TURBO_USDC_RESERVE = new PublicKey(
  'EjUgEaPpKMg2nqex9obb46gZQ6Ar9mWSdVKbw9A6PyXA',
);
export const SOLEND_TURBO_USDC_LIQUIDITY = new PublicKey(
  '49mYvAcRHFYnHt3guRPsxecFqBAY8frkGSFuXRL3cqfC',
);
export const SOLEND_TURBO_USDC_FEE_RECEIVER = new PublicKey(
  '5Gdxn4yquneifE6uk9tK8X4CqHfWKjW2BvYU25hAykwP',
);

export const SOLEND_FLASHLOAN_FEE_BPS = 30;


const payer = Keypair.fromSecretKey(  Uint8Array.from(
  JSON.parse(fs.readFileSync('./payer_key.json').toString())))



const setUpIxns: TransactionInstruction[] = [];
const instructionsMain: TransactionInstruction[] = [];


const baseMint =  BASE_MINTS_OF_INTEREST.SOL
const isUSDC = baseMint.equals(BASE_MINTS_OF_INTEREST.USDC);

const setUpSigners: Keypair[] = [payer];
let sourceTokenAccount: PublicKey;

let connection = new Connection('https://api.mainnet-beta.solana.com' , 'confirmed');


async function main() {

const MIN_BALANCE_RENT_EXEMPT_TOKEN_ACC =await Token.getMinimumBalanceForRentExemptAccount(connection);


// const USDC_ATA = await Token.getOrCreateAssociatedTokenAccount(
//   connection,
//   payer,
//   BASE_MINTS_OF_INTEREST.USDC,
//   payer.publicKey,
// );
const USDC_ATA  = undefined

if (!isUSDC) {
const sourceTokenAccountKeypair = Keypair.generate();
setUpSigners.push(sourceTokenAccountKeypair);

sourceTokenAccount = sourceTokenAccountKeypair.publicKey;

const createSourceTokenAccountIxn = SystemProgram.createAccount({
  fromPubkey: payer.publicKey,
  newAccountPubkey: sourceTokenAccount,
  space: Token.ACCOUNT_SIZE,
  lamports: MIN_BALANCE_RENT_EXEMPT_TOKEN_ACC,
  programId: Token.TOKEN_PROGRAM_ID,
});
setUpIxns.push(createSourceTokenAccountIxn);

const initSourceTokenAccountIxn =
  Token.createInitializeAccountInstruction(
    sourceTokenAccount,
    baseMint,
    payer.publicKey,
  );
setUpIxns.push(initSourceTokenAccountIxn);
} else {
sourceTokenAccount = USDC_ATA.address;
}

const destinationTokenAccount = "Address of the destination token account"; 

const solendReserve = isUSDC
? SOLEND_TURBO_USDC_RESERVE
: SOLEND_TURBO_SOL_RESERVE;

const solendLiquidity = isUSDC
? SOLEND_TURBO_USDC_LIQUIDITY
: SOLEND_TURBO_SOL_LIQUIDITY;

const solendFeeReceiver = isUSDC
? SOLEND_TURBO_USDC_FEE_RECEIVER
: SOLEND_TURBO_SOL_FEE_RECEIVER;

// 1 sol = 1_000_000_000 lamports  
const fixsize =1000_000_00;  // 0.1 sol 
const flashBorrowIxn = flashBorrowReserveLiquidityInstruction(
new BN(fixsize.toString()),
solendLiquidity,
new PublicKey(destinationTokenAccount),
solendReserve,
SOLEND_TURBO_POOL,
SOLEND_PRODUCTION_PROGRAM_ID,
);
instructionsMain.push(flashBorrowIxn);

const flashRepayIxn = flashRepayReserveLiquidityInstruction(
new BN(fixsize.toString()), // liquidityAmount
0, // borrowInstructionIndex
new PublicKey(destinationTokenAccount), // sourceLiquidity
solendLiquidity, // destinationLiquidity
solendFeeReceiver, // reserveLiquidityFeeReceiver
new PublicKey(destinationTokenAccount), // hostFeeReceiver
solendReserve, // reserve
SOLEND_TURBO_POOL, // lendingMarket
payer.publicKey, // userTransferAuthority
SOLEND_PRODUCTION_PROGRAM_ID, // lendingProgramId
);

instructionsMain.push(flashRepayIxn);



    
      const { blockhash } = await connection.getLatestBlockhash();
    
  try {
    
      const messageSetUp = new TransactionMessage({
          payerKey: payer.publicKey,
          instructions: setUpIxns,
          recentBlockhash: blockhash,
      }).compileToV0Message();
      const txSetUp = new VersionedTransaction(messageSetUp);
      txSetUp.sign(setUpSigners);
      const mainSetUp = new TransactionMessage({
          payerKey: payer.publicKey,
          instructions: instructionsMain,
          recentBlockhash: blockhash,
      }).compileToV0Message();
      const maintxSetUp = new VersionedTransaction(mainSetUp);
      const serializedMsg = mainSetUp.serialize();
      maintxSetUp.sign([payer]);

      // const simulationResult = await connection.simulateTransaction(txSetUp);
      const simulationResult2 = await connection.simulateTransaction(maintxSetUp);
      // const signature = await connection.sendTransaction( txSetUp, { skipPreflight: false, preflightCommitment: 'confirmed' });
      const signature2 = await connection.sendTransaction( maintxSetUp, { skipPreflight: true, preflightCommitment: 'confirmed' });

      // Log the transaction signature
      // console.log('Transaction successful!',signature);
      console.log('Transaction successful!',signature2);
      
      // console.log('Simulation Result:', simulationResult );
      // console.log('Simulation Result2 :', simulationResult2 );

      if (simulationResult2.value.err) {
          console.error('Transaction simulation failed:', simulationResult2.value.err);
      } else {
          console.log('Transaction simulation successful!');
          // console.log('Logs:', simulationResult2.value.logs);
      }
  } catch (err) {
      console.error('Error simulating transaction:', err);
  }
}

main().catch((err) => console.log(err));