import React from 'react';
import { MetricSummary } from '../types/product';
import { Radar, Percent, CheckCheck, TrendingUp } from 'lucide-react';

interface MetricStatsProps {
  metrics: MetricSummary;
}

export const MetricStats: React.FC<MetricStatsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      
      {/* Total no Radar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Radar Ativo
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">
            {metrics.totalRadar} <span className="text-xs font-normal text-slate-500">itens</span>
          </p>
        </div>
        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/60 text-amber-600">
          <Radar className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Maior Desconto */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Maior Desconto
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">
            -{metrics.highestDiscount}% <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">OFF</span>
          </p>
        </div>
        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200/60 text-emerald-600">
          <Percent className="w-5 h-5" />
        </div>
      </div>

      {/* Publicados Hoje */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Publicados Hoje
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">
            {metrics.publishedToday} <span className="text-xs font-normal text-slate-500">posts</span>
          </p>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200/60 text-blue-600">
          <CheckCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Média de Desconto */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Média Desconto ML
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">
            {metrics.avgDiscount}% <span className="text-xs font-normal text-slate-500">economizados</span>
          </p>
        </div>
        <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200/60 text-purple-600">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
};
