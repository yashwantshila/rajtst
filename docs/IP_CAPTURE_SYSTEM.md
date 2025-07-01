# IP Address Capturing System

## Overview
This system captures and stores the IP addresses of users when they visit the Index.tsx page (logged-in page). The system is designed to work only for regular users and excludes admin users.

## Features

### Backend Implementation

#### 1. IP Capture Controller (`backend/src/controllers/userController.ts`)
- **Function**: `captureUserIP`
- **Purpose**: Captures user IP address and stores it in Firestore
- **Authentication**: Requires user authentication
- **IP Sources**: Multiple fallback sources for IP detection:
  - `req.ip` (Express.js built-in)
  - `req.connection.remoteAddress`
  - `req.socket.remoteAddress`
  - `req.headers['x-forwarded-for']`
  - `req.headers['x-real-ip']`

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

#### 2. Index Page Integration (`src/pages/Index.tsx`)
- **IP Display**: Shows captured IP at the top of the page
- **User Filtering**: Only shows for authenticated non-admin users
- **Real-time Updates**: Displays loading state and captured IP
- **Visual Design**: Blue-themed banner with globe icon

#### 3. State Management
- **State Variables**:
  - `userIP`: Stores captured IP address
  - `isCapturingIP`: Loading state for IP capture
- **Mutations**: Uses React Query for API calls
- **Effects**: Automatically captures IP on page load

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
1. Log in to the application
2. Navigate to the Index page
3. IP address is automatically captured and displayed
4. IP is stored in Firestore for future reference

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
2. Log in as a regular user
3. Visit Index page
4. Verify IP address is displayed
5. Check Firestore for stored data

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