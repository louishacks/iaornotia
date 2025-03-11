from flask import Flask, render_template, request, jsonify, session
import os
import random

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # Required for session management

leaderboard = []  # Stores user scores globally

# Function to dynamically fetch all images
def load_images():
    image_folder = "static/images"
    image_files = os.listdir(image_folder)
    images = []

    for image in image_files:
        if image.lower().endswith(('png', 'jpg', 'jpeg')):
            is_ai = "ia" in image.lower()  
            is_real = "real" in image.lower()

            if not is_ai and not is_real:
                is_ai = random.choice([True, False])  # Random assignment
                
            images.append({"url": f"/static/images/{image}", "is_ai": is_ai})

    return images

# Load images once at startup
all_images = load_images()

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/start', methods=['POST'])
def start_quiz():
    session['pseudo'] = request.form.get('pseudo')
    session['current_index'] = 0
    session['score'] = 0
    session['images'] = random.sample(all_images, len(all_images))  # Shuffle images for each user

    return render_template('index.html', image=session['images'][0]['url'], pseudo=session['pseudo'])

@app.route('/guess', methods=['POST'])
def guess():
    if 'current_index' not in session or 'images' not in session:
        return jsonify({"error": "Session expired. Please restart the quiz."}), 400

    data = request.json
    user_guess = data.get('is_ai')

    current_index = session['current_index']
    images = session['images']
    score = session['score']

    if current_index >= len(images):
        return jsonify({
            "finished": True,
            "score": score,
            "total": len(images),
            "pseudo": session.get('pseudo', 'Player'),
            "leaderboard": leaderboard
        })

    correct_answer = images[current_index]['is_ai']

    if user_guess == correct_answer:
        score += 1

    current_index += 1

    # Update session with new values
    session['current_index'] = current_index
    session['score'] = score

    # End game if no more images
    if current_index >= len(images):
        leaderboard.append({"pseudo": session.get('pseudo', 'Player'), "score": score})
        leaderboard.sort(key=lambda x: x["score"], reverse=True)

        return jsonify({
            "finished": True,
            "score": score,
            "total": len(images),
            "pseudo": session.get('pseudo', 'Player'),
            "leaderboard": leaderboard
        })

    return jsonify({
        "finished": False,
        "next_image": images[current_index]['url'],
        "correct_answer": correct_answer
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
