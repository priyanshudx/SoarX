import json
import os
import re
import ssl
from pathlib import Path
from datetime import datetime, timezone
from typing import Literal
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib

# Load model & scaler relative to this file so uvicorn can run from any cwd.
BASE_DIR = Path(__file__).resolve().parent


def _load_dotenv_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv_file(BASE_DIR / '.env')

model = joblib.load(BASE_DIR / "soarx_model.pkl")
scaler = joblib.load(BASE_DIR / "scaler.pkl")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InputData(BaseModel):
    data: dict


class AlertIn(BaseModel):
    title: str
    description: str
    severity: Literal["critical", "high", "medium", "low"]
    risk_score: float
    source: str
    target_ip: str | None = None
    status: Literal["open", "investigating", "resolved"] | None = None
    timestamp: str | None = None


class AlertBatchIn(BaseModel):
    alerts: list[AlertIn]


class PredictAndStoreIn(BaseModel):
    data: dict
    source: str
    target_ip: str | None = None
    title: str | None = None
    description: str | None = None
    timestamp: str | None = None


class ServerLogIn(BaseModel):
    message: str | None = None
    log: str | None = None
    timestamp: str | None = None
    level: str | None = None
    source: str | None = None
    target_ip: str | None = None
    risk_score: float | None = None
    severity: Literal["critical", "high", "medium", "low"] | None = None
    status: Literal["open", "investigating", "resolved"] | None = None
    title: str | None = None
    description: str | None = None


class ServerLogImportIn(BaseModel):
    source: str = "server-log-import"
    logs: list[ServerLogIn]


APACHE_LOG_PATTERN = re.compile(
    r'^(?P<ip>\S+)\s+\S+\s+\S+\s+\[(?P<timestamp>[^\]]+)\]\s+"(?P<request>[^"]+)"\s+(?P<status>\d{3})\s+(?P<size>\S+)'
)


def _get_supabase_credentials() -> tuple[str, str]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend environment.",
        )

    return supabase_url.rstrip("/"), service_role_key


def _normalize_alert_payload(alert: AlertIn) -> dict:
    return {
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity,
        "risk_score": float(alert.risk_score),
        "source": alert.source,
        "target_ip": alert.target_ip,
        "status": alert.status,
        "timestamp": alert.timestamp or datetime.now(timezone.utc).isoformat(),
    }


