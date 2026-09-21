import { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { motion } from 'framer-motion';

const TEST_RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const DEMO_ROLES = {
  '79123456': 'Super Admin',
  '901234567': 'Distribuidor',
  '1122334455': 'Rector',
  '1001001000': 'Estudiante',
};

export default function LoginScreen({ onLogin }) {
  const [documentId, setDocumentId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaValue, setCaptchaValue] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    if (!captchaValue) {
      setError('Por favor, confirme que no es un robot');
      return;
    }

    if (!password.trim() || !DEMO_ROLES[documentId.trim()]) {
      setError('Credenciales inválidas');
      return;
    }

    onLogin({ documentId: documentId.trim(), role: DEMO_ROLES[documentId.trim()] });
  };

  return (
    <main className="login-screen flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-4 py-8 text-white sm:px-6">
      <motion.section
        className="login-screen__card w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-9"
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        aria-labelledby="login-title"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex w-full items-center justify-center">
            <img className="h-auto w-full object-contain" src={`${import.meta.env.BASE_URL}logos/MTT_Completo.png`} alt="My Talente Test" />
          </div>
          <h1 id="login-title" className="text-3xl font-bold text-white">Portal de acceso</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">Ingresa para continuar con tu experiencia vocacional.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="document-id">Documento de Identidad</label>
            <input
              id="document-id"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              value={documentId}
              onChange={(event) => {
                setDocumentId(event.target.value);
                setError('');
              }}
              className={`w-full rounded-xl border bg-slate-950/30 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-300/60 ${error === 'Credenciales inválidas' && !DEMO_ROLES[documentId.trim()] ? 'border-red-400/90 ring-2 ring-red-400/20' : 'border-white/20 focus:border-cyan-300'}`}
              placeholder="Escribe tu documento"
              aria-invalid={error === 'Credenciales inválidas'}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="password">Contraseña</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                className="w-full rounded-xl border border-white/20 bg-slate-950/30 py-3 pl-11 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/60"
                placeholder="Escribe tu contraseña"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-center overflow-hidden rounded-lg bg-white/5 py-3">
            <ReCAPTCHA
              sitekey={TEST_RECAPTCHA_SITE_KEY}
              theme="dark"
              onChange={setCaptchaValue}
              onExpired={() => setCaptchaValue(null)}
              onErrored={() => setCaptchaValue(null)}
            />
          </div>

          {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">{error}</p>}

          <button type="submit" className="w-full rounded-xl bg-cyan-400 px-5 py-3.5 font-bold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900">
            Ingresar al portal
          </button>
        </form>
      </motion.section>
    </main>
  );
}
