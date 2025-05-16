# Environment Setup Guide

## Environment Files

The application uses two environment files:
- `.env` for development
- `.env.production` for production

## Required Environment Variables

### Database Configuration
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### Authentication
```env
JWT_SECRET="your-secure-jwt-secret"
```

### OpenAI Configuration
```env
OPENAI_API_KEY="your-openai-api-key"
```

### Server Configuration
```env
PORT=3001
NODE_ENV="development" # or "production"
ALLOWED_ORIGINS="http://localhost:5173,https://your-production-domain.com"
```

### SMTP Configuration
```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@example.com"
FRONTEND_URL="http://localhost:5173" # or your production URL
```

## Optional Environment Variables

### Monitoring Configuration
```env
ENABLE_MONITORING=true
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
```

### Logging Configuration
```env
LOG_LEVEL="info" # debug, info, warn, or error
MAX_LOG_SIZE="5m"
MAX_LOG_FILES=5
```

## Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the variables in `.env` with your development values

3. Create the PostgreSQL database:
   ```sql
   CREATE DATABASE nel_webapp;
   CREATE USER nel_app_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE nel_webapp TO nel_app_user;
   ```

4. Initialize the database schema:
   ```bash
   npx prisma db push
   ```

## Production Setup

1. Create `.env.production` with production values:
   ```env
   NODE_ENV="production"
   DATABASE_URL="postgresql://username:password@production-db-host:5432/database_name"
   JWT_SECRET="long-random-secure-string"
   OPENAI_API_KEY="your-openai-api-key"
   ALLOWED_ORIGINS="https://your-production-domain.com"
   ```

2. Set up SSL certificate paths if using HTTPS:
   ```env
   SSL_KEY_PATH="/path/to/private.key"
   SSL_CERT_PATH="/path/to/certificate.crt"
   ```

3. Configure monitoring for production:
   ```env
   ENABLE_MONITORING=true
   PROMETHEUS_PORT=9090
   GRAFANA_PORT=3000
   ```

## Security Best Practices

1. Use strong, unique passwords for database users
2. Generate a secure JWT secret (at least 32 characters)
3. Keep the OpenAI API key secure
4. Restrict ALLOWED_ORIGINS to necessary domains
5. Use SSL/TLS in production
6. Set appropriate rate limits

## Environment Variable Descriptions

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL connection string | Yes | - |
| JWT_SECRET | Secret for JWT token signing | Yes | - |
| OPENAI_API_KEY | OpenAI API key | Yes | - |
| PORT | Server port number | No | 3001 |
| NODE_ENV | Environment mode | No | "development" |
| ALLOWED_ORIGINS | Comma-separated list of allowed origins | No | http://localhost:5173 |
| ENABLE_MONITORING | Enable Prometheus metrics | No | false |
| LOG_LEVEL | Logging level | No | "info" |
| SMTP_HOST | SMTP server hostname | Yes | - |
| SMTP_PORT | SMTP server port | Yes | - |
| SMTP_SECURE | Use TLS for SMTP | Yes | false |
| SMTP_USER | SMTP username | Yes | - |
| SMTP_PASS | SMTP password | Yes | - |
| SMTP_FROM | From email address | Yes | - |
| FRONTEND_URL | Frontend application URL | Yes | - |