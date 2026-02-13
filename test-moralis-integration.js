// Test the full Moralis integration through our API

// Test wallet with known transactions
const testWallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'; // Example Solana wallet

async function testAPI() {
  console.log('Testing Moralis integration through our API...\n');
  
  // First, we need to sign in (simulate session)
  // For testing, we'll call the API directly
  
  const apiUrl = `http://localhost:3003/api/trades?address=${testWallet}&chain=solana`;
  
  console.log('Fetching from:', apiUrl);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n✅ API Response:');
    console.log('- Cached:', data.cached || false);
    console.log('- Total transactions:', data.trades?.length || 0);
    
    if (data.trades && data.trades.length > 0) {
      console.log('\nFirst 3 transactions:');
      data.trades.slice(0, 3).forEach((tx, i) => {
        console.log(`\n${i + 1}. Transaction:`);
        console.log('   - Type:', tx.type);
        console.log('   - Token In:', tx.tokenIn?.symbol || 'N/A');
        console.log('   - Token Out:', tx.tokenOut?.symbol || 'N/A');
        console.log('   - Value USD:', tx.valueUSD);
        console.log('   - DEX:', tx.dex);
        console.log('   - Signature:', tx.signature?.substring(0, 20) + '...');
      });
    } else {
      console.log('\nNo transactions found for this wallet.');
      console.log('Note: Moralis only has swap data from September 2024 onwards.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Direct Moralis API test
async function testMoralisDirect() {
  console.log('\n\nTesting Moralis API directly...\n');
  
  const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjdmYzc3ZTQyLTY0ZjYtNDAzMi1hYWYxLTRiNTQxNWU2ZmEzZiIsIm9yZ0lkIjoiNTAwNTQ2IiwidXNlcklkIjoiNTE1MDQxIiwidHlwZUlkIjoiNDJjZTkwYTEtOWRjNy00MmJiLWJiZWUtMDg1NGUxZTIyODY1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzEwMTcxNDYsImV4cCI6NDkyNjc3NzE0Nn0.1Z2n0aEfRqpSM2XGMVydbPlSQK2Cbg-dZEPvt1ifcRA';
  
  const url = `https://solana-gateway.moralis.io/account/mainnet/${testWallet}/swaps?limit=5&order=DESC&transactionTypes=buy,sell`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-API-Key': MORALIS_API_KEY
    },
  });
  
  const data = await response.json();
  console.log('Direct Moralis API - Transactions found:', data.transactions?.length || 0);
  
  if (data.transactions && data.transactions.length > 0) {
    const tx = data.transactions[0];
    console.log('\nSample transaction from Moralis:');
    console.log('- Type:', tx.transactionType);
    console.log('- Token:', tx.tokenSymbol);
    console.log('- Token Address:', tx.tokenAddress);
    console.log('- SOL Amount:', tx.solAmount);
    console.log('- Token Amount:', tx.tokenAmount);
    console.log('- Success:', tx.success);
  }
}

// Run tests
async function runTests() {
  await testAPI();
  await testMoralisDirect();
}

runTests();