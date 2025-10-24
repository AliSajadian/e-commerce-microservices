// /payment-service/src/payment/enums/currency.enum.ts

/**
 * Currency enum based on ISO 4217 standard
 * Values are lowercase for consistency with payment providers like Stripe
 */
export enum Currency {
  // Major global currencies
  CNY = 'cny', // Chinese Yuan
  RUR = 'rur', // Russian Ruble (old code, sometimes used)

  // Secondary currencies
  USD = 'usd', // United States Dollar
  EUR = 'eur', // Euro
  GBP = 'gbp', // British Pound Sterling
  JPY = 'jpy', // Japanese Yen
  CAD = 'cad', // Canadian Dollar
  AUD = 'aud', // Australian Dollar
  CHF = 'chf', // Swiss Franc
  INR = 'inr', // Indian Rupee
  
  // Other popular currencies
  BRL = 'brl', // Brazilian Real
  MXN = 'mxn', // Mexican Peso
  KRW = 'krw', // South Korean Won
  SGD = 'sgd', // Singapore Dollar
  HKD = 'hkd', // Hong Kong Dollar
  NOK = 'nok', // Norwegian Krone
  SEK = 'sek', // Swedish Krona
  DKK = 'dkk', // Danish Krone
  PLN = 'pln', // Polish Zloty
  CZK = 'czk', // Czech Koruna
  HUF = 'huf', // Hungarian Forint
  ILS = 'ils', // Israeli New Shekel
  NZD = 'nzd', // New Zealand Dollar
  ZAR = 'zar', // South African Rand
  
  // Center World & Africa
  IRR = 'irr', // Iranian Rial
  AED = 'aed', // United Arab Emirates Dirham
  SAR = 'sar', // Saudi Riyal
  EGP = 'egp', // Egyptian Pound
  NGN = 'ngn', // Nigerian Naira
  KES = 'kes', // Kenyan Shilling
  
  // Asia-Pacific
  THB = 'thb', // Thai Baht
  MYR = 'myr', // Malaysian Ringgit
  IDR = 'idr', // Indonesian Rupiah
  VND = 'vnd', // Vietnamese Dong
  PHP = 'php', // Philippine Peso
  TWD = 'twd', // Taiwan Dollar
  
  // Latin America
  ARS = 'ars', // Argentine Peso
  CLP = 'clp', // Chilean Peso
  COP = 'cop', // Colombian Peso
  PEN = 'pen', // Peruvian Sol
  UYU = 'uyu', // Uruguayan Peso
  
  // Eastern Europe
  RUB = 'rub', // Russian Ruble
  UAH = 'uah', // Ukrainian Hryvnia
  BGN = 'bgn', // Bulgarian Lev
  RON = 'ron', // Romanian Leu
  HRK = 'hrk', // Croatian Kuna
  
  // Others
  TRY = 'try', // Turkish Lira
  ISK = 'isk', // Icelandic Krona
  
  // Crypto (if supported)
  BTC = 'btc', // Bitcoin
  ETH = 'eth', // Ethereum
}

/**
 * Currency metadata for display and calculations
 */
export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  decimalPlaces: number; // Number of decimal places (e.g., 2 for USD, 0 for JPY)
  symbolPosition: 'before' | 'after'; // Symbol position relative to amount
}

/**
 * Currency information mapping
 */
