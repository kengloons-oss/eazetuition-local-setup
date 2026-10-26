from flask import Blueprint, render_template, request, jsonify, session, url_for
from datetime import datetime

from sqlalchemy import func
from helper import Helper
from middlewares.admin_required import admin_required
from models import db
from models.chat_room_model import Chat_Room, Message, Chat_Room_Member
from models.system_user_model import System_User
import json
# from models.system_user import System_User  # if you have one

chat_bp = Blueprint('chat', __name__, url_prefix='/chat')

#================================================================================================
# Admin website Control
#================================================================================================
# 🧭 Chat UI for admin (temporary fake user)

@chat_bp.route('/reply')
@admin_required
def chat_reply():
    # TEMP: simulate logged-in admin
    current_user_id = session["admin_id"]
    open_room = request.args.get("open_room") 

    # Get only rooms the current user is in
    chat_rooms = Chat_Room.get_rooms_for_user(current_user_id)
    
    #Header
    breadcrumbs = [
        ('Chat', url_for('chat.chat_reply')),
        ('List', None)
    ]

    title = "Chat"


    return render_template(
        'admin/chat/chat.html',
        chat_rooms=chat_rooms,
        current_user_id=current_user_id,
        open_room=open_room,
        title=title,
        breadcrumbs=breadcrumbs
    )


@chat_bp.route('/messages')
@admin_required
def get_chat_messages():
    room_id = request.args.get('room_id')
    current_user_id = session["admin_id"]

    if not room_id:
        return jsonify({'status': 'error', 'message': 'Missing room ID'}), 400

    # Verify user is member of this room
    membership = Chat_Room_Member.query.filter_by(
        chat_room_id=room_id,
        user_id=current_user_id
    ).first()
    if not membership:
        return jsonify({'status': 'error', 'message': 'Access denied'}), 403

    # Fetch messages
    messages = Message.get_messages_by_room(room_id, current_user_id)

    return jsonify({
        'status': 'success',
        'messages': [
            {
                'content': m.content,
                'sender_id': m.sender_id,
                'sender_name': getattr(m.sender, 'name', f'User {m.sender_id}'),
                'send_datetime': Helper.format_full_datetime_12h(m.send_datetime),
                'read_by': json.loads(m.read_by) if m.read_by else []
            }
            for m in messages
        ]
    })


# 🧭 Send a new message
@chat_bp.route('/send', methods=['POST'])
def send_message():

    data = request.get_json()
    room_id = data.get('room_id')
    sender_id = data.get("sender_id") or session["admin_id"]
    content = data.get('content', '').strip()

    print(room_id)
    print(sender_id)
    print(content)

    if not room_id or not content:
        return jsonify({'status': 'error', 'message': 'Missing room ID or content'}), 400

    # Ensure sender is in this chat room
    member = Chat_Room_Member.query.filter_by(chat_room_id=room_id, user_id=sender_id).first()
    if not member:
        return jsonify({'status': 'error', 'message': 'You are not a member of this room'}), 403

    try:
        msg = Message.add_message(room_id, sender_id, content)
       
        return jsonify({
            'status': 'success',
            'message': 'Message sent successfully.',
            'data': {
                'sender_id': msg.sender_id,
                'content': msg.content,
                'send_datetime': Helper.format_full_datetime_12h(msg.send_datetime)
            }
        })
    except Exception as e:
        db.session.rollback()
        print("Error sending message:", e)
        return jsonify({'status': 'error', 'message': 'Failed to send message.'}), 500
    
# 🧭 Search for user to chat with
@chat_bp.route('/search_user')
def search_user():
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'status': 'error', 'message': 'Missing query'})
    
    users = System_User.query.filter(System_User.name.like(f"%{query}%")).limit(10).all()

    return jsonify({
        'status': 'success',
        'data': [{'user_id': u.user_id, 'name': u.name} for u in users]
    })


