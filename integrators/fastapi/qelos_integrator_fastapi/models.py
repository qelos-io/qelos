from __future__ import annotations

from typing import Any, List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class QelosUser(BaseModel):
    """Typed view of the JSON object returned by ``GET /api/me``."""

    model_config = ConfigDict(extra="allow")

    id: Optional[str] = Field(default=None, validation_alias=AliasChoices("_id", "id"))
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("fullName", "full_name"),
    )
    first_name: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("firstName", "first_name"),
    )
    last_name: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("lastName", "last_name"),
    )
    birth_date: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("birthDate", "birth_date"),
    )
    roles: Optional[List[Any]] = None
    metadata: Optional[Any] = None


class QelosWorkspace(BaseModel):
    """Typed view of workspace objects from the Qelos API."""

    model_config = ConfigDict(extra="allow")

    id: Optional[str] = Field(default=None, validation_alias=AliasChoices("_id", "id"))
    name: Optional[str] = None
    labels: Optional[List[Any]] = None
