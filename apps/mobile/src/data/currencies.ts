/**
 * Every currency a group can keep its book in — ISO 4217, the active list.
 *
 * A home game is played in one currency and the app never converts between
 * two, so this is a NAME for the column of figures, not an exchange rate. What
 * a person needs from it is the one they use, found in two keystrokes: hence
 * the search below rather than four chips and a shrug for everyone else.
 *
 * Generated from CLDR (`Intl.DisplayNames` and `Intl.NumberFormat`) for the
 * English locale, then frozen here — the list must not depend on whether a
 * phone's JS engine shipped with full ICU data, and Hermes often does not.
 *
 * Where CLDR has no distinct glyph the symbol IS the code: `CHF 500` is what
 * Swiss francs look like written down, and inventing a glyph would be worse.
 */

export interface Currency {
  /** ISO 4217, three letters, upper case. What is stored on the club. */
  code: string;
  /** English name, for reading and for searching. */
  name: string;
  /** What goes in front of a figure. The code itself where there is no glyph. */
  symbol: string;
}

/** Codes only, in the tuple order below: code, name, symbol. */
const TABLE: ReadonlyArray<readonly [string, string, string]> = [
  ['AED', 'United Arab Emirates Dirham', 'AED'],
  ['AFN', 'Afghan Afghani', '؋'],
  ['ALL', 'Albanian Lek', 'ALL'],
  ['AMD', 'Armenian Dram', '֏'],
  ['ANG', 'Netherlands Antillean Guilder', 'ANG'],
  ['AOA', 'Angolan Kwanza', 'Kz'],
  ['ARS', 'Argentine Peso', '$'],
  ['AUD', 'Australian Dollar', 'A$'],
  ['AWG', 'Aruban Florin', 'AWG'],
  ['AZN', 'Azerbaijani Manat', '₼'],
  ['BAM', 'Bosnia-Herzegovina Convertible Mark', 'KM'],
  ['BBD', 'Barbadian Dollar', '$'],
  ['BDT', 'Bangladeshi Taka', '৳'],
  ['BGN', 'Bulgarian Lev', 'BGN'],
  ['BHD', 'Bahraini Dinar', 'BHD'],
  ['BIF', 'Burundian Franc', 'BIF'],
  ['BMD', 'Bermudan Dollar', '$'],
  ['BND', 'Brunei Dollar', '$'],
  ['BOB', 'Bolivian Boliviano', 'Bs'],
  ['BRL', 'Brazilian Real', 'R$'],
  ['BSD', 'Bahamian Dollar', '$'],
  ['BTN', 'Bhutanese Ngultrum', 'BTN'],
  ['BWP', 'Botswanan Pula', 'P'],
  ['BYN', 'Belarusian Ruble', 'BYN'],
  ['BZD', 'Belize Dollar', '$'],
  ['CAD', 'Canadian Dollar', 'CA$'],
  ['CDF', 'Congolese Franc', 'CDF'],
  ['CHF', 'Swiss Franc', 'CHF'],
  ['CLP', 'Chilean Peso', '$'],
  ['CNY', 'Chinese Yuan', 'CN¥'],
  ['COP', 'Colombian Peso', '$'],
  ['CRC', 'Costa Rican Colón', '₡'],
  ['CUP', 'Cuban Peso', '$'],
  ['CVE', 'Cape Verdean Escudo', 'CVE'],
  ['CZK', 'Czech Koruna', 'Kč'],
  ['DJF', 'Djiboutian Franc', 'DJF'],
  ['DKK', 'Danish Krone', 'kr'],
  ['DOP', 'Dominican Peso', '$'],
  ['DZD', 'Algerian Dinar', 'DZD'],
  ['EGP', 'Egyptian Pound', 'E£'],
  ['ERN', 'Eritrean Nakfa', 'ERN'],
  ['ETB', 'Ethiopian Birr', 'ETB'],
  ['EUR', 'Euro', '€'],
  ['FJD', 'Fijian Dollar', '$'],
  ['FKP', 'Falkland Islands Pound', '£'],
  ['GBP', 'British Pound', '£'],
  ['GEL', 'Georgian Lari', '₾'],
  ['GHS', 'Ghanaian Cedi', 'GH₵'],
  ['GIP', 'Gibraltar Pound', '£'],
  ['GMD', 'Gambian Dalasi', 'GMD'],
  ['GNF', 'Guinean Franc', 'FG'],
  ['GTQ', 'Guatemalan Quetzal', 'Q'],
  ['GYD', 'Guyanaese Dollar', '$'],
  ['HKD', 'Hong Kong Dollar', 'HK$'],
  ['HNL', 'Honduran Lempira', 'L'],
  ['HRK', 'Croatian Kuna', 'kn'],
  ['HTG', 'Haitian Gourde', 'HTG'],
  ['HUF', 'Hungarian Forint', 'Ft'],
  ['IDR', 'Indonesian Rupiah', 'Rp'],
  ['ILS', 'Israeli New Shekel', '₪'],
  ['INR', 'Indian Rupee', '₹'],
  ['IQD', 'Iraqi Dinar', 'IQD'],
  ['IRR', 'Iranian Rial', 'IRR'],
  ['ISK', 'Icelandic Króna', 'kr'],
  ['JMD', 'Jamaican Dollar', '$'],
  ['JOD', 'Jordanian Dinar', 'JOD'],
  ['JPY', 'Japanese Yen', '¥'],
  ['KES', 'Kenyan Shilling', 'KES'],
  ['KGS', 'Kyrgyz Som', '⃀'],
  ['KHR', 'Cambodian Riel', '៛'],
  ['KMF', 'Comorian Franc', 'CF'],
  ['KPW', 'North Korean Won', '₩'],
  ['KRW', 'South Korean Won', '₩'],
  ['KWD', 'Kuwaiti Dinar', 'KWD'],
  ['KYD', 'Cayman Islands Dollar', '$'],
  ['KZT', 'Kazakhstani Tenge', '₸'],
  ['LAK', 'Laotian Kip', '₭'],
  ['LBP', 'Lebanese Pound', 'L£'],
  ['LKR', 'Sri Lankan Rupee', 'Rs'],
  ['LRD', 'Liberian Dollar', '$'],
  ['LSL', 'Lesotho Loti', 'LSL'],
  ['LYD', 'Libyan Dinar', 'LYD'],
  ['MAD', 'Moroccan Dirham', 'MAD'],
  ['MDL', 'Moldovan Leu', 'MDL'],
  ['MGA', 'Malagasy Ariary', 'Ar'],
  ['MKD', 'Macedonian Denar', 'MKD'],
  ['MMK', 'Myanmar Kyat', 'K'],
  ['MNT', 'Mongolian Tugrik', '₮'],
  ['MOP', 'Macanese Pataca', 'MOP'],
  ['MRU', 'Mauritanian Ouguiya', 'MRU'],
  ['MUR', 'Mauritian Rupee', 'Rs'],
  ['MVR', 'Maldivian Rufiyaa', 'MVR'],
  ['MWK', 'Malawian Kwacha', 'MWK'],
  ['MXN', 'Mexican Peso', 'MX$'],
  ['MYR', 'Malaysian Ringgit', 'RM'],
  ['MZN', 'Mozambican Metical', 'MZN'],
  ['NAD', 'Namibian Dollar', '$'],
  ['NGN', 'Nigerian Naira', '₦'],
  ['NIO', 'Nicaraguan Córdoba', 'C$'],
  ['NOK', 'Norwegian Krone', 'kr'],
  ['NPR', 'Nepalese Rupee', 'Rs'],
  ['NZD', 'New Zealand Dollar', 'NZ$'],
  ['OMR', 'Omani Rial', 'OMR'],
  ['PAB', 'Panamanian Balboa', 'PAB'],
  ['PEN', 'Peruvian Sol', 'PEN'],
  ['PGK', 'Papua New Guinean Kina', 'PGK'],
  ['PHP', 'Philippine Peso', '₱'],
  ['PKR', 'Pakistani Rupee', 'Rs'],
  ['PLN', 'Polish Zloty', 'zł'],
  ['PYG', 'Paraguayan Guarani', '₲'],
  ['QAR', 'Qatari Riyal', 'QAR'],
  ['RON', 'Romanian Leu', 'lei'],
  ['RSD', 'Serbian Dinar', 'RSD'],
  ['RUB', 'Russian Ruble', '₽'],
  ['RWF', 'Rwandan Franc', 'RF'],
  ['SAR', 'Saudi Riyal', 'SAR'],
  ['SBD', 'Solomon Islands Dollar', '$'],
  ['SCR', 'Seychellois Rupee', 'SCR'],
  ['SDG', 'Sudanese Pound', 'SDG'],
  ['SEK', 'Swedish Krona', 'kr'],
  ['SGD', 'Singapore Dollar', '$'],
  ['SHP', 'St. Helena Pound', '£'],
  ['SLE', 'Sierra Leonean Leone', 'SLE'],
  ['SOS', 'Somali Shilling', 'SOS'],
  ['SRD', 'Surinamese Dollar', '$'],
  ['SSP', 'South Sudanese Pound', '£'],
  ['STN', 'São Tomé & Príncipe Dobra', 'Db'],
  ['SVC', 'Salvadoran Colón', 'SVC'],
  ['SYP', 'Syrian Pound', '£'],
  ['SZL', 'Swazi Lilangeni', 'SZL'],
  ['THB', 'Thai Baht', '฿'],
  ['TJS', 'Tajikistani Somoni', 'TJS'],
  ['TMT', 'Turkmenistani Manat', 'TMT'],
  ['TND', 'Tunisian Dinar', 'TND'],
  ['TOP', 'Tongan Paʻanga', 'T$'],
  ['TRY', 'Turkish Lira', '₺'],
  ['TTD', 'Trinidad & Tobago Dollar', '$'],
  ['TWD', 'New Taiwan Dollar', 'NT$'],
  ['TZS', 'Tanzanian Shilling', 'TZS'],
  ['UAH', 'Ukrainian Hryvnia', '₴'],
  ['UGX', 'Ugandan Shilling', 'UGX'],
  ['USD', 'US Dollar', '$'],
  ['UYU', 'Uruguayan Peso', '$'],
  ['UZS', 'Uzbekistani Som', 'UZS'],
  ['VES', 'Venezuelan Bolívar', 'VES'],
  ['VND', 'Vietnamese Dong', '₫'],
  ['VUV', 'Vanuatu Vatu', 'VUV'],
  ['WST', 'Samoan Tala', 'WST'],
  ['XAF', 'Central African CFA Franc', 'FCFA'],
  ['XCD', 'East Caribbean Dollar', 'EC$'],
  ['XOF', 'West African CFA Franc', 'F CFA'],
  ['XPF', 'CFP Franc', 'CFPF'],
  ['YER', 'Yemeni Rial', 'YER'],
  ['ZAR', 'South African Rand', 'R'],
  ['ZMW', 'Zambian Kwacha', 'ZK'],
  ['ZWG', 'Zimbabwean Gold', 'ZWG'],
];

