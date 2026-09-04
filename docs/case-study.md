# Lead Intake CRM Sync — Case Study

## Overview

Lead Intake CRM Sync is an n8n-based automation project that receives lead data through an HTTP webhook and synchronizes it with HubSpot CRM.

The workflow validates incoming data, searches HubSpot for an existing contact, creates new contacts when necessary, updates existing contacts without creating duplicates, preserves existing CRM values during partial updates, and authenticates HubSpot API requests using OAuth 2.0.

## Problem

Lead data may arrive from website forms, landing pages, advertising platforms, or other external systems.

A basic integration that creates a new CRM contact for every incoming request can cause several common integration issues:

- **Duplicate Contacts:** Repeated submissions can create multiple records for the same person.
- **Invalid Data:** Malformed or incomplete input may reach the CRM.
- **Destructive Overwrites:** Empty optional fields can erase useful existing customer information.
- **Poor Failure Handling:** External CRM errors may not be returned clearly to the calling system.
- **Authentication Limitations:** Static credentials are less flexible than a properly implemented OAuth-based flow.

The objective was to design and implement a reliable lead ingestion and CRM synchronization workflow that handles these situations explicitly.

## Solution Architecture

The workflow implements the following ingestion and synchronization pipeline:

```text
Lead Source / API Client
       ↓ HTTP POST
  n8n Webhook
       ↓
 Validate Email
       ↓
Search HubSpot by Email
       ↓
 Contact Exists?
      ↙         ↘
    No           Yes
    ↓             ↓
Create Contact   Update Contact
      \           /
       \         /
     HTTP Response
```

HubSpot API operations are authenticated using OAuth 2.0.

## Key Features

- **HTTP Webhook Intake:** Receives lead payloads from external systems.
- **Email Validation:** Rejects malformed or missing email addresses before CRM operations.
- **Email-Based Deduplication:** Searches HubSpot before creating a new contact.
- **Safe Partial Updates:** Sends only meaningful non-empty values during updates.
- **Explicit HTTP Responses:** Returns status codes that reflect the actual result of the request.
- **Explicit Error Routing:** CRM operation failures are routed to dedicated HTTP error responses.
- **OAuth 2.0 Authentication:** Uses HubSpot OAuth credentials for CRM API operations.

## Deduplication Strategy

In the current version, email is used as the contact identity key.
The workflow follows a search-before-write strategy:

1. The workflow queries the HubSpot Search API for an existing contact matching the incoming email address.
2. If no match is found: the workflow creates a new HubSpot contact.
3. If a match is found: the workflow extracts the existing HubSpot contact ID returned by the search result and updates that contact instead of creating a duplicate.

This implements email-based deduplication for the current workflow version.

## Partial Update Strategy

One important challenge in CRM synchronization is preventing empty optional fields from overwriting existing customer information.
During contact updates, the workflow dynamically constructs the properties object and removes values that are:

- Missing from the incoming payload
- Set to `null`
- Empty strings (`""`)

Only non-empty values are sent to HubSpot's PATCH endpoint.
This allows the workflow to update selected fields while preserving existing CRM data such as phone numbers, company names, or other previously stored values.

## OAuth 2.0 Integration

To implement a more standard OAuth-based authentication flow, the HubSpot integration was transitioned from the initial Service Key/Bearer authentication approach to OAuth 2.0.
The OAuth implementation included:

- **HubSpot App Configuration:** Configured a private OAuth app with the required scopes:
  - `oauth`
  - `crm.objects.contacts.read`
  - `crm.objects.contacts.write`
- **Local Callback Handler:** Used a small Node.js callback server on `http://localhost:3000` to capture the temporary authorization code during development.
- **Authorization Code Exchange:** Exchanged the authorization code for access and refresh tokens.
- **Access Token Validation:** Verified API access against the HubSpot Contacts API.
- **Refresh Token Validation:** Confirmed that a new access token could be obtained without repeating the full authorization process.
- **n8n OAuth Credential Integration:** Connected HubSpot OAuth directly to the n8n workflow so CRM nodes could use the OAuth credential.
- **Fallback Preservation:** Kept the original Service Key workflow as a reference implementation.

