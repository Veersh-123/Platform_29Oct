# Deployment Guide - Gemini Test Case Generator

Complete guide for deploying the test case generator to production.

## Pre-Deployment Checklist

### Development Environment Verification

- [ ] All code tested locally
- [ ] All files created successfully
- [ ] Backend server starts without errors
- [ ] Frontend integration works
- [ ] Test case generation verified with multiple stories
- [ ] All export formats functional
- [ ] No console errors in browser
- [ ] No errors in server logs

### Code Review

- [ ] All .js files reviewed
- [ ] No console.log() left in production code
- [ ] Error handling comprehensive
- [ ] Input validation complete
- [ ] Security checks in place
- [ ] Comments added for complex logic

## Production Setup

### 1. Environment Configuration

**Create production .env file:**

```env
# Production Environment
NODE_ENV=production
PORT=3000

# Gemini Configuration
GEMINI_API_KEY=your_production_api_key_here

# Test Case Generation
TEST_CASE_MIN_COUNT=8
TEST_CASE_MAX_COUNT=15
INCLUDE_POSITIVE_SCENARIOS=true
INCLUDE_NEGATIVE_SCENARIOS=true
INCLUDE_BOUNDARY_SCENARIOS=true

# Logging (optional)
LOG_LEVEL=info
LOG_FILE=logs/test-case-generator.log
```

**Secure your API key:**
- Use AWS Secrets Manager / Azure Key Vault / HashiCorp Vault
- Never commit `.env` to git
- Rotate API keys regularly
- Use environment-specific keys

### 2. Server Configuration

**Express Server Hardening:**

```javascript
// In server-setup.js, add for production:

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api/', limiter);
}
```

### 3. Deployment Options

#### Option A: Docker Deployment

**Create Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
```

**Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  test-case-generator:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - PORT=3000
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

**Deploy:**
```bash
docker-compose up -d
```

#### Option B: Cloud Platform Deployment

**AWS EC2 / Heroku / DigitalOcean:**

```bash
# 1. Clone repository
git clone <repo-url>
cd <project-folder>

# 2. Install dependencies
npm install --production

# 3. Set environment variables
export NODE_ENV=production
export GEMINI_API_KEY=your_api_key

# 4. Start with process manager
npm install -g pm2
pm2 start server-setup.js --name test-case-generator
pm2 save
```

#### Option C: Serverless Deployment

For AWS Lambda / Google Cloud Functions:

```javascript
// Adapt server-setup.js for serverless
const serverless = require('serverless-http');
const app = require('./server-setup');
module.exports.handler = serverless(app);
```

### 4. Database Setup (Optional)

If storing test cases:

```sql
CREATE TABLE test_cases (
  id VARCHAR(50) PRIMARY KEY,
  story_id VARCHAR(100),
  title VARCHAR(500),
  scenario VARCHAR(50),
  steps JSON,
  expected_result TEXT,
  test_data JSON,
  priority VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by VARCHAR(100)
);

CREATE INDEX idx_story_id ON test_cases(story_id);
CREATE INDEX idx_created_at ON test_cases(created_at);
```

## SSL/TLS Configuration

### Self-Signed Certificate (Development)

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
```

### Let's Encrypt (Production - with Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Reverse Proxy Setup (Nginx/Apache)

### Nginx Configuration

```nginx
upstream test_case_generator {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://test_case_generator;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    location /health {
        access_log off;
        proxy_pass http://test_case_generator;
    }
}
```

## Monitoring & Logging

### Application Logging

```javascript
// Add to server-setup.js
const fs = require('fs');
const morgan = require('morgan');

const logStream = fs.createWriteStream('logs/app.log', { flags: 'a' });

app.use(morgan('combined', { stream: logStream }));
```

### Health Monitoring

```bash
# Check application health every 30 seconds
watch -n 30 'curl -s http://localhost:3000/health | jq .'

# Or use uptime monitoring service
# - UptimeRobot
# - New Relic
# - Datadog
# - CloudWatch
```

### Error Tracking

Integrate with error tracking:

```javascript
// Add Sentry for error tracking
const Sentry = require("@sentry/node");

if (process.env.NODE_ENV === 'production') {
  Sentry.init({ 
    dsn: process.env.SENTRY_DSN,
    environment: 'production'
  });
  app.use(Sentry.Handlers.errorHandler());
}
```

## Performance Optimization

