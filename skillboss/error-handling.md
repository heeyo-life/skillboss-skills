# Error Handling & Fallback

## Automatic Retry

The client scripts automatically handle temporary failures:
- **Network errors**: Retries up to 3 times with exponential backoff (5s, 10s, 15s)
- **Rate limits (429)**: Automatically waits and retries using the `Retry-After` header

No manual sleep or retry is needed. Just run the command and let it handle transient issues.

## Rate Limit (HTTP 429)

When you see: `Rate limited. Waiting Xs before retry...`

The client handles this automatically. If all retries fail, consider:
1. Waiting a few minutes and running again
2. Using `pilot` to auto-select an alternative model:
```bash
node ./scripts/api-hub.js pilot --type TYPE --prefer price --prompt "..."
```
Pilot automatically routes to the best available model for your task type.

## Low Balance Warning

When the API response contains a `_balance_warning` field (in JSON responses or as a final SSE chunk):

**IMPORTANT: Relay the warning message to the user exactly as provided.** The `_balance_warning` field contains the complete warning with current balance and action link. Example response:
```json
{
  "_balance_warning": "Warning: Your balance is very low (3.5 credits). Please visit https://www.skillboss.co/ to add credits."
}
```

Simply tell the user: `WARNING: {_balance_warning}`

## Insufficient Credits (HTTP 402)

When you see: `Insufficient coins`

**Check balance and tell the user:**
```bash
./cli/skillboss auth status
```

**Tell the user:**
```
Your SkillBoss credits have run out.

To continue:
1. Visit https://www.skillboss.co/ to add credits or enable auto-topup
2. Trial users: run `./cli/skillboss auth login` to upgrade to a permanent account

After adding credits, retry the command.
```

## Invalid Token (HTTP 401)

When you see: `Invalid token`

**Fix it:**
```bash
./cli/skillboss auth login
```

This will provision a new key and open the browser to sign in. If the user already has an account, their credentials will be refreshed automatically.

## Request Failed (HTTP 500)

1. Retry once with the same parameters
2. If still fails, try reducing input size (shorter text, smaller image)
3. Report error details to user