# 🧭 Start new chat with a user
@chat_bp.route('/start', methods=['POST'])
@admin_required
def start_chat():
    data = request.get_json()
    user_id = data.get('user_id')
    admin_id = session["admin_id"]

    if not user_id:
        return jsonify({'status': 'error', 'message': 'Missing user ID'})

    # Check if room already exists
    existing = (
        Chat_Room.query
        .join(Chat_Room_Member)
        .filter(Chat_Room_Member.user_id.in_([admin_id, user_id]))
        .group_by(Chat_Room.chat_room_id)
        .having(func.count(Chat_Room_Member.user_id) == 2)
        .first()
    )
    if existing:
        return jsonify({'status': 'success', 'message': 'Chat already exists', 'data': {
            'room_id': existing.chat_room_id,
            'created_time': existing.created_datetime.strftime("%Y-%m-%d %H:%M")
        }})
    
    user = System_User.get_by_id(user_id)

    # Otherwise, create new room
    room = Chat_Room(
        room_name=f"{user.name} ({Helper.format_user_type(user.type)})",
        room_type="private",
        created_by=admin_id,
        created_datetime=datetime.utcnow()
    )
    db.session.add(room)
    db.session.flush()

    db.session.add_all([
        Chat_Room_Member(chat_room_id=room.chat_room_id, user_id=admin_id, joined_datetime=datetime.utcnow(), role='admin'),
        Chat_Room_Member(chat_room_id=room.chat_room_id, user_id=user_id, joined_datetime=datetime.utcnow(), role='user')
    ])

    db.session.commit()

    return jsonify({
        'status': 'success',
        'message': 'New chat created successfully',
        'data': {
            'room_id': room.chat_room_id,
            'created_time': room.created_datetime.strftime("%Y-%m-%d %H:%M")
        }
    })

@chat_bp.route('/poll/latest')
def poll_latest_message():
    user_id = session["admin_id"]
    if not user_id:
        return jsonify({"status": "unauthorized"}), 401 

    rooms = Chat_Room.get_rooms_for_user(user_id)

    latest_msg = None

    for r in rooms:
        room_id = r['chat_room_id']

        messages = Message.get_messages_by_room(
            room_id,
            current_user_id=user_id
        )

        if not messages:
            continue

        last_msg = messages[-1]  # 因为你的 function 已经 order by ASC

        if latest_msg is None or last_msg.send_datetime > latest_msg.send_datetime:
            latest_msg = last_msg

    if not latest_msg:
        return jsonify({"status": "empty"}), 200

    sender_name = latest_msg.sender.name if latest_msg.sender else f"User {latest_msg.sender_id}"

    return jsonify({
        "status": "success",
        "data": {
            "message_id": latest_msg.message_id,
            "room_id": latest_msg.chat_room_id,
            "sender_id": latest_msg.sender_id,
            "sender_name": sender_name,
            "content": latest_msg.content,
            "send_datetime": Helper.format_full_datetime_12h(latest_msg.send_datetime)
        }
    })




#================================================================================================
# Mobile Control
#================================================================================================
@chat_bp.route('/mobile/rooms/<int:user_id>')
def mobile_get_rooms(user_id):
    chat_rooms = Chat_Room.get_rooms_for_user(user_id)
    result = []

    for r in chat_rooms:
        print("➡️ Room:", r['chat_room_id'], r['room_name'])

        members = Chat_Room_Member.query.filter_by(
            chat_room_id=r['chat_room_id']
        ).all()

        member_ids = [m.user_id for m in members]
        print("   Members:", member_ids)

        # -----------------------------
        # ⭐ PRIVATE CHAT → rename room
        # -----------------------------
        final_room_name = r['room_name']

        if r['room_type'] == "1":
            # get the OTHER user id
            other_user_ids = [uid for uid in member_ids if uid != user_id]
            if other_user_ids:
                other_user = System_User.get_by_id(other_user_ids[0])
                if other_user:
                    final_room_name = other_user.name + " (" + Helper.format_user_type(other_user.type) + ")"

        result.append({
            "chat_room_id": r['chat_room_id'],
            "room_name": final_room_name,    # ⭐ replaced
            "last_message": r['last_message'],
            "last_time": r['last_time'],
            "unread_count": r['unread_count'],
            "members": member_ids or []
        })

    return jsonify(result), 200



