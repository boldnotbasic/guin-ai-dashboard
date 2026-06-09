# Discord Webhook Setup voor Sentiment Radar

## Wat je nodig hebt
- Discord server (maak een nieuwe of gebruik bestaande)
- Toegang tot server instellingen
- Webhook URL van je Discord server

## Stap 1: Webhook aanmaken in Discord

1. **Ga naar je Discord server**
2. **Klik op servernaam** → **Server Instellingen**
3. Ga naar **Integraties** → **Webhooks**
4. Klik **Nieuwe Webhook**
5. Geef een naam: `Guin Sentiment Bot`
6. Kies kanaal waar berichten naartoe moeten (bijv `#trading-talk` of `#sentiment-feed`)
7. Kopieer de **Webhook URL** (ziet eruit als: `https://discord.com/api/webhooks/...`)

## Stap 2: Webhook testen

Test je webhook met curl of Postman:

```bash
curl -X POST "JOUW_WEBHOOK_URL" \
-H "Content-Type: application/json" \
-d '{
  "content": "$AAPL is going to the moon! 🚀 Bullish vibes!",
  "username": "Test Bot"
}'
```

## Stap 3: Trading servers koppelen (optioneel)

Voor de beste sentiment data, voeg webhooks toe van populaire trading communities:

### Manueel toevoegen:
1. Zoek openbare Discord servers voor trading
2. Vraag toegang tot hun webhooks (sommige servers bieden publieke webhooks)
3. Voeg hun webhook URLs toe aan je systeem

### Aanbevolen servers om te volgen:
- r/wallstreetbets sentiment
- Stock trading communities
- Crypto trading groups
- Options trading servers

## Stap 4: Automatiseren

Je kunt ook bots gebruiken om berichten te forwarden:

1. **Maak een bot** die luistert naar meerdere kanalen
2. **Forward relevante berichten** naar jouw webhook
3. **Filter op ticker mentions** ($AAPL, $TSLA, etc.)

## Stap 5: Integratie met Guin

Je webhook is nu klaar! De Sentiment Widget zal:
- Real-time berichten ontvangen
- Ticker mentions detecteren
- Sentiment scoren (bullish/bearish)
- Alerts tonen bij sterke sentiment shifts

## Veiligheidstips

- **Deel je webhook URL nooit publiek**
- **Gebruik unieke namen** per bron
- **Monitor voor abuse** - te veel berichten kunnen je rate limiten
- **Filter op relevante tickers** om ruis te verminderen

## Troubleshooting

**Geen data?**
- Controleer of webhook URL correct is
- Zorg dat berichten ticker mentions bevatten ($AAPL)
- Check browser console voor errors

**Rate limited?**
- Discord webhooks hebben limieten (30 berichten/10 sec)
- Gebruik caching in je API calls

**Foutieve sentiment?**
- Sentiment is gebaseerd op keywords + emoji
- Train de keyword lijst voor betere resultaten

## Voorbeeld berichten die werken

```
$NVDA earnings beat! 🚀 Going strong
$TSLA dropping hard 📉 Bearish on this
$BTC pumping! To the moon 🌙💎
```

Deze worden gedetecteerd en gescored in je Sentiment Radar!
