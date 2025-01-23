# Binance Trading UI

A TypeScript-based web interface for placing Binance orders with take profit functionality. Created with Cursor AI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Edit the `.env` file with your Binance API credentials:
- Get your API key and secret from Binance
- Add them to the `.env` file

## Development

1. Start the development server with hot reload:
```bash
npm run dev
```

## Production

1. Build the TypeScript code:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`

2. Enter the trading details:
- Coin Name (e.g., BTCUSDT)
- Quantity to buy
- Take Profit Percentage

3. Click "Place Order" to execute the trade

## Notes

- The server is configured to run in test mode by default
- To use real trading, set `test: false` in `src/server.ts`
- Make sure you have sufficient funds in your Binance account
- Double-check the trading pair and quantity before placing orders