def _insert_alert_rows(rows: list[dict]) -> list[dict]:
    supabase_url, service_role_key = _get_supabase_credentials()
    endpoint = f"{supabase_url}/rest/v1/alerts"

    req = urllib_request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Prefer": "return=representation",
        },
    )

    try:
        with _urlopen_with_ssl_fallback(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise HTTPException(status_code=exc.code, detail=f"Supabase insert failed: {detail}") from exc
    except urllib_error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Supabase: {exc.reason}") from exc


def _insert_audit_log_rows(rows: list[dict]) -> list[dict]:
    supabase_url, service_role_key = _get_supabase_credentials()
    endpoint = f"{supabase_url}/rest/v1/audit_logs"

    req = urllib_request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Prefer": "return=representation",
        },
    )

    try:
        with _urlopen_with_ssl_fallback(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else []
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise HTTPException(status_code=exc.code, detail=f"Supabase audit log insert failed: {detail}") from exc
    except urllib_error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Supabase: {exc.reason}") from exc


def _urlopen_with_ssl_fallback(req: urllib_request.Request, timeout: int):
    try:
        return urllib_request.urlopen(req, timeout=timeout)
    except urllib_error.URLError as exc:
        reason = str(getattr(exc, "reason", ""))
        if "CERTIFICATE_VERIFY_FAILED" not in reason:
            raise

        insecure_context = ssl._create_unverified_context()
        return urllib_request.urlopen(req, timeout=timeout, context=insecure_context)


def _predict_from_sample(sample: dict) -> tuple[str, float]:
    sample_df = pd.DataFrame([sample])
    sample_df = sample_df.reindex(columns=scaler.feature_names_in_, fill_value=0)
    sample_scaled = scaler.transform(sample_df)
    sample_scaled_df = pd.DataFrame(sample_scaled, columns=scaler.feature_names_in_)

    pred = model.predict(sample_scaled_df)[0]
    prob = model.predict_proba(sample_scaled_df)[0][1]
    prediction = "ATTACK" if pred == 1 else "BENIGN"
    return prediction, float(prob)


def _derive_alert_severity(confidence: float) -> str:
    if confidence >= 0.9:
        return "critical"
    if confidence >= 0.75:
        return "high"
    if confidence >= 0.55:
        return "medium"
    return "low"


def _derive_alert_status(severity: str) -> str:
    if severity == "critical":
        return "investigating"
    if severity in {"high", "medium"}:
        return "open"
    return "resolved"


def _normalize_level(level: str | None) -> str:
    normalized = (level or "").strip().lower()
    if normalized == "warn":
        return "warning"
    return normalized


def _severity_from_level(level: str) -> str:
    if level in {"critical", "fatal"}:
        return "critical"
    if level in {"error", "err"}:
        return "high"
    if level in {"warning", "warn"}:
        return "medium"
    return "low"


def _risk_score_from_level(level: str) -> float:
    if level in {"critical", "fatal"}:
        return 95.0
    if level in {"error", "err"}:
        return 80.0
    if level in {"warning", "warn"}:
        return 60.0
    if level in {"info"}:
        return 35.0
    return 20.0


def _clamp_risk_score(value: float) -> float:
    return max(0.0, min(100.0, value))


def _level_from_http_status(status_code: int) -> str:
    if status_code >= 500:
        return "error"
    if status_code >= 400:
        return "warning"
    return "info"


def _parse_apache_timestamp(raw: str | None) -> str | None:
    if not raw:
        return None

    try:
        parsed = datetime.strptime(raw, "%d/%b/%Y:%H:%M:%S %z")
        return parsed.astimezone(timezone.utc).isoformat()
    except ValueError:
        return None


def _extract_fields_from_raw_log(raw_log: str) -> dict:
    match = APACHE_LOG_PATTERN.match(raw_log.strip())
    if not match:
        return {
            "message": raw_log,
            "target_ip": None,
            "timestamp": None,
            "level": None,
            "status_code": None,
            "request": None,
        }

    status_code = int(match.group("status"))
    parsed_level = _level_from_http_status(status_code)

    return {
        "message": raw_log,
        "target_ip": match.group("ip"),
        "timestamp": _parse_apache_timestamp(match.group("timestamp")),
        "level": parsed_level,
        "status_code": status_code,
        "request": match.group("request"),
    }


def _detect_log_indicators(message: str, request: str | None) -> list[str]:
    content = f"{message} {request or ''}".lower()
    indicators: list[str] = []

    if "'--" in content or " or 1=1" in content or "union select" in content:
        indicators.append("sql-injection-pattern")
    if "../" in content or "%2e%2e" in content:
        indicators.append("path-traversal-pattern")
    if "<script" in content or "javascript:" in content:
        indicators.append("xss-pattern")
    if "cmd=" in content or "powershell" in content or "/etc/passwd" in content:
        indicators.append("command-injection-pattern")

    return indicators


def _build_model_features_from_server_log(
    message: str,
    request: str | None,
    status_code: int | None,
    level: str,
    indicators: list[str],
) -> dict:
    req = request or ""
    status = status_code or 200
    req_len = len(req)
    indicator_score = float(len(indicators))

    status_penalty = 0.0
    if status >= 500:
        status_penalty = 2.0
    elif status >= 400:
        status_penalty = 1.0

    level_weight = 1.0 if level in {"error", "critical", "fatal"} else 0.5 if level in {"warning", "warn"} else 0.2
    risk_driver = indicator_score + status_penalty + level_weight

    return {
        "Flow Duration": max(1.0, 5.0 - min(4.0, risk_driver)),
        "Total Fwd Packets": 1.0 + risk_driver * 30.0,
        "Total Backward Packets": max(0.0, 3.0 - risk_driver),
        "Fwd Packets Length Total": req_len * (40.0 + risk_driver * 10.0),
        "Bwd Packets Length Total": max(0.0, 800.0 - risk_driver * 250.0),
        "Fwd Packet Length Max": min(1500.0, req_len * (2.0 + risk_driver)),
        "Fwd Packet Length Mean": min(900.0, req_len * (1.2 + risk_driver * 0.4)),
        "Fwd Packet Length Std": 20.0 + risk_driver * 25.0,
        "Bwd Packet Length Max": max(0.0, 300.0 - risk_driver * 80.0),
        "Bwd Packet Length Mean": max(0.0, 120.0 - risk_driver * 30.0),
        "Bwd Packet Length Std": 15.0 + risk_driver * 20.0,
        "Flow Bytes/s": 1000.0 + req_len * 500.0 + risk_driver * 120000.0,
        "Flow Packets/s": 20.0 + risk_driver * 400.0,
        "Flow IAT Mean": max(1.0, 50.0 - risk_driver * 10.0),
        "Flow IAT Std": max(0.5, 10.0 - risk_driver * 1.5),
        "Flow IAT Max": 100.0 + risk_driver * 30.0,
        "Flow IAT Min": 0.0,
        "Fwd IAT Total": max(1.0, 100.0 - risk_driver * 25.0),
        "Fwd IAT Mean": max(0.5, 20.0 - risk_driver * 4.0),
        "Fwd IAT Std": max(0.1, 4.0 - risk_driver * 0.7),
        "Fwd IAT Max": 40.0 + risk_driver * 10.0,
        "Fwd IAT Min": 0.0,
        "Bwd IAT Total": max(0.0, 90.0 - risk_driver * 30.0),
        "Bwd IAT Mean": max(0.0, 18.0 - risk_driver * 5.0),
        "Bwd IAT Std": max(0.0, 3.0 - risk_driver * 0.8),
        "Bwd IAT Max": max(0.0, 35.0 - risk_driver * 8.0),
        "Bwd IAT Min": 0.0,
        "Fwd PSH Flags": 1.0 if indicator_score > 0 else 0.0,
        "Fwd Header Length": 64.0 + req_len * 1.5,
        "Bwd Header Length": max(0.0, 64.0 - risk_driver * 20.0),
        "Fwd Packets/s": 20.0 + risk_driver * 350.0,
        "Bwd Packets/s": max(0.0, 30.0 - risk_driver * 8.0),
        "Packet Length Max": min(1500.0, req_len * 2.5 + risk_driver * 40.0),
        "Packet Length Mean": min(1100.0, req_len * 1.4 + risk_driver * 20.0),
        "Packet Length Std": 25.0 + risk_driver * 15.0,
        "Packet Length Variance": (25.0 + risk_driver * 15.0) ** 2,
        "SYN Flag Count": 1.0,
        "URG Flag Count": 0.0,
        "Avg Packet Size": min(1200.0, req_len + risk_driver * 25.0),
        "Avg Fwd Segment Size": min(1200.0, req_len + risk_driver * 30.0),
        "Avg Bwd Segment Size": max(0.0, 120.0 - risk_driver * 30.0),
        "Subflow Fwd Packets": 1.0 + risk_driver * 30.0,
        "Subflow Fwd Bytes": req_len * (40.0 + risk_driver * 10.0),
        "Subflow Bwd Packets": max(0.0, 2.0 - risk_driver),
        "Subflow Bwd Bytes": max(0.0, 600.0 - risk_driver * 200.0),
        "Init Fwd Win Bytes": max(256.0, 65535.0 - risk_driver * 5000.0),
        "Init Bwd Win Bytes": max(0.0, 65535.0 - risk_driver * 20000.0),
        "Fwd Act Data Packets": 1.0 + risk_driver * 25.0,
        "Fwd Seg Size Min": max(0.0, 20.0 - risk_driver * 6.0),
        "Active Mean": 5.0 + risk_driver * 10.0,
        "Active Std": 1.0 + risk_driver * 3.0,
        "Active Max": 10.0 + risk_driver * 15.0,
        "Active Min": max(0.0, 2.0 - risk_driver * 0.5),
        "Idle Mean": max(0.0, 8.0 - risk_driver * 2.0),
        "Idle Std": max(0.0, 2.0 - risk_driver * 0.5),
        "Idle Max": max(0.0, 10.0 - risk_driver * 2.5),
        "Idle Min": max(0.0, 1.0 - risk_driver * 0.2),
    }


def _prediction_label(prediction: str) -> str:
    return "RISK" if prediction == "ATTACK" else "NORMAL"


def _heuristic_risk_from_log(
    message: str,
    request: str | None,
    status_code: int | None,
    level: str,
    indicators: list[str],
) -> float:
    content = f"{message} {request or ''}".lower()

    risk = 15.0
    if status_code is not None:
        if status_code >= 500:
            risk += 30.0
        elif status_code >= 400:
            risk += 20.0

    if level in {"critical", "fatal"}:
        risk += 30.0
    elif level in {"error", "err"}:
        risk += 22.0
    elif level in {"warning", "warn"}:
        risk += 12.0

    risk += len(indicators) * 18.0

    if " or 1=1" in content or "'--" in content or "union select" in content:
        risk += 22.0
    if "/login" in content and "admin" in content:
        risk += 8.0
    if "../" in content or "%2e%2e" in content:
        risk += 12.0
    if "<script" in content:
        risk += 12.0

    return _clamp_risk_score(risk)


def _build_explainability_metadata(
    *,
    message: str,
    request: str | None,
    status_code: int | None,
    source: str,
    target_ip: str | None,
    prediction_label: str,
    confidence: float,
    model_risk_score: float,
    heuristic_risk_score: float,
    final_risk_score: float,
    indicators: list[str],
    severity: str,
    status: str,
    timestamp: str,
) -> dict:
    return {
        "schema": "soarx.explainability.v1",
        "request": request,
        "status_code": status_code,
        "source": source,
        "target_ip": target_ip,
        "prediction_label": prediction_label,
        "confidence": round(confidence, 4),
        "model_risk": round(model_risk_score, 2),
        "heuristic_risk": round(heuristic_risk_score, 2),
        "final_risk": round(final_risk_score, 2),
        "indicators": indicators,
        "severity": severity,
        "status": status,
        "timestamp": timestamp,
        "raw": message,
    }


def _server_log_to_alert_payload(log: ServerLogIn, default_source: str) -> dict:
    raw_extracted = _extract_fields_from_raw_log(log.log) if log.log else {
        "message": None,
        "target_ip": None,
        "timestamp": None,
        "level": None,
        "status_code": None,
        "request": None,
    }

    message = log.message or raw_extracted["message"]
    if not message:
        raise HTTPException(status_code=400, detail="Each log item must include either `message` or `log`.")

    level = _normalize_level(log.level or raw_extracted["level"])
    parsed_request = raw_extracted["request"]
    parsed_status_code = raw_extracted["status_code"]
    indicators = _detect_log_indicators(message, parsed_request)

    model_features = _build_model_features_from_server_log(
        message=message,
        request=parsed_request,
        status_code=parsed_status_code,
        level=level,
        indicators=indicators,
    )
    prediction, confidence = _predict_from_sample(model_features)
    predicted_label = _prediction_label(prediction)

    model_risk_score = _clamp_risk_score(round(confidence * 100.0, 2))
    heuristic_risk_score = _heuristic_risk_from_log(
        message=message,
        request=parsed_request,
        status_code=parsed_status_code,
        level=level,
        indicators=indicators,
    )
    blended_risk_score = max(model_risk_score, heuristic_risk_score)

    risk_score = _clamp_risk_score(log.risk_score if log.risk_score is not None else blended_risk_score)
    severity = log.severity or _derive_alert_severity(risk_score / 100.0)
    status = log.status or _derive_alert_status(severity)

    source_value = log.source or default_source
    target_ip_value = log.target_ip or raw_extracted["target_ip"]
    timestamp_value = log.timestamp or raw_extracted["timestamp"] or datetime.now(timezone.utc).isoformat()

    title = log.title or (f"{predicted_label} HTTP {parsed_status_code}" if parsed_status_code else f"{predicted_label} Event")
    indicator_text = ", ".join(indicators) if indicators else "none"
    ai_line = (
        f"AI={predicted_label} confidence={confidence:.2f} "
        f"model_risk={model_risk_score:.2f} heuristic_risk={heuristic_risk_score:.2f} "
        f"final_risk={risk_score:.2f} indicators={indicator_text}"
    )
    raw_line = f"raw={message}"
    request_line = f"request={parsed_request}" if parsed_request else ""
    metadata = _build_explainability_metadata(
        message=message,
        request=parsed_request,
        status_code=parsed_status_code,
        source=source_value,
        target_ip=target_ip_value,
        prediction_label=predicted_label,
        confidence=confidence,
        model_risk_score=model_risk_score,
        heuristic_risk_score=heuristic_risk_score,
        final_risk_score=risk_score,
        indicators=indicators,
        severity=severity,
        status=status,
        timestamp=timestamp_value,
    )
    metadata_line = f"meta_json={json.dumps(metadata, separators=(',', ':'))}"
    generated_description = " | ".join([part for part in [metadata_line, request_line, ai_line, raw_line] if part])
    description = log.description or generated_description

    return {
        "title": title,
        "description": description,
        "severity": severity,
        "risk_score": risk_score,
        "source": source_value,
        "target_ip": target_ip_value,
        "status": status,
        "timestamp": timestamp_value,
    }


def _insert_alert_rows_in_chunks(rows: list[dict], chunk_size: int = 500) -> list[dict]:
    inserted: list[dict] = []
    for i in range(0, len(rows), chunk_size):
        inserted.extend(_insert_alert_rows(rows[i : i + chunk_size]))
    return inserted


def _default_title(prediction: str) -> str:
    return "Threat" if prediction == "ATTACK" else "Low Risk"


def _default_description(prediction: str, confidence: float) -> str:
    return f"Model predicted {prediction} with confidence {confidence:.2f}."


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/alerts")
def create_alert(alert: AlertIn):
    inserted = _insert_alert_rows([_normalize_alert_payload(alert)])
    return {"inserted": len(inserted), "data": inserted}


@app.post("/alerts/bulk")
def create_alerts_bulk(batch: AlertBatchIn):
    if not batch.alerts:
        raise HTTPException(status_code=400, detail="alerts list cannot be empty")

    payload = [_normalize_alert_payload(alert) for alert in batch.alerts]
    inserted = _insert_alert_rows(payload)
    return {"inserted": len(inserted), "data": inserted}


@app.post("/predict-and-store")
def predict_and_store(input_data: PredictAndStoreIn):
    prediction, confidence = _predict_from_sample(input_data.data)

    severity = _derive_alert_severity(confidence)
    status = _derive_alert_status(severity)
    risk_score = round(confidence * 100, 2)

    alert_payload = {
        "title": input_data.title or _default_title(prediction),
        "description": input_data.description or _default_description(prediction, confidence),
        "severity": severity,
        "risk_score": risk_score,
        "source": input_data.source,
        "target_ip": input_data.target_ip,
        "status": status,
        "timestamp": input_data.timestamp or datetime.now(timezone.utc).isoformat(),
    }

    inserted = _insert_alert_rows([alert_payload])

    audit_log_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_email": input_data.source,
        "action": "Predicted and stored alert",
        "resource": alert_payload["title"],
        "resource_type": "alert",
        "status": "warning" if prediction == "ATTACK" else "success",
        "ip_address": input_data.target_ip or "0.0.0.0",
        "details": f"Model predicted {prediction} with confidence {confidence:.2f} and inserted alert into database.",
    }

    audit_log_error = None
    try:
        _insert_audit_log_rows([audit_log_payload])
    except HTTPException as exc:
        # Keep detection path successful even if audit logging fails.
        audit_log_error = exc.detail

    return {
        "prediction": prediction,
        "confidence": confidence,
        "alert": inserted[0] if inserted else None,
        "audit_log_error": audit_log_error,
    }

