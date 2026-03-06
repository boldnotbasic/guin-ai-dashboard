// Eenmalige cleanup voor menu cache problemen
// Deze code kun je verwijderen na gebruik

export const clearMenuCache = () => {
  // Verwijder alle menu-gerelateerde localStorage items
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('menu-order-')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('Removing cached menu:', key);
    localStorage.removeItem(key);
  });
  
  console.log(`Cleared ${keysToRemove.length} menu cache entries`);
  console.log('Refresh de pagina om de menu\'s opnieuw te laden');
};

// Auto-run bij import (eenmalig)
if (typeof window !== 'undefined') {
  clearMenuCache();
}
