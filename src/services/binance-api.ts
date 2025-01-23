import crypto from 'crypto';

export interface BinanceOrder {
    orderId: number;
    symbol: string;
    status: string;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    type: string;
    side: string;
}

export class BinanceAPI {
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private readonly baseUrl: string;
    private readonly testMode: boolean;

    constructor(apiKey: string, apiSecret: string, testMode = true) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = 'https://api.binance.com';
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

    async marketBuy(symbol: string, quantity: string): Promise<BinanceOrder> {
        const endpoint = this.testMode ? '/api/v3/order/test' : '/api/v3/order';
        return this.makeSignedRequest(endpoint, 'POST', {
            symbol: symbol.toUpperCase(),
            side: 'BUY',
            type: 'MARKET',
            quantity
        });
    }

    async limitSell(symbol: string, quantity: string, price: number): Promise<BinanceOrder> {
        const endpoint = this.testMode ? '/api/v3/order/test' : '/api/v3/order';
        return this.makeSignedRequest(endpoint, 'POST', {
            symbol: symbol.toUpperCase(),
            side: 'SELL',
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity,
            price: price.toString()
        });
    }

    async getOrderStatus(symbol: string, orderId: number): Promise<BinanceOrder> {
        return this.makeSignedRequest('/api/v3/order', 'GET', {
            symbol: symbol.toUpperCase(),
            orderId: orderId.toString()
        });
    }
} 