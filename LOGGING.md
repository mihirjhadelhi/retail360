# Logging System Documentation

This application has separate logging systems for frontend and backend errors.

## Backend Logging

### Log File Location
- **Backend logs**: `server/logs/backend.log`
- **Frontend logs**: `server/logs/frontend.log`

### Usage

The backend logger is available in all route files:

```javascript
const logger = require('../utils/logger');

// Log errors
logger.backend.error('Error message', { details: 'additional info' });

// Log warnings
logger.backend.warn('Warning message', { details: 'additional info' });

// Log info
logger.backend.info('Info message', { details: 'additional info' });

// Log debug
logger.backend.debug('Debug message', { details: 'additional info' });
```

### Log Format

Each log entry includes:
- Timestamp (ISO format)
- Log level (ERROR, WARN, INFO, DEBUG)
- Message
- Additional details (JSON format)

Example:
```
[2026-01-26T14:30:45.123Z] [ERROR] Error fetching products | Details: {"message":"Connection timeout","stack":"..."}
```

### API Endpoints

- `GET /api/logs?type=backend&lines=100` - Get backend logs (last 100 lines)
- `GET /api/logs?type=frontend&lines=100` - Get frontend logs (last 100 lines)
- `DELETE /api/logs?type=backend` - Clear backend logs
- `DELETE /api/logs?type=frontend` - Clear frontend logs

## Frontend Logging

### Usage

The frontend logger is available in all components:

```javascript
import logger from '../utils/logger';

// Log errors
logger.error('Error message', { details: 'additional info' });

// Log warnings
logger.warn('Warning message', { details: 'additional info' });

// Log info
logger.info('Info message', { details: 'additional info' });
```

### Features

1. **Automatic Backend Logging**: All frontend errors are automatically sent to the backend and logged to `frontend.log`

2. **LocalStorage Backup**: Errors are also stored in browser localStorage as backup (max 100 entries)

3. **Global Error Handlers**: Automatically catches:
   - Unhandled JavaScript errors
   - Unhandled promise rejections

4. **Error Details Captured**:
   - Error message
   - Stack trace
   - URL where error occurred
   - User agent
   - Timestamp

### Accessing Stored Errors

```javascript
import logger from '../utils/logger';

// Get stored errors from localStorage
const errors = logger.getStoredErrors();

// Clear stored errors
logger.clearStoredErrors();

// Download errors as JSON file
logger.downloadErrors();
```

## Log File Management

### Viewing Logs

**Backend logs:**
```bash
# View last 50 lines
tail -n 50 server/logs/backend.log

# Follow logs in real-time
tail -f server/logs/backend.log
```

**Frontend logs:**
```bash
# View last 50 lines
tail -n 50 server/logs/frontend.log

# Follow logs in real-time
tail -f server/logs/frontend.log
```

### Clearing Logs

Logs can be cleared via API:
```javascript
// Clear backend logs
await logsAPI.clearLogs('backend');

// Clear frontend logs
await logsAPI.clearLogs('frontend');
```

Or manually delete the log files:
```bash
rm server/logs/backend.log
rm server/logs/frontend.log
```

## Log Rotation

For production, consider implementing log rotation to prevent log files from growing too large. You can use tools like:
- `logrotate` (Linux)
- `winston-daily-rotate-file` (Node.js package)

## Best Practices

1. **Use appropriate log levels**:
   - `error`: For errors that need attention
   - `warn`: For warnings that might indicate issues
   - `info`: For informational messages
   - `debug`: For debugging information

2. **Include context**: Always include relevant details in the log entry

3. **Don't log sensitive data**: Avoid logging passwords, tokens, or personal information

4. **Monitor log files**: Regularly check log files for errors and warnings

5. **Clear old logs**: Periodically clear or archive old log files

## Example Usage

### Backend Route
```javascript
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    logger.backend.error('Error fetching products', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Component
```javascript
const fetchProducts = async () => {
  try {
    const response = await productsAPI.getAll();
    setProducts(response.data);
  } catch (error) {
    logger.error('Error fetching products', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    alert('Failed to fetch products');
  }
};
```

