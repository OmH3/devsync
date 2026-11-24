# DevSync - Real-time Collaborative Development Platform

This branch maintains the React/Vite client and Node/Express server.

Implementation and verification are tracked in
[the implementation plan](docs/NODE_REACT_IMPLEMENTATION_PLAN.md).
See [benchmark evidence](server/BENCHMARKS.md) for methodology and limitations.
Deployment packaging for this stack is available in deploy/ and docker-compose.prod.yml.

A comprehensive real-time collaborative platform that enables teams to work together seamlessly with integrated tools for document editing, whiteboard collaboration, code editing, and audio communication.

## 🌟 Project Overview

DevSync solves the challenge of remote team collaboration by providing an all-in-one platform where developers and teams can:

- **Collaborate in real-time** on documents, whiteboards, and code
- **Communicate effectively** through integrated audio rooms
- **Manage projects** with workspace-based organization
- **Share ideas visually** with interactive whiteboards
- **Code together** with synchronized code editing

### Key Features

- 🔄 **Real-time Collaboration** - Live editing across all tools
- 📝 **Document Editor** - Rich text editing with auto-save
- 🎨 **Interactive Whiteboard** - Drawing, shapes, and collaborative sketching
- 💻 **Code Editor** - Syntax highlighting and live code sharing
- 🎙️ **Audio Rooms** - Voice communication during collaboration
- 👥 **Workspace Management** - Role-based access control (Owner, Admin, Member)
- 🔐 **Authentication** - Google OAuth and local authentication
- 📱 **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend (Client)
- **React** 19.1.0 - Modern UI library
- **Vite** - Fast build tool and development server
- **TailwindCSS** 4.1.11 - Utility-first CSS framework
- **Zustand** 5.0.6 - State management
- **React Router** 7.6.2 - Client-side routing
- **Socket.io Client** 4.8.1 - Real-time communication
- **Axios** 1.11.0 - HTTP client
- **WebRTC** - Microphone-only workspace audio rooms

### Backend (Server)
- **Node.js** with **Express** 5.1.0 - Web server framework
- **MongoDB** with **Mongoose** 8.16.0 - Database and ODM
- **Socket.io** 4.8.1 - Real-time WebSocket communication
- **Passport.js** - Authentication middleware
- **JWT** - Token-based authentication
- **Zod** 3.25.75 - Schema validation
- **Socket.IO** - Authorized audio signaling
- **bcrypt** - Password hashing

### Development Tools
- **ESLint** - Code linting
- **Nodemon** - Development server auto-restart
- **UUID** - Unique identifier generation

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **MongoDB** database (local or cloud)
- Microphone permission for audio rooms (no external account required)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/devsync.git
cd devsync
```

### 2. Server Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables (see Environment Variables section)
# Start development server
npm run dev
```

### 3. Client Setup
```bash
# Open new terminal and navigate to client directory
cd client

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables
# Start development server
npm run dev
```

### 4. Environment Variables

#### Server (.env)
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/devsync?retryWrites=true&w=majority&appName=Cluster0
# For local development:
# MONGO_URI=mongodb://localhost:27017/devsync

# Server Configuration
NODE_ENV=production
# For development: NODE_ENV=development
PORT=8000
# For development: PORT=5000

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here
SESSION_EXPIRES_IN=1d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend-url.onrender.com/api/auth/google/callback
# For development: GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend Configuration
FRONTEND_ORIGIN=https://your-frontend-url.vercel.app
FRONTEND_GOOGLE_CALLBACK_URL=https://your-frontend-url.vercel.app/google/callback
# For development: 
# FRONTEND_ORIGIN=http://localhost:5173
# FRONTEND_GOOGLE_CALLBACK_URL=http://localhost:5173/google/callback

# Native audio rooms
AUDIO_ENABLED=true
```

#### Client (.env)
```env
# API Configuration
VITE_API_BASE_URL=https://your-backend-url.onrender.com
# For development: VITE_API_BASE_URL=http://localhost:5000

