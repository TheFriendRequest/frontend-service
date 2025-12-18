# Frontend Service

React + TypeScript web application for the microservices event management platform.

## 📋 Overview

The Frontend Service is a single-page application (SPA) built with React and TypeScript that provides the user interface for:
- User authentication and registration
- Event creation and browsing
- Post creation and feed
- Friend management
- Interest-based content discovery

## 🏗️ Architecture

```
Frontend (React) → API Gateway → Composite Service → Atomic Services
```

- **Framework**: React 18 with TypeScript
- **Build Tool**: Create React App
- **State Management**: React Context API
- **Routing**: React Router
- **Authentication**: Firebase Authentication
- **Deployment**: Cloud Storage (Static Website Hosting)

## 🚀 Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Firebase project with Authentication enabled

### Installation

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Configure Firebase**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

3. **Run development server**
   ```bash
   npm start
   # or
   yarn start
   ```

   The app will open at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

   This creates an optimized production build in the `build/` directory.

## 🔧 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `REACT_APP_API_URL` | API Gateway URL | `http://localhost:8000` | Yes |
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key | - | Yes |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | - | Yes |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID | - | Yes |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | - | Yes |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | - | Yes |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID | - | Yes |

## 📁 Project Structure

```
frontend-service/
├── public/              # Static files
│   ├── index.html      # HTML template
│   └── ...
├── src/
│   ├── components/     # React components
│   │   ├── Auth/       # Authentication components
│   │   ├── Events/     # Event-related components
│   │   ├── Posts/      # Post-related components
│   │   └── ...
│   ├── contexts/        # React Context providers
│   │   └── AuthContext.tsx
│   ├── services/       # API service functions
│   │   └── api.ts
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   └── index.tsx       # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## 🎨 Features

### Authentication
- Email/password registration and login
- Firebase Authentication integration
- Protected routes
- Automatic token refresh
- Logout functionality

### Events
- Create, view, edit, and delete events
- Event search and filtering
- Interest-based event discovery
- Event details with location and time

### Posts
- Create, view, edit, and delete posts
- Feed with pagination
- Like/unlike posts
- Interest-based post discovery

### User Management
- User profile viewing and editing
- Profile picture upload
- Interest management
- User search

### Friends
- Send and accept friend requests
- View friends list
- Remove friends

## 🔐 Authentication Flow

1. User registers/logs in via Firebase Authentication
2. Firebase returns ID token
3. Frontend stores token in localStorage
4. All API requests include token in `Authorization: Bearer <token>` header
5. API Gateway validates token and forwards request with `x-firebase-uid` header

## 🌐 API Integration

The frontend communicates with the backend through the API Gateway:

```typescript
// Example API call
const response = await fetch(`${API_URL}/api/users/me`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

All API calls are centralized in `src/services/api.ts`.

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t frontend-service .
```

### Run Container
```bash
docker run -p 3000:80 \
  -e REACT_APP_API_URL=https://api-gateway.run.app \
  frontend-service
```

## ☁️ GCP Cloud Storage Deployment

The frontend is deployed as static files to Cloud Storage:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Create Cloud Storage bucket**
   ```bash
   gsutil mb gs://your-bucket-name
   ```

3. **Upload build files**
   ```bash
   gsutil -m cp -r build/* gs://your-bucket-name/
   ```

4. **Configure for static website hosting**
   ```bash
   gsutil web set -m index.html -e index.html gs://your-bucket-name
   gsutil iam ch allUsers:objectViewer gs://your-bucket-name
   ```

5. **Access the website**
   ```
   https://storage.googleapis.com/your-bucket-name/index.html
   ```

See [../GCP_DEPLOYMENT_GUIDE.md](../GCP_DEPLOYMENT_GUIDE.md) for automated deployment.

## 🧪 Testing

### Run Tests
```bash
npm test
# or
yarn test
```

### Build and Test Production Build
```bash
npm run build
npm install -g serve
serve -s build
```

## 📚 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (irreversible)

## 🔍 Error Handling

The frontend includes error handling for:
- Network errors (API unavailable)
- Authentication errors (token expired)
- Validation errors (form inputs)
- 404 errors (page not found)

Error messages are displayed to users via toast notifications or inline form errors.

## 🎯 Best Practices

- **Type Safety**: All components and functions use TypeScript
- **Component Reusability**: Shared components in `components/` directory
- **State Management**: Context API for global state (auth, user)
- **API Abstraction**: Centralized API calls in `services/api.ts`
- **Error Boundaries**: React error boundaries for graceful error handling
- **Loading States**: Loading indicators for async operations

## 📝 Notes

- The frontend is a SPA, so all routes are handled client-side
- Firebase Authentication handles password reset, email verification, etc.
- Images are stored in Firebase Storage or Cloud Storage
- The app uses React Router for navigation

## 🤝 Contributing

When adding new features:
1. Create components in appropriate directories
2. Add TypeScript types in `types/` directory
3. Add API calls to `services/api.ts`
4. Update routing in `App.tsx`
5. Test with different screen sizes (responsive design)

## 🔗 Related Documentation

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [React Router](https://reactrouter.com/)
