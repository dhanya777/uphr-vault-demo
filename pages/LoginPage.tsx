
import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase.ts';
import { Spinner } from '../components/icons.tsx';

const LoginPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isLoginView) { // Sign Up Logic
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setIsLoading(false);
        return;
      }
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName: displayName });
        }
        // Auth state change will handle redirect
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err.code));
        setIsLoading(false);
      }
    } else { // Sign In Logic
      try {
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state change will handle redirect
      } catch (err: any) {
        setError(getFriendlyErrorMessage(err.code));
        setIsLoading(false);
      }
    }
  };

  const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-3 mb-4">
            <svg className="h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-800">UPHR-Vault</h1>
          </div>
          <p className="text-gray-600">{isLoginView ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>
        
        <form onSubmit={handleAuthAction} className="space-y-4">
          {!isLoginView && (
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">Name</label>
              <input id="name" name="name" type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500" />
          </div>
          <div>
            <label htmlFor="password"  className="text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500" />
          </div>
          {!isLoginView && (
            <div>
              <label htmlFor="confirm-password"  className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input id="confirm-password" name="confirm-password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500" />
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300">
              {isLoading ? <Spinner className="h-5 w-5" /> : (isLoginView ? 'Sign In' : 'Create Account')}
            </button>
          </div>
        </form>
        
        <p className="text-center text-sm text-gray-500">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => { setIsLoginView(!isLoginView); setError(null); }} className="font-medium text-green-600 hover:text-green-500 ml-1">
            {isLoginView ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
