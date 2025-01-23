import crypto from 'crypto';

export interface BinanceOrder {
    orderId: number;
    symbol: string;
    status: string;
    price: string;
    origQty: string;
    executedQty: string;
    type: string;
    side: string;
}

export interface BinancePosition {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    markPrice: string;
    unRealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    marginType: string;
}

export class BinanceAPI {
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private readonly baseUrl: string;
    private readonly testMode: boolean;

    constructor(apiKey: string, apiSecret: string, testMode = true) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = testMode ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
        this.testMode = testMode;
    }

    private generateSignature(queryString: string): string {
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');
    }

    private async makeSignedRequest(
        endpoint: string,
        method: string,
        params: Record<string, string | number> = {}
    ): Promise<any> {
        const timestamp = Date.now();
        const queryParams = new URLSearchParams({
            ...params,
            timestamp: timestamp.toString()
        });

        const signature = this.generateSignature(queryParams.toString());
        queryParams.append('signature', signature);

        const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;

        const response = await fetch(url, {
            method,
            headers: {
                'X-MBX-APIKEY': this.apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || 'Binance API request failed');
        }

        return response.json();
    }

    // Set leverage for a symbol
    async setLeverage(symbol: string, leverage: number): Promise<any> {
        return this.makeSignedRequest('/fapi/v1/leverage', 'POST', {
            symbol: symbol.toUpperCase(),
            leverage: leverage.toString()
        });
    }

    // Get symbol precision info
    private async getSymbolPrecision(symbol: string): Promise<{ pricePrecision: number }> {
        const exchangeInfo = await this.makeSignedRequest('/fapi/v1/exchangeInfo', 'GET');
        const symbolInfo = exchangeInfo.symbols.find((s: any) => s.symbol === symbol.toUpperCase());
        if (!symbolInfo) {
            throw new Error('Symbol not found');
        }
        return {
            pricePrecision: symbolInfo.pricePrecision
        };
    }

    // Open a long position
    async openLongPosition(symbol: string, quantity: string, takeProfitPercent?: number): Promise<BinanceOrder[]> {
        const orders: BinanceOrder[] = [];
        
        // Place the long order
        const longOrder = await this.makeSignedRequest('/fapi/v1/order', 'POST', {
            symbol: symbol.toUpperCase(),
            side: 'BUY',
            type: 'MARKET',
            quantity
        });
        orders.push(longOrder);

        // If take profit is specified, place a take profit order
        if (takeProfitPercent) {
            const position = await this.getPosition(symbol);
            const entryPrice = parseFloat(position.entryPrice);
            const takeProfitPrice = entryPrice * (1 + takeProfitPercent / 100);
            
            // Get symbol precision
            const { pricePrecision } = await this.getSymbolPrecision(symbol);
            const priceTrimmed = takeProfitPrice.toFixed(pricePrecision);

            const tpOrder = await this.makeSignedRequest('/fapi/v1/order', 'POST', {
                symbol: symbol.toUpperCase(),
                side: 'SELL',
                type: 'LIMIT',
                timeInForce: 'GTC',
                price: priceTrimmed,
                quantity: position.positionAmt,
                reduceOnly: 'true'
            });
            orders.push(tpOrder);
        }

        return orders;
    }

    // Open a short position
    async openShortPosition(symbol: string, quantity: string, takeProfitPercent?: number): Promise<BinanceOrder[]> {
        const orders: BinanceOrder[] = [];
        
        // Place the short order
        const shortOrder = await this.makeSignedRequest('/fapi/v1/order', 'POST', {
            symbol: symbol.toUpperCase(),
            side: 'SELL',
            type: 'MARKET',
            quantity
        });
        orders.push(shortOrder);

        // If take profit is specified, place a take profit order
        if (takeProfitPercent) {
            const position = await this.getPosition(symbol);
            const entryPrice = parseFloat(position.entryPrice);
            const takeProfitPrice = entryPrice * (1 - takeProfitPercent / 100);

            // Get symbol precision
            const { pricePrecision } = await this.getSymbolPrecision(symbol);
            const priceTrimmed = takeProfitPrice.toFixed(pricePrecision);

            const tpOrder = await this.makeSignedRequest('/fapi/v1/order', 'POST', {
                symbol: symbol.toUpperCase(),
                side: 'BUY',
                type: 'LIMIT',
                timeInForce: 'GTC',
                price: priceTrimmed,
                quantity: Math.abs(parseFloat(position.positionAmt)).toString(),
                reduceOnly: 'true'
            });
            orders.push(tpOrder);
        }

        return orders;
    }

    // Close a position
    async closePosition(symbol: string): Promise<BinanceOrder> {
        const position = await this.getPosition(symbol);
        const positionAmt = parseFloat(position.positionAmt);
        
        if (positionAmt === 0) {
            throw new Error('No position to close');
        }

        // If positionAmt is positive, we need to sell to close
        // If positionAmt is negative, we need to buy to close
        const side = positionAmt > 0 ? 'SELL' : 'BUY';
        const quantity = Math.abs(positionAmt).toString();

        return this.makeSignedRequest('/fapi/v1/order', 'POST', {
            symbol: symbol.toUpperCase(),
            side,
            type: 'MARKET',
            quantity,
            reduceOnly: 'true'
        });
    }

    // Get position information
    async getPosition(symbol: string): Promise<BinancePosition> {
        const positions = await this.makeSignedRequest('/fapi/v2/positionRisk', 'GET', {
            symbol: symbol.toUpperCase()
        });
        return positions[0];
    }

    // Get all positions
    async getAllPositions(): Promise<BinancePosition[]> {
        return this.makeSignedRequest('/fapi/v2/positionRisk', 'GET');
    }

    // Close all positions
    async closeAllPositions(): Promise<BinanceOrder[]> {
        const positions = await this.getAllPositions();
        const closingOrders = positions
            .filter(position => parseFloat(position.positionAmt) !== 0)
            .map(position => this.closePosition(position.symbol));
        return Promise.all(closingOrders);
    }

    // Cancel all open orders for a symbol
    async cancelAllOrders(symbol: string): Promise<any> {
        return this.makeSignedRequest('/fapi/v1/allOpenOrders', 'DELETE', {
            symbol: symbol.toUpperCase()
        });
    }
} 