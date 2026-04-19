import { Outlet, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import MusicPlayer from './MusicPlayer';
import Footer from './Footer';
import DesktopTitleBar from './DesktopTitleBar';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
    const location = useLocation();
    const isRubiksCubePage = location.pathname === '/rubiks-cube';
    const isElectron = window.electronAPI !== undefined;

    return (
        <div className={`min-h-screen flex flex-col ${isElectron ? 'pt-8' : 'pt-20'}`}>
            <DesktopTitleBar />
            <Navigation />

            <main className="flex-grow">
                <Outlet />
            </main>

            {!isRubiksCubePage && <Footer />}
            <MusicPlayer />

            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'var(--foreground)',
                        color: 'var(--background)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        fontWeight: '600'
                    },
                }}
            />
        </div>
    );
};

export default Layout;
