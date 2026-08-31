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

- Duplicate detection and update logic

- Retry and rate-limit handling

- HubSpot inbound webhooks

- Docker and Cloud deployment
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

For v1, every valid lead is treated as a new contact and sent to HubSpot for creation.

The lead email is reserved as the identity key for the future deduplication phase.

In a later phase:
- If a contact with the same email exists, update the existing contact.
- If no contact exists, create a new contact.

For v1, no duplicate detection or update operation is performed.
## 5. Error Behavior

- Invalid or missing email → reject the request and return a validation error.
- HubSpot authentication or authorization failure → return a CRM error without creating the contact.
- HubSpot server error → return a CRM error and record the failure.
- Timeout → record the failure; retry logic is deferred to a later phase.
## 6. Test Cases

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Valid new lead | Contact is created in HubSpot |
| 2 | Missing email | Request is rejected with a validation error |
| 3 | Invalid email format | Request is rejected with a validation error |
| 4 | Invalid JSON payload | Request is rejected |
| 5 | HubSpot API failure | No contact is created and the failure is recorded |
| 6 | Request timeout | Failure is recorded; retry is deferred to a later phase |

## 7. Basic Flow

```text
Postman
   ↓ HTTP POST
n8n Webhook
   ↓
Validate email
   ↓
HubSpot Create Contact
   ↓
Return success response
```
