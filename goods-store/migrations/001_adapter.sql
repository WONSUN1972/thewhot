-- Adapter sessions and retry journal only. Products, customers and orders live in Medusa.
CREATE TABLE IF NOT EXISTS whot_sessions (
 token_hash text PRIMARY KEY, bearer text NOT NULL, role text NOT NULL CHECK(role IN ('customer','admin')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '8 hours'
);
CREATE TABLE IF NOT EXISTS whot_demo_requests (
 customer_id text NOT NULL, request_key text NOT NULL, fingerprint text NOT NULL,
 cart_id text, order_id text, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,request_key)
);
CREATE TABLE IF NOT EXISTS whot_audit (
 id bigserial PRIMARY KEY, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whot_oauth_attempts (
 state_hash text PRIMARY KEY,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes'
);
