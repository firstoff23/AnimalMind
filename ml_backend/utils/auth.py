import os
from typing import Optional
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


security_bearer = HTTPBearer(auto_error=False)


def verify_api_key(api_key: Optional[str]) -> bool:
    """Verifies X-API-Key header against API_KEY environment variable."""
    expected_key = os.environ.get("API_KEY")
    if not expected_key:
        return False
    return api_key == expected_key


def verify_jwt(token: str) -> Optional[dict]:
    """Verifies Supabase JWT token using SUPABASE_JWT_SECRET environment variable."""
    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        return None
    try:
        from jose import jwt
        payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
        return payload
    except Exception:
        # Fallback to PyJWT if jose is not present
        try:
            import jwt as pyjwt
            payload = pyjwt.decode(token, jwt_secret, algorithms=["HS256"])
            return payload
        except Exception:
            return None


async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    """
    FastAPI dependency enforcing authentication on protected routes.
    Checks:
    1. If neither API_KEY nor SUPABASE_JWT_SECRET is set, bypass (development mode).
    2. Validates X-API-Key header.
    3. Validates Authorization: Bearer <JWT> header.
    """
    api_key_env = os.environ.get("API_KEY")
    jwt_secret_env = os.environ.get("SUPABASE_JWT_SECRET")

    # Bypass authentication if no secret or API key is set in environment (Dev Mode)
    if not api_key_env and not jwt_secret_env:
        return {"user": "anonymous_dev"}

    # 1. Check API Key
    if x_api_key and verify_api_key(x_api_key):
        return {"user": "api_key_client"}

    # 2. Check Supabase JWT
    if auth_credentials and auth_credentials.credentials:
        payload = verify_jwt(auth_credentials.credentials)
        if payload:
            return payload

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais de autenticação inválidas ou ausentes. Forneça um JWT Token (Bearer) ou X-API-Key.",
        headers={"WWW-Authenticate": "Bearer"},
    )
