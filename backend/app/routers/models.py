from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/models")
async def list_models(request: Request):
    registry = request.app.state.registry
    return {"models": registry.list_models()}
