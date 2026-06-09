# 🚀 OpenAI AI Uitleg - Installatie Instructies

## Stap 1: Installeer OpenAI Package

```bash
cd "/Users/gijsmeteor/Library/Mobile Documents/com~apple~CloudDocs/Eigen projecten/guin.ai"
npm install openai axios
```

## Stap 2: Voeg API Key toe aan Vercel

1. Ga naar: https://vercel.com/dashboard
2. Open je project: **guin-ai-dashboard**
3. Ga naar: **Settings → Environment Variables**
4. Voeg toe:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** `sk-proj-...` (jouw OpenAI secret key)
5. Klik: **"Save"**
6. **Redeploy** je project (Deployments → ... → Redeploy)

## Stap 3: Test Lokaal (Optioneel)

Maak `.env.local` in project root:
```
OPENAI_API_KEY=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

## Stap 4: Voeg AI Uitleg Knop toe aan AnalystMeter

Open `/src/components/BeleggenPage.js` en voeg dit toe aan de `AnalystMeter` component:

### A. Voeg state toe (bovenaan component, na regel 229):

```javascript
const AnalystMeter = ({ recommendation, growthData, targetPrice, currentPrice, ticker, isETF }) => {
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const getAIExplanation = async () => {
    if (aiExplanation) {
      setShowAI(!showAI);
      return;
    }

    setLoadingAI(true);
    try {
      const response = await axios.post('/api/ai-explain', {
        type: 'analyst',
        ticker,
        data: {
          mean: recommendation.mean,
          analysts: recommendation.analysts,
          breakdown: recommendation.breakdown,
          targetPrice
        }
      });
      setAiExplanation(response.data.explanation);
      setShowAI(true);
    } catch (error) {
      console.error('AI explain error:', error);
      setAiExplanation('AI uitleg tijdelijk niet beschikbaar.');
      setShowAI(true);
    } finally {
      setLoadingAI(false);
    }
  };

  // Rest van component...
```

### B. Voeg knop toe (na de FMP source badge, rond regel 355):

```javascript
        {/* AI Explanation Button */}
        <button
          onClick={getAIExplanation}
          disabled={loadingAI}
          className="mt-3 w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 text-[11px] font-medium px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
        >
          {loadingAI ? (
            <>
              <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
              <span>Laden...</span>
            </>
          ) : (
            <>
              <span>🤖</span>
              <span>{showAI ? 'Verberg' : 'AI Uitleg'}</span>
            </>
          )}
        </button>

        {/* AI Explanation Display */}
        {showAI && aiExplanation && (
          <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-lg">🤖</span>
              <p className="text-[11px] text-white/80 leading-relaxed">{aiExplanation}</p>
            </div>
          </div>
        )}
```

## Stap 5: Zorg dat axios geïmporteerd is

Bovenaan `/src/components/BeleggenPage.js` moet staan:
```javascript
import axios from 'axios';
```

## ✅ Klaar!

Na deze stappen heb je:
- ✅ `/api/ai-explain.js` endpoint (al gemaakt)
- ✅ OpenAI package geïnstalleerd
- ✅ API key in Vercel environment variables
- ✅ "🤖 AI Uitleg" knop bij analyst bars

## 🎯 Gebruik

1. Ga naar een aandeel met analyst data (bijv. AMZN)
2. Klik op "🤖 AI Uitleg"
3. Wacht 1-2 seconden
4. Zie Nederlandse uitleg van de analyst aanbevelingen!

## 💰 Kosten

- ~$0.001 per uitleg
- 100 uitleg per dag = $3/maand
- Eerste $5 gratis (OpenAI credit)

## 🐛 Troubleshooting

**"OPENAI_API_KEY not configured"**
→ Voeg API key toe aan Vercel en redeploy

**"AI uitleg tijdelijk niet beschikbaar"**
→ Check console voor errors
→ Verifieer API key is correct

**Knop doet niks**
→ Check browser console (F12)
→ Verifieer axios is geïmporteerd
