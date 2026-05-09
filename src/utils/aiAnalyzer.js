// AI Stock Analyzer - Free & Paid AI integration for stock analysis
// Uses Hugging Face (FREE) by default, OpenAI as premium option

export class AIStockAnalyzer {
  constructor(apiKey = null) {
    this.openaiKey = apiKey || process.env.REACT_APP_OPENAI_API_KEY;
    this.huggingfaceKey = process.env.REACT_APP_HUGGINGFACE_API_KEY || 'hf_demo'; // Free tier
    this.useOpenAI = !!this.openaiKey;
  }

  // Analyze a stock with AI (uses free Hugging Face by default)
  async analyzeStock(stockData) {
    // Try free Hugging Face first
    if (!this.useOpenAI) {
      return await this.analyzeWithHuggingFace(stockData);
    }
    
    // Use OpenAI if key is available
    return await this.analyzeWithOpenAI(stockData);
  }

  // FREE: Hugging Face Analysis
  async analyzeWithHuggingFace(stockData) {
    const prompt = this.buildSimplePrompt(stockData);

    try {
      // Use Hugging Face Inference API (FREE)
      const response = await fetch(
        'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              return_full_text: false
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data[0]?.generated_text || 'Geen analyse beschikbaar';

      return {
        analysis,
        timestamp: new Date().toISOString(),
        ticker: stockData.ticker,
        provider: 'Hugging Face (FREE)'
      };
    } catch (error) {
      console.error('Hugging Face Analysis failed:', error);
      // Fallback to simple rule-based analysis
      return this.generateRuleBasedAnalysis(stockData);
    }
  }

  // PAID: OpenAI Analysis
  async analyzeWithOpenAI(stockData) {
    const prompt = this.buildAnalysisPrompt(stockData);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'Je bent een ervaren financieel analist die beleggingsadvies geeft. Geef concrete, praktische analyses in het Nederlands.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;

      return {
        analysis,
        timestamp: new Date().toISOString(),
        ticker: stockData.ticker,
        provider: 'OpenAI GPT-4'
      };
    } catch (error) {
      console.error('OpenAI Analysis failed:', error);
      // Fallback to free Hugging Face
      return await this.analyzeWithHuggingFace(stockData);
    }
  }

  // Fallback: Rule-based analysis (always works, no API needed)
  generateRuleBasedAnalysis(stockData) {
    const {
      ticker, name, currentPrice, dailyChange, growth1mo, growth6mo, growth1yr,
      rsi, macd, signal, trailingPE, pegRatio, sector
    } = stockData;

    let analysis = `**${name} (${ticker}) - Technische & Fundamentele Analyse**\n\n`;

    // Technical Analysis
    analysis += `**📊 Technische Analyse:**\n`;
    if (rsi) {
      if (rsi < 30) {
        analysis += `- RSI (${rsi.toFixed(0)}): OVERSOLD - Mogelijk koopkans, aandeel is technisch ondergewaardeerd.\n`;
      } else if (rsi > 70) {
        analysis += `- RSI (${rsi.toFixed(0)}): OVERBOUGHT - Voorzichtigheid geboden, mogelijk oververhit.\n`;
      } else {
        analysis += `- RSI (${rsi.toFixed(0)}): Neutraal - Geen extreme signalen.\n`;
      }
    }

    if (macd?.trend) {
      analysis += `- MACD: ${macd.trend === 'bullish' ? '↑ Bullish momentum' : '↓ Bearish momentum'}\n`;
    }

    if (signal?.overall) {
      analysis += `- Overall Signaal: **${signal.overall}**\n`;
    }

    // Growth Analysis
    analysis += `\n**📈 Groei Analyse:**\n`;
    if (growth1mo !== undefined) analysis += `- 1 maand: ${growth1mo >= 0 ? '+' : ''}${growth1mo.toFixed(1)}%\n`;
    if (growth6mo !== undefined) analysis += `- 6 maanden: ${growth6mo >= 0 ? '+' : ''}${growth6mo.toFixed(1)}%\n`;
    if (growth1yr !== undefined) analysis += `- 1 jaar: ${growth1yr >= 0 ? '+' : ''}${growth1yr.toFixed(1)}%\n`;

    // Valuation
    if (trailingPE || pegRatio) {
      analysis += `\n**💰 Waardering:**\n`;
      if (trailingPE) {
        const peAssessment = trailingPE < 15 ? 'Laag (mogelijk ondergewaardeerd)' :
                            trailingPE < 25 ? 'Gemiddeld' : 'Hoog (mogelijk duur)';
        analysis += `- P/E Ratio: ${trailingPE.toFixed(1)} - ${peAssessment}\n`;
      }
      if (pegRatio) {
        const pegAssessment = pegRatio < 1 ? 'Uitstekend' :
                             pegRatio < 1.5 ? 'Goed' : 'Hoog';
        analysis += `- PEG Ratio: ${pegRatio.toFixed(2)} - ${pegAssessment}\n`;
      }
    }

    // Recommendation
    analysis += `\n**🎯 Aanbeveling:**\n`;
    let recommendation = 'HOLD';
    let reasoning = '';

    if (signal?.overall === 'STRONG BUY' || signal?.overall === 'BUY') {
      recommendation = signal.overall;
      reasoning = 'Technische indicatoren tonen positieve signalen.';
    } else if (signal?.overall === 'STRONG SELL' || signal?.overall === 'SELL') {
      recommendation = signal.overall;
      reasoning = 'Technische indicatoren tonen negatieve signalen.';
    } else if (rsi && rsi < 30 && (growth6mo || 0) > 0) {
      recommendation = 'BUY';
      reasoning = 'Oversold met positieve groeitrend - koopkans.';
    } else if (rsi && rsi > 70) {
      recommendation = 'SELL';
      reasoning = 'Overbought - winst nemen overwegen.';
    } else {
      reasoning = 'Geen sterke signalen - afwachten of meer research doen.';
    }

    analysis += `**${recommendation}** - ${reasoning}\n`;
    analysis += `\n*Let op: Dit is een geautomatiseerde analyse. Doe altijd eigen onderzoek voor beleggingsbeslissingen.*`;

    return {
      analysis,
      timestamp: new Date().toISOString(),
      ticker: stockData.ticker,
      provider: 'Rule-Based (Offline)'
    };
  }

