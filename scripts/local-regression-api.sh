#!/usr/bin/env bash
# Local API regression smoke — requires backend at http://127.0.0.1:8000
set -euo pipefail

API="${API_BASE_URL:-${API_BASE:-http://127.0.0.1:8000/api}}"

if [[ "$API" == *render.com* ]] || [[ "$API" == *vercel.app* ]]; then
  echo "Refusing to run against production-like URL: $API" >&2
  exit 2
fi
FAIL=0
PASS=0

pass() { PASS=$((PASS + 1)); echo "PASS $*"; }
fail() { FAIL=$((FAIL + 1)); echo "FAIL $*"; }

login() {
  curl -sf -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' -H 'Accept: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"password\"}"
}

token() {
  php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["token"]??"";' <<<"$1"
}

expect_code() {
  local label="$1" method="$2" path="$3" tok="$4" want="$5"
  local body="${6:-}"
  local -a curl_args=(-s -o /tmp/reg-body.json -w "%{http_code}" -X "$method" -H 'Accept: application/json')
  if [[ -n "$tok" ]]; then
    curl_args+=(-H "Authorization: Bearer $tok")
  fi
  if [[ -n "$body" ]]; then
    curl_args+=(-H 'Content-Type: application/json' -d "$body")
  fi
  local code
  code=$(curl "${curl_args[@]}" "$API$path")
  if [[ "$code" == "$want" ]]; then
    pass "$label ($want)"
  else
    fail "$label expected $want got $code — $(head -c 120 /tmp/reg-body.json)"
  fi
}

echo "=== Health ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
[[ "$code" == "200" ]] && pass health || fail "health $code"

echo "=== Auth ==="
code=$(curl -s -o /tmp/reg-body.json -w "%{http_code}" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' -d '{"email":"bad","password":"x"}')
[[ "$code" == "422" ]] && pass invalid_login_422 || fail "invalid_login $code"

AT=$(token "$(login admin@example.com)")
[[ -n "$AT" ]] && pass admin_login || fail admin_login

for role in manager operator finance viewer; do
  t=$(token "$(login "${role}@example.com")")
  [[ -n "$t" ]] && pass "${role}_login" || fail "${role}_login"
done

expect_code unauthenticated_me GET /auth/me "" 401

echo "=== Role matrix (admin) ==="
for path in /dashboard /shipments /tracking /finance /finance/report /clients /managers/overview /users /telegram/status /telegram/settings /telegram/notifications; do
  expect_code "admin$path" GET "$path" "$AT" 200
done
expect_code admin_export_shipments GET /export/shipments.csv "$AT" 200

echo "=== Role restrictions ==="
FT=$(token "$(login finance@example.com)")
VT=$(token "$(login viewer@example.com)")
MT=$(token "$(login manager@example.com)")

expect_code finance_managers GET /managers/overview "$FT" 403
expect_code viewer_managers GET /managers/overview "$VT" 403
expect_code finance_shipments GET /shipments "$FT" 200
expect_code viewer_shipments GET /shipments "$VT" 200
expect_code manager_users GET /users "$MT" 403
expect_code finance_telegram_journal GET /telegram/notifications "$FT" 403
expect_code viewer_telegram_settings GET /telegram/settings "$VT" 403

echo "=== Users CRUD ==="
NEW="reg$(date +%s)@example.com"
code=$(curl -s -o /tmp/reg-user.json -w "%{http_code}" -X POST "$API/users" \
  -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Reg User\",\"email\":\"$NEW\",\"password\":\"password123\",\"role\":\"viewer\",\"isActive\":true}")
[[ "$code" == "201" ]] && pass user_create || fail "user_create $code"
USER_ID=$(php -r '$j=json_decode(file_get_contents("/tmp/reg-user.json"),true); echo $j["user"]["id"]??"";')
grep -q '\$2y\$' /tmp/reg-user.json && fail password_hash_exposed || pass no_password_hash

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$NEW\",\"password\":\"password123\"}")
[[ "$code" == "200" ]] && pass new_user_login || fail "new_user_login $code"

code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/users/$USER_ID" -H "Authorization: Bearer $AT")
[[ "$code" == "200" ]] && pass user_deactivate || fail "user_deactivate $code"

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$NEW\",\"password\":\"password123\"}")
[[ "$code" == "403" ]] && pass inactive_user_login_403 || fail "inactive_login $code"

echo "=== Shipment price + tracking ==="
code=$(curl -s -o /tmp/reg-sh.json -w "%{http_code}" -X POST "$API/shipments" \
  -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' \
  -d '{"clientId":1,"managerId":1,"type":"auto","origin":"Алматы","destination":"Ташкент","priceAmount":5000,"currency":"USD","weight":"10","weightUnit":"kg","volume":"1","volumeUnit":"m3"}')
[[ "$code" == "201" ]] && pass shipment_create_price || fail "shipment_create $code"
SHIPMENT_ID=$(php -r '$j=json_decode(file_get_contents("/tmp/reg-sh.json"),true); echo $j["shipment"]["id"]??"";')

TRACK=$(curl -sf -H "Authorization: Bearer $AT" "$API/tracking")
php -r '
$j=json_decode(file_get_contents("php://stdin"),true);
$s=$j["shipments"][0]??null;
if(!$s){fwrite(STDERR,"no shipments\n"); exit(1);}
$c=$s["client"]["company"]??"";
$m=$s["manager"]["name"]??null;
if($c===""){fwrite(STDERR,"no client company\n"); exit(1);}
echo "client=$c manager=".($m??"null")."\n";
' <<<"$TRACK" && pass tracking_embedded_names || fail tracking_names

expect_code invalid_shipment POST /shipments "$AT" 422 '{}'
expect_code shipment_404 GET "/shipments/999999" "$AT" 404

echo "=== Security ==="
curl -sf -H "Authorization: Bearer $AT" "$API/tracking" | grep -qE 'TELEGRAM_BOT_TOKEN|\$2y\$' && fail secrets_in_tracking || pass no_secrets_tracking
curl -sf -H "Authorization: Bearer $AT" "$API/telegram/settings" | grep -qi bot_token && fail bot_token_in_settings || pass no_bot_token_settings

echo "=== Logout ==="
expect_code logout POST /auth/logout "$AT" 200
expect_code me_after_logout GET /auth/me "$AT" 401

echo ""
echo "=== Summary: $PASS passed, $FAIL failed ==="
[[ "$FAIL" -eq 0 ]]
