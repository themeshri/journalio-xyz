// Test with specific wallet that has proven swaps
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjdmYzc3ZTQyLTY0ZjYtNDAzMi1hYWYxLTRiNTQxNWU2ZmEzZiIsIm9yZ0lkIjoiNTAwNTQ2IiwidXNlcklkIjoiNTE1MDQxIiwidHlwZUlkIjoiNDJjZTkwYTEtOWRjNy00MmJiLWJiZWUtMDg1NGUxZTIyODY1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzEwMTcxNDYsImV4cCI6NDkyNjc3NzE0Nn0.1Z2n0aEfRqpSM2XGMVydbPlSQK2Cbg-dZEPvt1ifcRA';

const walletAddress = 'FReKaCqfqYFGD3tqYCwSxwfWoSz2ey9qSPisDkaTj2mK';

async function testWallet() {
  console.log(`Testing wallet with proven swaps: ${walletAddress}\n`);
  
  // Test without any date filters first
  const url = `https://solana-gateway.moralis.io/account/mainnet/${walletAddress}/swaps?limit=100&order=DESC&transactionTypes=buy,sell`;
  
  console.log('URL:', url);
  console.log('\nFetching swaps...\n');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.log('Error Response:', responseText);
      return;
    }
    
    const data = JSON.parse(responseText);
    
    console.log('\n===== RESULTS =====');
    console.log(`Total swaps found: ${data.transactions?.length || 0}`);
    console.log(`Has cursor for next page: ${!!data.cursor}`);
    
    if (data.transactions && data.transactions.length > 0) {
      console.log('\n===== FIRST 5 TRANSACTIONS =====');
      
      data.transactions.slice(0, 5).forEach((tx, i) => {
        const date = new Date(tx.blockTime * 1000);
        console.log(`\n${i + 1}. Transaction Details:`);
        console.log('   Signature:', tx.signature);
        console.log('   Date:', date.toISOString());
        console.log('   Type:', tx.transactionType);
        console.log('   Token Symbol:', tx.tokenSymbol);
        console.log('   Token Name:', tx.tokenName);
        console.log('   Token Address:', tx.tokenAddress);
        console.log('   Token Amount:', tx.tokenAmount);
        console.log('   SOL Amount:', tx.solAmount);
        console.log('   Price per Token:', tx.pricePerToken);
        console.log('   Total Value USD:', tx.totalValue);
        console.log('   Program Name:', tx.programName);
        console.log('   Success:', tx.success);
      });
      
      // Show date range of transactions
      if (data.transactions.length > 1) {
        const firstDate = new Date(data.transactions[0].blockTime * 1000);
        const lastDate = new Date(data.transactions[data.transactions.length - 1].blockTime * 1000);
        console.log('\n===== DATE RANGE =====');
        console.log('Most recent swap:', firstDate.toISOString());
        console.log('Oldest swap in this batch:', lastDate.toISOString());
      }
      
    } else {
      console.log('\n⚠️  No swaps found for this wallet');
      console.log('Possible reasons:');
      console.log('1. This wallet has not made any swaps since September 2024');
      console.log('2. The swaps were made on DEXs not tracked by Moralis');
      console.log('3. The transactions were not swap type (buy/sell)');
      
      // Let's check the raw response
      console.log('\n===== RAW RESPONSE =====');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWallet();