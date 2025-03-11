from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit
import os
import random

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'changethis')  # Stocker cette clé dans une variable d'environnement

# Initialisation de Flask-SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

leaderboard = []  # Stockage temporaire des scores

def load_images():
    """Charge les images depuis le dossier statique"""
    image_folder = "static/images"
    if not os.path.exists(image_folder):
        return []
    
    images = []
    for image in os.listdir(image_folder):
        if image.lower().endswith(('png', 'jpg', 'jpeg')):
            is_ai = "ia" in image.lower()  
            is_real = "real" in image.lower()
            if not is_ai and not is_real:
                is_ai = random.choice([True, False])
            images.append({"url": f"/static/images/{image}", "is_ai": is_ai})

    return images

all_images = load_images()

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/start', methods=['POST'])
def start_quiz():
    """Démarre un quiz et initialise la session utilisateur"""
    pseudo = request.form.get('pseudo')
    session['pseudo'] = pseudo
    session['current_index'] = 0
    session['score'] = 0
    session['images'] = random.sample(all_images, len(all_images))  # Mélanger les images

    return render_template('index.html', image=session['images'][0]['url'], pseudo=pseudo)

@socketio.on('submit_guess')
def handle_guess(data):
    """Gestion de la réponse utilisateur via WebSockets"""
    if 'current_index' not in session or 'images' not in session:
        emit('error', {"message": "Session expirée. Relance le quiz."})
        return

    user_guess = data.get('is_ai')
    current_index = session['current_index']
    images = session['images']
    score = session['score']

    if current_index >= len(images):
        emit('quiz_finished', {
            "score": score,
            "total": len(images),
            "pseudo": session.get('pseudo', 'Joueur'),
            "leaderboard": leaderboard
        })
        return

    correct_answer = images[current_index]['is_ai']

    if user_guess == correct_answer:
        score += 1

    current_index += 1

    session['current_index'] = current_index
    session['score'] = score

    if current_index >= len(images):
        leaderboard.append({"pseudo": session.get('pseudo', 'Joueur'), "score": score})
        leaderboard.sort(key=lambda x: x["score"], reverse=True)

        # Diffuser les scores à tous les joueurs
        emit('leaderboard_update', leaderboard, broadcast=True)

        emit('quiz_finished', {
            "score": score,
            "total": len(images),
            "pseudo": session.get('pseudo', 'Joueur'),
            "leaderboard": leaderboard
        })
    else:
        emit('next_image', {
            "next_image": images[current_index]['url'],
            "correct_answer": correct_answer
        })

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
