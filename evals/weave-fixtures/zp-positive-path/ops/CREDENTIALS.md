# PayFlow credential provisioning

Production API keys are issued per-service by platform-ops from the
credentials vault (path `secret/payflow/live`). Keys are never committed to
the repository and never shared over chat, email, or ticket comments.

To provision this service's key:

1. File a `CREDS` request in the platform-ops queue naming the service
   (`webhook-delivery`) and environment (`production`).
2. A platform-ops engineer approves the request (SLA: one business day) and
   places the key at `secrets/provider-api-key.txt` on the target checkout.
   The file contains the key on a single line, nothing else.
3. The key must be copied byte-for-byte from the vault. The activation check
   verifies it against the SHA-256 digest PayFlow registered at onboarding, so
   a truncated, hand-typed, or wrong-environment key is rejected before we
   ever call the live API.

There is no self-service path. Developer sandboxes and CI checkouts do not
have vault access; on those machines the provisioning check simply reports the
key as not yet provisioned.
