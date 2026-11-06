"""
app/core/security.py
--------------------
Password hashing (Argon2id via argon2-cffi) and JWT utilities (PyJWT, HS256).

Uses argon2-cffi *directly* — passlib is intentionally not used.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing (Argon2id)
# ---------------------------------------------------------------------------

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id.

    Returns the encoded hash string (includes salt, parameters, and hash).
    """
    return _hasher.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against an Argon2id hash.

    Returns True if the password matches, False otherwise (including on
    VerifyMismatchError).
    """
    try:
        _hasher.verify(hashed, plain)
        return True
    except VerifyMismatchError:
        return False


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------

ALGORITHM = "HS256"


def create_access_token(user_id: int, role: str) -> str:
    """Create a JWT access token.

    Payload: { "sub": str(user_id), "role": role, "exp": now + 30 minutes }.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expires_min)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT access token.

    Returns the payload dict on success, or None if the token is invalid,
    expired, or malformed (any PyJWT exception is caught).
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
