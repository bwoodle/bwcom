"""Tests for strava_pipeline.strava_client."""

from __future__ import annotations

import os
import tempfile

from strava_pipeline.strava_client import (
    date_range_to_epochs,
    ensure_access_token,
    load_credentials,
    save_credentials,
)


class TestLoadSaveCredentials:
    def test_round_trip(self, tmp_path):
        path = str(tmp_path / "creds")
        creds = {
            "STRAVA_CLIENT_ID": "12345",
            "STRAVA_CLIENT_SECRET": "secret",
            "STRAVA_ACCESS_TOKEN": "abc",
            "STRAVA_REFRESH_TOKEN": "def",
            "STRAVA_EXPIRES_AT": "9999999999",
        }
        # Write initial file with all keys
        with open(path, "w") as f:
            for k, v in creds.items():
                f.write(f"{k}={v}\n")

        loaded = load_credentials(path)
        assert loaded == creds

        # Update tokens
        loaded["STRAVA_ACCESS_TOKEN"] = "new_token"
        save_credentials(path, loaded)

        reloaded = load_credentials(path)
        assert reloaded["STRAVA_ACCESS_TOKEN"] == "new_token"
        assert reloaded["STRAVA_CLIENT_ID"] == "12345"  # preserved

    def test_missing_file(self, tmp_path):
        path = str(tmp_path / "nonexistent")
        assert load_credentials(path) == {}

    def test_comments_and_blanks(self, tmp_path):
        path = str(tmp_path / "creds")
        with open(path, "w") as f:
            f.write("# comment\n\nSTRAVA_CLIENT_ID=123\n")
        loaded = load_credentials(path)
        assert loaded == {"STRAVA_CLIENT_ID": "123"}


class TestDateRangeToEpochs:
    def test_known_dates(self):
        after, before = date_range_to_epochs("2026-04-01", "2026-04-12")
        # April 1 midnight UTC
        # April 13 midnight UTC (end_date + 1 day)
        assert after == 1775001600
        assert before == 1776038400

    def test_single_day(self):
        after, before = date_range_to_epochs("2026-04-01", "2026-04-01")
        # Should span exactly one day
        assert before - after == 86400


class TestEnsureAccessToken:
    def test_exchange_code(self):
        """Test OAuth code exchange with mock HTTP."""
        creds = {
            "STRAVA_CLIENT_ID": "12345",
            "STRAVA_CLIENT_SECRET": "secret",
        }

        def mock_post(url, data):
            assert data["grant_type"] == "authorization_code"
            assert data["code"] == "test_code"
            return {
                "access_token": "new_access",
                "refresh_token": "new_refresh",
                "expires_at": 9999999999,
            }

        result = ensure_access_token(creds, code="test_code", http_post=mock_post)
        assert result["STRAVA_ACCESS_TOKEN"] == "new_access"
        assert result["STRAVA_REFRESH_TOKEN"] == "new_refresh"
        assert result["STRAVA_EXPIRES_AT"] == "9999999999"

    def test_auto_refresh_expired(self):
        """Test auto-refresh when token is expired."""
        creds = {
            "STRAVA_CLIENT_ID": "12345",
            "STRAVA_CLIENT_SECRET": "secret",
            "STRAVA_ACCESS_TOKEN": "old_access",
            "STRAVA_REFRESH_TOKEN": "old_refresh",
            "STRAVA_EXPIRES_AT": "0",  # expired
        }

        def mock_post(url, data):
            assert data["grant_type"] == "refresh_token"
            assert data["refresh_token"] == "old_refresh"
            return {
                "access_token": "refreshed_access",
                "refresh_token": "refreshed_refresh",
                "expires_at": 9999999999,
            }

        result = ensure_access_token(creds, http_post=mock_post)
        assert result["STRAVA_ACCESS_TOKEN"] == "refreshed_access"

    def test_valid_token_no_refresh(self):
        """If token is still valid, don't refresh."""
        creds = {
            "STRAVA_CLIENT_ID": "12345",
            "STRAVA_CLIENT_SECRET": "secret",
            "STRAVA_ACCESS_TOKEN": "valid_token",
            "STRAVA_REFRESH_TOKEN": "refresh",
            "STRAVA_EXPIRES_AT": "9999999999",
        }

        result = ensure_access_token(creds, http_post=lambda *a: None)
        assert result["STRAVA_ACCESS_TOKEN"] == "valid_token"

    def test_no_tokens_no_code_exits(self):
        """Should exit with auth URL when no tokens and no code."""
        import pytest

        creds = {
            "STRAVA_CLIENT_ID": "12345",
            "STRAVA_CLIENT_SECRET": "secret",
        }
        with pytest.raises(SystemExit):
            ensure_access_token(creds)
