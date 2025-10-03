# Solana Wallet Tracker

A Next.js application for tracking Solana wallet transactions and token balances using the Solana Tracker API.

## Features

- ✅ Wallet address input with validation
- ✅ Real-time transaction history display
- ✅ Token swap details (from token → to token)
- ✅ Transaction amounts with USD values
- ✅ Formatted timestamps
- ✅ DEX/program information (Raydium, Pump.fun, Jupiter, etc.)
- ✅ Transaction signatures with links to Solana Explorer
- ✅ Loading states and error handling
- ✅ Responsive design with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Solana Tracker API
- **HTTP Client**: Axios
- **Date Formatting**: date-fns

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Get your API key from [Solana Tracker](https://docs.solanatracker.io/)

3. Add your API key to `.env.local`:
```env
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=your_api_key_here
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a valid Solana wallet address (32-44 characters, base58 format)
2. Click "Search" to fetch the latest transactions
3. View detailed transaction information including:
   - Token swap details
   - Transaction amounts and USD values
   - Timestamps
   - DEX used (Raydium, Pump.fun, etc.)
   - Transaction signatures with links to Solscan

## Project Structure

```
test-solana-traker/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
├── components/
│   ├── WalletInput.tsx     # Wallet address input with validation
│   ├── TransactionList.tsx # Transaction list display
│   ├── LoadingSpinner.tsx  # Loading state component
│   └── ErrorMessage.tsx    # Error display component
├── lib/
│   └── solana-tracker.ts   # API service for Solana Tracker
├── .env.local              # Environment variables (create this)
├── .env.local.example      # Example environment file
└── README.md
```

## API Integration

This project uses the [Solana Tracker API](https://docs.solanatracker.io/) with the following endpoints:

- `GET /wallet/latest-trades` - Fetch wallet transaction history
- `GET /wallet/tokens` - Fetch wallet token balances

## Error Handling

The application handles various error scenarios:
- Invalid wallet addresses
- API key issues
- Rate limiting
- Network errors
- Wallets with no transactions

## Build for Production

```bash
npm run build
npm start
```

## License

ISC
