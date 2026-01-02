# Clutter Notes 2.0

A cross-platform note-taking application built with a modern monorepo architecture.

## 🏗️ Project Structure

This is a Turborepo monorepo containing:

```
clutter-notes/
├── apps/
│   ├── web/          # React + TypeScript web application (Vite)
│   ├── desktop/      # Tauri desktop application (wraps web app)
│   └── mobile/       # React Native mobile application (Expo)
├── packages/
│   ├── shared/       # Shared types, utilities, and hooks
│   └── ui/           # Design system tokens (Notion-inspired)
└── [root configs]    # Turborepo, TypeScript, ESLint, Prettier, etc.
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Rust** (for Tauri desktop app) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Expo CLI** (for mobile app) - Will be installed automatically

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

3. **Initialize Husky (Git hooks):**

```bash
npm run prepare
```

## 📦 Available Scripts

### Root Level

- `npm run build` - Build all apps and packages
- `npm run build:web` - Build only web app
- `npm run build:desktop` - Build desktop app (includes Tauri build)
- `npm run build:mobile` - Build mobile app
- `npm run build:packages` - Build shared packages only
- `npm run dev` - Start all apps in development mode
- `npm run dev:web` - Start web app only
- `npm run dev:desktop` - Start desktop app with Tauri
- `npm run dev:mobile` - Start mobile app with Expo
- `npm run lint` - Lint all packages
- `npm run format` - Format all code with Prettier
- `npm run type-check` - Type check all packages
- `npm run clean` - Clean all build artifacts

### App-Specific Scripts

#### Web App (`apps/web`)

- `npm run dev` - Start Vite dev server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

#### Desktop App (`apps/desktop`)

- `npm run tauri:dev` - Start Tauri dev mode
- `npm run tauri:build` - Build native app for macOS/Windows
- `npm run dev` - Start Vite dev server (http://localhost:1420)

#### Mobile App (`apps/mobile`)

- `npm run start` - Start Expo dev server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run in web browser
- `npm run build:android` - Build Android APK/AAB
- `npm run build:ios` - Build iOS app

## 🎨 Design System

The project uses a Notion-inspired design system located in `packages/ui`. The design tokens include:

- **Colors**: Background, text, borders, accents, semantic colors
- **Spacing**: 4px-based spacing scale
- **Typography**: Font families, sizes, weights, line heights
- **Sizing**: Icons, buttons, inputs, border radius, z-index
- **Interactions**: Cursor, opacity, shadows, focus states
- **Animations**: Durations, easing functions, transitions

Import tokens in your code:

```typescript
import { colors, spacing, typography } from '@clutter/ui';
```

## 🛠️ Technology Stack

### Core

- **Monorepo**: Turborepo
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand
- **Routing**: React Router (web/desktop), Expo Router (mobile)

### Web & Desktop

- **Framework**: React 18
- **Build Tool**: Vite
- **Desktop**: Tauri (Rust + Web)

### Mobile

- **Framework**: React Native
- **Tooling**: Expo

### Tooling

- **Linting**: ESLint
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged
- **Type Checking**: TypeScript

## 📱 Building for Production

### Web

```bash
npm run build:web
```

Output: `apps/web/dist/`

### Desktop (Tauri)

**macOS:**
```bash
cd apps/desktop
npm run tauri:build
```

Output: `apps/desktop/src-tauri/target/release/bundle/`

**Windows:**
```bash
cd apps/desktop
npm run tauri:build
```

Output: `apps/desktop/src-tauri/target/release/bundle/`

### Mobile

**Android:**
```bash
cd apps/mobile
npm run build:android
```

**iOS:**
```bash
cd apps/mobile
npm run build:ios
```

## 🔧 Development Workflow

1. **Make changes** in any app or package
2. **Type checking** runs automatically via Turbo
3. **Linting** runs on commit (via Husky)
4. **Formatting** runs on commit (via lint-staged)

### Working with Shared Packages

The `packages/shared` and `packages/ui` packages are automatically linked via npm workspaces. Changes to these packages will be reflected in all apps that use them.

To rebuild packages after changes:

```bash
npm run build:packages
```

Or use watch mode (in package directory):

```bash
cd packages/shared
npm run dev
```

## 📝 Environment Variables

### Web & Desktop

Use `VITE_` prefix for environment variables:

```env
VITE_APP_NAME=Clutter Notes
VITE_API_URL=http://localhost:3001
```

Access in code:

```typescript
import.meta.env.VITE_APP_NAME
```

### Mobile

Use `EXPO_PUBLIC_` prefix:

```env
EXPO_PUBLIC_APP_NAME=Clutter Notes
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Access in code:

```typescript
process.env.EXPO_PUBLIC_APP_NAME
```

## 🏛️ Architecture Decisions

### Why Turborepo?

- Fast builds with intelligent caching
- Easy dependency management across packages
- Parallel task execution
- Simple configuration

### Why Tauri over Electron?

- Smaller bundle size
- Better performance
- Native security model
- Rust backend for system operations

### Why Zustand?

- Minimal boilerplate
- Simple API
- Works across all platforms
- No context providers needed

### Why Notion Design System?

- Clean, minimal aesthetic
- Excellent UX patterns
- Familiar to many users
- Well-documented interaction patterns

## 🐛 Troubleshooting

### Tauri Build Issues

If you encounter Rust compilation errors:

1. Ensure Rust is installed: `rustc --version`
2. Update Rust: `rustup update`
3. Clean build: `cd apps/desktop && rm -rf src-tauri/target`

### Expo Issues

If Expo fails to start:

1. Clear cache: `cd apps/mobile && npm run clean`
2. Reinstall: `rm -rf node_modules && npm install`
3. Reset Expo: `npx expo start --clear`

### TypeScript Errors

If you see type errors after adding new packages:

1. Rebuild packages: `npm run build:packages`
2. Restart TypeScript server in your IDE

### Workspace Linking Issues

If packages aren't linking correctly:

1. Clean install: `npm run clean && npm install`
2. Verify workspaces in root `package.json`

## 📚 Next Steps

This is a foundation setup. To start building:

1. **Design UI components** using tokens from `@clutter/ui`
2. **Set up state management** stores in `packages/shared`
3. **Create routes** in each app
4. **Implement features** using shared logic

## 📄 License

[Add your license here]

## 🤝 Contributing

[Add contributing guidelines here]

