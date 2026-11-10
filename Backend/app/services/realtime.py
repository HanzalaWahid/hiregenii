"""In-process WebSocket fan-out for live notifications.

Single-process only. The platform plan replaces this with Supabase Realtime (phase C/F3+).
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import WebSocket
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import User


class ConnectionManager:
    def __init__(self):
        # Map user_id -> List[WebSocket]
        self.user_connections: Dict[int, List[WebSocket]] = {}
        # Track which user is on which socket for easy disconnect
        self.socket_to_user: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        self.socket_to_user[websocket] = user_id

    def disconnect(self, websocket: WebSocket):
        user_id = self.socket_to_user.get(websocket)
        if user_id is not None:
            if websocket in self.user_connections.get(user_id, []):
                self.user_connections[user_id].remove(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            del self.socket_to_user[websocket]

    async def send_personal_message(self, message: Any, user_id: int):
        if user_id in self.user_connections:
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_role(self, message: Any, role: str, db_session: Session):
        # This is a bit heavy, but safe for targeted role broadcasts
        users = db_session.execute(select(User.id).where(User.role == role)).scalars().all()
        for uid in users:
            await self.send_personal_message(message, uid)

    async def broadcast(self, message: Any):
        # Legacy broadcast to everyone
        for connections in self.user_connections.values():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()
