const fetch = require('node-fetch');

async function testSolanaTrackerAPI() {
  const apiKey = '7efed761-9946-4a6f-85ae-5762d4f24102';
  const testWallet = 'FReKaCqfqYFGD3tqYCwSxwfWoSz2ey9qSPisDkaTj2mK';
  
  const options = {
    method: 'GET', 
    headers: {
      'x-api-key': apiKey
    }
  };

  try {
    console.log('Testing Solana Tracker API...');
    console.log('URL:', `https://data.solanatracker.io/wallet/${testWallet}/trades`);
    
    const response = await fetch(`https://data.solanatracker.io/wallet/${testWallet}/trades`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ Number of trades found:', data.trades?.length || 0);
    
    if (data.trades && data.trades.length > 0) {
      console.log('✅ First trade sample:');
      const firstTrade = data.trades[0];
      console.log({
        tx: firstTrade.tx,
        time: new Date(firstTrade.time),
        from: {
          symbol: firstTrade.from.token.symbol,
          amount: firstTrade.from.amount
        },
        to: {
          symbol: firstTrade.to.token.symbol, 
          amount: firstTrade.to.amount
        },
        valueUSD: firstTrade.volume.usd,
        program: firstTrade.program
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    return false;
  }
}

testSolanaTrackerAPI().then(success => {
  console.log(success ? '✅ Test completed successfully' : '❌ Test failed');
});