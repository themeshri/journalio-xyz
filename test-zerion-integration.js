// Test script for Zerion API integration
const { isValidWalletAddress, getWalletTransactions } = require('./lib/zerion.ts');

async function testZerionIntegration() {
  console.log('🧪 Testing Zerion API Integration...\n');

  // Test 1: Wallet Address Validation
  console.log('1. Testing wallet address validation:');
  
  const testAddresses = [
    { address: '0x742d35Cc6C7672C0A14F4bf7a0F15e68b8E4C5BE', chain: 'ethereum', expected: true },
    { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', chain: 'solana', expected: true },
    { address: 'invalid-address', chain: 'ethereum', expected: false },
    { address: '0x742d35Cc6C7672C0A14F4bf7a0F15e68b8E4C5B', chain: 'ethereum', expected: false }, // too short
  ];

  for (const test of testAddresses) {
    const result = isValidWalletAddress(test.address, test.chain);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`   ${status} ${test.chain}: ${test.address} - ${result ? 'valid' : 'invalid'}`);
  }

  console.log('\n2. Testing transaction fetching:');
  
  // Test with a known Ethereum address (Vitalik's address)
  const testWallet = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  
  if (process.env.ZERION_API_KEY) {
    try {
      console.log(`   🔍 Fetching transactions for ${testWallet}...`);
      const transactions = await getWalletTransactions(testWallet, { limit: 5 });
      
      if (transactions && transactions.length > 0) {
        console.log(`   ✅ Successfully fetched ${transactions.length} transactions`);
        console.log(`   📊 Latest transaction: ${transactions[0].type} on ${transactions[0].chain}`);
        console.log(`   💰 Value: $${transactions[0].valueUSD || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No transactions found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️  ZERION_API_KEY not set - skipping API test`);
  }

  console.log('\n✅ Test completed!');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testZerionIntegration().catch(console.error);
}

module.exports = { testZerionIntegration };