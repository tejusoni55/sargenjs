# SargenJS

<div align="center" >
  <img src="logo/sargenjs-logo.png" alt="SargenJS Logo" style="padding: 10px 0px">
</div>

🚀 **SargenJS** - A beginner-friendly CLI that builds a ready-to-use Express.js project. Just run the command to get routes, configs, and scripts so you can focus on writing features, not boilerplate & base configurations.

> **📝 Important Note:** Everything SargenJS generates is default compatible and follows CommonJS module structure. For ESModule support, developers need to manually transfer/migrate files after generation.

---

## Features

> **🎯 Base Configured Layer**: SargenJS provides a complete base configured layer for backend development, allowing developers to focus on writing business logic rather than setting up infrastructure, security, and boilerplate code.

- **🚀 Project Generation**: Generate Express.js projects with different architectural patterns from single command
- **🏗️ Multiple Architectures**: Supports Layered (MVC) and Modular (Feature-based) project structures
- **🗄️ Database Integration**: Sequelize ORM with MySQL and PostgreSQL support
- **🔒 Security Middlewares**: Preconfigured with Helmet, CORS & Supports Rate Limiting, JWT Authentication, and ACL
- **📊 Monitoring & Logging Middleware**: Built-in Prometheus, Grafana, Loki, and Winston monitoring setup
- **📧 Communication Services**: SMTP email service with Nodemailer
- **🔔 Push Notifications**: Firebase Cloud Messaging (FCM) integration
- **⚡ Utility Services**: Redis configuration (ioredis) with caching & rate limiting middleware support
- **🔧 Module Generation**: Auto-generate controllers, routes, services, and models
- **📝 Git Integration**: Automatic Git repository setup with GitHub CLI support

## 📚 Documentation

For complete command guidance, detailed examples, and step-by-step tutorials, visit our comprehensive documentation website:

