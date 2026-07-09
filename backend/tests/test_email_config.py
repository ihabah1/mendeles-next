from identity.infrastructure.email_config import normalize_from_email, resolve_from_email


def test_normalize_from_email_replaces_unverified_domain():
    assert normalize_from_email("noreply@mendeles.ai") == "Mendeles <noreply@mendeles.co.il>"
    assert normalize_from_email("Mendeles <noreply@mendeles.ai>") == "Mendeles <noreply@mendeles.co.il>"
    assert normalize_from_email("noreply@mandeles.ai") == "Mendeles <noreply@mendeles.co.il>"


def test_normalize_from_email_keeps_verified_domain():
    assert normalize_from_email("Mendeles <noreply@mendeles.co.il>") == "Mendeles <noreply@mendeles.co.il>"


def test_resolve_from_email_uses_env(monkeypatch):
    monkeypatch.setenv("RESEND_FROM_EMAIL", "noreply@mendeles.ai")
    monkeypatch.delenv("DEFAULT_FROM_EMAIL", raising=False)
    assert resolve_from_email() == "Mendeles <noreply@mendeles.co.il>"
