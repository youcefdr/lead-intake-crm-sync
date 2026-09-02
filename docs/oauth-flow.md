# HubSpot OAuth Flow

## 1. Goal

Implement and validate HubSpot OAuth 2.0 authentication independently from the existing n8n workflow.

The existing n8n workflow continues to use the HubSpot Service Key until the OAuth flow is fully tested and ready for integration.

## 2. HubSpot Account

Development account:

- Account name: Lead Intake CRM Sync - Test
- Account ID: 149204392

## 3. OAuth Application

The HubSpot project uses OAuth authentication.

Configured redirect URI:

```text
http://localhost:3000
```

Required scopes:

- `oauth`
- `crm.objects.contacts.read`
- `crm.objects.contacts.write`


## 4. Authorization Flow

```text
User opens HubSpot authorization URL
        ↓
User selects HubSpot account
        ↓
User grants requested permissions
        ↓
HubSpot redirects to localhost callback
        ↓
Callback server receives authorization code
        ↓
Authorization code is exchanged for tokens
```

## 5. Local Callback Server

A local Node.js callback server runs on:

```text
http://localhost:3000
```

The callback server receives the temporary authorization code returned by HubSpot.

The authorization code is temporary and should not be stored permanently or committed to Git.

## 6. Token Exchange

The authorization code is exchanged for:

- Access token
- Refresh token

The access token is used to authenticate HubSpot API requests.

The refresh token is used to request a new access token when the current access token expires.

## 7. Access Token Validation

The OAuth access token was tested successfully against the HubSpot Contacts API.

The request returned HTTP 200 and successfully retrieved contacts from account 149204392.

## 8. Refresh Token Validation

The refresh token flow was tested successfully.

A new access token was generated without repeating the user authorization flow.

The new access token was tested against the HubSpot Contacts API and returned HTTP 200.

## 9. Security Rules

The following values must never be committed to Git:

- Client secret
- Access tokens
- Refresh tokens
- Authorization codes

Secrets and tokens should be stored in credential stores, environment variables, or secure platform-managed secret storage.

## 10. Current Integration State

## 10. Current Integration State

OAuth has been validated independently and integrated into a dedicated n8n test workflow.

The following HubSpot operations were tested successfully through OAuth:

- Search contact by email
- Create contact
- Update contact

All tested operations returned successful responses from HubSpot.

The original Service Key workflow remains unchanged as a known-good fallback.

The OAuth-enabled workflow is exported separately as:

```text
n8n/lead-intake-hubspot-oauth-v1.json
```