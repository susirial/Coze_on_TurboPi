"""
Configuration module for Turbopi Backend

Handles environment variables, runtime mode selection, and application settings.
"""

import os
import json
import fcntl
import tempfile
from pathlib import Path
from enum import Enum
from functools import lru_cache
from typing import Optional, Dict, Any
import threading

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class RuntimeMode(str, Enum):
    """Runtime mode enumeration."""
    MACBOOK_SIM = "macbook_sim"
    RASPBERRY_PI_ROS2 = "raspberry_pi_ros2"


class LogLevel(str, Enum):
    """Log level enumeration."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    log_level: LogLevel = Field(default=LogLevel.INFO, description="Log level")
    
    # Runtime mode
    runtime_mode: RuntimeMode = Field(
        default=RuntimeMode.MACBOOK_SIM,
        description="Runtime mode: macbook_sim or raspberry_pi_ros2"
    )
    
    # Zeroconf configuration
    zeroconf_service_name: str = Field(
        default="Turbopi Backend",
        description="Zeroconf service name"
    )
    zeroconf_service_type: str = Field(
        default="_turbopi._tcp.local.",
        description="Zeroconf service type"
    )
    zeroconf_ttl: int = Field(default=120, description="Zeroconf TTL in seconds")
    
    # Performance settings
    control_timeout_ms: int = Field(
        default=1000,
        description="Control command timeout in milliseconds"
    )
    estop_timeout_ms: int = Field(
        default=100,
        description="Emergency stop timeout in milliseconds"
    )
    camera_preview_timeout_ms: int = Field(
        default=2000,
        description="Camera preview startup timeout in milliseconds"
    )
    led_control_timeout_ms: int = Field(
        default=500,
        description="LED control timeout in milliseconds"
    )
    llm_request_timeout_ms: int = Field(
        default=5000,
        description="LLM request timeout in milliseconds"
    )
    
    # Remote code execution settings
    exec_timeout_ms: int = Field(
        default=1000,
        description="Code execution timeout in milliseconds"
    )
    exec_memory_limit_mb: int = Field(
        default=64,
        description="Code execution memory limit in MB"
    )
    exec_allowed_modules: list[str] = Field(
        default_factory=lambda: [
            "math", "random", "time", "json", "re", "datetime",
            "collections", "itertools", "functools", "operator"
        ],
        description="Allowed Python modules for code execution"
    )
    
    # ROS2 specific settings (only used in raspberry_pi_ros2 mode)
    ros2_node_name: str = Field(
        default="turbopi_backend",
        description="ROS2 node name"
    )
    ros2_cmd_vel_topic: str = Field(
        default="/cmd_vel",
        description="ROS2 cmd_vel topic name"
    )
    ros2_camera_topic: str = Field(default="/image_raw", description="ROS2 camera image topic name")
    ros2_buzzer_topic: str = Field(
        default="/ros_robot_controller/set_buzzer",
        description="ROS2 buzzer control topic name"
    )
    
    # Camera settings
    camera_device_id: int = Field(default=0, description="Camera device ID")
    camera_width: int = Field(default=640, description="Camera width")
    camera_height: int = Field(default=480, description="Camera height")
    camera_fps: int = Field(default=30, description="Camera FPS")
    camera_snapshot_timeout_ms: int = Field(default=2000, description="Camera snapshot timeout in milliseconds")
    
    # LLM proxy settings
    llm_service_url: Optional[str] = Field(
        default=None,
        description="LLM service URL (if using external service)"
    )
    llm_service_timeout_s: int = Field(
        default=10,
        description="LLM service timeout in seconds"
    )
    
    class Config:
        env_prefix = "TURBOPI_"
        case_sensitive = False
        
    def get_zeroconf_txt_records(self) -> dict[str, str]:
        """Get Zeroconf TXT records for service advertisement."""
        return {
            "mode": self.runtime_mode.value,
            "version": "0.1.0",
            "api": "rest",
            "device": "turbopi",
            "port": str(self.port),
        }
    
    def is_ros2_mode(self) -> bool:
        """Check if running in ROS2 mode."""
        return self.runtime_mode == RuntimeMode.RASPBERRY_PI_ROS2
    
    def is_sim_mode(self) -> bool:
        """Check if running in simulation mode."""
        return self.runtime_mode == RuntimeMode.MACBOOK_SIM


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()

# Local JSON Configuration Management
class LocalConfigManager:
    """Manages local JSON configuration file with thread-safe operations."""
    
    def __init__(self, config_path: Optional[str] = None):
        # Use a re-entrant lock to avoid deadlocks when a method holding
        # the lock calls another method that attempts to acquire it again.
        # For example, read_config() may call _atomic_write() when creating
        # defaults, which also acquires the same lock.
        self._lock = threading.RLock()
        self._config_path = self._get_config_path(config_path)
        self._ensure_config_dir()
    
    def _get_config_path(self, config_path: Optional[str] = None) -> Path:
        """Get configuration file path with environment variable override."""
        if config_path:
            return Path(config_path).expanduser().resolve()
            
        env_config_path = os.getenv("TURBOPI_CONFIG_PATH")
        if env_config_path:
            return Path(env_config_path).expanduser().resolve()
        
        # Default path: ~/.turbopi/config.json
        home_dir = Path.home()
        return home_dir / ".turbopi" / "config.json"
    
    def _ensure_config_dir(self):
        """Ensure configuration directory exists."""
        self._config_path.parent.mkdir(parents=True, exist_ok=True)
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration values."""
        return {
            "llm_provider": "openai",
            "telemetry_enabled": False,
            "discovery_enabled": True,
            "allowed_origins": [],
            "coze_voice_id": None,
            "coze_workspace_id": None
        }
    
    def _atomic_write(self, data: Dict[str, Any]):
        """Atomically write configuration to file with file locking."""
        with self._lock:
            # Create temporary file in same directory
            temp_fd, temp_path = tempfile.mkstemp(
                dir=self._config_path.parent,
                prefix=f"{self._config_path.name}.tmp"
            )
            
            try:
                with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                    # Acquire exclusive lock
                    fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())
                
                # Atomic replace
                os.replace(temp_path, self._config_path)
                
            except Exception:
                # Clean up temp file on error
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass
                raise
    
    def read_config(self) -> Dict[str, Any]:
        """Read configuration from file, return default if not exists."""
        with self._lock:
            if not self._config_path.exists():
                default_config = self._get_default_config()
                self._atomic_write(default_config)
                return default_config
            
            try:
                with open(self._config_path, 'r', encoding='utf-8') as f:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                    return json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                # Return default config if file is corrupted
                default_config = self._get_default_config()
                self._atomic_write(default_config)
                return default_config
    
    def write_config(self, config: Dict[str, Any]):
        """Write configuration to file."""
        self._atomic_write(config)
    
    def merge_config(self, partial_config: Dict[str, Any]) -> Dict[str, Any]:
        """Merge partial configuration with existing config."""
        current_config = self.read_config()
        current_config.update(partial_config)
        return current_config
    
    def reset_config(self) -> Dict[str, Any]:
        """Reset configuration to default values."""
        default_config = self._get_default_config()
        self._atomic_write(default_config)
        return default_config


