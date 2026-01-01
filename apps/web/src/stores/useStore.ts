import create from 'zustand'

type State = {
  name: string
  setName: (n: string) => void
  isAuthenticated: boolean
  token: string | null
  login: (token: string) => void
  logout: () => void
}

const useStore = create<State>((set) => ({
  name: 'Muthu',
  setName: (n) => set({ name: n }),
  isAuthenticated: !!localStorage.getItem('token'),
  token: localStorage.getItem('token'),
  login: (token) => {
    localStorage.setItem('token', token);
    set({ isAuthenticated: true, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ isAuthenticated: false, token: null });
  },
}))

export default useStore
