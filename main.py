import os
import logging
from flask import Flask, render_template, request, jsonify, send_file, Response, send_from_directory
from werkzeug.utils import secure_filename
from app import process_video
import threading
from app.adjust_video import adjust_video_speed, adjust_video_volume, adjust_video
from flask import session
from app.subtitle import add_subtitle, apply_subtitles , extract_subtitles

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 限制上傳檔案大小為 500MB

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov'}

logging.basicConfig(level=logging.INFO)

# 全局變量來存儲進度
progress = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def update_progress(task_id, percent):
    global progress
    progress[task_id] = percent
    app.logger.info(f"Task {task_id} progress updated: {percent}%")

def process_video_with_progress(file_path, task_id, speed):
    global progress
    try:
        progress[task_id] = 0
        highlight_video_path = process_video(file_path, lambda p: update_progress(task_id, p), speed)
        progress[task_id] = 100
        app.logger.info(f"影片處理完成: {highlight_video_path}")
    except Exception as e:
        app.logger.error(f"處理影片時發生錯誤: {str(e)}")
        progress[task_id] = -1

@app.route('/')
def index():
    return render_template('index.html')

def process_video_with_progress(file_path, task_id, speed):
    global progress
    try:
        progress[task_id] = 0
        highlight_video_path = process_video(file_path, lambda p: update_progress(task_id, p), speed)
        progress[task_id] = 100
        app.logger.info(f"影片處理完成: {highlight_video_path}")
    except Exception as e:
        app.logger.error(f"處理影片時發生錯誤: {str(e)}")
        progress[task_id] = -1

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件部分'}), 400
    
    file = request.files['file']
    speed = float(request.form.get('speed', 1.0))  # 獲取速度參數，默認為 1.0
    
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # 添加日志来检查文件路径
        app.logger.info(f"尝试保存文件到: {file_path}")
        
        try:
            file.save(file_path)
            app.logger.info(f"文件成功保存到: {file_path}")
        except Exception as e:
            app.logger.error(f"保存文件时发生错误: {str(e)}")
            return jsonify({'error': '保存文件时发生错误'}), 500
        
        task_id = filename  # 使用文件名作為任務ID
        threading.Thread(target=process_video_with_progress, args=(file_path, task_id, speed)).start()
        
        return jsonify({'message': '视频上传成功，开始处理', 'task_id': task_id}), 200
    else:
        return jsonify({'error': '不允许的文件类型'}), 400

@app.route('/progress/<task_id>')
def get_progress(task_id):
    try:
        progress_value = progress.get(task_id, 0)
        app.logger.info(f"Task {task_id} progress: {progress_value}")
        return jsonify({'progress': progress_value})
    except Exception as e:
        app.logger.error(f"获取进度时发生错误: {str(e)}")
        return jsonify({'error': '获取进度时发生错误'}), 500

@app.route('/download/<path:filename>')
def download_file(filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({'error': '文件不存在'}), 404

@app.route('/preview/<filename>')
def preview_video(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/preview_highlight/<filename>')
def preview_highlight_video(filename):
    highlight_filename = filename.replace('.mp4', '_highlight.mp4')
    return send_from_directory(app.config['UPLOAD_FOLDER'], highlight_filename)

@app.route('/adjust_speed', methods=['POST'])
def adjust_speed():
    input_file = request.json['input_file']
    volume = request.json['volume']
    speed = request.json['speed']

    if not input_file or not speed:
        return jsonify({'error': '缺少必要参数'}), 400
    
    # 确保文件名使用 UTF-8 编码
    input_file = input_file.encode('utf-8').decode('utf-8')
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)
    
    # 检查输入文件是否存在
    if not os.path.exists(input_path):
        return jsonify({'error': '输入文件不存在'}), 404

    # 生成新的输出文件名，包含速度信息
    base_name, ext = os.path.splitext(input_file)
    output_file = f"{base_name}_speed_{speed}{ext}"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_file)

    try:
        success = adjust_video(input_path, output_path, speed, volume)
        if success:
            return jsonify({'message': '视频速度调整成功', 'output_file': output_file}), 200
        else:
            return jsonify({'error': '调整视频速度失败'}), 500
    except Exception as e:
        return jsonify({'error': f'调整视频速度时发生错误: {str(e)}'}), 500

@app.route('/save_file_info', methods=['POST'])
def save_file_info():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件部分'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file and allowed_file(file.filename):
        
        filename = file.filename
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        app.logger.info(f"尝试保存文件到: {file_path}")
        
        try:
            file.save(file_path)
            app.logger.info(f"文件成功保存到: {file_path}")
            return jsonify({'message': '文件信息已成功保存'}), 200
        except Exception as e:
            app.logger.error(f"保存文件时发生错误: {str(e)}")
            return jsonify({'error': '保存文件时发生错误'}), 500
    else:
        return jsonify({'error': '不允许的文件类型'}), 400
    

