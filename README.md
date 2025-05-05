# Nel WebApp

A modern web application featuring an AI companion powered by OpenAI's GPT models. The application provides a personalized chat experience with customizable AI characters.

## Features

- 🤖 AI Character Interaction
- 🔐 Secure User Authentication
- 💾 PostgreSQL Database Storage
- 📊 Prometheus & Grafana Monitoring
- 🎨 Dark/Light Theme Support
- 📱 Responsive Design
- 🔄 Real-time Chat Updates
- ⚡ Fast Development Setup

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v16 or higher)
- OpenAI API Key
- pgAdmin 4 (optional, for database management)

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` for development
   - Set up `.env.production` for production
   - Configure required variables (see Environment Setup section in docs)

4. Initialize the database:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev:single
   ```

6. Visit `http://localhost:5173` in your browser

## Documentation

Detailed documentation can be found in the `docs` directory:

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Environment Setup](docs/ENVIRONMENT.md)
- [Monitoring Guide](docs/MONITORING.md)
- [Backup & Recovery](docs/BACKUP_RECOVERY.md)

## Scripts

- `npm run dev:single` - Start development server (combined frontend and backend)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prod` - Build and start production server

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 