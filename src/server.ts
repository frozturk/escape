import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { BinanceAPI } from './services/binance-api';

dotenv.config();

interface TradeRequest {
    coinName: string;
    quantity: string;
    takeProfitPercentage: string;
    leverage: number;
    isLong: boolean;
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize Binance API with credentials
const binanceApi = new BinanceAPI(
    process.env.BINANCE_API_KEY || '',
    process.env.BINANCE_API_SECRET || '',
    false // test mode
);

app.use(bodyParser.json());
app.use(express.static('./public'));

// Open position (long or short)
app.post('/api/trade', async (req: Request<{}, {}, TradeRequest>, res: Response) => {
    try {
        const { coinName, quantity, takeProfitPercentage, leverage, isLong } = req.body;

        // Set leverage first
        await binanceApi.setLeverage(coinName, leverage);

        // Open position with take profit
        const orders = isLong 
            ? await binanceApi.openLongPosition(coinName, quantity, parseFloat(takeProfitPercentage))
            : await binanceApi.openShortPosition(coinName, quantity, parseFloat(takeProfitPercentage));

        res.json({
            success: true,
            orders,
            message: `${isLong ? 'Long' : 'Short'} position opened successfully`
        });

    } catch (error) {
        console.error('Trading error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

// Close specific position
app.post('/api/close-position', async (req: Request<{}, {}, { coinName: string }>, res: Response) => {
    try {
        const { coinName } = req.body;
        const order = await binanceApi.closePosition(coinName);

        res.json({
            success: true,
            order,
            message: 'Position closed successfully'
        });

    } catch (error) {
        console.error('Close position error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

// Get all positions
app.get('/api/positions', async (_req: Request, res: Response) => {
    try {
        const positions = await binanceApi.getAllPositions();
        res.json({
            success: true,
            positions: positions.filter(pos => parseFloat(pos.positionAmt) !== 0)
        });
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

// Close all positions
app.post('/api/close-all', async (_req: Request, res: Response) => {
    try {
        const closedOrders = await binanceApi.closeAllPositions();
        res.json({
            success: true,
            closedOrders,
            message: 'All positions closed successfully'
        });
    } catch (error) {
        console.error('Error closing positions:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 