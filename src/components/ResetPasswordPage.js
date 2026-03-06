import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Eye, EyeOff, Lock } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user came from reset password email
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type !== 'recovery') {
      setError('Ongeldige reset link. Vraag een nieuwe aan.');
    }
  }, []);

  const validatePassword = (pwd) => {
    if (pwd.length < 10) {
      return 'Wachtwoord moet minimaal 10 tekens zijn';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Wachtwoord moet minimaal 1 hoofdletter bevatten';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Wachtwoord moet minimaal 1 cijfer bevatten';
    }
    return null;
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate password strength
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError(err.message || 'Er ging iets mis bij het resetten van je wachtwoord');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6">
        <div className="gradient-card rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-white text-2xl font-semibold mb-2">Wachtwoord gereset!</h2>
          <p className="text-white/70">Je wordt doorgestuurd naar de login pagina...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/Logo_meteor_def.svg"
              alt="METEOR logo"
              className="h-48 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Reset Password Form */}
        <div className="gradient-card rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-white text-xl font-semibold mb-2">
              Nieuw wachtwoord instellen
            </h2>
            <p className="text-white/70 text-sm">
              Kies een sterk wachtwoord voor je account
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Password Requirements Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-xs font-semibold mb-2">Wachtwoord vereisten:</p>
              <ul className="text-blue-300/80 text-xs space-y-1">
                <li>• Minimaal 10 tekens</li>
                <li>• Minimaal 1 hoofdletter</li>
                <li>• Minimaal 1 cijfer</li>
              </ul>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Nieuw wachtwoord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Voer nieuw wachtwoord in"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Bevestig wachtwoord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Herhaal nieuw wachtwoord"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 rounded-lg text-white font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Wachtwoord resetten...</span>
                </>
              ) : (
                <span>Wachtwoord resetten</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/50 text-xs">© 2026 Boldnotbasic</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
