# 🚀 Vercel Deployment Guide

## Wat is er veranderd?

Je app gebruikt nu **eigen Vercel API routes** in plaats van CORS proxies. Dit betekent:

✅ **Geen CORS errors meer**  
✅ **10x snellere laadtijden** (server-side caching)  
✅ **Betere Hidden Gems** (volume filters, drawdown limits, verbeterde scoring)  
✅ **Extra metrics** (RSI, SMA, volatility, volume ratio)  
✅ **Gratis** (Vercel hobby tier)

---

## 📋 Deployment Stappen

### 1. Installeer Vercel CLI

```bash
npm install -g vercel
```

### 2. Login bij Vercel

```bash
vercel login
```

Volg de instructies in je browser om in te loggen.

### 3. Deploy je App

```bash
cd "/Users/gijsmeteor/Library/Mobile Documents/com~apple~CloudDocs/Eigen projecten/guin.ai"
vercel
```

Bij de eerste keer:
- **Set up and deploy?** → Yes
- **Which scope?** → Kies je account
- **Link to existing project?** → No (tenzij je al een project hebt)
- **Project name?** → guin-ai (of een andere naam)
- **Directory?** → . (druk Enter)
- **Override settings?** → No

### 4. Deploy naar Productie

```bash
vercel --prod
```

Je krijgt een URL zoals: `https://guin-ai.vercel.app`

---

## 🔧 Environment Variables (Optioneel)

Als je later FMP of andere API's wilt gebruiken:

```bash
vercel env add ALPHA_VANTAGE_KEY
# Enter: UGNO5IK8X988V0LK

vercel env add FMP_API_KEY
# Enter: je FMP key (als je die hebt)
```

---

## 📊 Nieuwe API Endpoints

Je app heeft nu deze endpoints:

### `/api/stock-price`
Haalt live koersen op met caching (10 seconden).

**Parameters:**
- `ticker` - Stock ticker (bijv. AAPL, NASDAQ:NVDA, XETR:VWCE)
- `range` - Tijdsperiode (1d, 5d, 1mo, 6mo, 1y)
- `interval` - Interval (5m, 15m, 1h, 1d, 1wk)

**Voorbeeld:**
```
GET /api/stock-price?ticker=AAPL&range=1d&interval=5m
```

**Response:**
```json
{
  "ticker": "AAPL",
  "current": 178.45,
  "change": 2.17,
  "changePercent": 1.23,
  "currency": "USD",
  "sparklineData": [...],
  "growthData": {
    "dailyChange": 1.23,
    "growth1mo": 5.4,
    "growth6mo": 12.3,
    "growth1yr": 28.7
  },
  "technicals": {
    "rsi": 58.3,
    "sma50": 175.2,
    "sma200": 168.9
  },
  "riskMetrics": {
    "maxDrawdown30d": 8.5,
    "volatility30d": 22.3
  },
  "volume": {
    "current": 52847392,
    "average20d": 58392847,
    "ratio": 0.91
  }
}
```

### `/api/screener`
Verbeterde Hidden Gems screener met filters.

**Parameters:**
- `category` - Categorie (tech_growth, crypto, healthcare, etc.)
- `minScore` - Minimum quality score (0-100)
- `maxResults` - Max aantal resultaten

**Voorbeeld:**
```
GET /api/screener?category=tech_growth&minScore=30&maxResults=20
```

**Response:**
```json
{
  "category": "tech_growth",
  "stats": {
    "totalAnalyzed": 10,
    "passedFilter": 8,
    "hiddenGems": 2,
    "averageScore": 45
  },
  "results": [
    {
      "ticker": "NVDA",
      "qualityScore": 78,
      "opportunityType": "HIDDEN_GEM",
      "currentPrice": 875.23,
      "growth1yr": 245.6,
      "signal": "STRONG BUY",
      "rsi": 62.3,
      "maxDrawdown30d": 12.5,
      "volatility30d": 35.2,
      "qualityFactors": [
        "Exceptional 1Y growth (>100%)",
        "Strong technical buy",
        "Above 50-day MA",
        "High volume (>2x avg)"
      ]
    }
  ],
  "filters": {
    "minVolume": 100000,
    "minPrice": 5,
    "maxDrawdown": 40
  }
}
```

---

## 🎯 Nieuwe Features

### **Enhanced Quality Score**

De screener gebruikt nu een verbeterde scoring (max 100 punten):

- **Growth (40 punten):** 1Y/6M/1M/daily performance
- **Technicals (30 punten):** RSI, MACD, SMA50/200
- **Risk (15 punten):** Volatility, drawdown
- **Volume (10 punten):** Confirmatie via volume
- **RSI adjustment (±5 punten):** Oversold/overbought

### **Smart Filters**

Stocks worden automatisch uitgefilterd als:
- Volume < 100k (illiquid)
- Prijs < $5 (penny stocks)
- Drawdown > 40% (crashes)

### **Opportunity Types**

- `HIDDEN_GEM` - Score ≥ 70
- `STRONG_OPPORTUNITY` - Score ≥ 50
- `MODERATE_OPPORTUNITY` - Score ≥ 30
- `WEAK_OPPORTUNITY` - Score ≥ 10
- `NEUTRAL` - Score ≥ -10
- `AVOID` - Score < -10

---

## 🔍 Testen

### Lokaal testen (voor deployment):

```bash
vercel dev
```

Dit start een lokale server op `http://localhost:3000` waar je de API routes kunt testen.

### Test de API endpoints:

```bash
# Test stock price
curl "http://localhost:3000/api/stock-price?ticker=AAPL&range=1d&interval=5m"

# Test screener
curl "http://localhost:3000/api/screener?category=tech_growth&minScore=0&maxResults=10"
```

---

## 📈 Performance

### Caching

- **Stock prices:** 10 seconden cache
- **Screener data:** 5 minuten cache
- **Stale-while-revalidate:** Bij errors wordt oude cache gebruikt

### Rate Limits

Met caching blijf je ruim binnen de gratis limieten:
- Yahoo Finance: Geen officiële limiet, maar wees redelijk
- Vercel: 100GB bandwidth/maand (gratis tier)

---

## 🐛 Troubleshooting

### API geeft 404

Zorg dat je deployment succesvol was:
```bash
vercel --prod
```

### CORS errors

De API routes hebben CORS headers. Als je toch errors ziet, check of je de juiste URL gebruikt (`/api/...` niet `https://...`).

### Slow loading

Check of caching werkt:
```bash
# Tweede call moet "cached": true tonen
curl "https://jouw-app.vercel.app/api/stock-price?ticker=AAPL&range=1d&interval=5m"
```

---

## 🎉 Klaar!

Je app draait nu op Vercel met:
- ✅ Stabiele, snelle data fetching
- ✅ Verbeterde Hidden Gems screener
- ✅ Geen CORS issues
- ✅ Server-side caching
- ✅ Extra metrics (RSI, volatility, drawdown)

**Volgende stappen:**
1. Test de app op je Vercel URL
2. Bekijk de screener - Hidden Gems zijn nu veel beter gefilterd
3. Check de console logs voor "cached" berichten
4. Overweeg later FMP Starter ($19/mo) voor nog betere data

---

## 📞 Support

Bij problemen:
1. Check Vercel logs: `vercel logs`
2. Test lokaal: `vercel dev`
3. Check browser console voor errors
