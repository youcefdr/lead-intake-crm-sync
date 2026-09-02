# System Design



## 1. Goal



Build an automation workflow that receives a new lead via HTTP webhook, validates the required email field, and creates the lead as a contact in HubSpot.



## 2. Scope / Out of Scope



### In Scope



- Receive a lead through an HTTP webhook.

- Validate the required email field.

- Create a contact in HubSpot.



### Out of Scope for v1

- OAuth 2.0
- Retry and rate-limit handling
- HubSpot inbound webhooks
- Docker and Cloud deployment
- Lead message history and HubSpot Notes
- Advanced conflict resolution between source systems

## 3. Data Contract

The webhook accepts a JSON object representing a lead.

| Field | Type | Required | Description |
|---|---|---|---|
| `first_name` | string | Yes | Lead first name |
| `last_name` | string | Yes | Lead last name |
| `email` | string | Yes | Lead email; reserved as the identity key for the later deduplication phase |
| `phone` | string | No | Lead phone number |
| `company` | string | No | Lead company |
| `source` | string | No | Lead source |
| `message` | string | No | Lead message or inquiry |

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
| 4 | Invalid JSON payload | Request is rejected |
| 5 | HubSpot API failure | No contact is created and the failure is recorded |
| 6 | Request timeout | Failure is recorded; retry is deferred to a later phase |
| 7 | Existing contact with changed fields | Existing contact is updated without creating a duplicate |
| 8 | Existing contact with empty optional fields | Existing values are preserved |

## 7. Basic Flow

```text
Postman / Lead Source
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
        Return Result
```