**🔗 [SargenJS Full Documentation](https://sargenjs-docs.vercel.app)** *(with setup examples)*

## 🤝 Contributing

> **Note:** Currently, SargenJS is not accepting open contributions. The project is initially maintained and handled by the SargenJS development team. We appreciate your understanding and will announce when contribution guidelines become available.

## 📋 Table of Contents

1. [Installation](#installation)
2. [Quick Started](#quick-started)
3. [Project Structures](#project-structures)
4. [Commands](#commands)
   - [Project Initialization](#project-initialization-new-project)
   - [Sargen Setup](#sargen-setup-existing-project)
   - [Database Configuration](#database-confuguration)
   - [Module Generation](#module-generation)
   - [Middleware Setup](#middleware-setup)
   - [Utility Services](#utility-services)
   - [Git Repository Setup](#git-repository-setup)
5. [Configuration](#configuration)
6. [License](#license)


## Installation

```bash
npm install -g sargenjs
```

**Note:** Make sure you have Node.js 14+ installed on your system.

## Quick Started

### Create a new project

Create a project (with default **`Layered`** architecture)
```bash
sargen init test-project
```

Create a project with **`Modular`** architecture
```bash
sargen init test-project --struct modular
```

Create a project with test routing demonstration
```bash
sargen init test-project --test 
OR
sargen init test-project --struct modular --test
```
This will add a test routing file to demonstrate project structure and API handling patterns. Test endpoint available at `http://localhost:8000/api/v1/test/test-api`.

Create a project with additional security middleware `rateLimit` 
```bash
sargen init test-project --security rateLimit
```


### Run the project

```bash
cd test-project
npm run dev
```

OR

```bash
# test|satging environment
npm run test
```

OR

```bash
# production environment
npm run prod
```

Your node.js app will be started on: http://localhost:8000

## Project Structures

### Layered Architecture (Default)
```
test-project/
├── src/
│   ├── routes/
│   │   └── index.js
│   ├── controllers/
│   └── services/
├── app.js
├── .env
├── .env.test
├── .env.production
└── package.json
```

### Modular Architecture
```
test-project/
├── src/
│   ├── config/
│   ├── common/
│   └── modules/
├── app.js
├── .env
├── .env.test
├── .env.production
└── package.json
```

## Commands

### Project Initialization (New project)
- `sargen init <project-name>` - Create a new project
  - Options:
    - `--struct <type>` - Project structure type (`layered` or `modular`)
    - `--test` - Add test routing file to demonstrate project structure and API handling patterns
    - `--security [security...]` - Setup security middlewares (`helmet`, `cors`, `rateLimit`)
    - `-v, --verbose` - Enable verbose logging to see detailed background processes

### Sargen Setup (Existing project)
- `sargen setup` - Configure `.sargen.json` file in an existing Express.js project to use sargen commands
  - **Validates** that you're in a proper Express.js project directory
    - Checks for `package.json` with valid structure
    - Ensures Express.js is installed as a dependency
    - Warns about missing recommended dependencies (dotenv, body-parser, helmet, cors)
    - Checks for standard Express.js project structure (app.js, server.js, or index.js)
  - Detects project structure (layered or modular)
  - Creates sargen.json configuration file
  - Enables use of other sargen commands in the project
  - Options:
    - `-v, --verbose` - Enable verbose logging to see detailed background processes


### Database Confuguration
- `sargen gen:db` - Configure database ORM and Adapter setup (**sequelize** and **mysql** by default)
  - Options:
    -  `--orm <name>` - Database ORM to be setup (Supports only `sequelize` for now, `typeORM` in future updates)
    - `--adapter <name>` - Database connection/adapter to be setup (Supports `mysql` and `postgres` for now, `mongo` in future updates)
    - `--docker` - Set up database with Docker Compose configuration (creates local database containers)
    - `-v, --verbose` - Enable verbose logging to see detailed background processes

#### Database Docker Setup:
When using the `--docker` option, SargenJS creates a complete Docker-based database setup:

**Features:**
- **Local Database Containers**: MySQL 8.0 or PostgreSQL 15 with optimized configurations
- **Automatic Password Generation**: Secure random passwords for database access
- **Environment Variables**: Database credentials configured in Docker Compose
- **Health Checks**: Built-in health monitoring for database containers
- **Data Persistence**: Database data stored in `docker/data/` directories
- **Custom Configuration**: Database-specific config files for development optimization

**Usage Examples:**
```bash
# Setup MySQL with Docker (Default)
sargen gen:db --docker

# Setup PostgreSQL with Docker  
sargen gen:db --docker --adapter postgres

# Start database containers
docker-compose -f docker/docker-compose.yml up -d

# Check database logs
docker-compose -f docker/docker-compose.yml logs mysql
docker-compose -f docker/docker-compose.yml logs postgres
```

**Generated Files:**
- `docker/docker-compose.yml` - Main Docker Compose configuration
- `docker/data/` - Database data persistence directories


### Module Generation
- `sargen gen:module <module-name>` - Generate a new module/feature with all necessary files

**Three Use Cases:**

**1. Basic Module Setup:**
```bash
sargen gen:module users
```
- Creates blank controller, routes, service, and model files
- User can customize files as per their requirements

**2. Module with CRUD Methods:**
```bash
sargen gen:module users --crud
```
- Creates basic module files with blank CRUD methods
- Generates RESTful endpoints: `POST /api/v1/users`, `GET /api/v1/users`, `PUT /api/v1/users/:id`, `DELETE /api/v1/users/:id`
- User needs to manually update migration and model files for database integration

**3. Complete CRUD with Database Integration:**
```bash
sargen gen:module users --crud --model-attributes name:string,age:number,email:string
```
- Creates fully functional CRUD with dynamic queries and model attributes
- **Automatically includes pagination service** for GET operations
- Populates migration files with defined attributes
- Just run `npx sequelize-cli db:migrate` and CRUD is ready to use

**Options:**
- `--crud` - Generate Create, Read, Update, Delete APIs
- `--no-model` - Skip model generation (only create controller, route, service)
- `--model-attributes <attributes>` - Define model attributes (format: name:string,email:string,phone:number)
  - **Supported types:** string, number, integer, bool/boolean, float, date
  - **Type mapping:** number→BIGINT, integer→INTEGER, string→STRING, bool/boolean→BOOLEAN, float→FLOAT, date→DATE
  - **Example:** `--model-attributes name:string,email:string,phone:number,is_verified:bool,last_login:date`
- `-v, --verbose` - Enable verbose logging to see detailed background processes
  - **Service methods accept parameters (data, id, query) for proper functionality**
  - Follows project structure (layered or modular)
  - Automatically populates migration files with defined attributes
  - For layered: Creates files in respective directories
  - For modular: Creates module directory with complete structure

**Pagination Service:**
When using `--crud` and `--model-attributes`, SargenJS automatically creates a pagination service for GET operations.
- **Query Parameters**: `page` and `limit` (e.g., `GET /api/v1/users?page=1&limit=10`)
- **Response**: Includes `totalCounts`, `totalPages`, `currentPage`, `pageLimit`, and `items` array
- **Environment Variables**: Configurable via `PER_PAGE` and `DEFAULT_PAGE` env vars
[!NOTE]: For consitency keep module name in `plural` form or closed to `table-name`, (.i.e users, orders, products, payments etc.)


### Middleware Setup
- `sargen gen:middleware <name>` - Setup up predefined middleware code files into project
  - Available middlewares: `validator` | `auth` | `acl` | `monitor`
  - Sets middleware file at,
    - **Layered** structure: `src/middlewares`
    - **Modular** structure: `src/common/middlewares`
  - Options:
    - `-v, --verbose` - Enable verbose logging to see detailed background processes

#### Available Middlewares:

**Validation Middleware (`validator`)**
- Generates centralized validation service using `fastest-validator`
- Auto-discovers DTO files from `src/dto` (layered) or `src/common/dto` (modular)
- Dependencies: `fastest-validator`

**Authentication Middleware (`auth`)**
- Generates JWT-based authentication system
- Creates `authMiddleware.js` and `jwtService.js`
- Dependencies: `jsonwebtoken`, `bcrypt`
- Environment variables: `JWT_PASSPHRASE`, `JWT_EXPIRATION`

**Access Control List Middleware (`acl`)**
- Generates role-based access control system
- Creates `aclMiddleware.js` and `acl.json` configuration

**Monitoring Middleware (`monitor`)**
- Generates comprehensive monitoring setup with **Prometheus**, **Grafana**, and **Loki**
- Creates monitoring middleware and centralized Docker Compose configuration
- Dependencies: `prom-client`, `winston`, `winston-loki`, `response-time`
- Includes Grafana dashboard at `http://localhost:3000`
- Docker Compose files located in `docker/` directory (centralized structure)
- **Usage**: `sargen gen:middleware monitor` → `docker-compose -f docker/docker-compose.yml up -d`

### Utility Services
- `sargen gen:util <util-name>` - Generate utility services for your project
  - Available utilities: `smtp`, `notification`, `redis`
  - Options:
    - `--docker` - Generate utility with Docker Compose file
    - `-v, --verbose` - Enable verbose logging to see detailed background processes
  - Sets utility file at,
    - **Layered** structure: `src/utils`
    - **Modular** structure: `src/common/utils`

#### Available Utilities:

**SMTP Email Service (`smtp`)**
- Generates email service with Nodemailer for SMTP email sending
- Dependencies: `nodemailer`
- Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM_NAME`
- Supports multiple providers: Gmail, SendGrid, 1and1, and other SMTP services
- Includes pre-built email template: welcome email
- No Docker support (direct SMTP connection)

**Push Notification Service (`notification`)**
- Generates push notification service with Firebase Admin SDK
- Dependencies: `firebase-admin`
- Environment variables: `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_DATABASE_URL`
- Supports FCM (Firebase Cloud Messaging) for Android, iOS, and web push notifications
- Includes methods for single device, multiple devices, and topic-based notifications
- No Docker support (direct Firebase connection)

**Redis Service (`redis`)**
- Generates Redis connection and service utilities
- Dependencies: `ioredis`
- Environment variables: `REDIS_HOST`, `REDIS_PORT`
- Default configuration: host `localhost`, port `6379`
- Docker support: Creates centralized Docker Compose configuration in `docker/` directory
- **Usage**: `sargen gen:util redis --docker` → `docker-compose -f docker/docker-compose.yml up -d`
- **Note:** `--docker` option provides environment-based utility configuration for easy setup

#### Middleware and Utility Examples:
```bash
# Generate validation middleware
sargen gen:middleware validator

# Generate authentication middleware
sargen gen:middleware auth

# Generate access control middleware
sargen gen:middleware acl

# Generate monitoring middleware with Prometheus, Grafana, and Loki
sargen gen:middleware monitor

# Generate SMTP email service
sargen gen:util smtp

# Generate push notification service
sargen gen:util notification

# Generate Redis utility service
sargen gen:util redis

# Generate Redis utility with Docker configuration
sargen gen:util redis --docker

# Start all Docker services (monitoring, redis, database)
docker-compose -f docker/docker-compose.yml up -d
```

## Docker Integration

SargenJS provides seamless Docker integration for development services:

### Centralized Docker Structure
All Docker services are managed through a single `docker/` directory:
```
docker/
├── docker-compose.yml          # Main Docker Compose file
├── data/                       # Data persistence directories
└── services/                   # Service-specific configurations
    ├── monitoring/             # Grafana, Prometheus, Loki configs
    └── redis/                  # Redis configuration
```

### Available Docker Services
- **Database**: `sargen gen:db --docker --adapter mysql|postgres`
- **Monitoring**: `sargen gen:middleware monitor`
- **Redis**: `sargen gen:util redis --docker`

### Quick Start
```bash
# Setup all services with Docker
sargen gen:db --docker
sargen gen:middleware monitor
sargen gen:util redis --docker

# Start all services
docker-compose -f docker/docker-compose.yml up -d
```

### Git Repository Setup
- `sargen gen:git` - Initialize git repository and setup remote (default **private** repo)
  - Options:
    - `--remote <url>` - Remote repository URL (GitHub/GitLab/Bitbucket)
    - `--branch <name>` - Initial branch name (default: main)
    - `--message <msg>` - Custom initial commit message
    - `--public` - Create public repository (requires GitHub CLI)
    - `--description <desc>` - Repository description
    - `--no-push` - Initialize git but don't push to remote
    - `-v, --verbose` - Enable verbose logging to see detailed background processes
  - Features:
    - **Auto-creates GitHub repository** if no remote provided (requires GitHub CLI)
    - Automatically detects git installation and configuration
    - Fault-tolerant setup with graceful error handling
    - Supports all major git hosting services
    - Preserves existing project files and structure
    - Creates initial commit with all project files
    - Note: `.gitignore` file is created during project initialization

#### Git Setup Examples:
```bash
# Auto-create GitHub repository (requires GitHub CLI)
sargen gen:git

# Create public GitHub repository
sargen gen:git --public --description "My public project"

# With existing remote repository
sargen gen:git --remote https://github.com/username/repo.git

# Custom branch and commit message
sargen gen:git --remote https://github.com/username/repo.git --branch develop --message "Initial project setup"

# Initialize but don't push to remote
sargen gen:git --remote https://github.com/username/repo.git --no-push
```

#### Workflow:
1. **Option A: Auto-create GitHub repo** - Run `sargen gen:git` (requires GitHub CLI)
2. **Option B: Use existing remote** - Run `sargen gen:git --remote <url>`
3. **Option C: Local-only** - Run `sargen gen:git` without GitHub CLI (fallback to local)

#### Auto GitHub Repository Creation:
- **If GitHub CLI is installed and authenticated** → Automatically creates GitHub repository and pushes code seamlessly
- **If GitHub CLI is not available** → Falls back to local git repository with helpful instructions

## Configuration

The generated project comes with:
- Express.js setup with essential middleware
- `.gitignore` file for Node.js projects
- Environment configuration
- Basic security with helmet and CORS (by default)
- Body parser for JSON and URL-encoded data
- Structured API routing with versioning
- README.md with project information

### Available Security Middlewares:
- **Helmet**: Sets various HTTP headers for security
- **CORS**: Configures Cross-Origin Resource Sharing
- **Rate Limiting**: Limits requests per IP address (100 requests per minute by default)

### Environment Variables:
When using specific middlewares or utilities, add these to your `.env` file:

**Authentication Middleware:**
```
JWT_PASSPHRASE=your_jwt_passphrase
JWT_EXPIRATION=24h
```

**Redis Utility:**
```
REDIS_HOST=localhost
REDIS_PORT=6379
```


**SMTP Email Service:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM_NAME=Your App Name
```

**Push Notification Service:**
```
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/your-service-account.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

**Database Configuration:**
```
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql
```

**CORS Configuration:**
```
ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]
```

## Environment Management

SargenJS automatically creates multiple environment files for different deployment scenarios:

### Environment Files Created:
- `.env` - Development environment (default)
- `.env.test` - Test environment
- `.env.production` - Production environment

### Available Scripts:
```bash
# Development mode (default)
npm run dev

# Test environment
npm run test

# Production environment
npm run prod
```

> **💡 Cross-Platform Support:** All scripts use `cross-env` for seamless environment variable handling across Windows, macOS, and Linux.

### Environment Switching:
The application automatically loads the appropriate environment file based on the `NODE_ENV` variable:

- **Development**: Uses `.env` file (NODE_ENV=development)
- **Test**: Uses `.env.test` file (NODE_ENV=test)
- **Production**: Uses `.env.production` file (NODE_ENV=production)

### Customizing Environment Files:
You can modify the environment files to include environment-specific configurations:

**`.env` (Development):**
```
NODE_ENV=development
PORT=8000
DB_HOST=localhost
DB_NAME=myapp_dev
```

**`.env.test` (Test):**
```
NODE_ENV=test
PORT=8000
DB_HOST=localhost
DB_NAME=myapp_test
```

**`.env.production` (Production):**
```
NODE_ENV=production
PORT=8000
DB_HOST=prod-db.example.com
DB_NAME=myapp_prod
```

### Manual Environment Switching:
You can also manually set the environment:

```bash
# Set environment variable and run
NODE_ENV=production node app.js

# Or use cross-env for cross-platform compatibility
npx cross-env NODE_ENV=production node app.js
```

## CORS Management

SargenJS includes dynamic CORS configuration that allows you to manage allowed origins through environment variables.

### Default Behavior:
- **Development**: Allows all origins (`*`)
- **Test**: Allows localhost origins for testing
- **Production**: Requires explicit domain configuration

### Managing CORS Origins:

#### **Environment-Based Configuration:**
```bash
# Allow specific domains and IPs (JSON array format)
ALLOWED_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com","https://api.yourdomain.com"]

# Allow all origins (development only)
ALLOWED_ORIGINS=["*"]

# Allow localhost and specific IPs for testing
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:3001","192.168.1.100"]
```

#### **Environment-Specific Examples:**

**`.env` (Development):**
```
ALLOWED_ORIGINS=["*"]
```

**`.env.test` (Test):**
```
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

**`.env.production` (Production):**
```
ALLOWED_ORIGINS=["https://yourdomain.com","https://www.yourdomain.com"]
```

### Security Best Practices:
1. **Never use `*` in production** - Always specify exact domains
2. **Use HTTPS in production** - Ensure secure connections
3. **Regularly review allowed origins** - Remove unused domains
4. **Test CORS configuration** - Verify cross-origin requests work as expected
5. **Origin validation required** - Production/test environments require valid origins
6. **Block direct API access** - Prevents unauthorized curl/mobile app requests

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
