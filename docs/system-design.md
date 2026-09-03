# System Design



## 1. Goal



Build an automation workflow that receives lead data through an HTTP webhook, validates the required email field, synchronizes the lead with HubSpot using search/create/update logic, prevents duplicate contacts based on email, and returns explicit HTTP responses for successful and failed operations.

HubSpot API access is authenticated through OAuth 2.0.


## 2. Scope / Out of Scope



### In Scope



- Receive a lead through an HTTP webhook.
- Validate the required email field.
- Search HubSpot contacts by email.
- Create a contact when no match exists.
- Update an existing contact when the email already exists.
- Prevent duplicate contact creation through email-based matching.
- Preserve existing HubSpot values during partial updates when optional fields are missing or empty.
- Return explicit HTTP responses for validation, synchronization success, and CRM failures.
- Authenticate HubSpot API requests using OAuth 2.0.


### Out of Scope for v1

- Retry and rate-limit handling
- HubSpot inbound webhooks
- Docker and Cloud deployment
- Lead message history and HubSpot Notes
- Advanced conflict resolution between source systems
- Persistent business/execution logging
- Monitoring and alerting

## 3. Data Contract

The webhook accepts a JSON object representing a lead.

| Field | Type | Required | Description |
|---|---|---|---|
| `first_name` | string | No | Lead first name |
| `last_name` | string | No | Lead last name |
| `email` | string | Yes | Lead email; used as the identity key for contact matching and deduplication in v1 |
| `phone` | string | No | Lead phone number |
| `company` | string | No | Lead company |
| `source` | string | No | Lead source |
| `message` | string | No | Lead message or inquiry |

`source` and `message` may be accepted in the inbound payload but are not synchronized to HubSpot in v1.

### Example Payload

```json
{
  "first_name": "youcef",
  "last_name": "Doe",
  "email": "youcefdoe@example.com",
  "phone": "+123456789",
  "company": "ABC GmbH",
  "source": "website",
  "message": "I need help integrating our CRM with Shopify."
}
```
## 4. Identity & Create/Update Rules

The lead email is used as the initial identity key for contact matching.

For v1:

- If no contact matches the email, create a new HubSpot contact.
- If a contact matches the email, update the existing contact.
- The HubSpot Contact ID returned by the search is used for the update operation.
- Email is used for matching and is not changed automatically during an update.

### Partial Update Policy

Only non-empty values are sent to the HubSpot update request.

- `first_name`, `last_name`, `phone`, and `company` are updated when a valid non-empty value is received.
- Missing fields, `null`, and empty strings do not overwrite existing HubSpot values.
- Clearing an existing value is not supported implicitly and requires an explicit operation in a future phase.

### Future Identity Improvements

Email is a practical initial matching key, but it is not a permanent identity.

Future versions may introduce an external lead ID or another stable identifier and persist the HubSpot Contact ID for subsequent synchronizations.

## 5. Error Behavior

The workflow returns explicit HTTP responses for validation, success, and CRM failures.

### Validation Errors

- Missing email → HTTP 400
- Invalid email format → HTTP 400

Response example:

```json
{
  "success": false,
  "error": "Invalid or missing email"
}
```

### Successful Synchronization

If the lead passes validation and HubSpot synchronization succeeds, the workflow returns HTTP 200.

This applies to both:

- Contact creation
- Contact update

Response example:

```json
{
  "success": true,
  "message": "Lead synchronized successfully"
}
```

### HubSpot / CRM Errors

Errors returned by HubSpot are routed through a shared CRM error path instead of stopping the workflow without a response.

The following HubSpot operations use dedicated error outputs:

- Search Contact by Email
- Create Contact
- Update Contact

If one of these operations fails, the workflow returns HTTP 502.

Response example:

```json
{
  "success": false,
  "error": "CRM service error"
}
```

HTTP 502 is used because the incoming request may be valid, but the external CRM service failed to process the operation successfully.

### Deferred Error Handling

The following behaviors are not implemented in v1 and are deferred to a later phase:

- Automatic retries
- Rate-limit handling
- Backoff strategy
- Persistent failure logging
- Dead-letter or recovery workflow

## 6. Test Cases

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Valid new lead | Contact is created in HubSpot |
| 2 | Missing email | Request is rejected with a validation error |
| 3 | Invalid email format | Request is rejected with a validation error |
| 4 | Invalid JSON payload | Request is rejected by n8n with HTTP 422 before workflow processing |
| 5 | HubSpot API failure | HTTP 502 CRM error response is returned |
| 6 | Existing contact with changed fields | Existing contact is updated without creating a duplicate |
| 7 | Existing contact with empty optional fields | Existing values are preserved |
| 8 | OAuth-authenticated CRM synchronization | Search, create, and update operations succeed through OAuth 2.0 |

## 7. Basic Flow

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

HubSpot API Authentication: OAuth 2.0
```
