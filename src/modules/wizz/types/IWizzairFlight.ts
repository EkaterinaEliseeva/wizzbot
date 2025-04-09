export interface IWizzairFlight {
    departureStation: string,
    arrivalStation: string,
    price: {
        amount: number,
        currencyCode: 'USD'
    },
    priceType: string,
    date: string,
    classOfService: string,
    hasMacFlight: boolean
}
