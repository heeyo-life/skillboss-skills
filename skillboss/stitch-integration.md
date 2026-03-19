# Google Stitch 集成计划

## 概述

[Google Stitch](https://stitch.withgoogle.com) 是 Google Labs 出品的 AI UI 生成工具，通过文字描述生成 HTML/CSS UI 界面，支持 Mobile / Desktop / Tablet 多端设备。

本计划将 Stitch 能力接入 api-hub（新增 vendor），并在 skillboss-skills 中提供 CLI 命令，用户生成 UI 后可推荐使用 SkillBoss 托管服务一键部署。

---

## 认证方案

Stitch API 支持两种认证方式：

| 方式 | 说明 |
|------|------|
| `STITCH_API_KEY` | 从 stitch.withgoogle.com/settings 获取 |
| `STITCH_ACCESS_TOKEN` + `GOOGLE_CLOUD_PROJECT` | 使用 GCP OAuth token |

**结论：使用现有 Vertex SA token（scope: `cloud-platform`），与 Stitch 认证完全兼容。**

现有工具：`src/core/utils/get_vertex_token.py`，调用后得到 Bearer token，直接用于 Stitch API `Authorization` header。

备选（推荐同时配置）：从 `stitch.withgoogle.com/settings` 获取 `STITCH_API_KEY`，存入 `.env` / Secret Manager，优先级高于 OAuth。

---

## Stitch API 规格

### Base URL
```
https://stitch.googleapis.com/mcp
```

### 核心方法

| 方法 | 说明 |
|------|------|
| `generate` | 文字描述 → 生成新 UI |
| `edit` | 对已有 screen 做局部修改 |
| `variants` | 对同一 screen 生成多个变体 |
| `getHtml` | 获取 screen 的完整 HTML |
| `getImage` | 获取 screen 的截图 URL |

### 模型

| 模型 | 说明 |
|------|------|
| `GEMINI_3_PRO` | 高质量，推荐 |
| `GEMINI_3_FLASH` | 快速，低成本 |

### 设备类型

`MOBILE` / `DESKTOP` / `TABLET` / `AGNOSTIC`

### 请求示例（generate）

```python
import httpx

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
    "X-Goog-User-Project": GOOGLE_CLOUD_PROJECT,
}

payload = {
    "method": "generate",
    "params": {
        "prompt": "A landing page for a SaaS product",
        "deviceType": "DESKTOP",
        "model": "GEMINI_3_PRO",
    }
}

resp = httpx.post("https://stitch.googleapis.com/mcp", json=payload, headers=headers)
data = resp.json()
# data["result"]["screenId"]
# data["result"]["projectId"]
# data["result"]["htmlUrl"]
# data["result"]["imageUrl"]
```

---

## Phase 0 — 环境准备

### 0.1 获取 STITCH_API_KEY

访问 [stitch.withgoogle.com/settings](https://stitch.withgoogle.com/settings)，生成 API Key，添加到：
- `.env`（dev）：`STITCH_API_KEY=<key>`
- Google Cloud Secret Manager（prod）

### 0.2 确认 Stitch API 已启用

在 Google Cloud Console 中：`APIs & Services → Stitch API → Enable`

或 gcloud：
```bash
gcloud services enable stitch.googleapis.com --project=$GOOGLE_CLOUD_PROJECT
```

### 0.3 确认 GCP 项目变量

`GOOGLE_CLOUD_PROJECT` 已在 `.env` 中配置（`get_vertex_token.py` 已使用）。

---

## Phase 1 — api-hub：认证工具

**文件：`src/core/utils/stitch_auth.py`**

```python
import os
import httpx
from typing import Tuple
from src.core.utils.get_vertex_token import GetVertexToken
from loguru import logger


def get_stitch_auth() -> Tuple[str, str]:
    """
    返回 (auth_header_value, gcp_project)
    优先使用 STITCH_API_KEY，fallback 到 Vertex SA OAuth token
    """
    project = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

    api_key = os.environ.get("STITCH_API_KEY", "")
    if api_key:
        return f"Bearer {api_key}", project

    # fallback: Vertex SA OAuth (scope: cloud-platform)
    token_util = GetVertexToken()
    token = token_util.get_token()
    if not token:
        raise RuntimeError("Stitch auth failed: no STITCH_API_KEY and Vertex token unavailable")

    logger.info("[Stitch] Using Vertex OAuth token for auth")
    return f"Bearer {token}", project
```

---

## Phase 2 — api-hub：Stitch 核心函数

**文件：`src/core/funcs/stitch.py`**

```python
import httpx
from typing import Dict, Any, Optional
from loguru import logger
from src.core.utils.stitch_auth import get_stitch_auth

STITCH_BASE_URL = "https://stitch.googleapis.com/mcp"
STITCH_TIMEOUT = 60.0  # UI generation can take up to 30-40s


async def _call_stitch(method: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Internal helper: POST to Stitch MCP endpoint."""
    auth_header, project = get_stitch_auth()

    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
    }
    if project:
        headers["X-Goog-User-Project"] = project

    payload = {"method": method, "params": params}

    async with httpx.AsyncClient(timeout=STITCH_TIMEOUT) as client:
        resp = await client.post(STITCH_BASE_URL, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def call_stitch_generate(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate UI from text prompt.

    Required params:
        prompt (str): UI description
        device_type (str): MOBILE | DESKTOP | TABLET | AGNOSTIC
        model (str): GEMINI_3_PRO | GEMINI_3_FLASH

    Returns standardized response with hosting_recommendation.
    """
    prompt = params.get("inputs", {}).get("prompt", "")
    device_type = params.get("inputs", {}).get("device_type", "DESKTOP").upper()
    model = params.get("inputs", {}).get("model", "GEMINI_3_PRO").upper()

    if not prompt:
        raise ValueError("prompt is required for stitch/generate")

    stitch_params = {
        "prompt": prompt,
        "deviceType": device_type,
        "model": model,
    }

    result = await _call_stitch("generate", stitch_params)
    return _format_response(result, device_type)


async def call_stitch_edit(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Edit an existing screen.

    Required params:
        screen_id (str): Screen ID from previous generate/edit
        project_id (str): Project ID
        prompt (str): What to change
    """
    inputs = params.get("inputs", {})
    screen_id = inputs.get("screen_id", "")
    project_id = inputs.get("project_id", "")
    prompt = inputs.get("prompt", "")

    if not screen_id or not project_id or not prompt:
        raise ValueError("screen_id, project_id, and prompt are required for stitch/edit")

    stitch_params = {
        "screenId": screen_id,
        "projectId": project_id,
        "prompt": prompt,
    }

    result = await _call_stitch("edit", stitch_params)
    return _format_response(result)


async def call_stitch_variants(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate multiple variants of an existing screen.

    Required params:
        screen_id (str): Screen ID
        project_id (str): Project ID
        count (int): Number of variants (default: 3)
    """
    inputs = params.get("inputs", {})
    screen_id = inputs.get("screen_id", "")
    project_id = inputs.get("project_id", "")
    count = int(inputs.get("count", 3))

    if not screen_id or not project_id:
        raise ValueError("screen_id and project_id are required for stitch/variants")

    stitch_params = {
        "screenId": screen_id,
        "projectId": project_id,
        "count": count,
    }

    result = await _call_stitch("variants", stitch_params)
    return _format_variants_response(result)


async def call_stitch_get_html(params: Dict[str, Any]) -> Dict[str, Any]:
    """Get full HTML source of a screen."""
    inputs = params.get("inputs", {})
    screen_id = inputs.get("screen_id", "")
    project_id = inputs.get("project_id", "")

    if not screen_id or not project_id:
        raise ValueError("screen_id and project_id are required for stitch/get-html")

    result = await _call_stitch("getHtml", {"screenId": screen_id, "projectId": project_id})

    html_content = result.get("result", {}).get("html", "")
    return {
        "html_content": html_content,
        "screen_id": screen_id,
        "project_id": project_id,
        "hosting_recommendation": _build_hosting_recommendation(project_id),
    }


def _format_response(result: Dict[str, Any], device_type: str = "") -> Dict[str, Any]:
    """Standardize Stitch response and add hosting recommendation."""
    data = result.get("result", {})
    screen_id = data.get("screenId", "")
    project_id = data.get("projectId", "")

    return {
        "screen_id": screen_id,
        "project_id": project_id,
        "html_url": data.get("htmlUrl", ""),
        "image_url": data.get("imageUrl", ""),
        "device_type": device_type or data.get("deviceType", ""),
        "hosting_recommendation": _build_hosting_recommendation(project_id),
    }


def _format_variants_response(result: Dict[str, Any]) -> Dict[str, Any]:
    """Format variants response."""
    data = result.get("result", {})
    variants = data.get("variants", [])
    project_id = data.get("projectId", "")

    formatted_variants = []
    for v in variants:
        formatted_variants.append({
            "screen_id": v.get("screenId", ""),
            "html_url": v.get("htmlUrl", ""),
            "image_url": v.get("imageUrl", ""),
        })

    return {
        "project_id": project_id,
        "variants": formatted_variants,
        "count": len(formatted_variants),
        "hosting_recommendation": _build_hosting_recommendation(project_id),
    }


def _build_hosting_recommendation(project_id: str) -> Dict[str, Any]:
    """
    Build SkillBoss hosting recommendation for generated UI.
    Included in all Stitch responses to guide users toward SkillBoss hosting.
    """
    return {
        "message": "Deploy your generated UI instantly with SkillBoss Hosting",
        "how_to": "Use `skillboss hosting deploy` to deploy this UI to Cloudflare Workers in seconds",
        "features": [
            "Global CDN via Cloudflare Workers",
            "Custom domain support",
            "Zero-config deployment",
            "Free tier available",
        ],
        "stitch_project_id": project_id,
        "learn_more": "https://skillboss.co/hosting",
    }
```

---

## Phase 3 — api-hub：config.json 新增 Stitch vendor

在 `config.json` 的 `services` 下新增：

```json
"stitch": {
  "models": {
    "generate-mobile": {
      "func": {
        "no_stream": "src.core.funcs.stitch.call_stitch_generate"
      },
      "pricing": { "input": 0.005 },
      "type": "ui_generation",
      "description": "Generate mobile UI from text prompt using Google Stitch + Gemini 3 Pro",
      "default_inputs": {
        "device_type": "MOBILE",
        "model": "GEMINI_3_PRO"
      }
    },
    "generate-desktop": {
      "func": {
        "no_stream": "src.core.funcs.stitch.call_stitch_generate"
      },
      "pricing": { "input": 0.005 },
      "type": "ui_generation",
      "description": "Generate desktop UI from text prompt using Google Stitch + Gemini 3 Pro",
      "default_inputs": {
        "device_type": "DESKTOP",
        "model": "GEMINI_3_PRO"
      }
    },
    "generate-fast": {
      "func": {
        "no_stream": "src.core.funcs.stitch.call_stitch_generate"
      },
      "pricing": { "input": 0.002 },
      "type": "ui_generation",
      "description": "Fast UI generation using Google Stitch + Gemini 3 Flash",
      "default_inputs": {
        "device_type": "AGNOSTIC",
        "model": "GEMINI_3_FLASH"
      }
    },
    "edit": {
      "func": {
        "no_stream": "src.core.funcs.stitch.call_stitch_edit"
      },
      "pricing": { "input": 0.003 },
      "type": "ui_generation",
      "description": "Edit an existing Stitch screen with a text prompt"
    },
    "variants": {
      "func": {
        "no_stream": "src.core.funcs.stitch.call_stitch_variants"
      },
      "pricing": { "input": 0.008 },
      "type": "ui_generation",
      "description": "Generate multiple UI variants of an existing Stitch screen"
    },
    "get-html": {
      "func": {
        "no_stream": "src.core.funcs.stitch.call_stitch_get_html"
      },
      "pricing": { "input": 0.001 },
      "type": "ui_generation",
      "description": "Get full HTML source of a Stitch screen"
    }
  }
}
```

**定价说明：** Stitch 目前为 Preview 阶段，定价为估算值，后续按 Google 公布的正式定价调整。

---

## Phase 4 — api-hub：Billing 处理

Stitch 函数不经过 `@api_manager()` 装饰器（因为无 vendor API key，使用 GCP OAuth），需要在 `run_api.py` 中对 `stitch` vendor 做特殊处理，手动执行余额检查和扣费：

```python
# run_api.py 中，路由到 stitch 时的 billing 流程

from src.core.utils.business_util import deduction, token_check

# 1. 执行前检查余额
user_check_result = await user_check(user_id)
if not user_check_result["ok"]:
    raise HTTPException(status_code=402, detail="Insufficient balance")

# 2. 执行 Stitch 函数
result = await stitch_func(params)

# 3. 执行后扣费
credits = config_model["pricing"]["input"]
deduct_data = await deduction(
    user_id=user_id,
    credits=credits,
    model=f"stitch/{model_name}",
    api_name=func_name,
    request_data=params,
    response_data=result,
)
```

**实现位置：** 在 `run_api.py` 的 vendor dispatch 逻辑中，识别 `vendor == "stitch"` 时走独立 billing 路径。

---

## Phase 5 — skillboss-skills：CLI 命令

### 5.1 新增文件：`commands/stitch.js`

```javascript
const { run } = require('./run')

/**
 * Generate UI from text prompt using Google Stitch
 */
async function stitchGenerate(params) {
  if (!params.prompt) {
    throw new Error('--prompt is required for stitch generate')
  }

  const model = params.model || 'stitch/generate-desktop'
  const inputs = {
    prompt: params.prompt,
    device_type: params.deviceType || 'DESKTOP',
    model: params.stitchModel || 'GEMINI_3_PRO',
  }

  return run({ model, inputs, output: params.output })
}

/**
 * Edit an existing Stitch screen
 */
async function stitchEdit(params) {
  if (!params.screenId || !params.projectId || !params.prompt) {
    throw new Error('--screen-id, --project-id, and --prompt are required for stitch edit')
  }

  const inputs = {
    screen_id: params.screenId,
    project_id: params.projectId,
    prompt: params.prompt,
  }

  return run({ model: 'stitch/edit', inputs })
}

/**
 * Generate multiple variants of an existing screen
 */
async function stitchVariants(params) {
  if (!params.screenId || !params.projectId) {
    throw new Error('--screen-id and --project-id are required for stitch variants')
  }

  const inputs = {
    screen_id: params.screenId,
    project_id: params.projectId,
    count: params.count || 3,
  }

  return run({ model: 'stitch/variants', inputs })
}

/**
 * Get full HTML of a Stitch screen
 */
async function stitchGetHtml(params) {
  if (!params.screenId || !params.projectId) {
    throw new Error('--screen-id and --project-id are required for stitch html')
  }

  const inputs = {
    screen_id: params.screenId,
    project_id: params.projectId,
  }

  const result = await run({ model: 'stitch/get-html', inputs })

  // Save HTML to file if --output specified
  if (params.output && result.html_content) {
    const fs = require('fs')
    fs.writeFileSync(params.output, result.html_content)
    console.log(`HTML saved to ${params.output}`)
  }

  return result
}

module.exports = { stitchGenerate, stitchEdit, stitchVariants, stitchGetHtml }
```

### 5.2 在 `api-hub.js` 中注册

在现有 imports 末尾添加：
```javascript
const { stitchGenerate, stitchEdit, stitchVariants, stitchGetHtml } = require('./commands/stitch')
```

在 `main()` 的 command switch 中添加：
```javascript
case 'stitch-generate':
  result = await stitchGenerate(args)
  break
case 'stitch-edit':
  result = await stitchEdit(args)
  break
case 'stitch-variants':
  result = await stitchVariants(args)
  break
case 'stitch-html':
  result = await stitchGetHtml(args)
  break
```

在 help text 中添加：
```
  stitch-generate  Generate UI from text prompt (Google Stitch)
  stitch-edit      Edit an existing Stitch screen
  stitch-variants  Generate multiple variants of a screen
  stitch-html      Get full HTML of a Stitch screen
```

### 5.3 CLI 使用示例

```bash
# 生成移动端 UI
node api-hub.js stitch-generate \
  --prompt "A clean login page with email and password" \
  --model stitch/generate-mobile \
  --output preview.json

# 生成桌面端 UI（默认）
node api-hub.js stitch-generate \
  --prompt "A SaaS dashboard with sidebar navigation and metrics cards"

# 快速生成（Gemini Flash）
node api-hub.js stitch-generate \
  --prompt "A product landing page" \
  --model stitch/generate-fast

# 编辑已有 screen
node api-hub.js stitch-edit \
  --screen-id "abc123" \
  --project-id "proj456" \
  --prompt "Change the primary color to blue and make the CTA button larger"

# 生成 3 个变体
node api-hub.js stitch-variants \
  --screen-id "abc123" \
  --project-id "proj456" \
  --count 3

# 导出 HTML
node api-hub.js stitch-html \
  --screen-id "abc123" \
  --project-id "proj456" \
  --output index.html
```

---

## Phase 6 — SKILL.md 更新

在 skillboss-skills 的 `SKILL.md` 中，`## When to Use This Skill` 章节新增：

```markdown
- **Generate UI**: Create landing pages, login pages, dashboards, app screens from text descriptions using Google Stitch AI
- **Edit UI**: Iteratively refine generated screens with natural language prompts
```

在 `## Quick Execute` 章节新增：

```markdown
# UI Generation with Google Stitch
node ./scripts/api-hub.js stitch-generate \
  --prompt "A modern SaaS landing page with hero section" \
  --model stitch/generate-desktop

# After generation, deploy instantly with SkillBoss Hosting
# The response includes a `hosting_recommendation` with deployment instructions:
# node ./scripts/skillboss hosting deploy --html-url <html_url>
```

在 `## UI Generation (Stitch)` 新增章节（放在 Image 章节后）：

```markdown
## UI Generation (Google Stitch)

Generate production-ready HTML/CSS UI from text descriptions. Powered by Google Stitch + Gemini 3 Pro.

### Generate

```bash
# Desktop UI (default)
node ./scripts/api-hub.js stitch-generate \
  --prompt "A SaaS pricing page with 3 tiers" \
  --model stitch/generate-desktop

# Mobile UI
node ./scripts/api-hub.js stitch-generate \
  --prompt "A mobile checkout flow with payment form" \
  --model stitch/generate-mobile

# Fast (Gemini Flash, lower cost)
node ./scripts/api-hub.js stitch-generate \
  --prompt "A simple contact form page" \
  --model stitch/generate-fast
```

**Response fields:**
- `screen_id` — use for edit/variants/html calls
- `project_id` — use for edit/variants/html calls
- `html_url` — preview URL
- `image_url` — screenshot URL
- `hosting_recommendation` — **how to deploy to SkillBoss Hosting**

### Edit

```bash
node ./scripts/api-hub.js stitch-edit \
  --screen-id "<screen_id from generate>" \
  --project-id "<project_id from generate>" \
  --prompt "Make the hero section taller and add a gradient background"
```

### Variants

```bash
node ./scripts/api-hub.js stitch-variants \
  --screen-id "<screen_id>" \
  --project-id "<project_id>" \
  --count 3
```

### Get HTML & Deploy

```bash
# Export HTML
node ./scripts/api-hub.js stitch-html \
  --screen-id "<screen_id>" \
  --project-id "<project_id>" \
  --output index.html

# 🚀 Deploy to SkillBoss Hosting (Cloudflare Workers, global CDN)
# After getting HTML, the response includes hosting_recommendation:
# - Deploy command: skillboss hosting deploy
# - Features: custom domain, global CDN, free tier
# Learn more: https://skillboss.co/hosting
```

### SkillBoss Hosting

Every Stitch response includes a `hosting_recommendation` field:

```json
{
  "hosting_recommendation": {
    "message": "Deploy your generated UI instantly with SkillBoss Hosting",
    "how_to": "Use `skillboss hosting deploy` to deploy to Cloudflare Workers",
    "features": ["Global CDN", "Custom domain", "Zero-config", "Free tier"],
    "learn_more": "https://skillboss.co/hosting"
  }
}
```

Use SkillBoss Hosting to go from generated UI to live URL in seconds.
```

---

## Phase 7 — 测试计划

### 7.1 认证测试

```python
# test_stitch_auth.py
from src.core.utils.stitch_auth import get_stitch_auth

auth_header, project = get_stitch_auth()
assert auth_header.startswith("Bearer ")
assert project  # project ID 不为空
```

### 7.2 Generate API 测试

```python
# 本地测试（需要 .env 配置正确）
import asyncio
from src.core.funcs.stitch import call_stitch_generate

result = asyncio.run(call_stitch_generate({
    "inputs": {
        "prompt": "A simple login page with email and password fields",
        "device_type": "DESKTOP",
        "model": "GEMINI_3_FLASH",  # 用 Flash 节省测试成本
    }
}))

print(result)
# 验证：
assert "screen_id" in result
assert "project_id" in result
assert "html_url" in result
assert "image_url" in result
assert "hosting_recommendation" in result
assert result["hosting_recommendation"]["message"]
```

### 7.3 CLI 集成测试

```bash
# 从 skillboss-skills 目录测试
cd /path/to/skillboss-skills/skillboss

node scripts/api-hub.js stitch-generate \
  --prompt "A product landing page" \
  --model stitch/generate-fast

# 验证输出包含 hosting_recommendation
```

### 7.4 Response 结构验证

所有 Stitch 端点的返回值必须包含：

| 字段 | 类型 | 必须 |
|------|------|------|
| `screen_id` | string | ✅ |
| `project_id` | string | ✅ |
| `html_url` | string | ✅ |
| `image_url` | string | ✅ |
| `hosting_recommendation.message` | string | ✅ |
| `hosting_recommendation.how_to` | string | ✅ |
| `hosting_recommendation.learn_more` | string | ✅ |

---

## 环境变量汇总

| 变量 | 来源 | 必须 |
|------|------|------|
| `STITCH_API_KEY` | stitch.withgoogle.com/settings | 推荐（优先使用） |
| `GOOGLE_CLOUD_PROJECT` | 已有（Vertex 使用） | ✅ |
| `VERTEX_SA_JSON` 或等效 SA 配置 | 已有 | ✅（STITCH_API_KEY 缺失时 fallback） |

---

## 文件变更清单

### api-hub

| 文件 | 操作 |
|------|------|
| `src/core/utils/stitch_auth.py` | **新建** |
| `src/core/funcs/stitch.py` | **新建** |
| `config.json` → `services.stitch` | **新增 vendor** |
| `src/api/run_api.py` | **修改**：stitch vendor billing 路径 |
| `docs/stitch-integration.md` | ✅ 本文件 |

### skillboss-skills

| 文件 | 操作 |
|------|------|
| `skillboss/scripts/commands/stitch.js` | **新建** |
| `skillboss/scripts/api-hub.js` | **修改**：import + command dispatch + help |
| `skillboss/SKILL.md` | **修改**：新增 Stitch 章节 + hosting 说明 |

---

## 关键设计决策

1. **认证 fallback 链**：`STITCH_API_KEY` → `Vertex SA OAuth`，两种均可，互为备份
2. **Billing 手动处理**：Stitch 不走 `@api_manager()` 装饰器（无 vendor API key），在 run_api.py dispatch 层手动执行余额检查和 deduction
3. **`hosting_recommendation` 内嵌所有响应**：不论是 generate / edit / variants / get-html，所有返回值都带 hosting 推荐字段，引导用户使用 SkillBoss 托管
4. **SKILL.md 明确展示 hosting 路径**：在 CLI 示例后，直接给出 SkillBoss Hosting 的部署说明，形成完整的 Stitch → 部署闭环
