# Test Data Factories — Testing

**Goal:** @faker-js/faker, fishery/factory.ts patterns, deterministic seeds, and "arrange once, assert many" for consistent test data.

---

## Why Test Data Factories?

**Benefits:**
- **Consistency**: Same structure across tests
- **Maintainability**: Update in one place
- **Readability**: Clear intent with named factories
- **Flexibility**: Override defaults easily
- **Determinism**: Reproducible test data

**Problems they solve:**
- Hardcoded test data duplication
- Brittle tests when data structure changes
- Unclear test data relationships
- Non-deterministic test failures

---

## Setup

### Install Dependencies
```bash
pnpm add -D @faker-js/faker fishery
```

### Basic Factory Pattern
```ts
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export const createUser = (overrides?: Partial<User>): User => {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'user',
    createdAt: faker.date.past(),
    ...overrides,
  };
};
```

### Usage
```ts
import { createUser } from './factories/user.factory';

describe('UserProfile', () => {
  it('should display user name', () => {
    const user = createUser({ name: 'John Doe' });
    
    render(<UserProfile user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show admin badge for admin users', () => {
    const admin = createUser({ role: 'admin' });
    
    render(<UserProfile user={admin} />);
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
```

---

## Advanced Factories with Fishery

### Define Factory
```ts
// tests/factories/user.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import type { User } from '@/types';

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: `user-${sequence}`,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'user',
  verified: false,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
}));

// Create variants
export const adminFactory = userFactory.params({ role: 'admin' });
export const verifiedUserFactory = userFactory.params({ verified: true });
```

### Build Single Object
```ts
const user = userFactory.build();
const admin = adminFactory.build();
const customUser = userFactory.build({ name: 'John Doe' });
```

### Build Multiple Objects
```ts
const users = userFactory.buildList(10);
const admins = adminFactory.buildList(3);
```

### Build with Associations
```ts
// tests/factories/project.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { userFactory } from './user.factory';
import type { Project } from '@/types';

export const projectFactory = Factory.define<Project>(({ associations }) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  description: faker.lorem.paragraph(),
  owner: associations.owner || userFactory.build(),
  members: associations.members || userFactory.buildList(3),
  createdAt: faker.date.past(),
}));

// Usage
const owner = userFactory.build({ name: 'John Doe' });
const project = projectFactory.build({
  associations: {
    owner,
    members: userFactory.buildList(5),
  },
});
```

---

## Deterministic Seeds

### Set Global Seed
```ts
// vitest.setup.ts
import { faker } from '@faker-js/faker';

beforeEach(() => {
  // Reset to deterministic seed before each test
  faker.seed(123);
});
```

### Per-Test Seed
```ts
import { faker } from '@faker-js/faker';

it('should be deterministic', () => {
  faker.seed(456);
  
  const user1 = createUser();
  const user2 = createUser();
  
  // Always generates same data with same seed
  expect(user1.id).toBe('expected-uuid');
});
```

### Environment-Based Seed
```ts
// vitest.setup.ts
const seed = process.env.CI ? 123 : Date.now();
faker.seed(seed);

console.log(`Faker seed: ${seed}`);
```

---

## Deterministic IDs

### Sequential IDs
```ts
export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: `user-${sequence}`,
  name: faker.person.fullName(),
  email: `user${sequence}@example.com`,
}));

// Generates: user-1, user-2, user-3, etc.
```

### UUID with Deterministic Seed
```ts
import { faker } from '@faker-js/faker';

export const createUser = (): User => {
  faker.seed(123); // Deterministic
  
  return {
    id: faker.string.uuid(), // Always same UUID
    name: faker.person.fullName(),
  };
};
```

### Custom ID Generator
```ts
let idCounter = 0;

export const resetIds = () => {
  idCounter = 0;
};

export const generateId = () => {
  return `test-id-${++idCounter}`;
};

beforeEach(() => {
  resetIds();
});
```

---

## Factories for Different Domains

### API Response Factory
```ts
// tests/factories/api-response.factory.ts
import { faker } from '@faker-js/faker';

export interface ApiResponse<T> {
  data: T;
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}

export const createApiResponse = <T>(
  data: T,
  overrides?: Partial<ApiResponse<T>['meta']>
): ApiResponse<T> => ({
  data,
  meta: {
    page: 1,
    perPage: 10,
    total: faker.number.int({ min: 10, max: 100 }),
    ...overrides,
  },
});

// Usage
const response = createApiResponse(userFactory.buildList(10), {
  total: 50,
  page: 2,
});
```

### Form Data Factory
```ts
// tests/factories/form-data.factory.ts
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const createLoginFormData = (
  overrides?: Partial<LoginFormData>
): LoginFormData => ({
  email: faker.internet.email(),
  password: faker.internet.password(),
  rememberMe: false,
  ...overrides,
});

// Variants
export const createValidLoginData = () =>
  createLoginFormData({
    email: 'valid@example.com',
    password: 'ValidPass123!',
  });

export const createInvalidLoginData = () =>
  createLoginFormData({
    email: 'invalid-email',
    password: '123',
  });
```

