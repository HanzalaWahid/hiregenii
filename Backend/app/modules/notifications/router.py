"""HTTP routes for the notifications module (moved verbatim from the Hire-geni API)."""

from __future__ import annotations
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import decode_token
from app.db.models import Notification, User
from app.db.session import get_db
from app.modules.notifications.schemas import NotificationPublic
from app.services.realtime import manager

router = APIRouter()
@router.websocket("/ws/jobs")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        # Authenticate user via token
        payload = decode_token(token)
        user_id = payload.get("uid")
        if not user_id:
            await websocket.close(code=4003)
            return
            
        await manager.connect(websocket, user_id)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@router.get("/notifications", response_model=List[NotificationPublic])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    ).scalars().all()
    return notifs


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.execute(select(Notification).where(Notification.id == notif_id, Notification.user_id == current_user.id)).scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.read = True
    db.commit()
    return {"success": True}


@router.patch("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy import update
    db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read == False)
        .values(read=True)
    )
    db.commit()
    return {"success": True}
