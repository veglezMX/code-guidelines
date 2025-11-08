/**
 * Integration Test Example: App with Providers
 * 
 * Demonstrates testing with full provider stack:
 * - React Query
 * - React Router
 * - Auth Context
 * - MSW for API mocking
 */

import { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';

// ============================================================================
// MSW SERVER SETUP
// ============================================================================

const server = setupServer(
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
    });
  }),
  
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    
    if (email === 'user@example.com' && password === 'password123') {
      return HttpResponse.json({
        token: 'mock-token-123',
        user: {
          id: '1',
          name: 'John Doe',
          email: 'user@example.com',
        },
      });
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),
  
  http.get('/api/projects', () => {
    return HttpResponse.json([
      { id: '1', name: 'Project Alpha', status: 'active' },
      { id: '2', name: 'Project Beta', status: 'completed' },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ============================================================================
// PROVIDERS SETUP
// ============================================================================

interface AuthContextValue {
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(null);
  
  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
    } else {
      throw new Error('Login failed');
    }
  };
  
  const logout = () => setUser(null);
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function AllProvidersWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration: Login Flow', () => {
  it('should login and redirect to dashboard', async () => {
    const user = userEvent.setup();
    
    render(
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>,
      { wrapper: AllProvidersWrapper }
    );
    
    // Fill login form
    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    
    // Verify redirect and user data
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
    
    expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
  });

  it('should display error on invalid credentials', async () => {
    const user = userEvent.setup();
    
    render(<LoginPage />, { wrapper: AllProvidersWrapper });
    
    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));
    
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});

describe('Integration: Dashboard with Data Fetching', () => {
  it('should fetch and display projects', async () => {
    render(<Dashboard />, { wrapper: AllProvidersWrapper });
    
    // Should show loading state
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    
    // Should display projects after loading
    expect(await screen.findByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      http.get('/api/projects', () => {
        return HttpResponse.json(
          { message: 'Server error' },
          { status: 500 }
        );
      })
    );
    
    render(<Dashboard />, { wrapper: AllProvidersWrapper });
    
    expect(await screen.findByText('Failed to load projects')).toBeInTheDocument();
  });
});

// ============================================================================
// COMPONENTS (Example implementations)
// ============================================================================

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext)!;
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <input
        type="email"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign In</button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
}

function Dashboard() {
  const { user } = useContext(AuthContext)!;
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });
  
  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div>Failed to load projects</div>;
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      <ul>
        {projects?.map((project) => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// KEY PATTERNS
// ============================================================================
// 1. Create test provider wrapper with all necessary context
// 2. Use MSW to mock API calls realistically
// 3. Test full user flows (login → redirect → data fetch)
// 4. Test loading and error states
// 5. Reset handlers after each test
// 6. Use realistic test data

