'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DLPPerformance {
  id: string;
  totalScore: string;
  tradingVolume: string;
  uniqueContributors: string;
  dataAccessFees: string;
}

interface DLP {
  id: string;
  name: string;
  token: string;
  treasury?: string;
  metadata?: string;
  isRewardEligible?: boolean;
  totals?: {
    uniqueFileContributors: number;
  };
  performances: DLPPerformance[];
}

export default function Page() {
  const [dlps, setDlps] = useState<DLP[]>([]);
  const [loading, setLoading] = useState(false);
  const [vanaPrice, setVanaPrice] = useState<number>(4.3); // fallback price

  const DECIMALS = 1e18;

  const formatValue = (value: string, decimals = DECIMALS, toUSD = false) => {
    const num = parseFloat(value) / decimals;
    return toUSD ? `$${(num * vanaPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} VANA`;
  };

  const GRAPHQL_ENDPOINT = 'https://api.goldsky.com/api/public/project_cm168cz887zva010j39il7a6p/subgraphs/vana/main/gn';

  const fetchVanaPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=vana&vs_currencies=usd');
      const data = await response.json();
      if (data?.vana?.usd) {
        setVanaPrice(data.vana.usd);
      }
    } catch (error) {
      console.error('Error fetching VANA price:', error);
    }
  };

  const fetchDLPs = async () => {
    setLoading(true);
    const query = `{
      dlps(where: {status: 2}) {
        id
        name
        token
        treasury
        metadata
        isRewardEligible
        totals {
          uniqueFileContributors
        }
        performances(orderBy: id, orderDirection: desc, first: 5) {
          id
          totalScore
          tradingVolume
          uniqueContributors
          dataAccessFees
        }
      }
    }`;

    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const { data } = await response.json();
      setDlps(data.dlps);
    } catch (error) {
      console.error('Error fetching DLPs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVanaPrice();
    fetchDLPs();
  }, []);

  const totalContributors = dlps.reduce((acc, dlp) => acc + (dlp.totals?.uniqueFileContributors || 0), 0);
  const totalAccessFees = dlps.reduce((acc, dlp) => acc + parseFloat(dlp.performances[0]?.dataAccessFees || '0'), 0) / DECIMALS;

  return (
    <main className="p-8 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-2 text-center">Active Vana DLPs</h1>
      <p className="text-center text-gray-600 mb-6">This dashboard shows active Data Liquidity Pools (DLPs) on Vana. Figures represent either actual token transactions (Data Access Fees) or internal economic signals (Trading Volume). Prices use a live feed from CoinGecko when available.</p>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-4 mb-8">
        <p className="text-lg font-semibold text-gray-800 mb-2">Totals</p>
        <p className="text-sm text-gray-600">Total Data Access Fees: <span className="font-bold">{totalAccessFees.toLocaleString(undefined, { maximumFractionDigits: 4 })} VANA (${(totalAccessFees * vanaPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })})</span></p>
      </div>

      {loading && (
        <p className="text-center text-gray-600">Loading DLP data...</p>
      )}

      {!loading && dlps.length === 0 && (
        <p className="text-center text-gray-600">No active DLPs found or no data yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dlps.map(dlp => {
          const perf = dlp.performances[0];

          const chartData = dlp.performances.map((p, index) => ({
            name: `#${index + 1}`,
            dataAccess: parseFloat(p.dataAccessFees) / DECIMALS,
          })).reverse();

          return (
            <div key={dlp.id} className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 hover:shadow-lg transition">
              <h2 className="text-lg font-semibold mb-2 text-gray-800 truncate">{dlp.name}</h2>
              <p className="text-xs text-gray-500 break-words mb-2">Token: {dlp.token}</p>

              <div className="mt-4">
                <p className="text-sm text-gray-700">Unique File Contributors:</p>
                <p className="text-xl font-bold text-blue-600">{dlp.totals?.uniqueFileContributors ?? 0}</p>
              </div>

              {perf && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-1">Latest Economic Data:</p>
                  <p className="text-sm text-gray-600">Total Score: <span className="font-semibold">{formatValue(perf.totalScore)}</span></p>
                  <p className="text-sm text-gray-600">Trading Volume: <span className="font-semibold">{formatValue(perf.tradingVolume, DECIMALS, true)}</span></p>
                  <p className="text-sm text-gray-600">Data Access Fees: <span className="font-semibold">{formatValue(perf.dataAccessFees)} ({formatValue(perf.dataAccessFees, DECIMALS, true)})</span></p>
                  <p className="text-sm text-gray-600">Unique Contributors: <span className="font-semibold">{perf.uniqueContributors}</span></p>

                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={chartData}>
                        <Line type="monotone" dataKey="dataAccess" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <XAxis hide dataKey="name" />
                        <YAxis hide />
                        <Tooltip formatter={(v: number) => `${v.toFixed(4)} VANA`} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 text-center mt-1">Data Access Fees over Time</p>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 mb-1">Additional Info:</p>
                <p className="text-sm text-gray-600">Reward Eligible: <span className="font-semibold">{dlp.isRewardEligible ? 'Yes' : 'No'}</span></p>
                {dlp.treasury && (
                  <p className="text-sm text-gray-600">Treasury: <span className="font-mono text-xs">{dlp.treasury}</span></p>
                )}
                {dlp.metadata && (
                  <p className="text-sm text-gray-600 mt-2 italic">{dlp.metadata}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
