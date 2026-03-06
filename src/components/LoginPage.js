import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const LoginPage = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');

  const ALLOWED_EMAILS = [
    'gijs.vandromme@meteor.be',
    'gijsvd_1993@hotmail.com'
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (data?.session) {
        // Check if email is whitelisted
        if (!ALLOWED_EMAILS.includes(data.session.user.email)) {
          await supabase.auth.signOut();
          setError('Je bent niet geautoriseerd om in te loggen.');
          return;
        }

        localStorage.setItem('shopify-dashboard-logged-in', 'true');
        setIsLoggedIn(true);
      }
    } catch (err) {
      setError(err.message || 'Ongeldige email of wachtwoord');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (error) throw error;

      if (data?.session) {
        localStorage.setItem('shopify-dashboard-logged-in', 'true');
        setIsLoggedIn(true);
      } else {
        setError('Account aangemaakt! Check je email voor verificatie.');
      }
    } catch (err) {
      setError(err.message || 'Er ging iets mis bij het aanmaken van je account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Google login mislukt');
      setIsLoading(false);
    }
  };


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

        {/* Login/SignUp Form */}
        <div className="gradient-card rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-white text-xl font-semibold mb-2">
              {isSignUp ? 'Account aanmaken' : 'Welkom terug'}
            </h2>
            <p className="text-white/70 text-sm">
              {isSignUp ? 'Maak een account aan om aan de slag te gaan' : 'Log in om toegang te krijgen tot het dashboard'}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            {/* Full Name Field (alleen bij sign up) */}
            {isSignUp && (
              <div>
                <label className="block text-white/70 text-sm mb-2">Volledige naam</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder="Voer je volledige naam in"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Voer je email in"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Wachtwoord</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="Voer je wachtwoord in"
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
                  <span>{isSignUp ? 'Account aanmaken...' : 'Inloggen...'}</span>
                </>
              ) : (
                <span>{isSignUp ? 'Account aanmaken' : 'Inloggen'}</span>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-dark text-white/70">Of</span>
              </div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg flex items-center justify-center space-x-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Inloggen met Google</span>
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

export default LoginPage;
