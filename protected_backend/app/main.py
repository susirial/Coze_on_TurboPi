"""
Turbopi Backend - FastAPI Application Entry Point

This module initializes the FastAPI application with Zeroconf service discovery,
runtime mode selection (macbook_sim / raspberry_pi_ros2), and unified API routing.
"""

import asyncio
import logging
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.utils.errors import TurbopiError
from app.utils.logging import setup_logging
from app.utils.responses import create_error_response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown tasks."""
    settings = get_settings()
    logger = logging.getLogger(__name__)
    
    # Startup
    logger.info(f"Starting Turbopi Backend in {settings.runtime_mode} mode")
    logger.info(f"Service will be advertised on port {settings.port}")
    
    # Initialize runtime manager
    from app.services.runtime import get_runtime_manager
    runtime_manager = get_runtime_manager()
    await runtime_manager.initialize()
    
    # TODO: Initialize Zeroconf service discovery
    
    yield
    
    # Shutdown
    logger.info("Shutting down Turbopi Backend")
    
    # Cleanup runtime manager
    await runtime_manager.cleanup()
    
    # TODO: Cleanup Zeroconf service


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    # Setup logging
    setup_logging(settings.log_level)
    
    app = FastAPI(
        title="Turbopi Control Backend",
        description="ROS2-compatible control backend with Zeroconf discovery",
        version="0.1.0",
        lifespan=lifespan,
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # TODO: Restrict in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Global exception handler
    @app.exception_handler(TurbopiError)
    async def turbopi_exception_handler(request: Request, exc: TurbopiError):
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(
                code=exc.error_code,
                message=exc.message,
                details=exc.details,
                trace_id=getattr(request.state, "trace_id", None),
            ),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger = logging.getLogger(__name__)
        logger.exception("Unhandled exception occurred")
        
        return JSONResponse(
            status_code=500,
            content=create_error_response(
                code="INTERNAL_ERROR",
                message="An internal server error occurred",
                trace_id=getattr(request.state, "trace_id", None),
            ),
        )
    
    # Register API routers
    from app.api import status, control, coze_conversations, coze_audio, coze_bots, coze_workspace, coze_files, coze_image, coze_transcriptions, camera, buzzer
    from app.routers import config
    app.include_router(status.router, prefix="/status", tags=["status"])
    app.include_router(control.router, prefix="/control", tags=["control"])
    app.include_router(config.router, prefix="/api/v1", tags=["configuration"])
    app.include_router(coze_conversations.router, prefix="/api/v1", tags=["llm"])
    app.include_router(coze_audio.router, prefix="/api/v1", tags=["llm"])
    app.include_router(coze_transcriptions.router, prefix="/api/v1", tags=["llm"])
    app.include_router(coze_bots.router, prefix="/api/v1", tags=["llm"])
    app.include_router(coze_workspace.router, prefix="/api/v1", tags=["llm"])
    app.include_router(coze_files.router, prefix="/api/v1", tags=["llm"])
    app.include_router(coze_image.router, prefix="/api/v1", tags=["llm"])
    app.include_router(camera.router, prefix="/api/v1", tags=["camera"])
    app.include_router(buzzer.router, prefix="/api/v1", tags=["control"])
    
    # TODO: Register remaining routers
    # from app.api import led, llm, exec
    # app.include_router(led.router, prefix="/led", tags=["led"])
    # app.include_router(llm.router, prefix="/llm", tags=["llm"])
    # app.include_router(exec.router, prefix="/exec", tags=["exec"])
    
    # Add trace_id middleware
    @app.middleware("http")
    async def add_trace_id_middleware(request: Request, call_next):
        from app.utils.logging import set_trace_id
        import uuid
        
        # Get or generate trace_id
        trace_id = request.headers.get("X-Trace-ID") or str(uuid.uuid4())
        set_trace_id(trace_id)
        
        # Store in request state for access in handlers
        request.state.trace_id = trace_id
        
        response = await call_next(request)
        
        # Add trace_id to response headers
        response.headers["X-Trace-ID"] = trace_id

        return response

    # Private Network Access (PNA) preflight compatibility
    # Some browsers require Access-Control-Allow-Private-Network for HTTPS origins
    # accessing private network resources (e.g., 192.168.x.x). Add the header
    # when the request indicates a private-network preflight.
    @app.middleware("http")
    async def private_network_access_middleware(request: Request, call_next):
        response = await call_next(request)

        try:
            if request.method == "OPTIONS":
                req_pna = request.headers.get("Access-Control-Request-Private-Network")
                if req_pna and req_pna.lower() == "true":
                    response.headers["Access-Control-Allow-Private-Network"] = "true"
        except Exception:
            # Be permissive: do not block the response even if header handling fails
            pass

        return response
    
    return app


def main():
    """Main entry point for running the application."""
    settings = get_settings()
    
    import uvicorn
    
    # Avoid relying on current working directory for reload; explicitly set watched dirs
    reload_dirs = None
    if settings.debug:
        # Watch the backend app directory explicitly to prevent Path.cwd() issues
        reload_dirs = [str(Path(__file__).resolve().parent)]

    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
        reload=settings.debug,
        reload_dirs=reload_dirs,
    )


# Create app instance for uvicorn
app = create_app()

if __name__ == "__main__":
    main()