import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Shield, Bell, Moon, Sun, Save, Loader2, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        bio: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                bio: user.bio || '',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put('/users/profile', formData);
            if (response.data.success) {
                updateUser(response.data.data.user);
                toast.success('Settings updated successfully');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            toast.error(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
            <div className="space-y-12">
                {/* Header */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
                    <p className="text-gray-500 text-lg">Manage your account preferences and profile information.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* Profile Section */}
                    <section className="space-y-6">
                        <div className="flex items-center space-x-2 pb-2 border-b border-border">
                            <User size={20} className="text-foreground" />
                            <h2 className="text-sm font-bold uppercase tracking-widest">Public Profile</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">This information will be displayed publicly to other users and curators.</p>
                                <div className="relative w-32 h-32 group">
                                    <div className="w-full h-full rounded-2xl bg-muted overflow-hidden flex items-center justify-center border-2 border-dashed border-border text-foreground">
                                        {user?.avatar ? (
                                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={40} className="text-gray-400" />
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl"
                                    >
                                        <Camera className="text-white" size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Display Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-muted border-none rounded-xl focus:ring-2 focus:ring-foreground transition-all text-foreground"
                                            placeholder="Your name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Bio</label>
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full px-4 py-3 bg-muted border-none rounded-xl focus:ring-2 focus:ring-foreground transition-all resize-none text-foreground"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Account Section */}
                    <section className="space-y-6">
                        <div className="flex items-center space-x-2 pb-2 border-b border-border">
                            <Shield size={20} className="text-foreground" />
                            <h2 className="text-sm font-bold uppercase tracking-widest">Account Security</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">Update your account credentials and security settings.</p>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Email Address</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-gray-500 cursor-not-allowed"
                                        />
                                        <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20">VERIFIED</div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="text-sm font-medium border-b border-foreground pb-0.5 hover:text-gray-400 hover:border-gray-400 transition-colors"
                                >
                                    Change password
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Preferences */}
                    <section className="space-y-6">
                        <div className="flex items-center space-x-2 pb-2 border-b border-gray-100 dark:border-white/10">
                            <Bell size={20} className="text-foreground" />
                            <h2 className="text-sm font-bold uppercase tracking-widest">Preferences</h2>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                                    {darkMode ? <Sun size={18} className="text-foreground" /> : <Moon size={18} className="text-foreground" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Dark Mode</p>
                                    <p className="text-xs text-gray-400">Adjust the interface to your preference.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${darkMode ? 'bg-brand' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${darkMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </section>

                    {/* Save Button */}
                    <div className="pt-6 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 bg-foreground text-background px-8 py-4 rounded-2xl font-bold hover:opacity-80 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Save size={20} />
                            )}
                            <span>SAVE CHANGES</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
