import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, Heart, Radio, MessageCircle, Box } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import SyncOverlay from '../sync/SyncOverlay';
import LiveChat from '../sync/LiveChat';
import SearchOverlay from './SearchOverlay';

const Navigation = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [syncOpen, setSyncOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { user, logout } = useAuth();
    const { roomCode } = useSync();
    const location = useLocation();

    const menuItems = [
        { label: 'Artists', path: '/artists' },
        { label: 'Playlists', path: '/playlists' },
        { label: 'Liked', path: '/liked' },
    ];


    const isActive = (path) => location.pathname === path;

    const isElectron = window.electronAPI !== undefined;

    return (
        <>
            <nav className={`fixed ${isElectron ? 'top-8' : 'top-0'} left-0 w-full z-40 
                        bg-background/80 backdrop-blur-md 
                        border-b border-border transition-all duration-300`}>


                <div className="px-6 py-4 flex justify-between items-center max-w-[1920px] mx-auto">
                    {/* Logo & Menu */}
                    <div className="flex items-center space-x-12">
                        <Link to="/" className="text-xl font-bold tracking-tighter uppercase font-sans">
                            AURA.
                        </Link>



                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-8 
                          text-[11px] uppercase tracking-[0.2em] 
                          font-medium">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`hover:text-foreground transition-colors flex items-center ${isActive(item.path)
                                        ? 'text-foreground'
                                        : 'text-gray-400'
                                        }`}
                                >
                                    {item.label === 'Liked' && (
                                        <Heart
                                            size={12}
                                            className={`mr-2 ${isActive(item.path) ? 'fill-foreground' : ''}`}
                                        />
                                    )}
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-4 md:space-x-8">
                        {/* Always Visible Actions: Search & Sync */}
                        <div className="flex items-center space-x-4 md:space-x-8 text-[11px] uppercase tracking-[0.2em] font-medium">
                            <Link
                                to="/rubiks-cube"
                                className={`hover:text-foreground transition-colors flex items-center space-x-2 border border-white rounded px-2 py-1 ${isActive('/rubiks-cube') ? 'text-foreground bg-white/10' : 'text-gray-400'}`}
                            >
                                <Box className="w-5 h-5 md:w-3.5 md:h-3.5" />
                                <span className="hidden md:inline">CUBE</span>
                            </Link>

                            <button
                                onClick={() => setSearchOpen(true)}
                                className="hover:text-foreground text-gray-400 transition-colors flex items-center space-x-2"
                            >
                                <Search className="w-5 h-5 md:w-3.5 md:h-3.5" />
                                <span className="hidden md:inline">SEARCH</span>
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setSyncOpen(!syncOpen)}
                                    className={`flex items-center space-x-2 transition-colors ${syncOpen || roomCode ? 'text-foreground' : 'text-gray-400 hover:text-foreground'}`}
                                >
                                    <div className="relative">
                                        <Radio className={`w-5 h-5 md:w-3.5 md:h-3.5 ${roomCode ? "animate-pulse" : ""}`} />
                                        {roomCode && (
                                            <div className="md:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        )}
                                    </div>
                                    <span className="hidden md:inline">SYNC</span>
                                    {roomCode && (
                                        <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    )}
                                </button>

                                <AnimatePresence>
                                    {syncOpen && (
                                        <SyncOverlay
                                            isOpen={syncOpen}
                                            onClose={() => setSyncOpen(false)}
                                            onToggleChat={() => {
                                                setChatOpen(!chatOpen);
                                                setSyncOpen(false);
                                            }}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Desktop User/Auth Actions */}
                        <div className="hidden md:flex items-center space-x-8 text-[11px] uppercase tracking-[0.2em] font-medium">
                            {user ? (
                                <div className="flex items-center space-x-8">
                                    {user.role === 'admin' && (
                                        <Link to="/admin/dashboard" className={`hover:text-foreground transition-colors ${isActive('/admin/dashboard') ? 'text-foreground font-bold' : 'text-gray-400'}`}>
                                            ADMIN
                                        </Link>
                                    )}
                                    <Link to="/settings" className={`hover:text-foreground transition-colors ${isActive('/settings') ? 'text-foreground font-bold' : 'text-gray-400'}`}>
                                        SETTINGS
                                    </Link>

                                    <Link to="/profile">
                                        <div className="w-8 h-8 rounded-full bg-[#0d0d0d] border border-white/10 flex items-center justify-center text-white text-[10px] font-serif overflow-hidden">
                                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                        </div>
                                    </Link>
                                </div>
                            ) : (
                                <Link to="/login" className="hover:text-foreground text-gray-400 transition-colors">
                                    LOGIN
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-background border-t border-border 
                        px-6 py-8 space-y-6 absolute w-full left-0 animate-in fade-in slide-in-from-top-4">
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block text-2xl font-serif ${isActive(item.path) ? 'text-foreground' : 'text-gray-400'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="pt-6 border-t border-gray-100 flex flex-col space-y-4">
                            {user ? (
                                <>
                                    <Link
                                        to="/settings"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-lg font-sans tracking-widest uppercase"
                                    >
                                        Settings
                                    </Link>

                                    <button
                                        onClick={() => {
                                            logout();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="text-lg font-sans tracking-widest uppercase text-red-600 text-left"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-lg font-sans tracking-widest uppercase">
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                )
                }
            </nav >
            <LiveChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
            <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
};

export default Navigation;
