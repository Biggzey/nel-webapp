import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nel WebApp API',
      version: '1.0.0',
      description: 'API documentation for Nel WebApp',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://nel-webapp.onrender.com' 
          : 'http://localhost:3001',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server' 
          : 'Development server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./server.js'], // Path to the API docs
};

export const specs = swaggerJsdoc(options); 