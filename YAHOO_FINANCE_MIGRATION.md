# 🚀 Yahoo Finance + OpenAI Migration - Complete Guide

## ✅ Wat Ik Heb Gemaakt

### 1. **Yahoo Finance Analyst API** (`/api/yahoo-analyst.js`)
- ✅ Haalt analyst data op van Yahoo Finance (GRATIS)
- ✅ Vervangt FMP voor analyst recommendations
- ✅ Geeft: mean score, breakdown, target price
- ✅ Compatibel met huidige AnalystMeter component

### 2. **AI Settings Component** (`/src/components/AISettings.js`)
- ✅ Laat gebruiker OpenAI API key invoeren
- ✅ Laat gebruiker Gemini API key invoeren
- ✅ Slaat keys op in localStorage
- ✅ Mooie UI met show/hide functie

### 3. **AI Explain Utility** (`/src/utils/aiExplain.js`)
- ✅ Gebruikt OpenAI key uit localStorage
- ✅ Genereert Nederlandse uitleg van analyst data
- ✅ Ondersteunt: analyst, news, performance, technical
- ✅ Direct call naar OpenAI (geen backend nodig)

---

## 🔧 Wat JIJ Moet Doen

### **Stap 1: Update BeleggenPage.js - Gebruik Yahoo Analyst Data**

Open `/src/components/BeleggenPage.js` en zoek naar `fetchFMPAnalystData` (rond regel 822).

**Vervang deze functie:**
```javascript
const fetchFMPAnalystData = async (tickers) => {
  // ... oude FMP code
};
```

**Door deze nieuwe functie:**
```javascript
const fetchYahooAnalystData = async (tickers) => {
  if (!tickers || tickers.length === 0) return;
  
  console.log('🔍 Fetching Yahoo analyst data for tickers:', tickers);
  
  try {
    const response = await axios.get('/api/yahoo-analyst', {
      params: { tickers: tickers.join(',') }
    });
    
    console.log('📊 Yahoo Response:', response.data);
    
    if (response.data?.results) {
      const resultCount = Object.keys(response.data.results).length;
      console.log(`✅ Got analyst data for ${resultCount} tickers:`, Object.keys(response.data.results));
      
      setAnalystData(prev => {
        const merged = { ...prev };
        Object.keys(response.data.results).forEach(ticker => {
          merged[ticker] = response.data.results[ticker];
        });
        console.log('💾 Merged analyst data:', merged);
        return merged;
      });
    } else {
      console.warn('⚠️ No results in Yahoo response');
    }
  } catch (error) {
    console.error('❌ Error fetching Yahoo analyst data:', error.message);
  }
};
```

**Vervang ook alle calls naar `fetchFMPAnalystData` door `fetchYahooAnalystData`:**
- Zoek: `fetchFMPAnalystData(`
- Vervang door: `fetchYahooAnalystData(`

---

### **Stap 2: Voeg AI Settings Knop toe aan Header**

Open `/src/components/Header.js` en voeg een settings knop toe:

```javascript
import AISettings from './AISettings';

// In de Header component, voeg state toe:
const [showAISettings, setShowAISettings] = useState(false);

// Voeg knop toe in de header (naast andere knoppen):
<button
  onClick={() => setShowAISettings(!showAISettings)}
  className="p-2 hover:bg-white/10 rounded-lg transition-all"
  title="AI Instellingen"
>
  <Settings className="w-5 h-5 text-white/80" />
</button>

// Render AISettings component:
{showAISettings && <AISettings onClose={() => setShowAISettings(false)} />}
```

---

### **Stap 3: Voeg AI Uitleg Knop toe aan AnalystMeter**

Open `/src/components/BeleggenPage.js` en zoek de `AnalystMeter` component (rond regel 229).

**A. Importeer de AI utility bovenaan het bestand:**
```javascript
import { getAIExplanation } from '../utils/aiExplain';
```

