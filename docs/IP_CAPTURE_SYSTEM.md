# IP Address Capturing System

## Overview
This system captures and stores the IP addresses of users when they register or log in. The system is designed to work only for regular users and excludes admin users.

## Features

### Backend Implementation

#### 1. IP Capture Controller (`backend/src/controllers/userController.ts`)
- **Function**: `captureUserIP`
- **Purpose**: Captures user IP address and stores it in Firestore
- **Authentication**: Requires user authentication
- **IP Sources**: Multiple fallback sources for IP detection:
  - `req.headers['x-forwarded-for']`
  - `req.headers['x-real-ip']`
  - `req.connection.remoteAddress`
  - `req.socket.remoteAddress`
  - `req.ip` (Express.js built-in)
- **Validation**: Rejects invalid IP formats before storing

#### 2. Firestore Storage
- **Collection**: `userIPLogs`
- **Document ID**: User ID
- **Fields**:
  - `userId`: User's unique identifier
  - `ipAddress`: Captured IP address
  - `userAgent`: Browser/device information
  - `timestamp`: When IP was captured
  - `lastUpdated`: Last update timestamp

#### 3. User Document Update
- **Collection**: `users`
- **Fields Added**:
  - `currentIP`: Current IP address
  - `lastIPUpdate`: Last IP update timestamp

#### 4. API Endpoint
- **Route**: `POST /api/users/capture-ip`
- **Authentication**: Required (Bearer token)
- **Response**: JSON with success status, IP address, and timestamp

### Frontend Implementation

#### 1. API Service (`src/services/api/user.ts`)
- **Function**: `captureUserIP`
- **Purpose**: Calls backend endpoint to capture IP
- **Error Handling**: Includes token refresh logic
- **Response Type**: `IPCaptureResponse`
- **Client Fallback**: Removed to avoid repeated external requests

#### 2. Auth Integration
- IP address is captured during user registration and login only.
- The value is stored in Firestore and reused in features like mega tests.

#### 3. State Management
No periodic IP capture is performed on the Index page anymore.

## Security Considerations

### 1. Authentication Required
- Only authenticated users can capture IP addresses
- Admin users are excluded from IP capture

### 2. Proxy Support
- Backend configured with `trust proxy` for accurate IP detection
- Handles various proxy headers (`x-forwarded-for`, `x-real-ip`)

### 3. Data Privacy
- IP addresses are stored securely in Firestore
- User consent should be obtained for IP collection
- Consider GDPR compliance for EU users

## Usage

### For Users
1. Register or log in to the application
2. Your IP address is captured once and stored in Firestore

### For Developers
1. Backend automatically handles IP detection
2. Frontend displays IP in a user-friendly format
3. No additional configuration required

## Testing

### Backend Tests
- Location: `backend/src/tests/ipCapture.test.ts`
- Tests IP capture functionality
- Verifies authentication requirements
- Mocks Firebase interactions

### Manual Testing
1. Start backend server
2. Register or log in as a regular user
3. Verify IP address is stored in Firestore

## Configuration

### Environment Variables
- No additional environment variables required
- Uses existing Firebase configuration

### Dependencies
- Backend: Express.js, Firebase Admin
- Frontend: React Query, Axios

## Future Enhancements

### Potential Improvements
1. **IP Geolocation**: Add location data based on IP
2. **IP History**: Track IP changes over time
3. **Security Alerts**: Detect suspicious IP changes
4. **Analytics**: IP-based usage analytics
5. **Rate Limiting**: Prevent IP capture abuse

### Monitoring
1. **Logs**: Monitor IP capture success/failure rates
2. **Storage**: Track Firestore usage
3. **Performance**: Monitor API response times
4. **Security**: Monitor for unusual IP patterns 