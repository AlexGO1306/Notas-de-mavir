import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, handleFirestoreError, OperationType } from '../firebase';
import { BookOpen } from 'lucide-react';

export function AuthScreen() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      alert('Error al iniciar sesión. Revisa la consola para más detalles.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-[#144C8A] p-4 rounded-full">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Bienvenido</h1>
        <p className="text-slate-600 mb-8">Inicia sesión para gestionar tus niveles, estudiantes y su progreso de forma segura.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
