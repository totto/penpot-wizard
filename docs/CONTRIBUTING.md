# Contributing to Penpot Wizard

Thank you for your interest in contributing to Penpot Wizard! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions with other contributors.

### Expected Behavior

- Be respectful and considerate
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment or discrimination of any kind
- Trolling or insulting comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- OpenAI API key or OpenRouter API key (for testing)
- Penpot account (for plugin testing)

### First-Time Setup

1. **Fork the repository**
   ```bash
   # Visit https://github.com/YourOrg/penpot-wizard
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YourUsername/penpot-wizard.git
   cd penpot-wizard
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/YourOrg/penpot-wizard.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Start development server**
   ```bash
   npm run dev:penpot
   ```

6. **Read the documentation**
   - [ARCHITECTURE.md](./ARCHITECTURE.md)
   - [CODE_STRUCTURE.md](./CODE_STRUCTURE.md)
   - [DEVELOPMENT.md](./DEVELOPMENT.md)

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

#### 🐛 Bug Fixes
- Fix issues listed in GitHub Issues
- Improve error handling
- Fix edge cases

#### ✨ New Features
- Add new agents (directors, coordinators, specialists)
- Create new tools (function, RAG, drawing)
- Improve existing functionality
- Add support for new LLM providers

#### 📚 Documentation
- Improve README or docs
- Add code comments
- Create tutorials or examples
- Fix typos

#### 🧪 Testing
- Add unit tests
- Add integration tests
- Improve test coverage
- Report bugs with reproduction steps

#### 🎨 UI/UX Improvements
- Improve component designs
- Enhance user experience
- Add accessibility features
- Improve responsive design

#### 🚀 Performance
- Optimize bundle size
- Improve rendering performance
- Reduce memory usage
- Optimize database operations

## Development Workflow

### Branch Strategy

We use Git Flow:

- `main` - Stable releases
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical fixes for production
- `docs/*` - Documentation updates

### Creating a Feature Branch

```bash
# Update your fork
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/my-new-feature

# Make changes
# ...

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to your fork
git push origin feature/my-new-feature
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```bash
feat(agents): add web projects coordinator
fix(tools): correct stacking order in drawing tools
docs(readme): update installation instructions
refactor(stores): optimize conversation loading
test(utils): add tests for message utilities
```

**Scope examples:**
- `agents` - Agent system
- `tools` - Tools system
- `stores` - State management
- `components` - UI components
- `plugin` - Penpot plugin
- `utils` - Utilities

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream develop into your develop
git checkout develop
git merge upstream/develop

# Rebase your feature branch
git checkout feature/my-feature
git rebase develop
```

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code style
- Use ESLint (run `npm run lint`)
- Use meaningful variable names

```typescript
// ✅ Good
const activeConversationId = $activeConversationId.get();
const userMessage = createUserMessage(text);

// ❌ Bad
const id = $activeConversationId.get();
const msg = createUserMessage(text);
```

### React Components

- Use functional components
- Use hooks for state management
- Memoize expensive computations
- Extract reusable logic into custom hooks

```typescript
// ✅ Good
const MessageHistory = React.memo(({ messages }) => {
  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
});

// ❌ Bad
function MessageHistory({ messages }) {
  // Re-renders on every parent update
  return <div>{/* ... */}</div>;
}
```

### File Organization

- One component per file
- Keep files under 300 lines
- Extract complex logic into utilities
- Group related files in folders

```
components/
└── Chat/
    ├── Chat.jsx              # Main component
    ├── Header/
    │   └── Header.jsx
    ├── ChatMessages/
    │   ├── ChatMessages.jsx
    │   └── MessageHistory.jsx
    └── Footer/
        └── Footer.jsx
```

### Naming Conventions

Follow the conventions in [CODE_STRUCTURE.md](./CODE_STRUCTURE.md):

- **Files**: PascalCase for components, camelCase for others
- **Atoms**: Prefix with `$`
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test src/utils/messagesUtils.test.ts
```

### Writing Tests

Place tests next to the code they test:

```
src/utils/
├── messagesUtils.ts
└── messagesUtils.test.ts
```

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { formatMessage } from './messagesUtils';

