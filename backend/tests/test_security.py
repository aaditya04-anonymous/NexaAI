import pytest
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password


def test_argon2_hash_does_not_reveal_password():
    value = hash_password("correct-horse-battery-staple")
    assert "correct-horse" not in value
    assert verify_password("correct-horse-battery-staple", value)
    assert not verify_password("wrong-password", value)


def test_jwt_identifies_authenticated_subject():
    assert decode_access_token(create_access_token("user-id"))["sub"] == "user-id"
