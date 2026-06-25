from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.entity import EntityCreate, EntityFieldCreate, EntityFieldUpdate, EntityRecordPayload, EntityRelationCreate, EntityUpdate
from app.services import entity_service

router = APIRouter(tags=["entities"])


def _error(error: Exception):
    if isinstance(error, LookupError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    if isinstance(error, entity_service.EntityConflictError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": error.detail, "conflicts": error.conflicts},
        )
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error


@router.get("/projects/{project_id}/entities")
def list_entities(project_id: int, db: Session = Depends(get_db)):
    return entity_service.list_project_entities(db, project_id)


@router.post("/projects/{project_id}/entities", status_code=status.HTTP_201_CREATED)
def create_entity(project_id: int, payload: EntityCreate, db: Session = Depends(get_db)):
    try:
        entity = entity_service.create_entity(db, project_id, payload.model_dump())
    except (LookupError, ValueError) as error:
        _error(error)
    return entity_service.entity_to_response(db, entity)


@router.get("/entities/{entity_id}")
def get_entity(entity_id: int, db: Session = Depends(get_db)):
    entity = entity_service.get_entity(db, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="entity not found")
    return entity_service.entity_to_response(db, entity)


@router.patch("/entities/{entity_id}")
def patch_entity(entity_id: int, payload: EntityUpdate, db: Session = Depends(get_db)):
    try:
        entity = entity_service.update_entity(db, entity_id, payload.model_dump(exclude_unset=True))
    except ValueError as error:
        _error(error)
    if not entity:
        raise HTTPException(status_code=404, detail="entity not found")
    return entity_service.entity_to_response(db, entity)


@router.delete("/entities/{entity_id}")
def remove_entity(entity_id: int, db: Session = Depends(get_db)):
    try:
        deleted = entity_service.delete_entity(db, entity_id)
    except (ValueError, entity_service.EntityConflictError) as error:
        conflict_response = _error(error)
        if conflict_response is not None:
            return conflict_response
    if not deleted:
        raise HTTPException(status_code=404, detail="entity not found")
    return {"ok": True}


@router.post("/entities/{entity_id}/fields", status_code=status.HTTP_201_CREATED)
def create_field(entity_id: int, payload: EntityFieldCreate, db: Session = Depends(get_db)):
    try:
        return entity_service.field_to_response(entity_service.create_entity_field(db, entity_id, payload.model_dump()))
    except (LookupError, ValueError) as error:
        _error(error)


@router.patch("/entities/{entity_id}/fields/{field_id}")
def patch_field(entity_id: int, field_id: int, payload: EntityFieldUpdate, db: Session = Depends(get_db)):
    try:
        field = entity_service.update_entity_field(db, entity_id, field_id, payload.model_dump(exclude_unset=True))
    except (LookupError, ValueError, entity_service.EntityConflictError) as error:
        conflict_response = _error(error)
        if conflict_response is not None:
            return conflict_response
    if not field:
        raise HTTPException(status_code=404, detail="field not found")
    relation = entity_service.get_entity_relation_by_field(db, field.id)
    return entity_service.field_to_response(field, relation)


@router.delete("/entities/{entity_id}/fields/{field_id}")
def remove_field(entity_id: int, field_id: int, db: Session = Depends(get_db)):
    try:
        deleted = entity_service.delete_entity_field(db, entity_id, field_id)
    except (ValueError, entity_service.EntityConflictError) as error:
        conflict_response = _error(error)
        if conflict_response is not None:
            return conflict_response
    if not deleted:
        raise HTTPException(status_code=404, detail="field not found")
    return {"ok": True}


@router.post("/entities/{entity_id}/relations", status_code=status.HTTP_201_CREATED)
def create_relation(entity_id: int, payload: EntityRelationCreate, db: Session = Depends(get_db)):
    try:
        relation = entity_service.create_entity_relation(db, entity_id, payload.model_dump())
    except (LookupError, ValueError) as error:
        _error(error)
    return {"id": relation.id, "source_field_id": relation.source_field_id, "target_entity_id": relation.target_entity_id, "target_display_field_key": relation.target_display_field_key, "relation_type": relation.relation_type}


@router.get("/entities/{entity_id}/fields/{field_id}/reference-options")
def reference_options(entity_id: int, field_id: int, search: str = "", db: Session = Depends(get_db)):
    try:
        return entity_service.list_reference_options(db, entity_id, field_id, search)
    except LookupError as error:
        _error(error)


@router.get("/entities/{entity_id}/records")
def list_records(entity_id: int, request: Request, page: int = 1, pageSize: int = 10, db: Session = Depends(get_db)):
    try:
        filters = {key: value for key, value in request.query_params.items() if key not in {"page", "pageSize"}}
        return entity_service.list_entity_records(db, entity_id, filters, page, pageSize)
    except LookupError as error:
        _error(error)


@router.post("/entities/{entity_id}/records", status_code=status.HTTP_201_CREATED)
def create_record(entity_id: int, payload: EntityRecordPayload, db: Session = Depends(get_db)):
    try:
        return entity_service.entity_record_to_response(db, entity_service.create_entity_record(db, entity_id, payload.data))
    except (LookupError, ValueError) as error:
        _error(error)


@router.put("/entities/{entity_id}/records/{record_id}")
def update_record(entity_id: int, record_id: int, payload: EntityRecordPayload, db: Session = Depends(get_db)):
    try:
        record = entity_service.update_entity_record(db, entity_id, record_id, payload.data)
    except ValueError as error:
        _error(error)
    if not record:
        raise HTTPException(status_code=404, detail="record not found")
    return entity_service.entity_record_to_response(db, record)


@router.delete("/entities/{entity_id}/records/{record_id}")
def delete_record(entity_id: int, record_id: int, db: Session = Depends(get_db)):
    try:
        deleted = entity_service.delete_entity_record(db, entity_id, record_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="record not found")
    return {"ok": True}
