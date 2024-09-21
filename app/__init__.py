import os
from app.audio_extraction import extract_audio
from app.audio_analysis import analyze_audio
from app.highlight_detection import detect_highlights
from app.video_processing import create_highlight_video
import concurrent.futures

def process_video(video_file, progress_callback=None, speed=1.0):
    base_name = os.path.splitext(os.path.basename(video_file))[0]
    audio_file = f"uploads/{base_name}_audio.wav"
    highlight_video = f"uploads/{base_name}_highlight.mp4"

    with concurrent.futures.ThreadPoolExecutor() as executor:
        # 并行执行音频提取和分析
        future_extract = executor.submit(extract_audio, video_file, audio_file)
        future_extract.result()
        if progress_callback:
            progress_callback(25)

        future_analyze = executor.submit(analyze_audio, audio_file)
        y, sr, energy, pitch_values, hop_length = future_analyze.result()
        if progress_callback:
            progress_callback(50)

        # 检测亮点
        highlight_times, energy = detect_highlights(energy, pitch_values, sr, hop_length)
        if progress_callback:
            progress_callback(75)

        # 创建精华视频
        create_highlight_video(video_file, highlight_times, energy, sr, hop_length, output_path=highlight_video)

    # 删除临时音频文件
    os.remove(audio_file)

    if progress_callback:
        progress_callback(100)

    return highlight_video