@chat_bp.route('/mobile/messages/<int:room_id>')
def mobile_get_messages(room_id):
    since_str = request.args.get('since')
    current_user_id = request.args.get('current_user_id')

    since_dt = None

    if since_str:
        try:
            clean_str = since_str.replace("Z", "+00:00")
            since_dt = datetime.fromisoformat(clean_str)
        except:
            print("⚠️ Invalid since:", since_str)

    messages = Message.get_messages_by_room(
        room_id,
        current_user_id=current_user_id,
        since_dt=since_dt
    )

    response = []
    for m in messages:
        response.append({
            "message_id": m.message_id,
            "chat_room_id": m.chat_room_id,
            "sender_id": m.sender_id,
            "content": m.content,
            "send_datetime": Helper.format_full_datetime_12h(m.send_datetime),
            "read_by": m.read_by or "[]"
        })

    return jsonify(response), 200


@chat_bp.route('/mobile/active_users')
def mobile_get_active_users():
    """
    Mobile: return all active users (status='1')
    You may filter out admin if needed.
    """

    users = System_User.query.filter_by(status="1").all()

    return jsonify([
        {
            "user_id": u.user_id,
            "name": u.name + " (" + u.type + ")"
        }
        for u in users
    ]), 200


@chat_bp.route('/mobile/start', methods=["POST"])
def mobile_start_chat():
    data = request.get_json()
    current_user_id = data.get('current_user_id')  # ← mobile logged user
    target_user_id = data.get('target_user_id')

    if not current_user_id or not target_user_id:
        return jsonify({'status': 'error', 'message': 'Missing IDs'}), 400

    if current_user_id == target_user_id:
        return jsonify({'status': 'error', 'message': 'Cannot chat with yourself'}), 400
    

    # Check existing room
    existing = (
        Chat_Room.query
        .join(Chat_Room_Member)
        .filter(Chat_Room_Member.user_id.in_([current_user_id, target_user_id]))
        .group_by(Chat_Room.chat_room_id)
        .having(func.count(Chat_Room_Member.user_id) == 2)
        .first()
    )

    if existing:
        return jsonify({
            'status': 'success',
            'message': 'Chat already exists',
            'data': { 'room_id': existing.chat_room_id }
        })

    # Create new room
    target = System_User.get_by_id(target_user_id)

    room = Chat_Room(
        room_name=target.name,
        room_type="1",
        created_by=current_user_id,
        created_datetime=datetime.utcnow()
    )
    db.session.add(room)
    db.session.flush()

    # Add members
    db.session.add_all([
        Chat_Room_Member(chat_room_id=room.chat_room_id, user_id=current_user_id, role='user'),
        Chat_Room_Member(chat_room_id=room.chat_room_id, user_id=target_user_id, role='user')
    ])

    db.session.commit()

    return jsonify({
        'status': 'success',
        'data': {
            'room_id': room.chat_room_id
        }
    }), 200


@chat_bp.route('/mobile/unread_count')
def mobile_unread_count():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'status': 'error', 'message': 'Missing user_id'}), 400

    try:
        user_id = int(user_id)
    except:
        return jsonify({'status': 'error', 'message': 'Invalid user_id'}), 400

    # 找出使用者的聊天室
    rooms = Chat_Room.get_rooms_for_user(user_id)

    total_unread = 0
    latest_msg = None
    latest_dt = None

    for r in rooms:
        room_id = r['chat_room_id']

        msgs = Message.query.filter_by(chat_room_id=room_id).order_by(Message.send_datetime.desc()).all()

        for m in msgs:
            read_by = json.loads(m.read_by) if m.read_by else []

            if m.sender_id != user_id and user_id not in read_by:
                total_unread += 1
                
            if latest_dt is None or m.send_datetime > latest_dt:
                latest_dt = m.send_datetime
                latest_msg = m

    if latest_msg:
        latest_payload = {
            "message_id": latest_msg.message_id,
            "room_id": latest_msg.chat_room_id,
            "sender_id": latest_msg.sender_id,
            "sender_name": latest_msg.sender.name if latest_msg.sender else f"User {latest_msg.sender_id}",
            "content": latest_msg.content,
            "send_datetime": Helper.format_full_datetime_12h(latest_msg.send_datetime)
        }
    else:
        latest_payload = None

    return jsonify({
        "status": "success",
        "unread": total_unread,
        "latest": latest_payload
    }), 200