  // Simple prompt for free AI
  buildSimplePrompt(stockData) {
    const { ticker, name, currentPrice, rsi, signal, growth6mo } = stockData;
    return `Analyseer ${name} (${ticker}). Prijs: €${currentPrice?.toFixed(2)}, RSI: ${rsi?.toFixed(0)}, Groei 6M: ${growth6mo?.toFixed(1)}%, Signaal: ${signal?.overall}. Geef korte analyse (max 300 woorden) in Nederlands met koop/verkoop advies.`;
  }

  // Build analysis prompt with stock data
  buildAnalysisPrompt(stockData) {
    const {
      ticker,
      name,
      currentPrice,
      dailyChange,
      growth1mo,
      growth6mo,
      growth1yr,
      rsi,
      macd,
      signal,
      marketCap,
      trailingPE,
      forwardPE,
      pegRatio,
      volume,
      avgVolume,
      sector
    } = stockData;

    let prompt = `Analyseer het aandeel ${name} (${ticker}) en geef een gedetailleerde beleggingsanalyse.\n\n`;
    prompt += `**Huidige Data:**\n`;
    prompt += `- Koers: €${currentPrice?.toFixed(2) || 'N/A'}\n`;
    prompt += `- Dagelijkse verandering: ${dailyChange?.toFixed(2) || 'N/A'}%\n`;
    prompt += `- 1 maand groei: ${growth1mo?.toFixed(2) || 'N/A'}%\n`;
    prompt += `- 6 maanden groei: ${growth6mo?.toFixed(2) || 'N/A'}%\n`;
    prompt += `- 1 jaar groei: ${growth1yr?.toFixed(2) || 'N/A'}%\n`;
    
    if (rsi) prompt += `- RSI: ${rsi.toFixed(0)}\n`;
    if (macd) prompt += `- MACD trend: ${macd.trend}\n`;
    if (signal) prompt += `- Technisch signaal: ${signal.overall}\n`;
    if (marketCap) prompt += `- Market Cap: €${(marketCap / 1e9).toFixed(2)}B\n`;
    if (trailingPE) prompt += `- P/E ratio: ${trailingPE.toFixed(2)}\n`;
    if (forwardPE) prompt += `- Forward P/E: ${forwardPE.toFixed(2)}\n`;
    if (pegRatio) prompt += `- PEG ratio: ${pegRatio.toFixed(2)}\n`;
    if (volume && avgVolume) prompt += `- Volume: ${((volume / avgVolume) * 100).toFixed(0)}% van gemiddelde\n`;
    if (sector) prompt += `- Sector: ${sector}\n`;

    prompt += `\n**Gevraagde Analyse:**\n`;
    prompt += `1. **Technische Analyse**: Wat zeggen de technische indicators (RSI, MACD, trends)?\n`;
    prompt += `2. **Fundamentele Analyse**: Hoe staat de waardering (P/E, PEG)?\n`;
    prompt += `3. **Risico's**: Wat zijn de belangrijkste risico's?\n`;
    prompt += `4. **Kansen**: Wat zijn de groeikansen?\n`;
    prompt += `5. **Aanbeveling**: Kopen, verkopen of aanhouden? Waarom?\n`;
    prompt += `\nGeef een beknopte maar complete analyse (max 500 woorden).`;

    return prompt;
  }

  // Quick sentiment analysis
  async quickSentiment(ticker, recentNews) {
    if (!this.apiKey) {
      return { error: 'API key niet geconfigureerd' };
    }

    const newsText = recentNews.map(n => `- ${n.title}`).join('\n');
    const prompt = `Analyseer het sentiment van dit recente nieuws over ${ticker}:\n\n${newsText}\n\nGeef een sentiment score (1-10, waarbij 10 = zeer bullish) en een korte uitleg (max 100 woorden).`;

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Je bent een sentiment analist voor financieel nieuws.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 200
        })
      });

      const data = await response.json();
      return {
        sentiment: data.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Compare multiple stocks
  async compareStocks(stocks) {
    if (!this.apiKey) {
      return { error: 'API key niet geconfigureerd' };
    }

    const stockSummaries = stocks.map(s => 
      `${s.name} (${s.ticker}): Prijs €${s.currentPrice?.toFixed(2)}, RSI ${s.rsi?.toFixed(0)}, Groei 1Y ${s.growth1yr?.toFixed(1)}%`
    ).join('\n');

    const prompt = `Vergelijk deze aandelen en geef aan welke de beste keuze is voor een langetermijn investering:\n\n${stockSummaries}\n\nGeef een ranking met uitleg (max 300 woorden).`;

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'Je bent een portfolio manager die aandelen vergelijkt.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();
      return {
        comparison: data.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Singleton instance
export const aiAnalyzer = new AIStockAnalyzer();
