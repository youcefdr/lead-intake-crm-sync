# Lead Intake CRM Sync

An intermediate-level n8n automation and API integration project that receives leads through an HTTP webhook, validates input, synchronizes contacts with HubSpot, prevents duplicates, supports partial updates, and authenticates HubSpot API requests using OAuth 2.0.

## Project Overview

This project simulates a real-world lead intake and CRM synchronization workflow.

A lead is received through an HTTP webhook and processed by n8n. The workflow validates the lead email, searches HubSpot for an existing contact, then either creates a new contact or updates the existing one.

The project was built as a practical API integration and workflow automation portfolio project based on real market requirements.

## Problem

Lead sources often send customer information to a CRM through APIs or automation platforms.

A reliable integration must handle more than simply creating contacts.

It should:

- Validate incoming data.
- Prevent duplicate contacts.
- Update existing contacts safely.
- Preserve existing CRM values when optional fields are missing.
- Return meaningful HTTP responses.
- Handle external CRM failures.
- Authenticate securely with OAuth 2.0.

## Solution

The workflow implements the following process:

```text
Lead Source / API Client
       ↓ HTTP POST
n8n Webhook
       ↓
Validate Email
       ↓
Search HubSpot Contact by Email
       ↓
Contact Exists?
      ↙         ↘
    No           Yes
    ↓             ↓
Create Contact   Update Contact
      \           /
       \         /
        Return HTTP Result
```

HubSpot API requests are authenticated using OAuth 2.0.

## Features

* HTTP webhook lead intake
* Email validation
* HubSpot contact search by email
* Contact creation
* Existing contact update
* Email-based deduplication
* Partial update behavior
* Explicit HTTP responses
* CRM error routing
* OAuth 2.0 authentication
* Access token and refresh token flow
* Separate Service Key workflow kept as a fallback/reference implementation

## Partial Update Behavior

The workflow only sends non-empty values during contact updates.

The following values are ignored during an update:

* Missing fields
* `null`
* Empty strings

This prevents existing HubSpot values from being accidentally overwritten.
For example, if the incoming lead contains an empty phone field, the existing HubSpot phone number is preserved.

## OAuth 2.0

The HubSpot integration uses OAuth 2.0 with the following scopes:

* `oauth`
* `crm.objects.contacts.read`
* `crm.objects.contacts.write`

The OAuth flow includes:

```text
Authorization
      ↓
Authorization Code
      ↓
Token Exchange
      ↓
Access Token + Refresh Token
      ↓
HubSpot API
```

The refresh-token flow was tested successfully to confirm that a new access token can be obtained without repeating user authorization.

Detailed OAuth documentation is available in:

* `docs/oauth-flow.md`

## HTTP Responses

### Successful Synchronization (`200 OK`)

```json
{
  "success": true,
  "message": "Lead synchronized successfully"
}
```

### Missing or Invalid Email (`400 Bad Request`)

```json
{
  "success": false,
  "error": "Invalid or missing email"
}
```

### Invalid JSON (`422 Unprocessable Entity`)

Malformed JSON is rejected by n8n before workflow processing.

### CRM Failure (`502 Bad Gateway`)

```json
{
  "success": false,
  "error": "CRM service error"
}
```

## Final Test Coverage

The final workflow was tested for the following scenarios:

| Scenario | Verified Result |
| --- | --- |
| Invalid JSON payload | HTTP 422 |
| Missing email | HTTP 400 |
| Invalid email format | HTTP 400 |
| Valid new lead | Contact created, HTTP 200 |
| Existing contact | Contact updated, no duplicate created |
| Empty optional update fields | Existing values preserved |
| OAuth-authenticated search | Successful |
| OAuth-authenticated create | Successful |
| OAuth-authenticated update | Successful |
| HubSpot API failure | HTTP 502 error path |

## Project Structure

```text
lead-intake-crm-sync/
├── README.md
├── docs/
│   ├── system-design.md
│   └── oauth-flow.md
├── n8n/
│   ├── lead-intake-hubspot-v1.json
│   └── lead-intake-hubspot-oauth-v1.json
├── oauth-callback/
│   └── server.js
└── lead-intake-crm-hubspot-app/
    └── HubSpot developer project files

```

## Workflow Versions

### Service Key Version

`n8n/lead-intake-hubspot-v1.json`

This version uses the original Service Key / Bearer authentication approach.

### OAuth Version

`n8n/lead-intake-hubspot-oauth-v1.json`

This version uses the HubSpot OAuth2 credential and is the final authentication implementation.

## Security

Sensitive credentials are not stored in the repository.

The following values must never be committed:

* Client secrets
* Access tokens
* Refresh tokens
* Authorization codes
* API credentials

OAuth credentials are managed through n8n's credential system.

## Documentation

* **System architecture and behavior:** `docs/system-design.md`
* **OAuth implementation details:** `docs/oauth-flow.md`

## Future Improvements

The following features are intentionally outside the current project scope:

* Automatic retry and exponential backoff
* Rate-limit handling
* Persistent execution/business logging
* Monitoring and alerting
* Advanced contact identity strategies
* Explicit CRM field-clearing operations
* HubSpot inbound webhooks
* Production cloud deployment

## Status

Functional implementation complete.

The project includes:

* Lead intake
* Validation
* CRM synchronization
* Deduplication
* Partial updates
* Structured HTTP responses
* CRM error handling
* OAuth 2.0 authentication
* Final functional testing

This repository is intended as an intermediate-level workflow automation and API integration portfolio project.
