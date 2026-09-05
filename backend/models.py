"""Shared Pydantic models — Phase 0 + Phase 1 + Phase 2 + Phase 3 + Phase 4.

Phase 4 adds deterministic AI-report models. The AI never decides risk;
these models only structure evidence-grounded explanations.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "risklens-ai"


class Transaction(BaseModel):
    transaction_id: str
    customer_id: str
    timestamp: str
    date: str
    time: str
    description: str
    payee: str
    amount: float
    channel: str
    transaction_type: str


class Customer(BaseModel):
    customer_id: str
    customer_name: str
    customer_type: str
    primary_channel: str
    typical_monthly_transactions: int
    typical_monthly_amount: float


class CustomerBaseline(BaseModel):
    total_transactions: int
    total_amount: float
    average_amount: float
    median_amount: float
    minimum_amount: float
    maximum_amount: float
    standard_deviation: float
    typical_transaction_count_per_day: float = 0.0
    average_daily_amount: float = 0.0
    most_common_payees: list = Field(default_factory=list)
    most_common_channels: list = Field(default_factory=list)
    most_common_transaction_types: list = Field(default_factory=list)
    typical_transaction_hour: int = 12
    median_transaction_hour: int = 12
    weekday_transaction_count: int = 0
    weekend_transaction_count: int = 0
    monthly_transaction_count: dict = Field(default_factory=dict)
    monthly_total_amount: dict = Field(default_factory=dict)


class ValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    rows: int = 0


class DataStatusDateRange(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None


class DataStatus(BaseModel):
    dataset_loaded: bool
    customers: int = 0
    transactions: int = 0
    date_range: DataStatusDateRange = Field(default_factory=DataStatusDateRange)


class Finding(BaseModel):
    finding_id: str
    customer_id: str
    rule_id: str
    rule_name: str
    severity: str
    transaction_ids: List[str]
    detected_at: Optional[str] = None
    summary: str = ""
    evidence: dict = Field(default_factory=dict)
    baseline: dict = Field(default_factory=dict)
    calculation: dict = Field(default_factory=dict)
    traceability: dict = Field(default_factory=dict)


class FindingsDocument(BaseModel):
    generated_from: str = "data/transactions.csv"
    engine_version: str = "1.0"
    rules: List[str] = Field(default_factory=lambda: ["R01", "R02", "R03", "R04", "R05"])
    transactions_analysed: int = 0
    findings: List[Finding] = Field(default_factory=list)


class FindingValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    findings: int = 0


class EvidenceItem(BaseModel):
    transaction_id: str
    customer_id: str = ""
    timestamp: str = ""
    date: str = ""
    time: str = ""
    description: str = ""
    payee: str = ""
    amount: float = 0.0
    channel: str = ""
    transaction_type: str = ""


class EvidencePackage(BaseModel):
    finding_id: str
    customer_id: str
    rule_id: str
    primary_transactions: List[dict] = Field(default_factory=list)
    related_transactions: List[dict] = Field(default_factory=list)
    customer_context: dict = Field(default_factory=dict)
    payee_context: dict = Field(default_factory=dict)
    temporal_context: dict = Field(default_factory=dict)
    baseline_comparison: dict = Field(default_factory=dict)
    calculation: dict = Field(default_factory=dict)
    source_traceability: dict = Field(default_factory=dict)


class InvestigationContext(BaseModel):
    investigation_id: str
    customer_id: str
    finding_ids: List[str] = Field(default_factory=list)
    findings: List[dict] = Field(default_factory=list)
    evidence_packages: List[dict] = Field(default_factory=list)
    customer_profile: dict = Field(default_factory=dict)
    source: dict = Field(default_factory=dict)


class EvidenceValidationResult(BaseModel):
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    packages: int = 0


class ChatHistoryItem(BaseModel):
    role: str = "user"
    content: str = ""


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[ChatHistoryItem] = Field(default_factory=list)
    investigation_id: Optional[str] = None


class ChatResponse(BaseModel):
    status: str = "complete"
    reply: str = ""
    model_metadata: dict = Field(default_factory=dict)


class RuleExplanation(BaseModel):
    rule_id: str
    rule_name: str = ""
    triggered: bool = True
    explanation: str = ""
    transaction_ids: List[str] = Field(default_factory=list)
    evidence_references: List[str] = Field(default_factory=list)


class EvidenceExplanation(BaseModel):
    title: str
    observation: str = ""
    supporting_transaction_ids: List[str] = Field(default_factory=list)
    baseline_reference: str = ""
    calculation_reference: str = ""


class SourceReference(BaseModel):
    source_type: str
    source_id: str
    transaction_ids: List[str] = Field(default_factory=list)
    description: str = ""


class InvestigationAIReport(BaseModel):
    investigation_id: str = ""
    customer_id: str = ""
    generated_at: str = ""
    status: str = "complete"
    executive_summary: str = ""
    what_happened: str = ""
    why_flagged: str = ""
    behavioral_comparison: str = ""
    rule_explanations: List[RuleExplanation] = Field(default_factory=list)
    key_evidence: List[EvidenceExplanation] = Field(default_factory=list)
    analyst_considerations: List[str] = Field(default_factory=list)
    uncertainty: str = ""
    source_references: List[SourceReference] = Field(default_factory=list)
    model_metadata: dict = Field(default_factory=dict)