describe('messagesUtils', () => {
  describe('formatMessage', () => {
    it('should format user messages correctly', () => {
      const message = {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      const formatted = formatMessage(message);

      expect(formatted).toContain('Hello');
      expect(formatted).toContain('user');
    });

    it('should handle tool calls in assistant messages', () => {
      const message = {
        id: '2',
        role: 'assistant',
        content: 'Using tool...',
        timestamp: new Date(),
        toolCalls: [
          { id: 'tc1', name: 'getUserData', state: 'completed' }
        ]
      };

      const formatted = formatMessage(message);

      expect(formatted).toContain('getUserData');
    });
  });
});
```

### Test Coverage

Aim for:
- **Utilities**: 80%+ coverage
- **Stores**: 70%+ coverage
- **Components**: 60%+ coverage (focus on logic)

## Documentation

### Code Comments

```typescript
// ✅ Good - explain WHY
// Stacking order matters: backgrounds drawn first appear at bottom
await rectangleMaker({ /* background */ });

// ✅ Good - explain complex logic
// Convert Zod schema to AST for UI display
// This allows dynamic rendering of schema editors
const ast = zodToAST(schema);

// ❌ Bad - state the obvious
// Create a rectangle
await rectangleMaker({ /* ... */ });
```

### JSDoc for Public APIs

```typescript
/**
 * Send a message to the Penpot plugin and wait for response.
 *
 * @param queryType - Type of query to send
 * @param payload - Query-specific data
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Promise resolving to plugin response
 * @throws Error if timeout or plugin returns error
 *
 * @example
 * const userData = await sendMessageToPlugin(
 *   ClientQueryType.GET_USER_DATA
 * );
 */
export async function sendMessageToPlugin(
  queryType: ClientQueryType,
  payload?: any,
  timeoutMs: number = 30000
): Promise<PluginResponsePayload> {
  // Implementation
}
```

### Documentation Files

When adding new features, update relevant docs:

- README.md - User-facing documentation
- ARCHITECTURE.md - Architecture changes
- CODE_STRUCTURE.md - New files/modules
- AGENT_SYSTEM.md - New agent types
- TOOLS_SYSTEM.md - New tool types
- PLUGIN_COMMUNICATION.md - New plugin operations

## Pull Request Process

### Before Submitting

1. **Update your branch**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/my-feature
   git rebase develop
   ```

2. **Run tests**
   ```bash
   npm test
   ```

3. **Run linter**
   ```bash
   npm run lint
   ```

4. **Test in Penpot**
   - Build: `npm run build`
   - Load plugin in Penpot
   - Test your changes

5. **Update documentation**
   - Update README if needed
   - Add/update code comments
   - Update relevant docs in `/docs`

### Submitting Pull Request

1. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create PR on GitHub**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Base: `upstream/develop`
   - Compare: `your-fork/feature/my-feature`

3. **Fill out PR template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring
   - [ ] Other (describe)

   ## Testing
   - [ ] Added tests
   - [ ] Existing tests pass
   - [ ] Tested manually in Penpot

   ## Documentation
   - [ ] Updated README
   - [ ] Updated code comments
   - [ ] Updated docs in /docs

   ## Screenshots (if applicable)
   [Add screenshots here]

   ## Related Issues
   Fixes #123
   ```

4. **Wait for review**
   - Maintainers will review your PR
   - Address feedback if requested
   - Be patient and respectful

### PR Review Criteria

Your PR will be evaluated on:

- **Code Quality**: Follows style guide, clean code
- **Tests**: Adequate test coverage
- **Documentation**: Code is well-documented
- **Functionality**: Features work as expected
- **Performance**: No significant performance regression
- **Compatibility**: Works with existing features

## Reporting Bugs

### Before Reporting

1. **Check existing issues** - Your bug may already be reported
2. **Try latest version** - Bug may be fixed in `develop`
3. **Verify it's reproducible** - Can you reproduce consistently?

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Penpot Wizard version: [e.g., 0.1.0]
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14]
- Node version: [e.g., 18.17.0]

## Screenshots
If applicable, add screenshots

## Console Logs
```
Paste any console errors here
```

## Additional Context
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem It Solves
What problem does this address?

## Proposed Solution
How would this feature work?

## Alternatives Considered
Other solutions you've thought about

## Additional Context
Mockups, examples, references, etc.

## Implementation Ideas
(Optional) How might this be implemented?
```

### Feature Discussion

Before implementing a major feature:

1. Open an issue to discuss
2. Get feedback from maintainers
3. Agree on approach
4. Then implement

This prevents wasted effort on features that may not be accepted.

## Community

### Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions

### Recognition

Contributors are recognized in:
- README.md (Contributors section)
- Release notes
- Git commit history

Thank you for contributing! 🎉

---

## Quick Reference

```bash
# Setup
git clone https://github.com/YourUsername/penpot-wizard.git
npm install
npm run dev:penpot

# Development
git checkout -b feature/my-feature
# ... make changes
git add .
git commit -m "feat: add feature"
npm test
npm run lint

# Submit
git push origin feature/my-feature
# Create PR on GitHub

# Update fork
git fetch upstream
git checkout develop
git merge upstream/develop
git push origin develop
```

---

**Next**: See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development setup and workflow.
