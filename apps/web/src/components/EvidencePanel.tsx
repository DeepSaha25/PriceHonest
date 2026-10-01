import { motion } from 'framer-motion';
import type { SellerPrice, HistoricalSignal } from '../lib/types';
import { SparklesIcon, TagIcon, CalendarIcon, SearchIcon, DatabaseIcon } from './Icons';

interface Props {
  cheapestSeller: SellerPrice | null;
  historicalSignals: HistoricalSignal[];
  rationale: string;
  fromCache: boolean;
}

const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function EvidencePanel({ cheapestSeller, historicalSignals, rationale, fromCache }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="flex flex-col gap-4"
    >
      {/* Rationale */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon size={16} className="text-amber-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Analysis
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#d0d0e8' }}>
          {rationale}
        </p>
      </div>

      {/* Evidence items */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Cheapest seller */}
        {cheapestSeller && (
          <EvidenceCard
            icon={<TagIcon size={16} />}
            label="Cheapest right now"
            value={fmt(cheapestSeller.price)}
            sub={cheapestSeller.name}
            link={cheapestSeller.link !== '#' ? cheapestSeller.link : undefined}
            color="#22c55e"
          />
        )}

        {/* Historical signal */}
        {historicalSignals.length > 0 ? (
          <EvidenceCard
            icon={<CalendarIcon size={16} />}
            label="Historical mention found"
            value={fmt(historicalSignals[0].mentionedPrice)}
            sub={`${historicalSignals[0].source}${historicalSignals[0].date ? ` · ${historicalSignals[0].date}` : ''}`}
            link={historicalSignals[0].url !== '#' ? historicalSignals[0].url : undefined}
            color="#f59e0b"
          />
        ) : (
          <EvidenceCard
            icon={<SearchIcon size={16} />}
            label="Historical data"
            value="None found"
            sub="No independent price mentions discovered"
            color="#52526a"
          />
        )}
      </div>

      {/* Cache note */}
      {fromCache && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#71717a',
          }}
        >
          <DatabaseIcon size={14} className="text-amber-500 flex-shrink-0" />
          <span>Recently saved search — evidence is cached for up to 10 minutes. Refresh prices to check again.</span>
        </div>
      )}
    </motion.div>
  );
}

interface EvidenceCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  link?: string;
  color: string;
}

function EvidenceCard({ icon, label, value, sub, link, color }: EvidenceCardProps) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: '#9090b0' }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: '#9090b0' }}>
          {label}
        </span>
      </div>
      <div className="text-xl font-bold mb-0.5" style={{ color }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: '#52526a' }}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: '#f59e0b' }}>
            {sub} →
          </a>
        ) : (
          sub
        )}
      </div>
    </div>
  );
}
