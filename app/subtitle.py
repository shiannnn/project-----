import subprocess
import os
import json

def add_subtitle(input_file, output_file, subtitle_text, start_time, end_time):
    try:
        # 创建临时字幕文件
        subtitle_file = 'temp_subtitle.srt'
        with open(subtitle_file, 'w', encoding='utf-8') as f:
            f.write(f"1\n{format_time(start_time)} --> {format_time(end_time)}\n{subtitle_text}\n")

        # 使用 FFmpeg 添加字幕
        command = [
            'ffmpeg',
            '-i', input_file,
            '-vf', f"subtitles={subtitle_file}:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=3'",
            '-c:a', 'copy',
            '-y',  # 覆盖输出文件（如果存在）
            output_file
        ]
        
        subprocess.run(command, check=True)

        # 删除临时字幕文件
        import os
        os.remove(subtitle_file)

        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg 命令执行失败: {e}")
        return False
    except Exception as e:
        print(f"添加字幕时发生错误: {e}")
        return False

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def apply_subtitles(input_path, output_path, subtitles):
    try:
        # 创建临时字幕文件
        subtitle_file = 'temp_subtitle.srt'
        create_srt_file(subtitles, subtitle_file)

        # 使用 FFmpeg 添加字幕
        command = [
            'ffmpeg',
            '-i', input_path,
            '-vf', f"subtitles={subtitle_file}:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=3'",
            '-c:a', 'copy',
            '-y',  # 覆盖输出文件（如果存在）
            output_path
        ]
        
        subprocess.run(command, check=True)

        # 删除临时字幕文件
        os.remove(subtitle_file)

        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg 命令执行失败: {e}")
        return False
    except Exception as e:
        print(f"应用字幕时发生错误: {str(e)}")
        return False

def create_srt_file(subtitles, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        for i, subtitle in enumerate(subtitles, 1):
            f.write(f"{i}\n")
            f.write(f"{format_time(subtitle['startTime'])} --> {format_time(subtitle['endTime'])}\n")
            f.write(f"{subtitle['text']}\n\n")
def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def extract_subtitles(input_file):
    try:
        command = [
            'ffmpeg',
            '-i', input_file,
            '-map', '0:s:0',  # 選擇第一個字幕軌道
            '-f', 'srt',
            '-'
        ]
        
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        srt_content = result.stdout
        
        # 解析 SRT 內容
        subtitles = []
        lines = srt_content.strip().split('\n\n')
        for line in lines:
            parts = line.split('\n')
            if len(parts) >= 3:
                time_range = parts[1].split(' --> ')
                subtitles.append({
                    'startTime': time_to_seconds(time_range[0]),
                    'endTime': time_to_seconds(time_range[1]),
                    'text': '\n'.join(parts[2:])
                })
        
        return subtitles
    except subprocess.CalledProcessError as e:
        print(f"提取字幕時發生錯誤: {e}")
        return []

def time_to_seconds(time_str):
    h, m, s = time_str.split(':')
    s, ms = s.split(',')
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