### Caching

```javascript
// Add Redis caching for repeated requests
const redis = require('redis');
const client = redis.createClient();

app.post('/api/test-cases/generate', async (req, res) => {
  const cacheKey = `test_cases_${req.body.storyId}`;
  
  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  
  // Generate and cache for 1 hour
  const result = await generateTestCases(req.body);
  await client.setex(cacheKey, 3600, JSON.stringify(result));
  
  res.json(result);
});
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const testCaseGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many test case generation requests'
});

app.post('/api/test-cases/generate', testCaseGenerationLimiter, ...);
```

## Backup & Recovery

### Database Backups

```bash
# Daily backup to S3
0 2 * * * pg_dump production_db | gzip > backup_$(date +\%Y\%m\%d).sql.gz && \
  aws s3 cp backup_$(date +\%Y\%m\%d).sql.gz s3://backups/test-case-generator/
```

### Application Snapshots

```bash
# Backup application files
tar -czf app_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  ./
```

## Rollback Procedure

### If Deployment Fails

```bash
# 1. Stop current version
pm2 stop test-case-generator

# 2. Switch to previous version
git checkout HEAD~1

# 3. Reinstall dependencies
npm install --production

# 4. Restart
pm2 start server-setup.js --name test-case-generator
```

### Zero-Downtime Deployment

```bash
# Use PM2 cluster mode
pm2 delete test-case-generator
pm2 start server-setup.js -i max --name test-case-generator

# Update with zero downtime
pm2 reload test-case-generator
```

## Security Hardening

### API Security Measures

- [ ] HTTPS/SSL enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation comprehensive
- [ ] SQL injection prevention (if using DB)
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] API authentication (optional but recommended)

### Example API Key Authentication

```javascript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});
```

## Load Testing

### Test with Apache Bench

```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/health
```

### Test with k6

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.post('http://localhost:3000/api/test-cases/generate', {
    storyId: 'PROJ-1',
    storyTitle: 'Test',
    acceptanceCriteria: 'Test criteria'
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

## CI/CD Pipeline Integration

### GitHub Actions Example

```yaml
name: Deploy Test Case Generator

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
      
      - name: Deploy to production
        run: |
          docker build -t test-case-generator .
          docker push your-registry/test-case-generator:latest
```

## Post-Deployment Verification

- [ ] Server responds to health check
- [ ] API endpoints accessible
- [ ] Test case generation works
- [ ] All exports functional
- [ ] Logs being written
- [ ] Monitoring active
- [ ] Backups verified
- [ ] Performance acceptable
- [ ] No security warnings
- [ ] Documentation updated

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify uptime monitoring

### Weekly
- [ ] Review application logs
- [ ] Check Gemini API quotas
- [ ] Verify backups successful
- [ ] Review security logs

### Monthly
- [ ] Update dependencies
- [ ] Rotate API keys
- [ ] Review performance metrics
- [ ] Update documentation
- [ ] Security audit

### Quarterly
- [ ] Major version updates
- [ ] Infrastructure review
- [ ] Cost analysis
- [ ] Capacity planning

## Support & SLA

### Service Level Agreement

- **Uptime Target:** 99.9%
- **Response Time:** < 5 seconds
- **Generation Success Rate:** > 95%
- **Support Hours:** 24/7 for critical issues

### Escalation Path

1. **Level 1:** Automated monitoring
2. **Level 2:** Development team (30 min response)
3. **Level 3:** Infrastructure team (15 min response)
4. **Level 4:** Management (immediate escalation)

## Disaster Recovery

### RTO/RPO Targets

- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 15 minutes

### Disaster Recovery Steps

1. Detect failure (automated monitoring)
2. Activate backup infrastructure
3. Restore from latest backup
4. Verify system functionality
5. Notify stakeholders
6. Document incident
7. Root cause analysis

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code review complete
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Security reviewed

### Deployment
- [ ] Environment configured
- [ ] Application deployed
- [ ] Database migrated
- [ ] SSL/TLS enabled

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring active
- [ ] Logs verified
- [ ] Users notified

### Validation
- [ ] All endpoints functional
- [ ] Performance acceptable
- [ ] No errors in logs
- [ ] Backup confirmed

---

**Version:** 1.0.0  
**Last Updated:** October 13, 2024  
**Status:** Production Ready ✅

For support or issues, contact the DevOps team.
