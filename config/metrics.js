import promClient from 'prom-client';
import logger from './logging.js';

// Create a Registry
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: 'nel-webapp'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDurationSeconds = new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const activeConnections = new promClient.Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(databaseQueryDurationSeconds);
register.registerMetric(activeConnections);

// Error counter
const errorCounter = new promClient.Counter({
    name: 'app_errors_total',
    help: 'Total number of application errors',
    labelNames: ['type']
});
register.registerMetric(errorCounter);

// Memory usage gauge
const memoryUsage = new promClient.Gauge({
    name: 'app_memory_usage_bytes',
    help: 'Application memory usage in bytes',
    collect() {
        const usage = process.memoryUsage();
        this.set(usage.heapUsed);
    }
});
register.registerMetric(memoryUsage);

// Authentication metrics
const authMetrics = {
    loginAttempts: new promClient.Counter({
        name: 'auth_login_attempts_total',
        help: 'Total number of login attempts',
        labelNames: ['status'] // success, failed
    }),
    activeUsers: new promClient.Gauge({
        name: 'auth_active_users',
        help: 'Number of currently active users'
    }),
    registrationCount: new promClient.Counter({
        name: 'auth_registrations_total',
        help: 'Total number of user registrations'
    })
};

// OpenAI API metrics
const openaiMetrics = {
    apiLatency: new promClient.Histogram({
        name: 'openai_api_latency_seconds',
        help: 'OpenAI API request latency',
        labelNames: ['endpoint'],
        buckets: [0.1, 0.5, 1, 2, 5, 10]
    }),
    apiCalls: new promClient.Counter({
        name: 'openai_api_calls_total',
        help: 'Total number of OpenAI API calls',
        labelNames: ['endpoint', 'status']
    }),
    tokenUsage: new promClient.Counter({
        name: 'openai_token_usage_total',
        help: 'Total number of tokens used',
        labelNames: ['type'] // prompt, completion
    })
};

// Character interaction metrics
const characterMetrics = {
    creationCount: new promClient.Counter({
        name: 'character_creations_total',
        help: 'Total number of characters created'
    }),
    activeCharacters: new promClient.Gauge({
        name: 'character_active_total',
        help: 'Number of active characters'
    }),
    interactionCount: new promClient.Counter({
        name: 'character_interactions_total',
        help: 'Total number of character interactions',
        labelNames: ['character_id']
    }),
    responseTime: new promClient.Histogram({
        name: 'character_response_time_seconds',
        help: 'Time taken for character responses',
        labelNames: ['character_id'],
        buckets: [0.1, 0.5, 1, 2, 5, 10]
    })
};

// Resource usage metrics
const resourceMetrics = {
    cpuUsage: new promClient.Gauge({
        name: 'app_cpu_usage_percent',
        help: 'Application CPU usage percentage'
    }),
    memoryUsageDetailed: new promClient.Gauge({
        name: 'app_memory_detailed_bytes',
        help: 'Detailed application memory usage',
        labelNames: ['type'] // heapTotal, heapUsed, external, rss
    })
};

// Register all metrics
Object.values(authMetrics).forEach(metric => register.registerMetric(metric));
Object.values(openaiMetrics).forEach(metric => register.registerMetric(metric));
Object.values(characterMetrics).forEach(metric => register.registerMetric(metric));
Object.values(resourceMetrics).forEach(metric => register.registerMetric(metric));

export {
    register,
    httpRequestDurationMicroseconds,
    httpRequestsTotal,
    databaseQueryDurationSeconds,
    activeConnections,
    errorCounter,
    memoryUsage,
    authMetrics,
    openaiMetrics,
    characterMetrics,
    resourceMetrics
}; 