
// Compatibility layer for components still using useAuth
import { useMultiAuth } from './MultiAuthContext';

export const useAuth = useMultiAuth;
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // This is just a pass-through since MultiAuthProvider is already wrapping the app
  return <>{children}</>;
};