@app.post("/predict")
def predict(input_data: InputData):
    prediction, confidence = _predict_from_sample(input_data.data)

    return {
        "prediction": prediction,
        "confidence": confidence
    }


@app.post("/import-server-logs")
def import_server_logs(input_data: ServerLogImportIn):
    if not input_data.logs:
        raise HTTPException(status_code=400, detail="logs list cannot be empty")

    alert_payloads = [_server_log_to_alert_payload(log, input_data.source) for log in input_data.logs]
    inserted = _insert_alert_rows_in_chunks(alert_payloads)

    risk_events = sum(1 for row in alert_payloads if float(row["risk_score"]) >= 55.0)
    normal_events = len(alert_payloads) - risk_events
    average_risk_score = round(sum(float(row["risk_score"]) for row in alert_payloads) / len(alert_payloads), 2)

    audit_log_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_email": input_data.source,
        "action": "Imported server logs",
        "resource": "alerts",
        "resource_type": "alert",
        "status": "success",
        "ip_address": "0.0.0.0",
        "details": f"Imported {len(inserted)} server log(s); risk_events={risk_events}, normal_events={normal_events}, avg_risk={average_risk_score}.",
    }

    audit_log_error = None
    try:
        _insert_audit_log_rows([audit_log_payload])
    except HTTPException as exc:
        audit_log_error = exc.detail

    return {
        "imported": len(inserted),
        "data": inserted,
        "risk_events": risk_events,
        "normal_events": normal_events,
        "average_risk_score": average_risk_score,
        "audit_log_error": audit_log_error,
    }