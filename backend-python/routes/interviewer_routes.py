"""Interviewer API - Simple rule-based interviewer."""

import uuid
import logging
import json
from flask import Blueprint, request, jsonify, Response, stream_with_context

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


@interviewer_bp.route('/chat-stream', methods=['POST'])
def chat_stream():
    """Streaming version of chat endpoint using Server-Sent Events"""
    try:
        data = request.json
        session_id = data['session_id']
        user_message = data['message']

        logger.info(f"Chat stream request - session_id: {session_id}, message: {user_message}")

        session = sessions.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        session['messages'].append({'role': 'user', 'text': user_message})

        messages = [
            {"role": m["role"], "content": m["text"]}
            for m in session["messages"]
        ]

        def generate():
            """Generator function for SSE streaming"""
            try:
                logger.info(f"Starting stream for session {session_id}")

                for event in interviewer.run_stream(
                    session['problem'],
                    messages,
                    session['hints_used']
                ):
                    # Update session state
                    session['hints_used'] = event['hints_used']

                    if event['type'] == 'tool':
                        # Add tool message to session
                        session['messages'].append({
                            'role': event['role'],
                            'text': event['text']
                        })
                        # Send SSE event
                        yield f"data: {json.dumps(event)}\n\n"

                    elif event['type'] == 'final':
                        # Add final response to session
                        session['messages'].append({
                            'role': 'assistant',
                            'text': event['text']
                        })
                        # Send final SSE event
                        yield f"data: {json.dumps(event)}\n\n"

                logger.info(f"Stream completed for session {session_id}")
            except Exception as e:
                logger.error(f"Error in stream generator: {str(e)}", exc_info=True)
                error_event = {"type": "error", "text": str(e)}
                yield f"data: {json.dumps(error_event)}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'  # Disable nginx buffering
            }
        )

    except Exception as e:
        logger.error(f"Error in chat-stream endpoint: {str(e)}", exc_info=True)
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
