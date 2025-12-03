import uuid
from pathlib import Path

from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, PlainTextResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import re


app = FastAPI(title="BFF Service (patched v7)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://127.0.0.1", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
UPLOAD_DIR = Path("/tmp/uploads")
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass


ADMIN_BASE = os.getenv("ADMIN_BASE", "http://admin_service:8000")
AUTH_BASE = os.getenv("AUTH_BASE", "http://auth_service:8000")
PAYMENT_BASE = os.getenv("PAYMENT_SERVICE_URL", "http://payment_service:8000")
COOKIE_PATH_REWRITE_ENABLED = os.getenv("COOKIE_PATH_REWRITE_ENABLED", "1") == "1"

def _cookie_to_bearer(request: Request, headers: dict) -> dict:
    token = request.cookies.get("access_token")
    if token and not any(h.lower() == "authorization" for h in headers.keys()):
        headers["Authorization"] = f"Bearer {token}"
    return headers

def _rewrite_set_cookie(sc: str) -> str:
    if not COOKIE_PATH_REWRITE_ENABLED:
        return sc
    # Widen Path to "/" so cookie is sent to /api/admin/*
    sc = re.sub(r"(?i)Path\s*=\s*/api/auth", "Path=/", sc)
    sc = re.sub(r"(?i)Path\s*=\s*/auth", "Path=/", sc)
    # On localhost over http, Secure cookies are ignored; drop Secure flag if present
    sc = re.sub(r";\s*Secure\b", "", sc)
    # Ensure SameSite is at least Lax if missing
    if re.search(r"(?i)\bSameSite=", sc) is None:
        sc = sc + "; SameSite=Lax"
    return sc

def _build_response_from_httpx(resp: httpx.Response) -> Response:
    headers = {}
    ct = resp.headers.get("content-type")
    if ct:
        headers["content-type"] = ct
    r = Response(content=resp.content, status_code=resp.status_code, headers=headers)
    # Preserve Set-Cookie (rewritten)
    try:
        for sc in resp.headers.get_list("set-cookie"):
            r.headers.append("set-cookie", _rewrite_set_cookie(sc))
    except Exception:
        sc = resp.headers.get("set-cookie")
        if sc:
            r.headers.append("set-cookie", _rewrite_set_cookie(sc))
    return r

async def _passthrough(method: str, url: str, request: Request, inject_bearer: bool = False, extra_headers: dict | None = None):
    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "content-length"}}
    if inject_bearer:
        headers = _cookie_to_bearer(request, headers)
    if extra_headers:
        headers.update(extra_headers)

    try:
        if request.headers.get("content-type", "").startswith("application/json"):
            json_body = await request.json()
            data = None
        else:
            json_body = None
            data = await request.body()
    except Exception:
        json_body = None
        data = await request.body()

    params = dict(request.query_params)

    timeout = httpx.Timeout(10.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        resp = await client.request(method, url, headers=headers, params=params, json=json_body, content=data)
        return _build_response_from_httpx(resp)

# ---------- Auth service proxies (/api/auth/*) ----------
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(path: str, request: Request):
    target = f"{AUTH_BASE}/auth/{path}"
    return await _passthrough(request.method, target, request, inject_bearer=False)

# Helper: read /auth/me to enrich headers for admin_service
async def _fetch_me_headers(request: Request) -> dict:
    timeout = httpx.Timeout(5.0, connect=5.0)
    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host","content-length"}}
    headers = _cookie_to_bearer(request, headers)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        try:
            resp = await client.get(f"{AUTH_BASE}/auth/me", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                extra = {}
                if isinstance(data, dict):
                    if "id" in data: extra["X-User-Id"] = str(data["id"])
                    if "role" in data: extra["X-User-Role"] = str(data["role"])
                    if "email" in data: extra["X-User-Email"] = str(data["email"])
                return extra
        except Exception:
            pass
    return {}

async def _require_admin(request: Request, allowed_roles: set[str] | None = None) -> dict:
    extra = await _fetch_me_headers(request)
    if not extra.get("X-User-Id"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    role = str(extra.get("X-User-Role", "")).lower()
    allowed = {r.lower() for r in (allowed_roles or {"admin", "administrator"})}
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    return extra



# ---------- Admin service proxies (require bearer + identity headers) ----------
@app.api_route("/api/admin/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_admin(path: str, request: Request):
    target = f"{ADMIN_BASE}/admin/{path}"
    extra = await _require_admin(request, {"admin", "administrator", "moderator"})
    return await _passthrough(request.method, target, request, inject_bearer=True, extra_headers=extra)

# ---------- Payment service proxies ----------
@app.post("/api/purchases")
async def create_purchase(request: Request):
    target = f"{PAYMENT_BASE}/api/v1/purchases/"
    return await _passthrough("POST", target, request, inject_bearer=True)


@app.get("/api/purchases/my")
async def list_my_purchases(request: Request):
    target = f"{PAYMENT_BASE}/api/v1/purchases/my"
    return await _passthrough("GET", target, request, inject_bearer=True)


@app.get("/api/payment/admin/purchases")
async def admin_list_purchases(request: Request):
    target = f"{PAYMENT_BASE}/api/v1/purchases/"
    extra = await _require_admin(request, {"admin", "administrator", "moderator"})
    return await _passthrough("GET", target, request, inject_bearer=True, extra_headers=extra)


@app.patch("/api/payment/admin/purchases/{purchase_id}")
async def admin_update_purchase(purchase_id: int, request: Request):
    target = f"{PAYMENT_BASE}/api/v1/purchases/{purchase_id}"
    extra = await _require_admin(request, {"admin", "administrator", "moderator"})
    return await _passthrough("PATCH", target, request, inject_bearer=True, extra_headers=extra)

@app.get("/api/payment/settings")
async def get_payment_settings(request: Request):
    target = f"{PAYMENT_BASE}/api/v1/payments/settings"
    return await _passthrough("GET", target, request, inject_bearer=False)

# Fallback for /api/offline-movies used by UI
@app.get("/api/offline-movies")
async def offline_movies_fallback(request: Request):
    target = f"{ADMIN_BASE}/offline-movies"
    try:
        timeout = httpx.Timeout(5.0, connect=5.0)
        headers = _cookie_to_bearer(request, {k: v for k, v in request.headers.items() if k.lower() not in {"host","content-length"}})
        headers.update(await _fetch_me_headers(request))
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            resp = await client.get(target, headers=headers, params=request.query_params)
        if resp.status_code < 400:
            return _build_response_from_httpx(resp)
    except Exception:
        pass
    return JSONResponse([], status_code=200)

# ---------- Users (auth_service) with shape normalization ----------
@app.get("/api/users")
async def get_users(request: Request):
    extra = await _require_admin(request, {"admin", "administrator"})
    target = f"{AUTH_BASE}/internal/users"
    timeout = httpx.Timeout(10.0, connect=10.0)
    headers = _cookie_to_bearer(request, {})
    headers.update({k: v for k, v in extra.items() if k.lower().startswith("x-")})
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        resp = await client.get(target, params=request.query_params, headers=headers)
    try:
        data = resp.json()
    except Exception:
        return _build_response_from_httpx(resp)
    if isinstance(data, dict) and "users" in data and isinstance(data["users"], list):
        return JSONResponse(data["users"], status_code=resp.status_code)
    if isinstance(data, list):
        return JSONResponse(data, status_code=resp.status_code)
    return JSONResponse([data], status_code=resp.status_code)

@app.put("/api/users/{user_id}/role")
async def set_user_role(user_id: str, request: Request):
    extra = await _require_admin(request)
    body = await request.json()
    role = body.get("role")
    if role is None:
        raise HTTPException(400, "role is required")
    target = f"{AUTH_BASE}/internal/users/{user_id}"
    timeout = httpx.Timeout(10.0, connect=10.0)
    headers = _cookie_to_bearer(request, {})
    headers.update({k: v for k, v in extra.items() if k.lower().startswith("x-")})
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        resp = await client.patch(target, json={"role": role}, headers=headers)
    return _build_response_from_httpx(resp)

@app.post("/api/users/{user_id}/ban")
async def ban_user(user_id: str, request: Request):
    extra = await _require_admin(request)
    body = await request.json()
    is_blocked = body.get("is_blocked")
    if is_blocked is None:
        raise HTTPException(400, "is_blocked is required (true/false)")
    target = f"{AUTH_BASE}/internal/users/{user_id}"
    timeout = httpx.Timeout(10.0, connect=10.0)
    headers = _cookie_to_bearer(request, {})
    headers.update({k: v for k, v in extra.items() if k.lower().startswith("x-")})
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        resp = await client.patch(target, json={"is_blocked": bool(is_blocked)}, headers=headers)
    return _build_response_from_httpx(resp)

@app.put("/api/users/{user_id}")
async def update_user_generic(user_id: str, request: Request):
    extra = await _require_admin(request)
    body = await request.json()
    target = f"{AUTH_BASE}/internal/users/{user_id}"
    timeout = httpx.Timeout(10.0, connect=10.0)
    headers = _cookie_to_bearer(request, {})
    headers.update({k: v for k, v in extra.items() if k.lower().startswith("x-")})
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        resp = await client.patch(target, json=body, headers=headers)
    return _build_response_from_httpx(resp)

@app.delete("/api/users/{user_id}")
async def delete_user_not_supported(user_id: str, request: Request):
    await _require_admin(request)
    return PlainTextResponse("Deletion is not supported by auth_service", status_code=405)


@app.post("/api/upload")
async def upload_file_dev(file: UploadFile = File(...), kind: str = "file"):
    # Dev-only upload handler: saves to /tmp/uploads and returns public URL
    ext = os.path.splitext(file.filename or "")[1]
    fname = f"{kind}-{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / fname
    try:
        content = await file.read()
        with dest.open("wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    return {"public_url": f"/api/files/{fname}"}

@app.get("/api/files/{name}")
async def get_uploaded_file(name: str):
    dest = UPLOAD_DIR / name
    if not dest.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(dest)
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

from .tmdb_router import router as tmdb_router
from .admin_router import router as admin_router
from .content_router import router as content_router

app.include_router(tmdb_router, prefix="/api/tmdb")
app.include_router(admin_router)
app.include_router(content_router)


