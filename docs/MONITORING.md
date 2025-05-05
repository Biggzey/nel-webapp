# Monitoring Guide

The application uses Prometheus and Grafana for monitoring and visualization.

## Metrics Available

### HTTP Metrics
- Request duration
- Total requests
- Active connections
- Status codes distribution

### Authentication Metrics
- Login attempts (success/failure)
- Active users
- Registration count

### OpenAI API Metrics
- API latency
- API calls count
- Token usage

### Character Metrics
- Character creation count
- Active characters
- Interaction count
- Response time

### Resource Usage
- CPU usage
- Memory usage (heap, external, RSS)
- Database query duration

## Setting Up Monitoring

1. Start Prometheus:
   ```bash
   npm run start-prometheus
   ```
   Access Prometheus UI at `http://localhost:9090`

2. Start Grafana:
   ```bash
   docker-compose up grafana
   ```
   Access Grafana at `http://localhost:3000`
   - Default credentials:
     - Username: admin
     - Password: admin

3. Configure Grafana:
   - Add Prometheus as a data source
   - Import the provided dashboards from `grafana/dashboards/`

## Dashboard Descriptions

### Main Application Dashboard
- Request rate and latency
- Error rate
- Active users
- System resources

### Character Interaction Dashboard
- Character creation/deletion rate
- Message volume
- Response times
- Popular characters

### OpenAI Usage Dashboard
- API call volume
- Token consumption
- Cost tracking
- Error rates

## Alert Rules

### HTTP Alerts
- High error rate (>5% of requests)
- High latency (>2s average)
- Unusual traffic patterns

### Resource Alerts
- High CPU usage (>80%)
- High memory usage (>80%)
- Database connection issues

### OpenAI Alerts
- API errors
- High token usage
- Cost thresholds

## Logging

Logs are stored in the `logs` directory:
- `error.log` - Error messages only
- `combined.log` - All log messages
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### Log Rotation
- Maximum file size: 5MB
- Maximum files: 5 per type
- Automatic compression of old logs

## Metrics Endpoints

### Application Metrics
```
GET /metrics
```
Returns Prometheus-formatted metrics

### Custom Metrics
- `http_request_duration_seconds`
- `http_requests_total`
- `database_query_duration_seconds`
- `active_connections`
- `auth_login_attempts_total`
- `openai_api_latency_seconds`
- `character_interactions_total`

## Troubleshooting

1. Prometheus not scraping metrics:
   - Check Prometheus configuration
   - Verify target is reachable
   - Check port configuration

2. Grafana issues:
   - Verify Prometheus data source
   - Check dashboard JSON
   - Review permissions

3. Missing metrics:
   - Ensure monitoring is enabled
   - Check log files for errors
   - Verify metric registration

## Best Practices

1. Regular monitoring review
2. Alert threshold tuning
3. Dashboard optimization
4. Log rotation management
5. Metric cardinality control 