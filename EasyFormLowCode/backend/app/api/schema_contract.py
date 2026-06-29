from fastapi import APIRouter

from app.schemas.page_schema import (
    PageSchemaContractPayload,
    PageSchemaContractResponse,
    PageSchemaValidationResponse,
)
from app.services.schema_contract import (
    get_minimal_schema,
    get_page_schema_validation_errors,
    normalize_page_schema,
)

router = APIRouter(prefix="/schema-contract/page-schema", tags=["schema-contract"])


@router.get("/default", response_model=PageSchemaContractResponse)
def get_default_page_schema(page_id: str = "user_manage"):
    return {"schema_json": normalize_page_schema(page_id, get_minimal_schema(page_id))}


@router.post("/normalize", response_model=PageSchemaContractResponse)
def normalize_page_schema_contract(payload: PageSchemaContractPayload):
    return {
        "schema_json": normalize_page_schema(payload.page_id, payload.schema_data),
    }


@router.post("/validate", response_model=PageSchemaValidationResponse)
def validate_page_schema_contract(payload: PageSchemaContractPayload):
    errors = get_page_schema_validation_errors(payload.schema_data)
    return {
        "valid": not errors,
        "errors": errors,
        "schema_json": normalize_page_schema(payload.page_id, payload.schema_data),
    }
