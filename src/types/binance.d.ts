declare module 'node-binance-api' {
    interface BinanceOptions {
        APIKEY: string | undefined;
        APISECRET: string | undefined;
        useServerTime?: boolean;
        test?: boolean;
    }

    interface BinanceAPI {
        options(options: BinanceOptions): this;
        prices(): Promise<{ [key: string]: string }>;
        marketBuy(symbol: string, quantity: string): Promise<BinanceOrder>;
        sell(symbol: string, quantity: string, price: number): Promise<BinanceOrder>;
    }

    interface BinanceOrder {
        orderId: number;
        symbol: string;
        status: string;
        price: string;
        origQty: string;
    }

    const Binance: new () => BinanceAPI;
    export default Binance;
} 