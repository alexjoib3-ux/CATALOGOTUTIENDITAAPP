import os
from flask import Flask, render_template, request, jsonify, url_for
from werkzeug.utils import secure_filename
import time

app = Flask(__name__)

# Definir ruta absoluta apuntando directamente a static/img
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'img')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Asegurar que la carpeta static/img exista al iniciar
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

# Endpoint para procesar la subida de imágenes locales hacia static/img
@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        if 'files[]' not in request.files:
            return jsonify({'error': 'No se encontraron archivos en la petición'}), 400
        
        files = request.files.getlist('files[]')
        saved_urls = []

        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{int(time.time())}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                
                # Generar la URL apuntando a static/img/
                url = url_for('static', filename=f'img/{unique_filename}')
                saved_urls.append(url)

        return jsonify({'urls': saved_urls})
    except Exception as e:
        print(f"Error interno al subir archivo: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)