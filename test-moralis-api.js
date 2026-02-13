// Test Moralis API directly
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjdmYzc3ZTQyLTY0ZjYtNDAzMi1hYWYxLTRiNTQxNWU2ZmEzZiIsIm9yZ0lkIjoiNTAwNTQ2IiwidXNlcklkIjoiNTE1MDQxIiwidHlwZUlkIjoiNDJjZTkwYTEtOWRjNy00MmJiLWJiZWUtMDg1NGUxZTIyODY1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzEwMTcxNDYsImV4cCI6NDkyNjc3NzE0Nn0.1Z2n0aEfRqpSM2XGMVydbPlSQK2Cbg-dZEPvt1ifcRA';

// Test wallet address (example from Moralis docs)
const walletAddress = 'FReKaCqfqYFGD3tqYCwSxwfWoSz2ey9qSPisDkaTj2mK';

const options = {
  method: 'GET',
  headers: {
    'accept': 'application/json',
    'X-API-Key': MORALIS_API_KEY
  },
};

const url = `https://solana-gateway.moralis.io/account/mainnet/${walletAddress}/swaps?limit=10&order=DESC&transactionTypes=buy,sell`;

console.log('Testing Moralis API...');
console.log('URL:', url);

fetch(url, options)
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('\n✅ Moralis API Response:');
    console.log('Total transactions:', data.transactions?.length || 0);
    
    if (data.transactions && data.transactions.length > 0) {
      console.log('\nFirst transaction:');
      const tx = data.transactions[0];
      console.log('- Signature:', tx.signature);
      console.log('- Type:', tx.transactionType);
      console.log('- Token:', tx.tokenSymbol);
      console.log('- Token Amount:', tx.tokenAmount);
      console.log('- SOL Amount:', tx.solAmount);
      console.log('- Price per Token:', tx.pricePerToken);
      console.log('- Total Value:', tx.totalValue);
      console.log('- Success:', tx.success);
    }
    
    if (data.cursor) {
      console.log('\nPagination cursor:', data.cursor);
    }
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });