# Transaction Service

A microservice for managing financial transactions in the Expense Tracker application. This service handles transaction creation, retrieval, and management with secure session verification and comprehensive logging.

## Overview

The Transaction Service is a Node.js/Express-based microservice that provides RESTful APIs for transaction operations. It integrates with PostgreSQL for data persistence, Redis for caching/sessions, and includes robust error handling, security features, and logging capabilities.

## Features

- **Transaction Management**: Create, read, and manage financial transactions
- **Session Verification**: JWT-based authentication middleware
- **Security**: CORS protection, helmet security headers, and compression middleware
- **Database**: PostgreSQL with Knex query builder
- **Caching**: Redis integration for session management
- **Logging**: Winston logger with environment-specific logging levels
- **Graceful Shutdown**: Proper cleanup of database connections on service termination
- **Development Tools**: Nodemon for auto-reload during development

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: PostgreSQL (pg driver 8.16.3)
- **Query Builder**: Knex.js 3.1.0
- **Caching**: Redis 5.8.1
- **Authentication**: JSON Web Tokens (jsonwebtoken 9.0.2)
- **Logging**: Winston 3.17.0
- **Security**: Helmet, CORS
- **Environment**: dotenvx for environment variable management
- **Development**: Nodemon, Morgan (HTTP logging)

## Project Structure

```
.
├── index.js                           # Application entry point
├── package.json                       # Project dependencies
├── config/
│   ├── db.js                         # Database connection configuration
│   ├── knex.js                       # Knex query builder configuration
│   └── logger.js                     # Winston logger configuration
├── middleware/
│   └── verifySession.js              # JWT session verification middleware
├── src/
│   ├── controllers/
│   │   └── transactionController.js  # Business logic for transactions
│   ├── models/
│   │   └── Transactions.js           # Transaction data model
│   ├── routes/
│   │   └── transactionServiceRouter.js # API route definitions
│   └── service/
│       └── transactionService.js     # Service layer for business logic
└── utils/
    ├── fakerTransactions.js          # Fake data generation utility
    ├── redisConnection.js            # Redis connection management
    └── setupGracefulShutdown.js      # Graceful shutdown handler
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd expenseTracker-transaction-service
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/expense_tracker
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

## Usage

### Development Mode

Start the application in development mode with auto-reload:
```bash
npm run dev
```

The service will start and watch for file changes using Nodemon.

### Production Mode

Start the application:
```bash
node index.js
```

## API Endpoints

The service provides transaction-related endpoints through the transaction router. All endpoints require JWT session verification.

### Core Routes

Routes are defined in `src/routes/transactionServiceRouter.js` and include:
- Transaction CRUD operations
- Transaction filtering and retrieval
- Transaction history and analytics

## Configuration

### CORS Configuration

The service allows requests from the following origins:
- `http://localhost:3000` (local development)
- `https://expense-tracker-self-rho-12.vercel.app/` (production)

### Environment-Specific Settings

- **Development**: Morgan HTTP request logging enabled
- **Production**: Minimal logging for performance

## Middleware Stack

1. **CORS**: Cross-Origin Resource Sharing with credential support
2. **express.json()**: JSON body parsing
3. **compression**: Response compression
4. **cookieParser**: Cookie parsing
5. **morgan**: HTTP request logging (development only)
6. **verifySession**: JWT authentication verification
7. **Error Handling**: Application-level error catching middleware

## Database

### Connection Management

Database connections are configured through:
- `config/db.js`: Raw PostgreSQL connection pool
- `config/knex.js`: Knex query builder instance

### Graceful Shutdown

The application handles graceful shutdown by:
- Closing database connections
- Closing Redis connections
- Properly terminating the process

## Logging

Winston logger is configured in `config/logger.js` with:
- Environment-specific log levels
- Structured logging output
- Error tracking and reporting

## Error Handling

The application includes application-level error catching middleware that:
- Logs errors with full stack trace
- Returns consistent error responses to clients
- Prevents unhandled exceptions from crashing the service

## Development

### Scripts

- `npm run dev`: Start development server with auto-reload
- `npm test`: Run tests (currently placeholder)

### Code Organization

- **Controllers**: Handle HTTP request/response logic
- **Services**: Contain business logic for transactions
- **Models**: Define data structures and database interactions
- **Routes**: Define API endpoints and route handlers
- **Middleware**: Handle cross-cutting concerns (auth, logging, etc.)
- **Utils**: Utility functions and configuration helpers

## Dependencies

See `package.json` for the complete list of dependencies with versions.

### Key Dependencies:
- **express**: Web framework
- **pg**: PostgreSQL driver
- **knex**: Query builder
- **redis**: Caching and session management
- **jsonwebtoken**: Authentication
- **winston**: Logging
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing
- **@faker-js/faker**: Fake data generation (for testing/development)

## License

ISC

## Author

Gagan Upadhyay

## Contributing

When contributing to this project:
1. Ensure all changes follow the existing code structure
2. Add appropriate error handling and logging
3. Test changes in development mode before committing
4. Follow the existing naming conventions
