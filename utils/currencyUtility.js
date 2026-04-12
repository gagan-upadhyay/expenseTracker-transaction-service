let cachedRates = null;
let lastFetch = null;

const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 Hours

export async function getExchangeRates() {
    const now = Date.now();
    const API_KEY=process.env.EXCHANGE_API_KEY
    
    if (!cachedRates || (now - lastFetch > REFRESH_INTERVAL)) {
        try {
            const response = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`,{
              method:'GET',
            });
            if(!response.ok){
              throw new Error('Failed to fetch information')
            }
            const data = await response.json();
            console.log("value of resposen from utility:", data);

            cachedRates = data.conversion_rates;
            lastFetch = now;
            console.log("✅ Exchange rates refreshed");
        } catch (err) {
            console.error("❌ Failed to fetch rates, using stale cache if available");
            if (!cachedRates) throw new Error("Currency service unavailable");
        }
    }
    return cachedRates;
}

export function convertValue(amount, from, to, rates) {
  console.log('Value of amount, from to and rates:', amount, typeof(amount),from, typeof(from), to, typeof(to), rates, typeof(rates));
    if ((from).toLowerCase() === (to).toLowerCase()) return Number(amount);
    // (Amount / Rate of From) * Rate of To
    const usdValue = amount / rates[from];
    return usdValue * rates[to];
}

// getExchangeRates();