import os
import random
from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'changethis')  # Stocker dans une variable d'environnement
socketio = SocketIO(app, cors_allowed_origins="*")

leaderboard = []  # Stockage temporaire des scores

def load_images():
    """Charge les images en détectant si elles sont IA ou réelles de manière fiable."""
    image_folder = "static/images"
    
    if not os.path.exists(image_folder):
        return []
    
    images = []
    for image in os.listdir(image_folder):
        if image.lower().endswith(('png', 'jpg', 'jpeg')):
            filename = image.lower()
            
            # ✅ Détection FIABLE sans ambiguïté
            if "ai" in filename:
                is_ai = True
            elif "real" in filename:
                is_ai = False
            else:
                continue  # On ignore les fichiers mal nommés
                
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

    user_guess = data.get('is_ai')  # Valeur booléenne reçue du frontend
    current_index = session['current_index']
    images = session['images']
    score = session['score']
    total_images = len(images)

    if current_index >= total_images:
        emit('quiz_finished', {
            "score": score,
            "total": total_images,
            "pseudo": session.get('pseudo', 'Joueur')
        })
        return

    correct_answer = images[current_index]['is_ai']  # ✅ Vérification FIABLE

    is_correct = user_guess == correct_answer  # ✅ Comparaison robuste

    if is_correct:
        score += 1

    current_index += 1
    session['current_index'] = current_index
    session['score'] = score

    if current_index >= total_images:
        emit('quiz_finished', {
            "score": score,
            "total": total_images,
            "pseudo": session.get('pseudo', 'Joueur')
        })
    else:
        emit('next_image', {
            "next_image": images[current_index]['url'],
            "is_correct": is_correct,
            "current_index": current_index + 1,  # ✅ 1-based index
            "total_images": total_images
        })


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
