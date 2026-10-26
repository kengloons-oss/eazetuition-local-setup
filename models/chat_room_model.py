from datetime import datetime
import json
from sqlalchemy import case, desc, func
from sqlalchemy.orm import aliased
from helper import Helper
from models import db
from sqlalchemy.dialects.mysql import LONGTEXT

class Chat_Room_Member(db.Model):
    __tablename__ = 'chat_room_member'

    chat_room_id = db.Column(db.Integer, db.ForeignKey('chat_room.chat_room_id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('system_user.user_id'), primary_key=True)
    joined_datetime = db.Column(db.DateTime, nullable=False)
    role = db.Column(db.String(10), nullable=False)

    # relationships (optional convenience)
    chat_room = db.relationship("Chat_Room", back_populates="chat_room_members")
    user = db.relationship("System_User", back_populates="chat_room_members")

class Chat_Room(db.Model):
    __tablename__ = 'chat_room'

    chat_room_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_name = db.Column(db.String(100), nullable=False)
    room_type = db.Column(db.String(50), nullable=False)   
    created_by = db.Column(db.Integer, db.ForeignKey('system_user.user_id'), nullable=False)
    created_datetime = db.Column(db.DateTime, nullable=False)

    # Relationships
    creator = db.relationship("System_User", back_populates="chat_rooms_created")
    chat_room_members = db.relationship("Chat_Room_Member", back_populates="chat_room", cascade="all, delete-orphan")
    messages = db.relationship("Message", back_populates="chat_room", cascade="all, delete-orphan")

    

    @staticmethod
    def get_rooms_for_user(user_id):
        from models.chat_room_model import Message, Chat_Room_Member
        import json

        # Subquery to get latest message datetime per room
        last_msg_time_subq = (
            db.session.query(
                Message.chat_room_id,
                func.max(Message.send_datetime).label('last_time')
            )
            .group_by(Message.chat_room_id)
            .subquery()
        )

        # Join to get the content of the latest message
        last_msg_subq = (
            db.session.query(
                Message.chat_room_id,
                Message.content.label('last_message'),
                Message.send_datetime.label('last_time')
            )
            .join(last_msg_time_subq, (Message.chat_room_id == last_msg_time_subq.c.chat_room_id) &
                                    (Message.send_datetime == last_msg_time_subq.c.last_time))
            .subquery()
        )

        # Main query
        rooms = (
            db.session.query(
                Chat_Room,
                last_msg_subq.c.last_message,
                last_msg_subq.c.last_time
            )
            .join(Chat_Room_Member, Chat_Room_Member.chat_room_id == Chat_Room.chat_room_id)
            .outerjoin(last_msg_subq, last_msg_subq.c.chat_room_id == Chat_Room.chat_room_id)
            .filter(Chat_Room_Member.user_id == user_id)
            .order_by(
                case(
                    (last_msg_subq.c.last_time == None, 1),
                    else_=0
                ),
                last_msg_subq.c.last_time.desc(),
                Chat_Room.created_datetime.desc()
            )
            .all()
        )

        # Add unread_count
        room_list = []
        for r in rooms:
            room = r.Chat_Room

            # -----------------------------
            # 🔵 计算 unread（跳过自己发送的消息）
            # -----------------------------

            unread_count = 0
            for m in room.messages:
                read_by = json.loads(m.read_by) if m.read_by else []
                if m.sender_id != user_id and user_id not in read_by:
                    unread_count += 1

            # -----------------------------
            # 🔵 处理房间显示名称（私聊显示对方姓名）
            # -----------------------------
            final_room_name = room.room_name

            if room.room_type == "1":   # private chat
                members = Chat_Room_Member.query.filter_by(
                    chat_room_id=room.chat_room_id
                ).all()

                member_ids = [m.user_id for m in members]

                other_ids = [uid for uid in member_ids if uid != user_id]

                if other_ids:
                    from models.system_user_model import System_User
                    other_user = System_User.get_by_id(other_ids[0])
                    if other_user:
                        final_room_name = other_user.name + " (" + Helper.format_user_type(other_user.type) + ")"

            # -----------------------------
            room_list.append({
                'chat_room_id': room.chat_room_id,
                'room_name': final_room_name,     # ⭐ 用处理后的名字
                'room_type': room.room_type,
                'last_message': r.last_message,
                'last_time': Helper.format_full_datetime_12h(r.last_time) if r.last_time else None,
                'unread_count': unread_count
            })


        return room_list


    
class Message(db.Model):
    __tablename__ = 'message'

    message_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    chat_room_id = db.Column(db.Integer, db.ForeignKey('chat_room.chat_room_id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('system_user.user_id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    send_datetime = db.Column(db.DateTime, nullable=False)
    read_by = db.Column(LONGTEXT, nullable=True)   # JSON string, DB enforces json_valid()

    # Relationships
    chat_room = db.relationship("Chat_Room", back_populates="messages")
    sender = db.relationship("System_User", back_populates="messages_sent")

    @staticmethod
    def get_messages_by_room(room_id, current_user_id=None, since_dt=None):
        import json
        from app import db

        query = Message.query.filter_by(chat_room_id=room_id)

        if since_dt:
            query = query.filter(Message.send_datetime >= since_dt)

        messages = query.order_by(Message.send_datetime.asc()).all()

        if not current_user_id:
            return messages

        try:
            current_user_id = int(current_user_id)
        except:
            return messages

        updated = False

        for msg in messages:

            # Skip your own messages
            if int(msg.sender_id) == current_user_id:
                continue

            raw = json.loads(msg.read_by) if msg.read_by else []

            # ----- CLEAN -----
            clean = []
            for x in raw:
                try:
                    clean.append(int(x))
                except:
                    pass
            # ------------------

            # Always rewrite if cleaning changed something
            if clean != raw:
                msg.read_by = json.dumps(clean)
                updated = True

            # Then mark as read
            if current_user_id not in clean:
                clean.append(current_user_id)
                msg.read_by = json.dumps(clean)
                updated = True

        if updated:
            db.session.commit()

        return messages

    @staticmethod
    def add_message(room_id, sender_id, content):
        new_msg = Message(
            chat_room_id=room_id,
            sender_id=sender_id,
            content=content,
            send_datetime=datetime.utcnow()
        )
        db.session.add(new_msg)
        db.session.commit()
        return new_msg

