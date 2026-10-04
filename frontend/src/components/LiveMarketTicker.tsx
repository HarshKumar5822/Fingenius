import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity, Layers, Zap } from 'lucide-react';
import { investmentService, MarketTickerItem } from '../services/api';

export default function LiveMarketTicker() {
  const [tickerItems, setTickerItems] = useState<MarketTickerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGridMode, setIsGridMode] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  const fetchTickerData = async () => {
    try {
      setLoading(true);
      const res = await investmentService.getLiveTicker();
      if (res?.data) {
        setTickerItems(res.data);
        setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Failed to fetch live market ticker:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickerData();
    const interval = setInterval(() => {
      fetchTickerData();
    }, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, type: string) => {
    if (type === 'crypto' && price < 100) {
      return `$${price.toFixed(2)}`;
    }
    if (type === 'crypto') {
      return `$${price.toLocaleString('en-US')}`;
    }
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3 shadow-lg backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Compact Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-100 tracking-wide">Live Market Ticker</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> LIVE
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400">
              {lastUpdatedTime && `Refreshed ${lastUpdatedTime}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsGridMode(!isGridMode)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          >
            <Layers className="w-3 h-3" />
            {isGridMode ? 'Scroll View' : 'Grid View'}
          </button>

          <button
            onClick={fetchTickerData}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh market ticker"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Ticker Contents */}
      {isGridMode ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5 pt-0.5">
          {tickerItems.map((item) => {
            const isPositive = item.change >= 0;
            return (
              <div
                key={item.symbol}
                className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-lg p-1.5 transition-all"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold text-slate-300 truncate">{item.name}</span>
                </div>
                <div className="text-xs font-bold text-slate-100 font-mono">
                  {formatPrice(item.price, item.type)}
                </div>
                <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  <span>{isPositive ? '+' : ''}{item.changePercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="relative overflow-hidden py-0.5">
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
            {tickerItems.map((item) => {
              const isPositive = item.change >= 0;
              return (
                <div
                  key={item.symbol}
                  className="flex-none flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 hover:border-indigo-500/40 rounded-lg px-2.5 py-1 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-slate-200">{item.name}</span>
                      <span className="text-[9px] font-mono px-1 bg-slate-900 text-slate-400 rounded">
                        {item.symbol}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-100 font-mono">
                      {formatPrice(item.price, item.type)}
                    </div>
                  </div>

                  <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    <span>{isPositive ? '+' : ''}{item.changePercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
