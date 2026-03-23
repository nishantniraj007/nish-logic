const { useState, useEffect } = React;

const Auth = ({ onAuthSuccess }) => {
  const { auth, googleProvider, fbSignInWithPopup, fbOnAuthStateChanged, fbSignOut } = window.Firebase;
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState('');
  const [isGated, setIsGated] = useState(false);
  const [error, setError] = useState('');

  const ALLOWED_EMAIL = "nishantneeraj007@gmail.com";
  const ADMIN_PASSWORD = "nishlogic2024";

  useEffect(() => {
    const unsubscribe = fbOnAuthStateChanged((u) => {
      if (u && u.email === ALLOWED_EMAIL) {
        setUser(u);
      } else {
        setUser(null);
        setIsGated(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await fbSignInWithPopup(googleProvider);
      if (result.user.email !== ALLOWED_EMAIL) {
        await fbSignOut();
        setError('Unauthorized email address.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsGated(true);
      onAuthSuccess();
    } else {
      setError('Incorrect admin password.');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f1a] text-white p-4">
        <div className="bg-[#1a1a2e] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/5">
          <h1 className="text-3xl font-bold mb-6 text-center text-[#7c6af7]">Nish-Logic Admin</h1>
          <p className="text-[#888] mb-8 text-center">Sign in with your authorized Google account to continue.</p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            Sign in with Google
          </button>
          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
        </div>
      </div>
    );
  }

  if (!isGated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f1a] text-white p-4">
        <div className="bg-[#1a1a2e] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/5">
          <h1 className="text-2xl font-bold mb-6 text-center">Password Gate</h1>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Admin Password"
              className="w-full bg-[#0f0f1a] border border-white/10 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-[#7c6af7]"
            />
            <button
              type="submit"
              className="w-full bg-[#7c6af7] text-white font-bold py-3 px-4 rounded-xl hover:bg-opacity-90 transition-all"
            >
              Unlock Panel
            </button>
          </form>
          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
          <button onClick={() => fbSignOut()} className="mt-6 w-full text-[#888] hover:text-white text-sm transition-all">Sign Out</button>
        </div>
      </div>
    );
  }

  return null;
};

window.Auth = Auth;
