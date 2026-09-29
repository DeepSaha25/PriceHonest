import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';

const Landing = lazy(() => import('./pages/Landing'));
const AppFlow = lazy(() => import('./pages/AppFlow'));

export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
      <Suspense fallback={<div className="min-h-screen grid place-items-center bg-[#09090b] text-zinc-300"><span role="status">Opening PriceHonest…</span></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppFlow />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </MotionConfig>
    </BrowserRouter>
  );
}