### Mock Error Factory
```ts
// tests/factories/error.factory.ts
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export const createApiError = (overrides?: Partial<ApiError>): ApiError => ({
  code: 'GENERIC_ERROR',
  message: 'An error occurred',
  ...overrides,
});

// Specific error factories
export const createValidationError = (field: string, message: string) =>
  createApiError({
    code: 'VALIDATION_ERROR',
    message,
    field,
  });

export const createAuthError = () =>
  createApiError({
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  });

export const createNotFoundError = () =>
  createApiError({
    code: 'NOT_FOUND',
    message: 'Resource not found',
  });
```

---

## "Arrange Once, Assert Many" Pattern

### Shared Test Data
```ts
describe('UserProfile', () => {
  // Arrange: Create shared test data
  const testUser = userFactory.build({
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
  });

  // Assert many: Multiple tests use same data
  it('should display user name', () => {
    render(<UserProfile user={testUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should display user email', () => {
    render(<UserProfile user={testUser} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should show admin badge', () => {
    render(<UserProfile user={testUser} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
```

### Fixture Files
```ts
// tests/fixtures/users.ts
import { userFactory } from '../factories/user.factory';

export const fixtures = {
  johnDoe: userFactory.build({
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
  }),
  
  janeAdmin: userFactory.build({
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin',
  }),
  
  guestUser: userFactory.build({
    id: 'user-3',
    name: 'Guest',
    email: 'guest@example.com',
    verified: false,
  }),
};

// Usage
import { fixtures } from './fixtures/users';

it('should display John Doe', () => {
  render(<UserProfile user={fixtures.johnDoe} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

---

## MSW Handler Factories

### Generate Mock Handlers
```ts
// tests/factories/handlers.factory.ts
import { http, HttpResponse } from 'msw';
import { userFactory } from './user.factory';

export const createUserHandlers = (users?: User[]) => {
  const mockUsers = users || userFactory.buildList(10);
  
  return [
    http.get('/api/users', () => {
      return HttpResponse.json(mockUsers);
    }),
    
    http.get('/api/users/:id', ({ params }) => {
      const user = mockUsers.find(u => u.id === params.id);
      
      if (!user) {
        return HttpResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return HttpResponse.json(user);
    }),
    
    http.post('/api/users', async ({ request }) => {
      const body = await request.json();
      const newUser = userFactory.build(body);
      mockUsers.push(newUser);
      
      return HttpResponse.json(newUser, { status: 201 });
    }),
  ];
};

// Usage
import { server } from '@/mocks/server';
import { createUserHandlers } from './factories/handlers.factory';

it('should fetch users', async () => {
  const testUsers = userFactory.buildList(3);
  server.use(...createUserHandlers(testUsers));
  
  render(<UserList />);
  
  expect(await screen.findByText(testUsers[0].name)).toBeInTheDocument();
});
```

---

## Best Practices

### ✅ Use Realistic Data
```ts
// ✅ Good: Realistic data
const user = userFactory.build({
  email: 'john.doe@example.com',
  createdAt: new Date('2025-01-15'),
});

// ❌ Bad: Unrealistic data
const user = { id: '1', name: 'test', email: 'a@b.c' };
```

### ✅ Override Only What Matters
```ts
// ✅ Good: Override specific fields
const admin = userFactory.build({ role: 'admin' });

// ❌ Bad: Providing all fields
const admin = userFactory.build({
  id: 'user-1',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  verified: true,
  createdAt: new Date(),
});
```

### ✅ Use Variants for Common Cases
```ts
// ✅ Good: Named variants
export const adminFactory = userFactory.params({ role: 'admin' });
export const verifiedUserFactory = userFactory.params({ verified: true });

const admin = adminFactory.build();
const verified = verifiedUserFactory.build();
```

### ✅ Reset State Between Tests
```ts
beforeEach(() => {
  faker.seed(123); // Deterministic
  resetIds(); // Reset ID counter
});
```

---

## Anti-Patterns

### ❌ Hardcoded Test Data
```ts
// ❌ Bad: Hardcoded everywhere
it('test 1', () => {
  const user = { id: '1', name: 'John', email: 'john@example.com' };
});

it('test 2', () => {
  const user = { id: '1', name: 'John', email: 'john@example.com' };
});

// ✅ Good: Use factory
it('test 1', () => {
  const user = userFactory.build({ name: 'John' });
});
```

### ❌ Non-Deterministic Factories
```ts
// ❌ Bad: Using Date.now() or Math.random()
const createUser = () => ({
  id: Math.random().toString(),
  createdAt: Date.now(),
});

// ✅ Good: Deterministic with seed
faker.seed(123);
const createUser = () => ({
  id: faker.string.uuid(),
  createdAt: faker.date.past(),
});
```

### ❌ Factories That Do Too Much
```ts
// ❌ Bad: Factory makes API calls
const createUser = async () => {
  const user = await api.createUser({ name: 'John' });
  return user;
};

// ✅ Good: Factory just creates data
const createUser = () => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
});
```

---

**← Back to:** [Server vs Client Testing](./16-server-vs-client-testing.md)  
**Next:** [Mocking Guide](./11-mocking-guide.md) →

