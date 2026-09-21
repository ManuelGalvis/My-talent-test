import { motion } from 'framer-motion';
import { supabase } from '../supabase';

const STORAGE_KEY = 'my-talent-test-chaside-progress';

export default function TestSuccessScreen() {
  const returnToStart = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <main className="test-success min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-4 py-8 text-white sm:px-6">
      <motion.section
        className="test-success__panel mx-auto flex min-h-[min(680px,calc(100vh-4rem))] w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        aria-labelledby="test-success-title"
      >
        <motion.div
          className="test-success__icon mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-400/15 text-cyan-300 shadow-[0_0_40px_rgba(34,211,238,0.35)]"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.45, type: 'spring', stiffness: 180 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 52 52" className="h-14 w-14 fill-none" role="img">
            <motion.circle
              cx="26"
              cy="26"
              r="23"
              stroke="currentColor"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.55 }}
            />
            <motion.path
              d="M15 27l7 7 15-16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.7, duration: 0.45, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
        >
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">My Talente Test</p>
          <h1 id="test-success-title" className="mb-6 text-3xl font-bold text-white sm:text-4xl">¡Test completado con éxito!</h1>
          <p className="mx-auto max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
            Sus respuestas han sido procesadas y guardadas de forma segura. El informe detallado de su perfil vocacional estará disponible tan pronto como su institución o distribuidor autorice la visualización.
          </p>
        </motion.div>

        <motion.button
          type="button"
          className="mt-10 rounded-xl bg-cyan-400 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.3)] transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          onClick={returnToStart}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          Volver al inicio
        </motion.button>
      </motion.section>
    </main>
  );
}
