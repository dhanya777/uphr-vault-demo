
import React from 'react';
import { User } from '../types.ts';
import { LogoutIcon } from './icons.tsx';

type Tab = 'Dashboard' | 'AI Assistant' | 'Health Journey' | 'Insurance Co-Pilot' | 'Upload Document';
type Language = 'English' | 'Hindi' | 'Telugu' | 'Tamil' | 'Kannada';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onShare: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  language: Language;
  setLanguage: (language: Language) => void;
}

const navTabs: Tab[] = ['Dashboard', 'AI Assistant', 'Health Journey', 'Insurance Co-Pilot', 'Upload Document'];

const Header: React.FC<HeaderProps> = ({ user, onLogout, onShare, activeTab, setActiveTab, language, setLanguage }) => {
  if (!user) return null;

  return (
    <header className="bg-green-700 text-white shadow-lg sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-2xl font-bold">UPHR-Vault</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
                <select id="lang-select" value={language} onChange={e => setLanguage(e.target.value as Language)} className="bg-black bg-opacity-20 border-transparent rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Telugu</option>
                    <option>Tamil</option>
                    <option>Kannada</option>
                </select>
            </div>
            <span className="px-3 py-1.5 bg-black bg-opacity-20 rounded-md text-sm font-medium hidden sm:block">{user.email}</span>
          </div>
        </div>
      </div>
      <div className="bg-green-600">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
          <div className="flex space-x-1 overflow-x-auto">
            {navTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 font-medium text-sm rounded-t-lg transition-colors focus:outline-none flex-shrink-0 ${
                  activeTab === tab
                    ? 'bg-green-50 text-green-800'
                    : 'text-white hover:bg-green-700'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={onShare}
              className="px-3 py-2 font-medium text-sm text-white hover:bg-green-700 rounded-t-lg transition-colors focus:outline-none flex-shrink-0"
            >
              Share with Doctor
            </button>
          </div>
          <div className="hidden sm:block">
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 font-semibold text-sm bg-yellow-400 text-yellow-900 hover:bg-yellow-500 rounded-md transition-colors focus:outline-none"
            >
              <LogoutIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
