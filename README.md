# React 19.2 + Zustand + Vite Project

A modern React application built with React 19.2, Zustand for state management, and Vite for fast development and building.

## Features

- ⚡ **Vite** - Lightning fast build tool and dev server
- ⚛️ **React 19.2** - Latest React with new features and improvements
- 🐻 **Zustand** - Lightweight state management library
- 🎨 **Modern UI** - Clean and responsive design
- 🔥 **Hot Module Replacement** - Instant updates during development

## Project Structure

```
src/
├── components/          # Reusable React components
│   └── CounterDisplay.jsx
├── stores/             # Zustand stores
│   └── useCounterStore.js
├── assets/             # Static assets
├── App.jsx             # Main application component
├── main.jsx            # Application entry point
└── index.css           # Global styles
```

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## State Management with Zustand

This project demonstrates Zustand usage with a simple counter store:

```javascript
import { create } from "zustand";

const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### Using the Store in Components

```javascript
import useCounterStore from "./stores/useCounterStore";

function MyComponent() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies Used

- **React 19.2** - UI library
- **Zustand 5.0.8** - State management
- **Vite 7.1.7** - Build tool and dev server
- **ESLint** - Code linting

## Learn More

- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Vite Documentation](https://vitejs.dev/)
