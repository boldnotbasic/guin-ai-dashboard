// AI Explanation Utility
// Calls OpenAI API to explain financial data in Dutch
// Uses API key from localStorage (user's own key)

import axios from 'axios';

export const getAIExplanation = async (type, ticker, data) => {
  // Get API key from localStorage
  const apiKey = localStorage.getItem('openai_api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key niet ingesteld. Ga naar Instellingen om je key toe te voegen.');
  }

  try {
    let prompt = '';

    switch (type) {
      case 'analyst':
        const { mean, analysts, breakdown, targetPrice } = data;
        prompt = `Leg uit wat deze analyst aanbevelingen betekenen voor ${ticker}:
        
- Gemiddelde score: ${mean} (1=Strong Buy, 5=Strong Sell)
- Aantal analisten: ${analysts}
- Breakdown: ${breakdown?.strongBuy || 0} Strong Buy, ${breakdown?.buy || 0} Buy, ${breakdown?.hold || 0} Hold, ${breakdown?.sell || 0} Sell, ${breakdown?.strongSell || 0} Strong Sell
${targetPrice ? `- Doelkoers: €${targetPrice}` : ''}

Geef een korte uitleg (max 3 zinnen) in Nederlands over wat dit betekent voor een belegger.`;
        break;

      case 'news':
        const newsArticles = Array.isArray(data) ? data.slice(0, 5) : [];
        const newsSummary = newsArticles.map(a => `- ${a.title}`).join('\n');
        prompt = `Vat dit recente nieuws samen voor ${ticker}:

${newsSummary}

Leg in 2-3 zinnen uit wat de belangrijkste ontwikkelingen zijn en wat dit betekent voor het aandeel.`;
        break;

      case 'performance':
        const { dailyChange, growth1mo, growth6mo, growth1yr } = data;
        prompt = `Analyseer de koersontwikkeling van ${ticker}:

- Vandaag: ${dailyChange >= 0 ? '+' : ''}${dailyChange}%
- 1 maand: ${growth1mo >= 0 ? '+' : ''}${growth1mo}%
- 6 maanden: ${growth6mo >= 0 ? '+' : ''}${growth6mo}%
- 1 jaar: ${growth1yr >= 0 ? '+' : ''}${growth1yr}%

Geef een korte analyse (max 3 zinnen) van de trend en wat dit betekent.`;
        break;

      case 'technical':
        const { rsi, sma50, sma200, signal, currentPrice } = data;
        prompt = `Leg deze technische indicatoren uit voor ${ticker}:

- RSI: ${rsi}
- Prijs vs SMA50: ${currentPrice > sma50 ? 'Boven' : 'Onder'} (${sma50})
- Prijs vs SMA200: ${currentPrice > sma200 ? 'Boven' : 'Onder'} (${sma200})
- Signaal: ${signal}

Wat betekenen deze indicatoren voor een belegger? (max 3 zinnen)`;
        break;

      default:
        throw new Error(`Unknown type: ${type}`);
    }

    // Call OpenAI directly from frontend
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Je bent een financieel analist die complexe data uitlegt in begrijpelijk Nederlands. Wees beknopt (max 3-4 zinnen) en praktisch.'
        }, {
          role: 'user',
          content: prompt
        }],
        max_tokens: 250,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const result = await response.json();
    return result.choices[0].message.content;

  } catch (error) {
    console.error('AI Explain error:', error);
    throw error;
  }
};
