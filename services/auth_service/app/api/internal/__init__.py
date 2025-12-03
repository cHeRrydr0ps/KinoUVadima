# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends
from app.core.security import require_internal_secret

# Common internal router guarded by internal secret.
internal_router = APIRouter(
    prefix="/internal",
    dependencies=[Depends(require_internal_secret)],
)
