
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.services.auth_client import get_user

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

bearer_scheme = HTTPBearer(auto_error=True)

def _norm(role: str | None) -> str | None:
    if not role:
        return None
    r = str(role).strip().lower()
    mapping = {
        "administrator": "admin",
        "administrador": "admin",
        "administrateur": "admin",
        "owner": "admin",
        "superadmin": "admin",
        "super-admin": "admin",
        "mod": "moderator",
    }
    return mapping.get(r, r)

def get_current_user_with_role(allowed_roles: tuple[str, ...]):
    norm_roles = tuple(_norm(r) for r in allowed_roles)
    def wrapper(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
        token = credentials.credentials
        if not SECRET_KEY:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="SECRET_KEY missing")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")

        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

        try:
            uid = int(sub)
        except Exception:
            uid = sub

        try:
            user = get_user_sync(uid)
        except Exception:
            # fall back to role from token if user lookup fails
            user = {"role": payload.get("role")}

        user_role = _norm((user.get("role") if isinstance(user, dict) else None) or payload.get("role"))
        if user_role not in norm_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        return {"user_id": sub, "role": user_role}
    return wrapper

# helper sync wrapper as Depends can't await here easily without changing signatures
def get_user_sync(uid):
    import anyio
    return anyio.run(get_user, uid)