# Global instance
_local_config_manager = None

def get_local_config_manager() -> LocalConfigManager:
    """Get global LocalConfigManager instance."""
    global _local_config_manager
    if _local_config_manager is None:
        _local_config_manager = LocalConfigManager()
    return _local_config_manager


class ConfigService:
    """Service class for configuration operations with masking and validation."""
    
    def __init__(self):
        self.config_manager = get_local_config_manager()
    
    def get_config(self, include_secrets: bool = False) -> Dict[str, Any]:
        """
        Get configuration with optional secret masking.
        
        Args:
            include_secrets: If True, return unmasked sensitive fields
        
        Returns:
            Configuration dictionary with masked or unmasked sensitive fields
        """
        from app.models.config import mask_sensitive_fields
        
        config = self.config_manager.read_config()
        return mask_sensitive_fields(config, include_secrets)
    
    def put_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update entire configuration with validation.
        
        Args:
            config_data: New configuration data
        
        Returns:
            Updated configuration (masked)
        
        Raises:
            ValidationError: If validation fails
        """
        from app.models.config import validate_config_data, mask_sensitive_fields
        
        # Validate configuration
        validated_config = validate_config_data(config_data)
        
        # Write to file
        self.config_manager.write_config(validated_config.dict())
        
        # Return masked version
        return mask_sensitive_fields(validated_config.dict())
    
    def patch_config(self, partial_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Partially update configuration with validation.
        
        Args:
            partial_config: Partial configuration data
        
        Returns:
            Updated configuration (masked)
        
        Raises:
            ValidationError: If validation fails
        """
        from app.models.config import validate_config_data, mask_sensitive_fields
        
        # Merge with existing config
        merged_config = self.config_manager.merge_config(partial_config)
        
        # Validate merged configuration
        validated_config = validate_config_data(merged_config)
        
        # Write to file
        self.config_manager.write_config(validated_config.dict())
        
        # Return masked version
        return mask_sensitive_fields(validated_config.dict())
    
    def reset_config(self) -> Dict[str, Any]:
        """
        Reset configuration to default values.
        
        Returns:
            Default configuration (masked)
        """
        from app.models.config import mask_sensitive_fields
        
        default_config = self.config_manager.reset_config()
        return mask_sensitive_fields(default_config)
    
    def get_schema(self) -> Dict[str, Any]:
        """
        Get JSON Schema for configuration validation.
        
        Returns:
            JSON Schema dictionary
        """
        from app.models.config import get_config_schema
        
        return get_config_schema()


# Global service instance
_config_service = None

def get_config_service() -> ConfigService:
    """Get global ConfigService instance."""
    global _config_service
    if _config_service is None:
        _config_service = ConfigService()
    return _config_service