@app.route('/adjust_volume', methods=['POST'])
def adjust_volume():
    input_file = request.json['input_file']
    speed = request.json['speed']
    volume = request.json['volume']

    if not input_file or not volume:
        return jsonify({'error': '缺少必要参数'}), 400
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)

    if not os.path.exists(input_path):
        return jsonify({'error': '输入文件不存在'}), 404

    base_name, ext = os.path.splitext(input_file)
    output_file = f"{base_name}_volume_{volume}{ext}"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_file)

    try:
        success = adjust_video(input_path, output_path, speed, volume)
        if success:
            return jsonify({'message': '视频音量调整成功', 'output_file': output_file}), 200
        else:
            return jsonify({'error': '调整视频音量失败'}), 500
    except Exception as e:
        return jsonify({'error': f'调整视频音量时发生错误: {str(e)}'}), 500
    


@app.route('/add_subtitle', methods=['POST'])
def add_subtitle_route():
    data = request.json
    input_file = data.get('input_file')
    subtitle_text = data.get('subtitle_text')
    start_time = float(data.get('start_time'))
    end_time = float(data.get('end_time'))

    if not input_file or not subtitle_text or start_time is None or end_time is None:
        return jsonify({'error': '缺少必要参数'}), 400
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)
    
    if not os.path.exists(input_path):
        return jsonify({'error': '输入文件不存在'}), 404

    base_name, ext = os.path.splitext(input_file)
    output_file = f"{base_name}_subtitled{ext}"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_file)
    subtitle_file = f"{base_name}_subtitle.srt"

    try:
        app.logger.info(f"开始添加字幕: 输入文件 {input_path}, 输出文件 {output_path}")
        success = add_subtitle(input_path, output_path, subtitle_text, start_time, end_time)
        if success:
            app.logger.info("字幕添加成功")
            return jsonify({'message': '字幕添加成功', 'output_file': output_file, 'subtitle_file': subtitle_file}), 200
        else:
            app.logger.error("添加字幕失败")
            return jsonify({'error': '添加字幕失败'}), 500
    except Exception as e:
        app.logger.error(f"添加字幕时发生错误: {str(e)}", exc_info=True)
        return jsonify({'error': f'添加字幕时发生错误: {str(e)}'}), 500

@app.route('/update_subtitles', methods=['POST'])
def update_subtitles():
    data = request.json
    input_file = data.get('input_file')
    subtitles = data.get('subtitles', [])

    if not input_file:
        app.logger.error("未提供輸入文件")
        return jsonify({'error': 'No input file provided'}), 400

    base_name, ext = os.path.splitext(input_file)
    output_file = f"{base_name}_subtitled{ext}"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_file)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)

    app.logger.info(f"開始處理字幕: 輸入文件 {input_path}, 輸出文件 {output_path}")

    try:
        if not subtitles:
            app.logger.info("沒有字幕需要應用，返回原始文件")
            return jsonify({'output_file': input_file})
        else:
            app.logger.info(f"應用新的字幕: {subtitles}")
            success = apply_subtitles(input_path, output_path, subtitles)
            message = "字幕應用成功"

        if success:
            app.logger.info(message)
            return jsonify({'message': message, 'output_file': output_file}), 200
        else:
            app.logger.error("處理字幕失敗")
            return jsonify({'error': '處理字幕失敗'}), 500
    except Exception as e:
        app.logger.exception(f"處理字幕時發生錯誤: {str(e)}")
        return jsonify({'error': f'處理字幕時發生錯誤: {str(e)}'}), 500





@app.route('/get_subtitles', methods=['POST'])
def get_subtitles():
    data = request.json
    input_file = data.get('input_file')

    if not input_file:
        return jsonify({'error': '未提供輸入文件'}), 400

    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)

    if not os.path.exists(input_path):
        return jsonify({'error': '輸入文件不存在'}), 404

    try:
        app.logger.info(f"開始提取字幕: 輸入文件 {input_path}")
        subtitles = extract_subtitles(input_path)
        
        if subtitles:
            app.logger.info(f"成功提取 {len(subtitles)} 個字幕")
            return jsonify({'subtitles': subtitles}), 200
        else:
            app.logger.warning("未找到字幕")
            return jsonify({'subtitles': []}), 200
    except Exception as e:
        app.logger.error(f"提取字幕時發生錯誤: {str(e)}", exc_info=True)
        return jsonify({'error': f'提取字幕時發生錯誤: {str(e)}'}), 500
    
if __name__ == '__main__':
    app.run(debug=True)
