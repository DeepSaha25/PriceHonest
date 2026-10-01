import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import type { SellerPrice } from '../lib/types';

interface Props {
  sellers: SellerPrice[];
  claimedPrice?: number | null;
  claimedOriginalPrice?: number | null;
  medianPrice?: number | null;
}

const fmt = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN');

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; price: number; link: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="px-4 py-3 rounded-xl text-sm"
      style={{
        background: 'rgba(13,13,20,0.97)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#f0f0f8',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <div className="font-semibold mb-1">{d.name}</div>
      <div className="text-lg font-bold" style={{ color: '#fbbf24' }}>
        {fmt(d.price)}
      </div>
      {d.link && d.link !== '#' && (
        <a
          href={d.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs mt-1 block hover:underline"
          style={{ color: '#f59e0b' }}
        >
          View listing →
        </a>
      )}
    </div>
  );
}

export default function SellerChart({ sellers, claimedPrice, claimedOriginalPrice, medianPrice }: Props) {
  const sorted = [...sellers].sort((a, b) => a.price - b.price);
  const minPrice = sorted[0]?.price ?? 0;

  const data = sorted.map((s) => ({
    name: s.name,
    price: s.price,
    link: s.link,
  }));

  const allPrices = sorted.map((s) => s.price);
  if (claimedPrice) allPrices.push(claimedPrice);
  if (claimedOriginalPrice) allPrices.push(claimedOriginalPrice);
  const domainMax = Math.max(...allPrices) * 1.08;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-text-primary">Price Comparison</h3>
          <p className="text-xs text-neutral-400">Comparing across verified online &amp; retail stores</p>
        </div>
        <div className="flex gap-4 text-xs" style={{ color: '#9090b0' }}>
          {claimedPrice && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 inline-block" style={{ background: '#f59e0b' }} />
              This deal
            </span>
          )}
          {medianPrice && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 inline-block" style={{ background: '#52526a', borderTop: '2px dashed #52526a', marginTop: '-2px' }} />
              Market median
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            domain={[0, domainMax]}
            tickFormatter={(v: number) => (v >= 100000 ? '₹' + (v / 100000).toFixed(1) + 'L' : '₹' + (v / 1000).toFixed(0) + 'k')}
            tick={{ fill: '#71717a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: '#d4d4d8', fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {/* Claimed price reference line */}
          {claimedPrice && (
            <ReferenceLine
              x={claimedPrice}
              stroke="#f59e0b"
              strokeWidth={1.5}
              label={{ value: 'Deal', position: 'top', fill: '#f59e0b', fontSize: 10 }}
            />
          )}

          {/* Market median reference line */}
          {medianPrice && (
            <ReferenceLine
              x={medianPrice}
              stroke="#52526a"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          )}

          <Bar dataKey="price" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={i === 0 ? '#22c55e' : 'rgba(245, 158, 11, 0.40)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center justify-between text-xs" style={{ color: '#71717a' }}>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: '#22c55e' }}
          />
          <span>Lowest price highlighted in green</span>
        </div>
        <span>{data.length} verified sellers</span>
      </div>
    </motion.div>
  );
}
