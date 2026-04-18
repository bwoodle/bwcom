"""Shared types for Strava pipeline scripts."""

from __future__ import annotations

from typing import Literal, NotRequired, Protocol, TypedDict

type ResponseHeaders = dict[str, str]
type Credentials = dict[str, str]
type JsonObject = dict[str, object]
type TrainingLogSlot = Literal["workout1", "workout2"]


class StravaActivity(TypedDict, total=False):
    type: str
    distance: float
    start_date: str
    start_date_local: str
    name: str
    manual: bool
    workout_type: int


class TokenResponse(TypedDict, total=False):
    access_token: str
    refresh_token: str
    expires_at: int
    scope: str


class DailyEntry(TypedDict):
    logId: str
    sk: str
    date: str
    entryType: Literal["daily"]
    slot: TrainingLogSlot
    description: str
    miles: float
    createdAt: str
    highlight: NotRequired[bool]


class WeeklyEntry(TypedDict):
    logId: str
    sk: str
    date: str
    entryType: Literal["week"]
    description: str
    createdAt: str


type TrainingLogEntry = DailyEntry | WeeklyEntry


class DynamoTableLike(Protocol):
    def put_item(
        self,
        *,
        Item: JsonObject,
        ConditionExpression: str,
    ) -> object: ...


class DynamoResourceLike(Protocol):
    def Table(self, name: str) -> DynamoTableLike: ...


class WriteCounts(TypedDict):
    written: int
    skipped: int
    failed: int


class HttpPost(Protocol):
    def __call__(self, url: str, data: dict[str, str]) -> TokenResponse: ...


class HttpGet(Protocol):
    def __call__(
        self,
        url: str,
        access_token: str,
    ) -> tuple[object, ResponseHeaders]: ...
