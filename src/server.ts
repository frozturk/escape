import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { BinanceAPI } from './services/binance-api';

dotenv.config();

interface TradeRequest {
    coinName: string;
    quantity: string;
    takeProfitPercentage: string;
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize Binance API with credentials
const binanceApi = new BinanceAPI(
    process.env.BINANCE_API_KEY || '',
    process.env.BINANCE_API_SECRET || '',
    true // test mode
);

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/api/trade', async (req: Request<{}, {}, TradeRequest>, res: Response) => {
    try {
        const { coinName, quantity, takeProfitPercentage } = req.body;

        // Place market buy order
        const buyOrder = await binanceApi.marketBuy(coinName, quantity);
        
        // Get the actual buy price from the order
        const buyPrice = parseFloat(buyOrder.price);
        
        if (!buyPrice) {
            throw new Error('Could not determine buy price');
        }

        // Calculate take profit price based on the actual buy price
        const takeProfitPrice = buyPrice * (1 + parseFloat(takeProfitPercentage) / 100);

        // Place take profit sell order
        const sellOrder = await binanceApi.limitSell(coinName, quantity, takeProfitPrice);

        res.json({
            success: true,
            buyOrder,
            sellOrder,
            message: 'Orders placed successfully'
        });

    } catch (error) {
        console.error('Trading error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 