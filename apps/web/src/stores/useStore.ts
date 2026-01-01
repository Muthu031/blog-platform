import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
interface UserState {
  name: string;
  setName: (name: string) => void;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

type StoreState = UserState & AuthState;

// Slices
const createUserSlice = (set: any): UserState => ({
  name: 'Muthu',
  setName: (name: string) => set({ name }),
});

const createAuthSlice = (set: any): AuthState => ({
  isAuthenticated: false,
  token: null,
  login: (token: string) => {
    set({ isAuthenticated: true, token });
  },
  logout: () => {
    set({ isAuthenticated: false, token: null });
  },
});

// Combined store with persistence for auth
const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...createUserSlice(set),
      ...createAuthSlice(set),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useStore;
