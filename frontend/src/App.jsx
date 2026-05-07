import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import UploadSong from './pages/admin/UploadSong';
import VinylPlayerPage from './pages/VinylPlayerPage';
import Settings from './pages/Settings';
import PlaylistPage from './pages/PlaylistPage';
import PlaylistDirectory from './pages/PlaylistDirectory';
import CuratorProfile from './pages/CuratorProfile';
import Profile from './pages/Profile';
import LikedSongs from './pages/LikedSongs';
import History from './pages/History';
import RubiksCubePage from './pages/RubiksCubePage';
import { useAuth } from './context/AuthContext';
import { useSync } from './context/SyncContext';

const SyncLinkHandler = () => {
  const { id } = useParams();
  const { joinRoom } = useSync();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      joinRoom(id);
      navigate('/', { replace: true });
    }
  }, [id, joinRoom, navigate]);

  return null;
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="artists" element={<Browse />} />
        <Route path="playlists" element={<PlaylistDirectory />} />

        <Route path="login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="register" element={!user ? <Register /> : <Navigate to="/" />} />

        {/* Protected Admin Routes */}
        <Route
          path="admin/dashboard"
          element={user?.role === 'admin' ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="admin/upload"
          element={user?.role === 'admin' ? <UploadSong /> : <Navigate to="/" />}
        />
        <Route path="player" element={<VinylPlayerPage />} />
        <Route path="rubiks-cube" element={<RubiksCubePage />} />
        <Route path="liked" element={user ? <LikedSongs /> : <Navigate to="/login" />} />
        <Route path="history" element={user ? <History /> : <Navigate to="/login" />} />
        <Route path="curator/:id" element={<CuratorProfile />} />

        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route path="sync/:id" element={<SyncLinkHandler />} />
        <Route path="sync" element={<Navigate to="/" replace />} />
        <Route path="profile" element={user ? <Profile /> : <Navigate to="/login" />} />
        <Route path="settings" element={user ? <Settings /> : <Navigate to="/login" />} />
      </Route>
    </Routes>
  );
};

export default App;
