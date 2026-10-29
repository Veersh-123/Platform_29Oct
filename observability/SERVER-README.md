# Test Automation Reports Server

Professional Express.js server for showcasing Hexaware test automation reports with interactive dashboards.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Install server dependencies
npm install

# Build project and generate reports
npm run build
npm run dashboards

# Start the server
npm run server
```

### Development Mode
```bash
# Start server with auto-reload
npm run dev-server
```

## 📊 Features

### 🎯 Professional Landing Page
- Clean, responsive design
- Report overview with statistics
- Direct navigation to dashboards
- Real-time update timestamps

### 🥒 Cucumber Dashboard
- AI-powered test analysis
- Failed scenario details
- Interactive charts and metrics
- Bug categorization

### 🔭 Observability Dashboard
- System health monitoring
- Pass rate trends
- AI insights and alerts
- Browser coverage visualization

### 🔗 API Endpoints
- `GET /` - Landing page
- `GET /reports/cucumber-dashboard.html` - Cucumber report
- `GET /reports/observability-dashboard.html` - Observability report
- `GET /api/reports` - Reports metadata JSON
- `GET /api/historic-data` - Historic test data JSON
- `GET /health` - Server health check

## 🛠️ Server Configuration

### Environment Variables
```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production         # Environment mode
```

### Directory Structure
```
├── server.js              # Express server
├── package.json           # Server dependencies
├── output/                 # Generated reports
│   ├── cucumber-dashboard.html
│   ├── observability-dashboard.html
│   └── historic-data.json
└── assets/                 # Static assets
    └── images/
        └── logo-hexaware.png
```

## 🌐 Usage

1. **Access Landing Page**
   ```
   http://localhost:3000
   ```

2. **View Cucumber Report**
   ```
   http://localhost:3000/reports/cucumber-dashboard.html
   ```

3. **View Observability Report**
   ```
   http://localhost:3000/reports/observability-dashboard.html
   ```

4. **API Access**
   ```bash
   # Get reports list
   curl http://localhost:3000/api/reports
   
   # Get historic data
   curl http://localhost:3000/api/historic-data
   
   # Health check
   curl http://localhost:3000/health
   ```

## 🎨 Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Professional UI**: Clean, modern interface with Hexaware branding
- **Real-time Stats**: Latest test statistics on landing page
- **Cross-Navigation**: Easy switching between reports
- **API Integration**: RESTful endpoints for data access
- **Error Handling**: Graceful 404 and error pages

## 🔧 Customization

### Styling
The landing page uses inline CSS for easy customization. Key colors:
- Primary: `#07125E` (Hexaware blue)
- Secondary: `#007bff` (Bootstrap blue)
- Background: `linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)`

### Adding New Reports
1. Generate report HTML in `output/` directory
2. Add route in `server.js`
3. Update landing page with new report card

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Server Logs
- Server startup information
- Request logs
- Error tracking

## 🚀 Deployment

### Production Mode
```bash
npm run server
```

### Development Mode
```bash
npm run dev-server
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "run", "server"]
```

## 🛡️ Security

- Static file serving with proper headers
- Error handling without sensitive information
- CORS-ready for API endpoints
- Input validation on API routes