**B. Voeg state toe aan AnalystMeter (na regel 229):**
```javascript
const AnalystMeter = ({ recommendation, growthData, targetPrice, currentPrice, ticker, isETF }) => {
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleAIExplanation = async () => {
    if (aiExplanation) {
      setShowAI(!showAI);
      return;
    }

    setLoadingAI(true);
    setAiError(null);
    
    try {
      const explanation = await getAIExplanation('analyst', ticker, {
        mean: recommendation.mean,
        analysts: recommendation.analysts,
        breakdown: recommendation.breakdown,
        targetPrice
      });
      setAiExplanation(explanation);
      setShowAI(true);
    } catch (error) {
      console.error('AI explain error:', error);
      setAiError(error.message);
      setShowAI(true);
    } finally {
      setLoadingAI(false);
    }
  };

  // Rest van component...
```

**C. Voeg AI knop toe (na de FMP source badge, rond regel 355):**
```javascript
        {/* AI Explanation Button */}
        <button
          onClick={handleAIExplanation}
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
        {showAI && (
          <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            {aiError ? (
              <div className="flex items-start space-x-2">
                <span className="text-lg">⚠️</span>
                <p className="text-[11px] text-red-300 leading-relaxed">{aiError}</p>
              </div>
            ) : aiExplanation ? (
              <div className="flex items-start space-x-2">
                <span className="text-lg">🤖</span>
                <p className="text-[11px] text-white/80 leading-relaxed">{aiExplanation}</p>
              </div>
            ) : null}
          </div>
        )}
```

---

### **Stap 4: Commit & Deploy**

```bash
cd "/Users/gijsmeteor/Library/Mobile Documents/com~apple~CloudDocs/Eigen projecten/guin.ai"

# Commit nieuwe files
git add api/yahoo-analyst.js src/components/AISettings.js src/utils/aiExplain.js YAHOO_FINANCE_MIGRATION.md
git commit -m "Add Yahoo Finance analyst data + OpenAI integration"
git push origin main
```

---

## 🎯 Hoe Het Werkt

### **1. Gebruiker Stelt API Key In**
```
1. Klik op Settings knop in header
2. Voer OpenAI API key in (sk-proj-...)
3. Klik "Opslaan"
4. Key wordt opgeslagen in localStorage
```

### **2. Analyst Data Wordt Opgehaald**
```
Yahoo Finance API → /api/yahoo-analyst → AnalystMeter
- Mean score (1-5)
- Breakdown (strongBuy, buy, hold, sell, strongSell)
- Target price
- Current price
```

### **3. AI Uitleg Wordt Gegenereerd**
```
User klikt "🤖 AI Uitleg"
→ getAIExplanation() haalt key uit localStorage
→ Roept OpenAI API direct aan
→ Toont Nederlandse uitleg
```

---

## 💰 Kosten

### **Oude Situatie (FMP + OpenAI):**
- FMP: $50/maand
- OpenAI: $3/maand
- **Totaal: $53/maand**

### **Nieuwe Situatie (Yahoo + OpenAI):**
- Yahoo Finance: **GRATIS**
- OpenAI: $3/maand (gebruiker's eigen key)
- **Totaal: $0/maand voor jou, $3/maand voor gebruiker**

---

## ✅ Checklist

- [ ] `fetchFMPAnalystData` vervangen door `fetchYahooAnalystData`
- [ ] AI Settings knop toevoegen aan Header
- [ ] AISettings component importeren en renderen
- [ ] AI Uitleg knop toevoegen aan AnalystMeter
- [ ] `getAIExplanation` importeren in BeleggenPage
- [ ] Code committen en pushen
- [ ] Testen met AMZN, URA, COPX

---

## 🐛 Troubleshooting

**"OpenAI API key niet ingesteld"**
→ Klik op Settings knop en voer je OpenAI key in

**"Yahoo analyst failed"**
→ Check console voor errors
→ Verifieer ticker symbol is correct

**AI knop doet niks**
→ Check browser console (F12)
→ Verifieer `getAIExplanation` is geïmporteerd

---

## 🎉 Resultaat

Na deze wijzigingen heb je:
- ✅ Gratis analyst data van Yahoo Finance
- ✅ AI uitleg met gebruiker's eigen OpenAI key
- ✅ Geen FMP kosten meer
- ✅ Volledige functionaliteit behouden
