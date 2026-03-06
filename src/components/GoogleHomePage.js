import React from 'react';
import { Home, Wifi, PlugZap, Shield, ExternalLink } from 'lucide-react';

const GoogleHomePage = () => {
  return (
    <div className="space-y-6">
      <div className="gradient-card rounded-xl p-6 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
          <Home className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-white text-2xl font-semibold">Google Home</h1>
          <p className="text-white/70">Verbind je slimme apparaten en beheer ze vanuit Guin.AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-effect rounded-xl p-6">
          <h2 className="text-white text-lg font-semibold mb-3 flex items-center">
            <Wifi className="w-5 h-5 mr-2" />
            Koppeling (concept)
          </h2>
          <p className="text-white/70 text-sm mb-4">
            Om te koppelen met Google Home is een Google Cloud project nodig met Smart Home API-toegang en OAuth 2.0. Dit vereist client ID/secret en account linking.
          </p>
          <div className="space-y-2 text-white/70 text-sm">
            <div className="flex items-center"><Shield className="w-4 h-4 mr-2" />OAuth 2.0 met veilige opslag van tokens</div>
            <div className="flex items-center"><PlugZap className="w-4 h-4 mr-2" />Google Home/Smart Home API voor apparaatstatus en -commando's</div>
          </div>
          <a
            href="https://developers.home.google.com"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center mt-4 text-blue-300 hover:text-blue-200"
          >
            Documentatie <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        </div>

        <div className="glass-effect rounded-xl p-6">
          <h2 className="text-white text-lg font-semibold mb-3">Apparaten (demo)</h2>
          <p className="text-white/60 text-sm mb-4">Zodra de koppeling actief is tonen we hier je apparatenlijst (lampen, schakelaars, thermostaat, speakers...).</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Woonkamer lamp</p>
              <p className="text-white/60 text-sm">Status: —</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-medium">Thermostaat</p>
              <p className="text-white/60 text-sm">Temperatuur: —</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleHomePage;