The final OAuth-enabled workflow successfully performed:

- Contact search
- Contact creation
- Contact update

## Error Handling & HTTP Responses

The integration rejects invalid inputs early and returns explicit responses for CRM failures.

### Successful Synchronization
**HTTP 200**
Returned when a lead is successfully created or updated.

### Missing or Invalid Email
**HTTP 400**
Returned when the email is missing or does not match the expected format.

### Malformed JSON
Malformed JSON is rejected by n8n before the workflow begins processing.
**HTTP 422**

### HubSpot CRM Failure
**HTTP 502**
Returned when a HubSpot search, create, or update operation fails and is routed to the CRM error path.

## Testing & Verification

The final implementation was tested across the following functional scenarios:

| Scenario | Verified Result |
| :--- | :--- |
| Invalid JSON payload | HTTP 422 |
| Missing email | HTTP 400 |
| Invalid email format | HTTP 400 |
| Valid new lead | Contact created, HTTP 200 |
| Existing contact | Contact updated without duplicate |
| Empty optional fields | Existing CRM values preserved |
| OAuth contact search | Successful |
| OAuth contact creation | Successful |
| OAuth contact update | Successful |
| HubSpot API failure | HTTP 502 error path |

## Technical Challenges & Key Learnings

### 1. Preventing Duplicate CRM Records
Direct insertion on every webhook request can create duplicate CRM records.
The workflow solves this by searching HubSpot first and branching between create and update operations.
This implemented email-based deduplication instead of unconditional contact creation.

### 2. Protecting Existing CRM Data
Directly mapping every incoming field to HubSpot can erase existing values when optional fields are empty.
The workflow avoids this by dynamically filtering the update payload and sending only meaningful values.
This preserves existing CRM data during partial updates.

### 3. Isolating the OAuth Flow During Development
Instead of debugging OAuth entirely inside the main n8n workflow, the authorization flow was first tested independently using a small Node.js callback server.
This made it possible to verify:

- Authorization
- Authorization code capture
- Token exchange
- API access
- Refresh token behavior

Only after those steps were confirmed was OAuth integrated into the n8n CRM workflow.

### 4. Cross-Account Credential Discrepancy
During OAuth migration, the HubSpot search node was using the OAuth-connected account while one of the update operations was still configured with the previous Service Key credential.
This caused the workflow to retrieve a contact ID from one HubSpot account and attempt to update that ID in another account.
The issue was identified by tracing the credential configuration used by each CRM node.
The fix was to standardize the Search, Create, and Update operations in the OAuth workflow on the same HubSpot OAuth credential.
This debugging step reinforced the importance of checking authentication context at the node level when troubleshooting API integrations.

## Technology Stack

- **Workflow Automation:** n8n
- **CRM:** HubSpot CRM
- **API:** HubSpot CRM API v3
- **Authentication:** OAuth 2.0
- **Protocols & Data:** REST APIs, HTTP Webhooks, JSON
- **Testing:** Postman
- **Development Tooling:** Node.js, HubSpot CLI
- **Version Control:** Git, GitHub
- **Development Environment:** Ubuntu on WSL2, Windows 11

## Conclusion & Impact

The completed project demonstrates a reusable CRM synchronization pattern that can be adapted to real lead sources such as:

- Website contact forms
- Landing pages
- Advertising lead forms
- Internal business systems
- External APIs

The project demonstrates practical experience with:

- Workflow automation
- REST API integration
- CRM synchronization
- OAuth 2.0 authentication
- Input validation
- Deduplication
- Partial updates
- Error handling
- API debugging
- Git-based project organization

## Future Improvements

The following improvements are intentionally outside the current project scope:

- Automatic retry and exponential backoff
- Rate-limit handling
- Persistent execution and business logging
- Monitoring and alerting
- Dead-letter or failed-sync recovery mechanisms
- Advanced contact identity and deduplication strategies using stable external identifiers
- Explicit CRM field-clearing operations
- Bi-directional synchronization using HubSpot inbound webhooks
- Production cloud deployment