# API Documentation

## Authentication

### POST /api/auth/register
Register a new user.
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
```

### POST /api/auth/login
Login and receive JWT token.
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

## Characters

### GET /api/characters
Get all characters for the authenticated user.
- Headers: `Authorization: Bearer <token>`

### POST /api/characters
Create a new character.
- Headers: `Authorization: Bearer <token>`
```json
{
  "name": "Character Name",
  "personality": "Character personality",
  "avatar": "/path/to/avatar.png",
  "systemPrompt": "System prompt for character",
  "customInstructions": "Custom instructions"
}
```

### PUT /api/characters/:id
Update a character.
- Headers: `Authorization: Bearer <token>`
```json
{
  "name": "Updated Name",
  "personality": "Updated personality",
  "avatar": "/path/to/new-avatar.png",
  "systemPrompt": "Updated system prompt",
  "customInstructions": "Updated instructions"
}
```

### DELETE /api/characters/:id
Delete a character.
- Headers: `Authorization: Bearer <token>`

## Chat Messages

### GET /api/chat/:characterId/messages
Get chat messages for a character.
- Headers: `Authorization: Bearer <token>`

### POST /api/chat/:characterId/message
Send a new message.
- Headers: `Authorization: Bearer <token>`
```json
{
  "role": "user",
  "content": "Message content",
  "reactions": {}
}
```

### PUT /api/chat/:characterId/message/:messageId
Update a message (e.g., add reactions).
- Headers: `Authorization: Bearer <token>`
```json
{
  "reactions": {
    "❤️": 1
  }
}
```

## User Preferences

### GET /api/preferences
Get user preferences.
- Headers: `Authorization: Bearer <token>`

### PUT /api/preferences
Update user preferences.
- Headers: `Authorization: Bearer <token>`
```json
{
  "selectedCharId": 1
}
```

## Monitoring

### GET /metrics
Get Prometheus metrics (when enabled).
- Returns metrics in Prometheus format

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "error": "Not authorized to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "An unexpected error occurred"
}
```

## Rate Limiting

All endpoints are rate-limited to 100 requests per 15 minutes per IP address. 