# Environment
VITE_NODE_ENV=production
# For development: VITE_NODE_ENV=development
```

### 5. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. The application will create necessary collections automatically

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and add to `MONGODB_URI`

### 6. Audio rooms
Set `AUDIO_ENABLED=true` on the server. Join the Team lounge in the workspace sidebar and allow microphone access. Mute, deafen and leave controls are available; camera tracks are never requested. Rooms support up to eight participants using peer-to-peer WebRTC. HTTPS (or localhost) is required for microphone access. Restrictive networks may require a TURN relay; this local implementation currently uses a public STUN server.

### Workspace editors
Documents use TipTap rich text, code uses locally bundled Monaco workers, and new whiteboards use Excalidraw. Existing canvas data retains its original renderer. The Node API, MongoDB storage and authorized Socket.IO events remain in use. Document saves retain revision-conflict protection; automatic CRDT merging is not implemented.

## 📋 Usage Instructions

### Running the Application

1. **Start the backend server:**
   ```bash
   cd server
   npm run dev
   ```
   Server will run on `http://localhost:5000`

2. **Start the frontend client:**
   ```bash
   cd client
   npm run dev
   ```
   Client will run on `http://localhost:5173`

3. **Access the application:**
   Open your browser and navigate to `http://localhost:5173`

### Basic Workflow

1. **Register/Login** - Create an account or sign in with Google
2. **Create Workspace** - Set up a new collaborative workspace
3. **Invite Members** - Add team members with different roles
4. **Start Collaborating** - Use documents, whiteboard, or code editor
5. **Communicate** - Join audio rooms for voice communication

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `POST /api/auth/logout` - User logout

#### Workspaces
- `GET /api/workspaces` - Get user workspaces
- `POST /api/workspaces/create` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

#### Documents
- `GET /api/docs/workspace/:workspaceId` - Get workspace documents
- `POST /api/docs/create` - Create document
- `PUT /api/docs/:id` - Update document
- `DELETE /api/docs/:id` - Delete document

#### Real-time Events (Socket.io)
- `join-workspace` - Join workspace for real-time updates
- `doc-text-change` - Real-time document editing
- `whiteboard-update` - Real-time whiteboard changes
- `code-change` - Real-time code editing

## 🏗️ Build & Deployment

### Development Build
```bash
# Client
cd client
npm run build

# Server
cd server
npm start
```

### Production Deployment

#### Manual Deployment
1. **Build client:**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy server:**
   ```bash
   cd server
   npm start
   ```

### Environment-Specific Configuration

- **Development:** Local MongoDB, verbose logging
- **Staging:** Cloud database, moderate logging
- **Production:** Optimized builds, minimal logging, HTTPS

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Coding Standards
- Use ESLint configuration provided
- Follow React best practices
- Write meaningful commit messages
- Add comments for complex logic
- Ensure responsive design

### Code Structure
```
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Route components
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Zustand state management
│   ├── services/      # API service layers
│   └── utils/         # Utility functions

server/
├── src/
│   ├── controllers/   # Route handlers
│   ├── services/      # Business logic
│   ├── models/        # Database models
│   ├── routes/        # Express routes
│   ├── middleware/    # Custom middleware
│   ├── handlers/      # Socket.io handlers
│   └── validation/    # Input validation schemas
```

## 🐛 Known Issues & Roadmap

### Known Issues
- Audio rooms may have connectivity issues on some networks
- Large whiteboard drawings may cause performance lag

### Upcoming Features
- 🎨 **Themes** - Dark mode and custom themes
- 🤖 **AI Integration** - AI-powered code suggestions
- 📈 **Version Control** - Document and code versioning

### Performance Improvements
- Optimize real-time sync algorithms
- Implement lazy loading for large documents
- Add caching for frequently accessed data

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👥 Credits

### Core Contributors
- **Development Team** - Full-stack development and architecture
- **UI/UX Design** - Interface design and user experience

### Libraries & Services
- **React Team** - React framework
- **Socket.io** - Real-time communication
- **MongoDB** - Database solution
- **TipTap, Monaco and Excalidraw** - Workspace editors
- **Tailwind CSS** - CSS framework

### Special Thanks
- Open source community for invaluable libraries and tools
- Beta testers for feedback and bug reports

---

**DevSync** - Empowering teams to collaborate seamlessly in real-time 🚀