export const CURRENCIES: readonly Currency[] = TABLE.map(([code, name, symbol]) => ({
  code,
  name,
  symbol,
}));

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

/** The app's own default, and what a club falls back to. */
export const DEFAULT_CURRENCY = 'USD';

/**
 * A TIEBREAK, AND NOTHING ELSE. Symbols are not unique — `£` is the pound and
 * the Falkland Islands pound, `$` belongs to a dozen countries — and a list
 * that answers "£" with the Falklands because F comes before G is a list that
 * looks broken. Where two currencies match a query equally well, these go
 * first. Nothing else in the app treats them differently, and every currency
 * is still reachable by typing its code.
 */
const MAJOR = new Set([
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'INR',
  'CZK',
  'PLN',
  'SEK',
  'NOK',
  'DKK',
]);

/**
 * What a stored code means. An unknown code is still shown as itself rather
 * than swapped for the default — a book written in a currency this build has
 * never heard of must not silently become dollars.
 */
export function currencyFor(code: string): Currency {
  return BY_CODE.get(code.toUpperCase()) ?? { code, name: code, symbol: code };
}

/**
 * Suggestions for what has been typed, best first.
 *
 * Three things get typed into a currency box — the code, the symbol, or the
 * name of the money — so all three match. Ranking is by how sure the match is:
 * the exact code, then a code that starts with it, then a name whose first
 * letters are it, then a word inside the name, then the symbol.
 */
export function searchCurrencies(query: string, limit = 6): readonly Currency[] {
  const q = query.trim().toLowerCase();
  if (q === '') return CURRENCIES.slice(0, limit);

  const scored: Array<{ c: Currency; rank: number }> = [];
  for (const c of CURRENCIES) {
    const code = c.code.toLowerCase();
    const name = c.name.toLowerCase();
    const rank =
      code === q
        ? 0
        : code.startsWith(q)
          ? 1
          : name.startsWith(q)
            ? 2
            : name.split(' ').some((w) => w.startsWith(q))
              ? 3
              : c.symbol.toLowerCase() === q
                ? 4
                : name.includes(q)
                  ? 5
                  : -1;
    if (rank >= 0) scored.push({ c, rank });
  }

  // Within a rank the major currencies go first; below that the table's own
  // alphabetical order stands, which keeps the list stable as letters go in.
  return scored
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(MAJOR.has(b.c.code)) - Number(MAJOR.has(a.c.code)),
    )
    .slice(0, limit)
    .map((s) => s.c);
}
