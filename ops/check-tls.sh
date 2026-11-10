#!/bin/sh
# Observe the certificate served to users. Caddy, not this script, renews it.
set -eu
domain=new.thewhot.com
tmp_cert=$(mktemp)
trap 'rm -f "$tmp_cert"' EXIT HUP INT TERM
curl --fail --silent --show-error --connect-timeout 10 --max-time 30 "https://$domain/" -o /dev/null
timeout 20 openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -outform PEM > "$tmp_cert"
openssl x509 -in "$tmp_cert" -checkend 1209600 -noout
openssl x509 -in "$tmp_cert" -noout -issuer -dates
printf '%s\n' 'TLS verified; certificate valid for more than 14 days.'
