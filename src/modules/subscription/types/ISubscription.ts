export interface ISubscription {
    id: string;
    chatId: number;
    origin: string;
    destination: string;
    dateType: 'single' | 'range';
    date?: string;
    startDate?: string;
    endDate?: string;
    maxPrice?: number; 
    lastPrice?: number;
    bestDate?: string;
    bestDates?: Array<{date: string, price: number}>;
    createdAt: Date;
}