export const CURRENCY_INFO: Record<Currency, CurrencyInfo> = {
  [Currency.RUR]: {
    code: Currency.RUR,
    symbol: 'Ru',
    name: 'RU Ruble',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.IRR]: {
    code: Currency.IRR,
    symbol: '﷼',
    name: 'IR Rial',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.USD]: {
    code: Currency.USD,
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.EUR]: {
    code: Currency.EUR,
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.GBP]: {
    code: Currency.GBP,
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.JPY]: {
    code: Currency.JPY,
    symbol: '¥',
    name: 'Japanese Yen',
    decimalPlaces: 0, // JPY doesn't use decimal places
    symbolPosition: 'before',
  },
  [Currency.CAD]: {
    code: Currency.CAD,
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.AUD]: {
    code: Currency.AUD,
    symbol: 'A$',
    name: 'Australian Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.CHF]: {
    code: Currency.CHF,
    symbol: 'CHF',
    name: 'Swiss Franc',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.CNY]: {
    code: Currency.CNY,
    symbol: '¥',
    name: 'Chinese Yuan',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.INR]: {
    code: Currency.INR,
    symbol: '₹',
    name: 'Indian Rupee',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.BRL]: {
    code: Currency.BRL,
    symbol: 'R$',
    name: 'Brazilian Real',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.MXN]: {
    code: Currency.MXN,
    symbol: '$',
    name: 'Mexican Peso',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.KRW]: {
    code: Currency.KRW,
    symbol: '₩',
    name: 'South Korean Won',
    decimalPlaces: 0,
    symbolPosition: 'before',
  },
  [Currency.SGD]: {
    code: Currency.SGD,
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.HKD]: {
    code: Currency.HKD,
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.NOK]: {
    code: Currency.NOK,
    symbol: 'kr',
    name: 'Norwegian Krone',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.SEK]: {
    code: Currency.SEK,
    symbol: 'kr',
    name: 'Swedish Krona',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.DKK]: {
    code: Currency.DKK,
    symbol: 'kr',
    name: 'Danish Krone',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.PLN]: {
    code: Currency.PLN,
    symbol: 'zł',
    name: 'Polish Zloty',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.CZK]: {
    code: Currency.CZK,
    symbol: 'Kč',
    name: 'Czech Koruna',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.HUF]: {
    code: Currency.HUF,
    symbol: 'Ft',
    name: 'Hungarian Forint',
    decimalPlaces: 0,
    symbolPosition: 'after',
  },
  [Currency.ILS]: {
    code: Currency.ILS,
    symbol: '₪',
    name: 'Israeli New Shekel',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.NZD]: {
    code: Currency.NZD,
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.ZAR]: {
    code: Currency.ZAR,
    symbol: 'R',
    name: 'South African Rand',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.AED]: {
    code: Currency.AED,
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.SAR]: {
    code: Currency.SAR,
    symbol: '﷼',
    name: 'Saudi Riyal',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.EGP]: {
    code: Currency.EGP,
    symbol: 'E£',
    name: 'Egyptian Pound',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.NGN]: {
    code: Currency.NGN,
    symbol: '₦',
    name: 'Nigerian Naira',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.KES]: {
    code: Currency.KES,
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.THB]: {
    code: Currency.THB,
    symbol: '฿',
    name: 'Thai Baht',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.MYR]: {
    code: Currency.MYR,
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.IDR]: {
    code: Currency.IDR,
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    decimalPlaces: 0,
    symbolPosition: 'before',
  },
  [Currency.VND]: {
    code: Currency.VND,
    symbol: '₫',
    name: 'Vietnamese Dong',
    decimalPlaces: 0,
    symbolPosition: 'after',
  },
  [Currency.PHP]: {
    code: Currency.PHP,
    symbol: '₱',
    name: 'Philippine Peso',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.TWD]: {
    code: Currency.TWD,
    symbol: 'NT$',
    name: 'Taiwan Dollar',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.ARS]: {
    code: Currency.ARS,
    symbol: '$',
    name: 'Argentine Peso',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.CLP]: {
    code: Currency.CLP,
    symbol: '$',
    name: 'Chilean Peso',
    decimalPlaces: 0,
    symbolPosition: 'before',
  },
  [Currency.COP]: {
    code: Currency.COP,
    symbol: '$',
    name: 'Colombian Peso',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.PEN]: {
    code: Currency.PEN,
    symbol: 'S/',
    name: 'Peruvian Sol',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.UYU]: {
    code: Currency.UYU,
    symbol: '$U',
    name: 'Uruguayan Peso',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  [Currency.RUB]: {
    code: Currency.RUB,
    symbol: '₽',
    name: 'Russian Ruble',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.UAH]: {
    code: Currency.UAH,
    symbol: '₴',
    name: 'Ukrainian Hryvnia',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.BGN]: {
    code: Currency.BGN,
    symbol: 'лв',
    name: 'Bulgarian Lev',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.RON]: {
    code: Currency.RON,
    symbol: 'lei',
    name: 'Romanian Leu',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.HRK]: {
    code: Currency.HRK,
    symbol: 'kn',
    name: 'Croatian Kuna',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.TRY]: {
    code: Currency.TRY,
    symbol: '₺',
    name: 'Turkish Lira',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  [Currency.ISK]: {
    code: Currency.ISK,
    symbol: 'kr',
    name: 'Icelandic Krona',
    decimalPlaces: 0,
    symbolPosition: 'after',
  },
  [Currency.BTC]: {
    code: Currency.BTC,
    symbol: '₿',
    name: 'Bitcoin',
    decimalPlaces: 8,
    symbolPosition: 'before',
  },
  [Currency.ETH]: {
    code: Currency.ETH,
    symbol: 'Ξ',
    name: 'Ethereum',
    decimalPlaces: 18,
    symbolPosition: 'before',
  },
};

/**
 * Utility functions for currency handling
 */
export class CurrencyUtils {
  /**
   * Convert amount to smallest currency unit (cents, pence, etc.)
   */
  static toSmallestUnit(amount: number, currency: Currency): number {
    const info = CURRENCY_INFO[currency];
    return Math.round(amount * Math.pow(10, info.decimalPlaces));
  }

  /**
   * Convert from smallest currency unit to major unit
   */
  static fromSmallestUnit(amountInSmallestUnit: number, currency: Currency): number {
    const info = CURRENCY_INFO[currency];
    return amountInSmallestUnit / Math.pow(10, info.decimalPlaces);
  }

  /**
   * Format currency amount for display
   */
  static formatAmount(amount: number, currency: Currency): string {
    const info = CURRENCY_INFO[currency];
    const formattedAmount = amount.toFixed(info.decimalPlaces);
    
    if (info.symbolPosition === 'before') {
      return `${info.symbol}${formattedAmount}`;
    } else {
      return `${formattedAmount} ${info.symbol}`;
    }
  }

  /**
   * Get currency symbol
   */
  static getSymbol(currency: Currency): string {
    return CURRENCY_INFO[currency].symbol;
  }

  /**
   * Get currency name
   */
  static getName(currency: Currency): string {
    return CURRENCY_INFO[currency].name;
  }

  /**
   * Check if currency uses decimal places
   */
  static hasDecimals(currency: Currency): boolean {
    return CURRENCY_INFO[currency].decimalPlaces > 0;
  }

  /**
   * Get all supported currencies
   */
  static getAllCurrencies(): Currency[] {
    return Object.values(Currency);
  }

  /**
   * Get major currencies (most commonly used)
   */
  static getMajorCurrencies(): Currency[] {
    return [
      Currency.USD,
      Currency.EUR,
      Currency.GBP,
      Currency.JPY,
      Currency.CAD,
      Currency.AUD,
      Currency.CHF,
      Currency.CNY,
    ];
  }

  /**
   * Validate if currency is supported
   */
  static isSupported(currency: string): currency is Currency {
    return Object.values(Currency).includes(currency as Currency);
  }
}