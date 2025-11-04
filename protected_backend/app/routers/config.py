"""
Configuration management API endpoints

Provides REST API for local JSON configuration management with
validation, masking, and error handling.
"""

from typing import Dict, Any, Optional
import uuid

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import ValidationError

from app.config import get_config_service
from app.models.config import (
    LocalConfig,
    ConfigResponse,
    ConfigUpdateResponse,
    ConfigError,
    ConfigErrorResponse,
    format_validation_errors
)
from app.utils.responses import (
    create_config_success_response,
    create_config_update_response,
    create_config_validation_error_response,
    create_error_response
)

router = APIRouter(prefix="/config", tags=["configuration"])


@router.get("/", response_model=ConfigResponse)
async def get_config(
    request: Request,
    include_secrets: bool = Query(False, description="Include unmasked sensitive fields")
) -> Dict[str, Any]:
    """
    Get current configuration with optional secret masking.
    
    Args:
        include_secrets: If True, return unmasked sensitive fields
    
    Returns:
        Current configuration (masked by default)
    """
    trace_id = str(uuid.uuid4())
    
    try:
        config_service = get_config_service()
        config_data = config_service.get_config(include_secrets=include_secrets)
        
        return create_config_success_response(
            config_data=config_data,
            message="Configuration retrieved successfully",
            trace_id=trace_id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response(
                code="CONFIG_READ_ERROR",
                message=f"Failed to read configuration: {str(e)}",
                trace_id=trace_id
            )
        )


@router.put("/", response_model=ConfigUpdateResponse)
async def update_config(
    request: Request,
    config_data: LocalConfig
) -> Dict[str, Any]:
    """
    Update entire configuration with validation.
    
    Args:
        config_data: New configuration data
    
    Returns:
        Updated configuration (masked)
    """
    trace_id = str(uuid.uuid4())
    
    try:
        config_service = get_config_service()
        updated_config = config_service.put_config(config_data.dict())
        
        return create_config_update_response(
            config_data=updated_config,
            message="Configuration updated successfully",
            trace_id=trace_id
        )
    
    except ValidationError as e:
        errors = format_validation_errors(e)
        raise HTTPException(
            status_code=422,
            detail=create_config_validation_error_response(
                message="Configuration validation failed",
                errors=errors,
                trace_id=trace_id
            )
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response(
                code="CONFIG_UPDATE_ERROR",
                message=f"Failed to update configuration: {str(e)}",
                trace_id=trace_id
            )
        )


@router.patch("/", response_model=ConfigUpdateResponse)
async def patch_config(
    request: Request,
    partial_config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Partially update configuration with validation.
    
    Args:
        partial_config: Partial configuration data
    
    Returns:
        Updated configuration (masked)
    """
    trace_id = str(uuid.uuid4())
    
    try:
        config_service = get_config_service()
        updated_config = config_service.patch_config(partial_config)
        
        return create_config_update_response(
            config_data=updated_config,
            message="Configuration partially updated successfully",
            trace_id=trace_id
        )
    
    except ValidationError as e:
        errors = format_validation_errors(e)
        raise HTTPException(
            status_code=422,
            detail=create_config_validation_error_response(
                message="Configuration validation failed",
                errors=errors,
                trace_id=trace_id
            )
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response(
                code="CONFIG_PATCH_ERROR",
                message=f"Failed to patch configuration: {str(e)}",
                trace_id=trace_id
            )
        )


@router.get("/schema")
async def get_config_schema(request: Request) -> Dict[str, Any]:
    """
    Get JSON Schema for configuration validation.
    
    Returns:
        JSON Schema dictionary
    """
    trace_id = str(uuid.uuid4())
    
    try:
        config_service = get_config_service()
        schema = config_service.get_schema()
        
        return create_config_success_response(
            config_data=schema,
            message="Configuration schema retrieved successfully",
            trace_id=trace_id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response(
                code="SCHEMA_ERROR",
                message=f"Failed to get configuration schema: {str(e)}",
                trace_id=trace_id
            )
        )


@router.post("/reset", response_model=ConfigUpdateResponse)
async def reset_config(request: Request) -> Dict[str, Any]:
    """
    Reset configuration to default values.
    
    Returns:
        Default configuration (masked)
    """
    trace_id = str(uuid.uuid4())
    
    try:
        config_service = get_config_service()
        default_config = config_service.reset_config()
        
        return create_config_update_response(
            config_data=default_config,
            message="Configuration reset to defaults successfully",
            trace_id=trace_id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response(
                code="CONFIG_RESET_ERROR",
                message=f"Failed to reset configuration: {str(e)}",
                trace_id=trace_id
            )
        )


@router.get("/secrets", response_model=ConfigResponse)
async def get_config_with_secrets(request: Request) -> Dict[str, Any]:
    """
    Get configuration with unmasked sensitive fields.
    
    Note: This endpoint should be secured in production.
    
    Returns:
        Configuration with unmasked sensitive fields
    """
    trace_id = str(uuid.uuid4())
    
    try:
        config_service = get_config_service()
        config_data = config_service.get_config(include_secrets=True)
        
        return create_config_success_response(
            config_data=config_data,
            message="Configuration with secrets retrieved successfully",
            trace_id=trace_id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=create_error_response(
                code="CONFIG_SECRETS_ERROR",
                message=f"Failed to read configuration with secrets: {str(e)}",
                trace_id=trace_id
            )
        )