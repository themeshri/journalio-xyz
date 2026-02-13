// Test with known active Solana wallets
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjdmYzc3ZTQyLTY0ZjYtNDAzMi1hYWYxLTRiNTQxNWU2ZmEzZiIsIm9yZ0lkIjoiNTAwNTQ2IiwidXNlcklkIjoiNTE1MDQxIiwidHlwZUlkIjoiNDJjZTkwYTEtOWRjNy00MmJiLWJiZWUtMDg1NGUxZTIyODY1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzEwMTcxNDYsImV4cCI6NDkyNjc3NzE0Nn0.1Z2n0aEfRqpSM2XGMVydbPlSQK2Cbg-dZEPvt1ifcRA';

// Test multiple wallets to find one with transactions
const testWallets = [
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Known active trader
  'HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1', // Another active wallet
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Active wallet
];

async function testWallet(walletAddress) {
  console.log(`\nTesting wallet: ${walletAddress}`);
  console.log('=' .repeat(60));
  
  const url = `https://solana-gateway.moralis.io/account/mainnet/${walletAddress}/swaps?limit=10&order=DESC&transactionTypes=buy,sell`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    });
    
    if (!response.ok) {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.transactions?.length || 0} swaps`);
    
    if (data.transactions && data.transactions.length > 0) {
      console.log('\nFirst 3 transactions:');
      data.transactions.slice(0, 3).forEach((tx, i) => {
        const date = new Date(tx.blockTime * 1000).toLocaleString();
        console.log(`\n${i + 1}. ${tx.transactionType.toUpperCase()} - ${date}`);
        console.log(`   Token: ${tx.tokenSymbol} (${tx.tokenName})`);
        console.log(`   Amount: ${tx.tokenAmount} tokens`);
        console.log(`   SOL: ${tx.solAmount} SOL`);
        console.log(`   Value: $${tx.totalValue}`);
        console.log(`   Price: $${tx.pricePerToken}/token`);
        console.log(`   DEX: ${tx.programName}`);
        console.log(`   Success: ${tx.success}`);
      });
      
      return true; // Found transactions
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  return false; // No transactions
}

async function findActiveWallet() {
  console.log('Searching for wallets with recent swap activity...');
  console.log('Note: Moralis only has swap data from September 2024 onwards\n');
  
  for (const wallet of testWallets) {
    const hasTransactions = await testWallet(wallet);
    if (hasTransactions) {
      console.log(`\n🎯 Found active wallet: ${wallet}`);
      console.log('You can use this wallet address to test the application');
      return wallet;
    }
  }
  
  console.log('\n❌ None of the test wallets have recent swap activity');
  console.log('This might be because:');
  console.log('1. These wallets haven\'t traded since September 2024');
  console.log('2. They only traded on DEXs not tracked by Moralis');
  console.log('3. They only did non-swap transactions');
}

findActiveWallet();