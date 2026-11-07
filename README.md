# AI Autonomous Database Administrator

A web application for automated PostgreSQL database tuning using rule-based AI analysis.

## Features

- **Database Status Monitoring**: Real-time database health metrics
- **Performance Analysis**: View table performance metrics including scans, inserts, and updates
- **AI Auto-Tuning**: Rule-based analysis that recommends:
  - Index creation for tables with high sequential scans
  - VACUUM operations for tables with dead tuples
  - Configuration parameter adjustments
- **Selective Application**: Choose which recommendations to apply

## Tech Stack

- **Frontend**: React with Axios
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **AI**: Rule-based auto-tuning logic

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Edit `.env` with your PostgreSQL credentials:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
```

5. Start the backend server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Database Requirements

For the auto-tuning features to work properly, ensure your PostgreSQL database has:

1. **pg_stat_statements extension enabled**:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

2. **Sufficient permissions** for the database user to:
   - Read pg_stat_* views
   - Execute VACUUM
   - Create indexes
   - ALTER SYSTEM for configuration changes

## Usage

1. Open the application in your browser
2. View the database status and performance metrics
3. Click "Run Analysis" to perform AI auto-tuning analysis
4. Review the recommendations (high, medium, low priority)
5. Select the recommendations you want to apply
6. Click "Apply Selected" to implement the changes

## Auto-Tuning Rules

The system uses the following rule-based AI logic:

### Index Recommendations
- Trigger: Table has > 1000 sequential scans and 0 index scans
- Action: Suggest creating an index on the table

### Vacuum Recommendations
- Trigger: Table has > 10,000 dead tuples
- Action: Suggest running VACUUM ANALYZE

### Configuration Recommendations
- Trigger: shared_buffers < 128MB
- Action: Suggest increasing to 256MB

## API Endpoints

- `GET /api/health` - Server health check
- `GET /api/database/status` - Database status information
- `GET /api/database/performance` - Table performance metrics
- `GET /api/database/queries` - Query performance statistics
- `POST /api/autotune/analyze` - Run auto-tuning analysis
- `POST /api/autotune/apply` - Apply selected recommendations

## Project Structure

```
ai-database-admin/
├── backend/
│   ├── server.js          # Express server with API endpoints
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── App.js         # React main component
│   │   └── App.css        # Application styles
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## Security Notes

- Never commit `.env` files with real credentials
- Use strong database passwords
- Consider implementing authentication for production use
- Review recommendations before applying them in production

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env` file
- Ensure database user has necessary permissions

### pg_stat_statements Errors
- Enable the extension in PostgreSQL: `CREATE EXTENSION pg_stat_statements;`
- Add to postgresql.conf: `shared_preload_libraries = 'pg_stat_statements'`
- Restart PostgreSQL after configuration changes

### CORS Errors
- Ensure backend is running on port 5000
- Check that CORS is properly configured in server.js

## Future Enhancements

- Add user authentication
- Support for additional database types (MySQL, MongoDB)
- Historical performance tracking
- Machine learning-based recommendations
- Scheduled auto-tuning jobs
- Alert system for critical issues
