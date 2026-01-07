"""Interviewer API - Simple rule-based interviewer."""

import uuid
import logging
from flask import Blueprint, request, jsonify

from agents.interviewer_agent import InterviewerAgent

logger = logging.getLogger(__name__)

interviewer_bp = Blueprint('interviewer', __name__, url_prefix='/api/interviewer')
interviewer = InterviewerAgent()
sessions = {}  # session_id -> {problem, messages, hints_used}


@interviewer_bp.route('/start', methods=['POST'])
def start():
    problem = request.json.get('problem', 'Two Sum')
    session_id = str(uuid.uuid4())

    opening = interviewer.start(problem)

    sessions[session_id] = {
        'problem': problem,
        'messages': [{'role': 'assistant', 'text': opening}],
        'hints_used': 0
    }

    logger.info(f"Sessions data: {sessions}")
    return jsonify({'session_id': session_id, 'message': opening})


@interviewer_bp.route('/chat', methods=['POST'])
def chat():
    try:
        session_id = request.json['session_id']
        user_message = request.json['message']

        logger.info(f"Chat request - session_id: {session_id}, message: {user_message}")

        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        session['messages'].append({'role': 'user', 'text': user_message})

        messages = [
            {"role": m["role"], "content": m["text"]}
            for m in session["messages"]
        ]

        logger.info(f"Calling interviewer.run with {len(messages)} messages")
        response, hints_used, tool_messages = interviewer.run(
            session['problem'],
            messages,
            session['hints_used']
        )

        session['hints_used'] = hints_used
        for tool_message in tool_messages:
            session['messages'].append({
                'role': tool_message['role'],
                'text': tool_message['text']
            })
        session['messages'].append({'role': 'assistant', 'text': response})

        logger.info(f"Chat response: {response}")
        return jsonify({
            'message': response,
            'hints_used': session['hints_used'],
            'tool_messages': tool_messages
        })
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@interviewer_bp.route('/hint', methods=['POST'])
def hint():
    session_id = request.json['session_id']
    session = sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    if session['hints_used'] >= interviewer.max_hints:
        return jsonify({'error': 'No hints remaining'}), 400

    hint_text, hints_used = interviewer.give_hint(
        session['problem'],
        session['hints_used']
    )
    session['hints_used'] = hints_used
    session['messages'].append({'role': 'hint', 'text': hint_text})

    return jsonify({'hint': hint_text, 'hints_used': session['hints_used']})


@interviewer_bp.route('/end', methods=['POST'])
def end():
    session_id = request.json.get('session_id')
    if not session_id:
        return jsonify({'error': 'session_id is required'}), 400

    session = sessions.pop(session_id, None)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    return jsonify({'message': 'Session ended', 'session_id': session_id})
