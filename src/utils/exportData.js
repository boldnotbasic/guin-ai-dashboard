// Export functionality for portfolio data (CSV, PDF)
import jsPDF from 'jspdf';

export class DataExporter {
  // Export portfolio to CSV
  exportToCSV(investments, stockPrices) {
    const headers = [
      'Naam',
      'Ticker',
      'Type',
      'Sector',
      'Aandelen',
      'Aankoopprijs',
      'Geïnvesteerd',
      'Huidige Prijs',
      'Huidige Waarde',
      'Winst/Verlies',
      'Winst/Verlies %',
      'Dagelijkse Verandering %'
    ];

    const rows = investments.map(inv => {
      const stockPrice = inv.ticker_symbol ? stockPrices[inv.ticker_symbol] : null;
      const shares = parseFloat(inv.shares) || 0;
      const purchasePrice = parseFloat(inv.purchase_price) || 0;
      const invested = shares * purchasePrice || parseFloat(inv.amount) || 0;
      const currentPrice = stockPrice?.current || purchasePrice;
      const currentValue = shares > 0 ? shares * currentPrice : invested;
      const profitLoss = currentValue - invested;
      const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;
      const dailyChange = stockPrice?.changePercent || 0;

      return [
        inv.name,
        inv.ticker_symbol || '',
        inv.type,
        inv.sector || '',
        shares || '',
        purchasePrice || '',
        invested.toFixed(2),
        currentPrice.toFixed(2),
        currentValue.toFixed(2),
        profitLoss.toFixed(2),
        profitLossPercent.toFixed(2),
        dailyChange.toFixed(2)
      ];
    });

    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export portfolio to PDF
  exportToPDF(investments, stockPrices, portfolioStats) {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Portfolio Rapport', 14, 20);
    
    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Gegenereerd op: ${new Date().toLocaleDateString('nl-NL')}`, 14, 28);
    
    // Portfolio Summary Box
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 35, 182, 35, 'F');
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Portfolio Overzicht', 18, 43);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let yPos = 50;
    doc.text(`Totaal Geïnvesteerd: €${portfolioStats.totalInvested.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`, 18, yPos);
    yPos += 6;
    doc.text(`Huidige Waarde: €${portfolioStats.totalValue.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`, 18, yPos);
    yPos += 6;
    
    const plColor = portfolioStats.totalProfitLoss >= 0 ? [0, 128, 0] : [255, 0, 0];
    doc.setTextColor(...plColor);
    doc.setFont(undefined, 'bold');
    doc.text(`Winst/Verlies: €${portfolioStats.totalProfitLoss.toLocaleString('nl-NL', { minimumFractionDigits: 2 })} (${portfolioStats.totalProfitLossPercent.toFixed(2)}%)`, 18, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    yPos += 6;
    
    doc.text(`Aantal Posities: ${investments.length}`, 18, yPos);
    
    // Performance Metrics
    yPos = 78;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Top Performers', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    if (portfolioStats.bestPerformer) {
      doc.setTextColor(0, 128, 0);
      doc.text(`Beste: ${portfolioStats.bestPerformer.name} (+${portfolioStats.bestPerformer.percentage.toFixed(1)}%)`, 18, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
    if (portfolioStats.worstPerformer) {
      doc.setTextColor(255, 0, 0);
      doc.text(`Slechtste: ${portfolioStats.worstPerformer.name} (${portfolioStats.worstPerformer.percentage.toFixed(1)}%)`, 18, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    }
    doc.text(`Win Rate: ${portfolioStats.winRate.toFixed(1)}%`, 18, yPos);
    
    // Investments List
    yPos += 12;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Posities', 14, yPos);
    yPos += 6;
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    
    // List investments
    investments.slice(0, 20).forEach((inv, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const stockPrice = inv.ticker_symbol ? stockPrices[inv.ticker_symbol] : null;
      const shares = parseFloat(inv.shares) || 0;
      const purchasePrice = parseFloat(inv.purchase_price) || 0;
      const invested = shares * purchasePrice || parseFloat(inv.amount) || 0;
      const currentPrice = stockPrice?.current || purchasePrice;
      const currentValue = shares > 0 ? shares * currentPrice : invested;
      const profitLoss = currentValue - invested;
      const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;
      
      // Investment name and ticker
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${inv.name}`, 18, yPos);
      if (inv.ticker_symbol) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(`(${inv.ticker_symbol})`, 18 + doc.getTextWidth(`${index + 1}. ${inv.name}`) + 2, yPos);
        doc.setTextColor(0, 0, 0);
      }
      yPos += 4;
      
      // Details
      doc.setFont(undefined, 'normal');
      doc.text(`Type: ${inv.type}`, 22, yPos);
      doc.text(`Geïnvesteerd: €${invested.toFixed(2)}`, 70, yPos);
      doc.text(`Waarde: €${currentValue.toFixed(2)}`, 120, yPos);
      
      // P/L
      const plCol = profitLoss >= 0 ? [0, 128, 0] : [255, 0, 0];
      doc.setTextColor(...plCol);
      doc.text(`${profitLoss >= 0 ? '+' : ''}€${profitLoss.toFixed(2)} (${profitLossPercent.toFixed(1)}%)`, 165, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 6;
    });
    
    if (investments.length > 20) {
      yPos += 4;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`... en ${investments.length - 20} meer posities`, 18, yPos);
      doc.setTextColor(0, 0, 0);
    }

    // Save PDF
    doc.save(`portfolio_rapport_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Export screener results to CSV
  exportScreenerToCSV(screenerData, category) {
    const headers = [
      'Naam',
      'Ticker',
      'Sector',
      'Prijs',
      'Dag %',
      '1M %',
      '6M %',
      '1Y %',
      'RSI',
      'MACD',
      'Signal',
      'Volume',
      'Market Cap'
    ];

    const rows = Object.entries(screenerData).map(([ticker, data]) => [
      data.name || ticker,
      ticker,
      data.sector || '',
      data.currentPrice?.toFixed(2) || '',
      data.dailyChange?.toFixed(2) || '',
      data.growth1mo?.toFixed(2) || '',
      data.growth6mo?.toFixed(2) || '',
      data.growth1yr?.toFixed(2) || '',
      data.rsi?.toFixed(0) || '',
      data.macd?.trend || '',
      data.signal?.overall || '',
      data.volume || '',
      data.marketCap || ''
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `screener_${category}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export alerts to CSV
  exportAlertsToCSV(alerts) {
    const headers = ['Ticker', 'Naam', 'Type', 'Waarde', 'Actief', 'Aangemaakt', 'Laatste Trigger'];

    const rows = alerts.map(alert => [
      alert.ticker,
      alert.name,
      alert.type,
      alert.value || '',
      alert.enabled ? 'Ja' : 'Nee',
      new Date(alert.createdAt).toLocaleDateString('nl-NL'),
      alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleDateString('nl-NL') : 'Nooit'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alerts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Singleton instance
export const dataExporter = new DataExporter();
