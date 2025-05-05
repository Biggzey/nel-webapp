# Backup & Recovery Guide

## Database Backup

### Manual Backup

Using pg_dump:
```bash
pg_dump -U nel_app_user -d nel_webapp -F c -f backup.dump
```

Using the provided script:
```bash
./scripts/backup-db.bat
```

### Automated Backup

1. Create a backup script:
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="nel_webapp"
DB_USER="nel_app_user"

# Create backup
pg_dump -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/$DB_NAME_$TIMESTAMP.dump"

# Cleanup old backups (keep last 7 daily)
find $BACKUP_DIR -name "*.dump" -type f -mtime +7 -delete
```

2. Add to crontab:
```bash
0 0 * * * /path/to/backup-script.sh
```

## Database Recovery

### Full Recovery

Using pg_restore:
```bash
pg_restore -U nel_app_user -d nel_webapp -c backup.dump
```

Using the provided script:
```bash
./scripts/restore-db.bat path/to/backup.dump
```

### Point-in-Time Recovery

1. Stop the application:
   ```bash
   pm2 stop nel-webapp
   ```

2. Restore the database:
   ```bash
   pg_restore -U nel_app_user -d nel_webapp -c backup.dump
   ```

3. Start the application:
   ```bash
   pm2 start nel-webapp
   ```

## Backup Strategy

### Daily Backups
- Automated backup every day at midnight
- Retention: 7 days
- Location: Local storage

### Weekly Backups
- Automated backup every Sunday
- Retention: 4 weeks
- Location: Local + Cloud storage

### Monthly Backups
- Automated backup on 1st of each month
- Retention: 3 months
- Location: Local + Cloud storage

## File Storage Backup

### Static Files
- Avatar images
- Uploaded content
- Public assets

Backup command:
```bash
tar -czf static_backup.tar.gz public/
```

### Configuration Files
- Environment files
- Nginx configuration
- PM2 configuration

Backup command:
```bash
tar -czf config_backup.tar.gz .env.production nginx/ ecosystem.config.js
```

## Cloud Storage Integration

### AWS S3
```bash
# Upload to S3
aws s3 cp backup.dump s3://your-bucket/backups/

# Download from S3
aws s3 cp s3://your-bucket/backups/backup.dump .
```

### Google Cloud Storage
```bash
# Upload to GCS
gsutil cp backup.dump gs://your-bucket/backups/

# Download from GCS
gsutil cp gs://your-bucket/backups/backup.dump .
```

## Disaster Recovery Plan

### 1. Database Corruption
1. Stop application
2. Restore latest backup
3. Verify data integrity
4. Restart application

### 2. Server Failure
1. Launch new server instance
2. Install dependencies
3. Restore configuration
4. Restore database
5. Update DNS if needed

### 3. Data Center Outage
1. Switch to backup region
2. Restore from cloud backup
3. Update DNS records
4. Verify application health

## Monitoring Backups

### Backup Success Monitoring
- Check backup job logs
- Monitor backup file sizes
- Verify backup integrity

### Storage Monitoring
- Monitor available disk space
- Track backup growth rate
- Alert on storage issues

## Recovery Testing

### Monthly Testing
1. Create test environment
2. Restore latest backup
3. Verify application functionality
4. Document recovery time
5. Update procedures if needed

### Verification Checklist
- [ ] Database restored successfully
- [ ] Application starts correctly
- [ ] User data is intact
- [ ] File attachments accessible
- [ ] Monitoring systems working

## Best Practices

1. Regular backup testing
2. Encrypted backup storage
3. Geographic redundancy
4. Automated verification
5. Documentation maintenance 